import assert from "node:assert/strict";
import test from "node:test";
import {
  matchWebObservation,
  nexoProjectsFromCsv,
  reconcileOfficialWebObservations,
  type NexoProjectReference,
} from "./reconcile-observations.js";
import type { ObservationField, ObservationFieldName, WebObservation } from "./official-web-refresh.js";

const projects: NexoProjectReference[] = [
  project("101", "GRUPO T&C", "Parque Central", "Miraflores", "Av. Demo 123", {
    price_min: "450000",
    currency: "PEN",
    total_area: "60.5",
    bedrooms: "2",
    amenities: "Lobby | Terraza",
  }),
  project("102", "GRUPO TyC", "Parque Central II", "Miraflores", "Av. Demo 125"),
  project("201", "OTRA INMOBILIARIA", "Parque Central", "Miraflores", "Av. Demo 123"),
];

test("auto-enlaza solo cuando inmobiliaria, nombre y distrito son inequívocos", () => {
  const match = matchWebObservation(observation([
    field("project_name", "Parque Central"),
    field("agency_name", "GRUPO TyC"),
    field("address", "Av. Demo 123"),
  ], { district: "Miraflores" }), projects);

  assert.equal(match.status, "auto_matched");
  assert.equal(match.matchedProjectId, "101");
  assert.deepEqual(match.reasonCodes, ["NAME_DISTRICT_UNIQUE"]);
});

test("un id de alta confianza solo auto-enlaza con nombre, distrito e inmobiliaria consistentes", () => {
  const match = matchWebObservation(observation([
    field("project_name", "Parque Central"),
    field("agency_name", "GRUPO TyC"),
  ], {
    district: "Miraflores",
    projectExternalId: "101",
    expectedProjectName: "Parque Central",
    matchClass: "match_high",
    requiresHumanReview: false,
  }), projects);

  assert.equal(match.status, "auto_matched");
  assert.equal(match.matchedProjectId, "101");
  assert.deepEqual(match.reasonCodes, ["HIGH_CONFIDENCE_ID_NAME_AGENCY"]);
});

test("un id de confianza media siempre queda pendiente de revisión", () => {
  const match = matchWebObservation(observation([
    field("project_name", "Parque Central"),
    field("agency_name", "GRUPO TyC"),
  ], {
    district: "Miraflores",
    projectExternalId: "101",
    expectedProjectName: "Parque Central",
    matchClass: "match_medium",
    requiresHumanReview: true,
  }), projects);

  assert.equal(match.status, "review_required");
  assert.equal(match.matchedProjectId, undefined);
  assert.ok(match.reasonCodes.includes("EXTERNAL_ID_REQUIRES_REVIEW"));
  assert.ok(match.reasonCodes.includes("LINKAGE_HINT_NOT_HIGH_CONFIDENCE"));
});

test("un conflicto entre inmobiliaria curada y extraída nunca se auto-enlaza", () => {
  const match = matchWebObservation(observation([
    field("project_name", "Parque Central"),
    field("agency_name", "OTRA INMOBILIARIA"),
  ], {
    agency: "GRUPO T&C",
    district: "Miraflores",
    projectExternalId: "101",
    expectedProjectName: "Parque Central",
    matchClass: "match_high",
    requiresHumanReview: false,
  }), projects);

  assert.equal(match.status, "review_required");
  assert.ok(match.reasonCodes.includes("TARGET_AGENCY_CONFLICT"));
});

test("un conflicto entre nombre esperado y extraído nunca se auto-enlaza", () => {
  const match = matchWebObservation(observation([
    field("project_name", "Nombre totalmente distinto"),
    field("agency_name", "GRUPO TyC"),
  ], {
    district: "Miraflores",
    projectExternalId: "101",
    expectedProjectName: "Parque Central",
    matchClass: "match_high",
    requiresHumanReview: false,
  }), projects);

  assert.equal(match.status, "review_required");
  assert.ok(match.reasonCodes.includes("TARGET_PROJECT_NAME_CONFLICT"));
});

test("un nombre sin distrito confirmado se deriva a revisión y nunca se fuerza", () => {
  const match = matchWebObservation(observation([
    field("project_name", "Parque Central"),
    field("agency_name", "GRUPO TyC"),
  ]), projects);

  assert.equal(match.status, "review_required");
  assert.equal(match.matchedProjectId, undefined);
  assert.ok(match.reasonCodes.includes("DISTRICT_NOT_CONFIRMED"));
});

test("no cruza proyectos de inmobiliarias distintas aunque coincida el nombre", () => {
  const match = matchWebObservation(observation([
    field("project_name", "Parque Central"),
    field("agency_name", "INMOBILIARIA INEXISTENTE"),
  ], { district: "Miraflores" }), projects);

  assert.equal(match.status, "unmatched");
  assert.deepEqual(match.reasonCodes, ["AGENCY_NOT_FOUND_IN_NEXO"]);
});

test("conserva fuentes, revisión y trazabilidad de extracción cuando difieren", () => {
  const extraction: NonNullable<WebObservation["extraction"]> = {
    attempts: [{
      extractorId: "json-ld",
      archetype: "json_ld",
      applicable: true,
      candidateFields: 6,
      acceptedFields: 6,
      issueCodes: ["PRICE_WITHOUT_CURRENCY"],
    }],
    issueCodes: ["PRICE_WITHOUT_CURRENCY"],
  };
  const web = observation([
    field("project_name", "Parque Central"),
    field("agency_name", "GRUPO TyC"),
    field("address", "Av. Demo 123"),
    field("published_price", 470000, "PEN"),
    field("currency", "PEN"),
    field("area", 60.5, "m2"),
    field("amenities", ["Lobby", "Piscina"]),
  ], { district: "Miraflores", extraction });
  const result = reconcileOfficialWebObservations(projects, [web], {
    sourceRunId: "run-001",
    generatedAt: "2026-09-08T18:00:00.000Z",
    sourceManifestReference: "data/staging/official-webs/run-001/manifest.json",
    sourceManifestSha256: "b".repeat(64),
  });

  assert.equal(result.counts.autoMatched, 1);
  assert.equal(result.counts.differences, 2);
  const reconciled = result.reconciliations[0];
  const comparisons = reconciled?.comparisons ?? [];
  const price = comparisons.find((item) => item.field === "published_price");
  assert.equal(price?.status, "different");
  assert.equal(price?.nexo?.originalValue, "450000");
  assert.equal(price?.officialWeb?.originalValue, 470000);
  assert.equal(price?.officialWeb?.reviewStatus, "unreviewed");
  assert.deepEqual(reconciled?.extraction, extraction);
  assert.equal(reconciled?.capturedAt, web.capturedAt);
  assert.equal(reconciled?.contentSha256, web.contentSha256);
  assert.equal(result.sourceManifestReference, "data/staging/official-webs/run-001/manifest.json");
  assert.equal(result.sourceManifestSha256, "b".repeat(64));
  assert.equal(projects[0]?.values.price_min, "450000", "la conciliación no muta la fuente Nexo");
  assert.equal(comparisons.find((item) => item.field === "area")?.status, "same");
  assert.match(result.sha256, /^[a-f0-9]{64}$/u);
});

test("un valor disponible solo en Nexo se conserva como only_nexo", () => {
  const result = reconcileOfficialWebObservations(projects, [observation([
    field("project_name", "Parque Central"),
    field("agency_name", "GRUPO TyC"),
    field("address", "Av. Demo 123"),
  ], { district: "Miraflores" })], {
    sourceRunId: "run-002",
    generatedAt: "2026-09-08T18:00:00.000Z",
  });

  const price = result.reconciliations[0]?.comparisons.find((item) => item.field === "published_price");
  assert.equal(price?.status, "only_nexo");
  assert.equal(price?.nexo?.originalValue, "450000");
  assert.equal(price?.officialWeb, undefined);
});

test("trata S/ y PEN como equivalentes sin cruzarlos con USD", () => {
  const formatted = project("301", "Invent Inmobiliaria", "Invent Uno", "Jesus Maria", "Av. Uno 100", {
    price_min: "S/ 450,000",
    currency: "S/",
  });
  const pen = observation([
    field("project_name", "Invent Uno"),
    field("agency_name", "Invent Inmobiliaria"),
    field("address", "Av. Uno 100"),
    field("published_price", 450000, "PEN"),
    field("currency", "PEN"),
  ], { district: "Jesus Maria" });
  const sameResult = reconcileOfficialWebObservations([formatted], [pen], {
    sourceRunId: "run-003",
    generatedAt: "2026-09-08T18:00:00.000Z",
  });
  const same = sameResult.reconciliations[0]?.comparisons ?? [];

  assert.equal(same.find((item) => item.field === "published_price")?.status, "same");
  assert.equal(same.find((item) => item.field === "currency")?.status, "same");

  const usd = observation([
    field("project_name", "Invent Uno"),
    field("agency_name", "Invent Inmobiliaria"),
    field("address", "Av. Uno 100"),
    field("published_price", 450000, "USD"),
    field("currency", "USD"),
  ], { district: "Jesus Maria" });
  const usdResult = reconcileOfficialWebObservations([formatted], [usd], {
    sourceRunId: "run-004",
    generatedAt: "2026-09-08T18:00:00.000Z",
  });
  assert.equal(
    usdResult.reconciliations[0]?.comparisons.find((item) => item.field === "published_price")?.status,
    "not_comparable",
  );
});

test("normaliza listas con delimitadores razonables y conserva ambos originales", () => {
  const listed = project("401", "Invent Inmobiliaria", "Invent Listas", "Jesus Maria", "Av. Lista 100", {
    amenities: "Lobby; Terraza, SUM\nCoworking",
  });
  const web = observation([
    field("project_name", "Invent Listas"),
    field("agency_name", "Invent Inmobiliaria"),
    field("address", "Av. Lista 100"),
    field("amenities", ["coworking", "LOBBY", "Terraza", "SUM"]),
  ], { district: "Jesus Maria" });
  const result = reconcileOfficialWebObservations([listed], [web], {
    sourceRunId: "run-005",
    generatedAt: "2026-09-08T18:00:00.000Z",
  });
  const amenities = result.reconciliations[0]?.comparisons.find((item) => item.field === "amenities");

  assert.equal(amenities?.status, "same");
  assert.equal(amenities?.nexo?.originalValue, "Lobby; Terraza, SUM\nCoworking");
  assert.deepEqual(amenities?.officialWeb?.originalValue, ["coworking", "LOBBY", "Terraza", "SUM"]);
  assert.deepEqual(amenities?.nexo?.normalizedValue, ["coworking", "lobby", "sum", "terraza"]);
});

test("un rango de dormitorios nunca se transforma en el número 23", () => {
  const ranged = project("501", "Invent Inmobiliaria", "Invent Rango", "Jesus Maria", "Av. Rango 100", {
    bedrooms: "2 a 3",
  });
  const web = observation([
    field("project_name", "Invent Rango"),
    field("agency_name", "Invent Inmobiliaria"),
    field("address", "Av. Rango 100"),
    field("bedrooms", 23),
  ], { district: "Jesus Maria" });
  const result = reconcileOfficialWebObservations([ranged], [web], {
    sourceRunId: "run-006",
    generatedAt: "2026-09-08T18:00:00.000Z",
  });
  const bedrooms = result.reconciliations[0]?.comparisons.find((item) => item.field === "bedrooms");

  assert.equal(bedrooms?.status, "not_comparable");
  assert.equal(bedrooms?.nexo?.normalizedValue, "2 a 3");
  assert.notEqual(bedrooms?.nexo?.normalizedValue, 23);
});

test("el mismo alias personalizado se usa para enlazar y comparar", () => {
  const aliased = project("601", "FUTURA DESARROLLOS", "Futura Uno", "San Isidro", "Av. Futura 100");
  const web = observation([
    field("project_name", "Futura Uno"),
    field("agency_name", "Futura"),
    field("address", "Av. Futura 100"),
  ], { district: "San Isidro" });
  const result = reconcileOfficialWebObservations([aliased], [web], {
    sourceRunId: "run-007",
    generatedAt: "2026-09-08T18:00:00.000Z",
    aliasCatalogReference: "data/source/agency-aliases.json",
    agencyAliases: { Futura: "Futura Desarrollos" },
  });
  const agency = result.reconciliations[0]?.comparisons.find((item) => item.field === "agency_name");

  assert.equal(result.matches[0]?.status, "auto_matched");
  assert.equal(agency?.status, "same");
  assert.equal(agency?.nexo?.originalValue, "FUTURA DESARROLLOS");
  assert.equal(agency?.officialWeb?.originalValue, "Futura");
  assert.equal(result.aliasCatalogReference, "data/source/agency-aliases.json");
});

test("reconoce la marca oficial Grupo Toratto sin alterar los valores observados", () => {
  const monterosso = project(
    "1940",
    "TORATTO GRUPO INMOBILIARIO",
    "MONTEROSSO",
    "Jesús María",
    "Jr. Coronel Zegarra 1045",
  );
  const web = observation([
    field("project_name", "MONTEROSSO"),
    field("agency_name", "Grupo Toratto"),
    field("address", "Jr. Coronel Zegarra 1045"),
  ], {
    agency: "TORATTO GRUPO INMOBILIARIO",
    district: "Jesús María",
    projectExternalId: "1940",
    expectedProjectName: "MONTEROSSO",
    matchClass: "match_high",
    requiresHumanReview: false,
  });
  const result = reconcileOfficialWebObservations([monterosso], [web], {
    sourceRunId: "run-toratto",
    generatedAt: "2026-09-09T18:00:00.000Z",
  });
  const agency = result.reconciliations[0]?.comparisons.find((item) => item.field === "agency_name");

  assert.equal(result.matches[0]?.status, "auto_matched");
  assert.equal(result.matches[0]?.matchedProjectId, "1940");
  assert.ok(!result.matches[0]?.reasonCodes.includes("TARGET_AGENCY_CONFLICT"));
  assert.equal(agency?.status, "same");
  assert.equal(agency?.nexo?.originalValue, "TORATTO GRUPO INMOBILIARIO");
  assert.equal(agency?.officialWeb?.originalValue, "Grupo Toratto");
});

test("combina los aliases por defecto con el canonical real del catálogo", () => {
  const match = matchWebObservation(observation([
    field("project_name", "Parque Central"),
    field("agency_name", "GRUPO TyC"),
  ], { district: "Miraflores" }), projects, {
    "GRUPO T&C": "GRUPO T&C",
    "GRUPO TyC": "GRUPO T&C",
  });

  assert.equal(match.status, "auto_matched");
  assert.equal(match.matchedProjectId, "101");
});

test("rechaza colisiones normalizadas en la tabla única de aliases", () => {
  assert.throws(
    () => matchWebObservation(observation([
      field("project_name", "Parque Central"),
      field("agency_name", "Alias Uno"),
    ], { district: "Miraflores" }), projects, {
      "Alias-Uno": "Canon A",
      "Alias Uno": "Canon B",
    }),
    /RECONCILIATION_ALIAS_COLLISION:alias uno/u,
  );
});

test("rechaza ids de observación duplicados antes de conciliar", () => {
  const first = observation([
    field("project_name", "Parque Central"),
    field("agency_name", "GRUPO TyC"),
  ], { observationId: "duplicate", district: "Miraflores" });
  const second = observation([
    field("project_name", "Parque Central II"),
    field("agency_name", "GRUPO TyC"),
  ], { observationId: "duplicate", district: "Miraflores" });

  assert.throws(
    () => reconcileOfficialWebObservations(projects, [first, second], {
      sourceRunId: "run-008",
      generatedAt: "2026-09-08T18:00:00.000Z",
    }),
    /RECONCILIATION_DUPLICATE_OBSERVATION_ID:duplicate/u,
  );
});

test("no compara áreas sin unidad inequívoca", () => {
  const web = observation([
    field("project_name", "Parque Central"),
    field("agency_name", "GRUPO TyC"),
    field("address", "Av. Demo 123"),
    field("area", 60.5),
  ], { district: "Miraflores" });
  const result = reconcileOfficialWebObservations(projects, [web], {
    sourceRunId: "run-009",
    generatedAt: "2026-09-08T18:00:00.000Z",
  });

  assert.equal(
    result.reconciliations[0]?.comparisons.find((item) => item.field === "area")?.status,
    "not_comparable",
  );
});

test("convierte el CSV Nexo sin perder sus valores originales", () => {
  const csv = [
    "project_id,agency_name,project_name,district,address,price_min,currency,captured_at,source_url",
    "10,Invent Inmobiliaria,Invent Uno,Jesus Maria,Av. Uno 100,520000,PEN,2026-05-24T00:00:00Z,https://nexo.example/10",
    "",
  ].join("\n");
  const parsed = nexoProjectsFromCsv(csv);

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0]?.projectId, "10");
  assert.equal(parsed[0]?.values.price_min, "520000");
  assert.equal(parsed[0]?.sourceUrl, "https://nexo.example/10");
});

function project(
  projectId: string,
  agencyName: string,
  projectName: string,
  district: string,
  address: string,
  extra: Record<string, string> = {},
): NexoProjectReference {
  return {
    projectId,
    agencyName,
    projectName,
    district,
    address,
    sourceUrl: `https://nexo.example/${projectId}`,
    capturedAt: "2026-05-24T00:00:00.000Z",
    values: { project_id: projectId, agency_name: agencyName, project_name: projectName, district, address, ...extra },
  };
}

type ObservationOptions = Partial<Pick<WebObservation,
  | "observationId"
  | "district"
  | "agency"
  | "projectExternalId"
  | "expectedProjectName"
  | "matchClass"
  | "requiresHumanReview"
  | "extraction"
>>;

function observation(fields: ObservationField[], options: ObservationOptions = {}): WebObservation {
  return {
    observationId: options.observationId ?? "web-001",
    sourceId: "official-grupo-tyc",
    sourceUrl: "https://grupotyc.example/parque-central",
    capturedAt: "2026-09-08T18:00:00.000Z",
    contentSha256: "a".repeat(64),
    ...(options.district ? { district: options.district } : {}),
    ...(options.agency ? { agency: options.agency } : {}),
    ...(options.projectExternalId ? { projectExternalId: options.projectExternalId } : {}),
    ...(options.expectedProjectName ? { expectedProjectName: options.expectedProjectName } : {}),
    ...(options.matchClass ? { matchClass: options.matchClass } : {}),
    ...(options.requiresHumanReview !== undefined
      ? { requiresHumanReview: options.requiresHumanReview }
      : {}),
    ...(options.extraction ? { extraction: options.extraction } : {}),
    fields,
  };
}

function field(
  name: ObservationFieldName,
  value: string | number | string[],
  unit?: string,
): ObservationField {
  return {
    field: name,
    originalValue: value,
    normalizedValue: value,
    ...(unit ? { unit } : {}),
    locator: "fixture:test",
    confidence: "structured",
    reviewStatus: "unreviewed",
  };
}
