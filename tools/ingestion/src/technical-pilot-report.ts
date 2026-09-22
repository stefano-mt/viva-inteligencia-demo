import { createHash } from "node:crypto";
import {
  canonicalJsonSha256,
  containsPii,
  type BatchManifest,
  type StagingDocument,
} from "./official-web-refresh.js";
import { assertObservation } from "./reconcile-official-webs.js";
import type {
  FieldComparison,
  MatchDecision,
  ReconciliationDocument,
} from "./reconcile-observations.js";
import type { ObservationFieldName } from "./extractors/index.js";

const FIELD_NAMES = new Set<ObservationFieldName>([
  "project_name",
  "agency_name",
  "address",
  "published_price",
  "currency",
  "area",
  "bedrooms",
  "bathrooms",
  "amenities",
  "availability",
  "delivery_date",
  "typologies",
  "financing_banks",
  "published_at",
]);

const PILOT_AUTHORIZATION_SCOPE_NOTE = "La autorización del Product Owner otorgada en esta conversación cubre solo esta prueba técnica no publicable; no autoriza recolección productiva, publicación ni reutilización." as const;

export interface SuppressedFieldRule {
  field: ObservationFieldName;
  reason: string;
}

export interface PilotReportPolicy {
  sourceId: string;
  projectExternalId: string;
  reportAllowedFields: ObservationFieldName[];
  suppressedFields: SuppressedFieldRule[];
}

export interface TechnicalPilotDefinition {
  registryVersion: string;
  pilot: {
    pilotId: string;
    purpose: "technical_feasibility";
    authorizationReference: string;
    authorizationScopeNote: typeof PILOT_AUTHORIZATION_SCOPE_NOTE;
    publishable: false;
    rawHtmlStored: false;
    piiStored: false;
    maximumRunsPerTarget: 2;
    runPlan: [
      { sequence: 1; phase: "calibration" },
      { sequence: 2; phase: "validation" },
    ];
    reportPolicies: PilotReportPolicy[];
  };
  sources: Array<{
    sourceId: string;
    sourceClass: "official_project_website";
    reviewStatus: "pending";
    robotsStatus: "unknown";
    pilotAuthorization: {
      reference: string;
      approvedAt: string;
      approvedByRole: "product_owner";
      status: "approved";
      purpose: "technical_feasibility";
      allowedPaths: string[];
    };
    candidateTargets: Array<{
      url: string;
      projectExternalId?: string;
    }>;
    collection: {
      targets: unknown[];
    };
  }>;
}

export interface TechnicalPilotReport {
  schemaVersion: "1.0.0";
  pilotId: string;
  purpose: "technical_feasibility";
  publishable: false;
  rawHtmlStored: false;
  piiStored: false;
  runId: string;
  generatedAt: string;
  sourceId: string;
  projectExternalId: string;
  sourceUrl?: string;
  result: "feasible" | "partially_feasible" | "not_demonstrated";
  collection: {
    requests: number;
    redirects: number;
    targetStatus: string;
    extractedFieldCount: number;
  };
  reconciliation: {
    matchStatus: MatchDecision["status"] | "not_available";
    reasonCodes: string[];
    matchedProjectId?: string;
    reportedComparisons: FieldComparison[];
    suppressedFindings: Array<{
      field: ObservationFieldName;
      reason: string;
      observedComparisonStatus: FieldComparison["status"];
    }>;
  };
  limitations: string[];
  sha256: string;
}

export interface TechnicalPilotArtifacts {
  staging: StagingDocument;
  manifest: BatchManifest;
}

export function parseTechnicalPilotDefinition(raw: string): TechnicalPilotDefinition {
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("TECHNICAL_PILOT_REGISTRY_INVALID: JSON inválido.");
  }
  if (!isObject(value) || !isObject(value.pilot) || !Array.isArray(value.sources)) {
    throw new Error("TECHNICAL_PILOT_REGISTRY_INVALID: Falta el contrato superior del piloto.");
  }
  assertExactKeys(value, ["registryVersion", "pilot", "sources"], "contrato superior");
  const pilot = value.pilot;
  assertExactKeys(pilot, [
    "pilotId",
    "purpose",
    "authorizationReference",
    "authorizationScopeNote",
    "publishable",
    "rawHtmlStored",
    "piiStored",
    "maximumRunsPerTarget",
    "runPlan",
    "reportPolicies",
  ], "pilot");
  if (typeof value.registryVersion !== "string" || !value.registryVersion.startsWith("pilot-")
    || typeof pilot.pilotId !== "string" || !pilot.pilotId.trim()
    || pilot.purpose !== "technical_feasibility"
    || typeof pilot.authorizationReference !== "string" || !pilot.authorizationReference.trim()
    || pilot.authorizationScopeNote !== PILOT_AUTHORIZATION_SCOPE_NOTE
    || pilot.publishable !== false
    || pilot.rawHtmlStored !== false
    || pilot.piiStored !== false
    || pilot.maximumRunsPerTarget !== 2
    || !isExactPilotRunPlan(pilot.runPlan)
    || !Array.isArray(pilot.reportPolicies)
    || pilot.reportPolicies.length === 0) {
    throw new Error("TECHNICAL_PILOT_REGISTRY_INVALID: Los controles del piloto no son fail-closed.");
  }
  if (containsPii(JSON.stringify(pilot))) {
    throw new Error("TECHNICAL_PILOT_REGISTRY_INVALID: La definición contiene datos de contacto.");
  }

  const sourceIds = new Set<string>();
  for (const [index, source] of value.sources.entries()) {
    if (!isObject(source) || typeof source.sourceId !== "string" || !source.sourceId.trim()
      || source.sourceClass !== "official_project_website"
      || source.reviewStatus !== "pending"
      || source.robotsStatus !== "unknown"
      || !isObject(source.pilotAuthorization)
      || source.pilotAuthorization.reference !== pilot.authorizationReference
      || source.pilotAuthorization.approvedByRole !== "product_owner"
      || source.pilotAuthorization.status !== "approved"
      || source.pilotAuthorization.purpose !== "technical_feasibility"
      || !Array.isArray(source.pilotAuthorization.allowedPaths)
      || source.pilotAuthorization.allowedPaths.length !== 1
      || !Array.isArray(source.candidateTargets)
      || source.candidateTargets.length !== 1
      || !isObject(source.collection)
      || !Array.isArray(source.collection.targets)
      || source.collection.targets.length !== 0) {
      throw new Error(`TECHNICAL_PILOT_REGISTRY_INVALID: Fuente ${index + 1} fuera del alcance puntual.`);
    }
    const sourceId = source.sourceId.trim();
    if (sourceIds.has(sourceId)) {
      throw new Error(`TECHNICAL_PILOT_REGISTRY_INVALID: Fuente duplicada ${sourceId}.`);
    }
    sourceIds.add(sourceId);
    const target = source.candidateTargets[0];
    if (!isObject(target) || typeof target.url !== "string" || typeof target.projectExternalId !== "string") {
      throw new Error(`TECHNICAL_PILOT_REGISTRY_INVALID: Target de ${sourceId} incompleto.`);
    }
    const url = publicUrl(target.url);
    if (source.pilotAuthorization.allowedPaths[0] !== url.pathname) {
      throw new Error(`TECHNICAL_PILOT_REGISTRY_INVALID: La ruta de ${sourceId} no coincide con su autorización.`);
    }
  }

  const policySourceIds = new Set<string>();
  for (const [index, item] of pilot.reportPolicies.entries()) {
    if (!isObject(item)) {
      throw new Error(`TECHNICAL_PILOT_REGISTRY_INVALID: Política ${index + 1} inválida.`);
    }
    assertExactKeys(item, ["sourceId", "projectExternalId", "reportAllowedFields", "suppressedFields"], `reportPolicies[${index}]`);
    if (typeof item.sourceId !== "string" || !sourceIds.has(item.sourceId)
      || typeof item.projectExternalId !== "string" || !item.projectExternalId.trim()
      || !Array.isArray(item.reportAllowedFields) || item.reportAllowedFields.length === 0
      || !Array.isArray(item.suppressedFields)) {
      throw new Error(`TECHNICAL_PILOT_REGISTRY_INVALID: Política ${index + 1} incompleta.`);
    }
    if (policySourceIds.has(item.sourceId)) {
      throw new Error(`TECHNICAL_PILOT_REGISTRY_INVALID: Política duplicada para ${item.sourceId}.`);
    }
    policySourceIds.add(item.sourceId);
    const target = value.sources.find((source) => isObject(source) && source.sourceId === item.sourceId)?.candidateTargets?.[0];
    if (!isObject(target) || target.projectExternalId !== item.projectExternalId) {
      throw new Error(`TECHNICAL_PILOT_REGISTRY_INVALID: El proyecto de ${item.sourceId} no coincide con el target.`);
    }
    const allowed = new Set<ObservationFieldName>();
    for (const field of item.reportAllowedFields) {
      if (typeof field !== "string" || !FIELD_NAMES.has(field as ObservationFieldName) || allowed.has(field as ObservationFieldName)) {
        throw new Error(`TECHNICAL_PILOT_REGISTRY_INVALID: Campo permitido inválido en ${item.sourceId}.`);
      }
      allowed.add(field as ObservationFieldName);
    }
    const suppressed = new Set<ObservationFieldName>();
    for (const rule of item.suppressedFields) {
      if (!isObject(rule) || typeof rule.field !== "string" || !FIELD_NAMES.has(rule.field as ObservationFieldName)
        || typeof rule.reason !== "string" || !/^[A-Z][A-Z0-9_]+$/u.test(rule.reason)
        || suppressed.has(rule.field as ObservationFieldName)
        || allowed.has(rule.field as ObservationFieldName)) {
        throw new Error(`TECHNICAL_PILOT_REGISTRY_INVALID: Supresión inválida en ${item.sourceId}.`);
      }
      suppressed.add(rule.field as ObservationFieldName);
    }
    if (allowed.size + suppressed.size !== FIELD_NAMES.size) {
      throw new Error(`TECHNICAL_PILOT_REGISTRY_INVALID: La política de ${item.sourceId} no clasifica todos los campos.`);
    }
  }
  if (policySourceIds.size !== sourceIds.size) {
    throw new Error("TECHNICAL_PILOT_REGISTRY_INVALID: Cada fuente requiere una política de reporte.");
  }
  return value as unknown as TechnicalPilotDefinition;
}

function isExactPilotRunPlan(value: unknown): boolean {
  if (!Array.isArray(value) || value.length !== 2) return false;
  const expected = [
    { sequence: 1, phase: "calibration" },
    { sequence: 2, phase: "validation" },
  ] as const;
  return value.every((item, index) => {
    const planned = expected[index];
    return isObject(item)
      && Object.keys(item).length === 2
      && Object.hasOwn(item, "sequence")
      && Object.hasOwn(item, "phase")
      && item.sequence === planned?.sequence
      && item.phase === planned?.phase;
  });
}

export function parseTechnicalPilotArtifacts(
  definition: TechnicalPilotDefinition,
  stagingRaw: string,
  manifestRaw: string,
): TechnicalPilotArtifacts {
  const staging = parseObject(stagingRaw, "staging");
  assertExactKeys(staging, [
    "schemaVersion",
    "runId",
    "generatedAt",
    "registryVersion",
    "mode",
    "publishable",
    "pilotAuthorizationReference",
    "sourceObservations",
  ], "staging del piloto");
  if (staging.schemaVersion !== "pilot-1.0.0"
    || typeof staging.runId !== "string" || !staging.runId.trim()
    || typeof staging.generatedAt !== "string" || !Number.isFinite(Date.parse(staging.generatedAt))
    || staging.registryVersion !== definition.registryVersion
    || staging.mode !== "technical-pilot"
    || staging.publishable !== false
    || staging.pilotAuthorizationReference !== definition.pilot.authorizationReference
    || !Array.isArray(staging.sourceObservations)
    || staging.sourceObservations.length !== 1) {
    throw new Error("TECHNICAL_PILOT_ARTIFACT_INVALID: El staging no acredita un piloto puntual no publicable.");
  }
  const group = staging.sourceObservations[0];
  if (!isObject(group)) throw new Error("TECHNICAL_PILOT_ARTIFACT_INVALID: Grupo de observaciones inválido.");
  assertExactKeys(group, ["sourceId", "label", "sourceClass", "observations"], "grupo del piloto");
  if (typeof group.sourceId !== "string"
    || !definition.sources.some((source) => source.sourceId === group.sourceId)
    || typeof group.label !== "string"
    || group.sourceClass !== "official_project_website"
    || !Array.isArray(group.observations)
    || group.observations.length > 1) {
    throw new Error("TECHNICAL_PILOT_ARTIFACT_INVALID: El staging contiene una fuente o cardinalidad no autorizada.");
  }
  for (const [index, observation] of group.observations.entries()) {
    assertObservation(observation, 0, index);
    if (observation.sourceId !== group.sourceId) {
      throw new Error("TECHNICAL_PILOT_ARTIFACT_INVALID: La observación no pertenece a la fuente del piloto.");
    }
  }
  if (containsPii(JSON.stringify([group.sourceId, group.label, group.sourceClass]))) {
    throw new Error("TECHNICAL_PILOT_ARTIFACT_INVALID: El staging contiene datos de contacto.");
  }

  const manifest = parseObject(manifestRaw, "manifest");
  assertExactKeys(manifest, [
    "manifestVersion",
    "runId",
    "generatedAt",
    "registryReference",
    "registrySha256",
    "registryVersion",
    "mode",
    "publishable",
    "pilotAuthorizationReference",
    "filters",
    "controls",
    "counts",
    "sources",
    "targets",
    "stagingSha256",
  ], "manifiesto del piloto");
  if (manifest.manifestVersion !== "pilot-1.0.0"
    || manifest.runId !== staging.runId
    || manifest.generatedAt !== staging.generatedAt
    || manifest.registryVersion !== definition.registryVersion
    || manifest.mode !== "technical-pilot"
    || manifest.publishable !== false
    || manifest.pilotAuthorizationReference !== definition.pilot.authorizationReference
    || manifest.registrySha256 !== canonicalJsonSha256(definition)
    || manifest.stagingSha256 !== createHash("sha256").update(stagingRaw).digest("hex")
    || !isObject(manifest.controls)
    || manifest.controls.policyGateBeforeNetwork !== true
    || manifest.controls.robotsEnforced !== true
    || manifest.controls.retries !== 0
    // The pilot always contains exactly one target. A configured worker ceiling of two
    // therefore still has an effective concurrency of one for this artifact. Keep the
    // ceiling bounded so the same validator cannot be reused to justify a wider crawl.
    || !Number.isInteger(manifest.controls.concurrency)
    || manifest.controls.concurrency < 1
    || manifest.controls.concurrency > 2
    || !isObject(manifest.counts)
    || !Array.isArray(manifest.sources) || manifest.sources.length !== 1
    || !Array.isArray(manifest.targets) || manifest.targets.length !== 1) {
    throw new Error("TECHNICAL_PILOT_ARTIFACT_INVALID: El manifiesto no coincide con el staging o debilitó controles.");
  }
  const sourceAudit = manifest.sources[0];
  const targetAudit = manifest.targets[0];
  if (!isObject(sourceAudit) || sourceAudit.sourceId !== group.sourceId || sourceAudit.selectedTargets !== 1
    || !isObject(sourceAudit.decision) || sourceAudit.decision.allowed !== true
    || sourceAudit.decision.code !== "PILOT_COLLECTION_ALLOWED"
    || !isObject(targetAudit) || targetAudit.sourceId !== group.sourceId
    || targetAudit.projectExternalId !== definition.pilot.reportPolicies
      .find((item) => item.sourceId === group.sourceId)?.projectExternalId
    || !["collected", "collected_empty", "robots_blocked", "failed"].includes(String(targetAudit.status))) {
    throw new Error("TECHNICAL_PILOT_ARTIFACT_INVALID: La auditoría no corresponde a un único target autorizado.");
  }
  const source = definition.sources.find((item) => item.sourceId === group.sourceId)!;
  const candidate = source.candidateTargets[0]!;
  if (targetAudit.url !== candidate.url || !source.pilotAuthorization.allowedPaths.includes(publicUrl(targetAudit.url).pathname)) {
    throw new Error("TECHNICAL_PILOT_ARTIFACT_INVALID: La URL ejecutada no coincide con el target exacto autorizado.");
  }
  const observations = group.observations;
  const collected = targetAudit.status === "collected" || targetAudit.status === "collected_empty";
  if ((collected && observations.length !== 1) || (!collected && observations.length !== 0)
    || (observations[0] && (observations[0].sourceUrl !== targetAudit.url
      || observations[0].projectExternalId !== targetAudit.projectExternalId
      || observations[0].contentSha256 !== targetAudit.contentSha256))) {
    throw new Error("TECHNICAL_PILOT_ARTIFACT_INVALID: El target y su observación no tienen correspondencia uno-a-uno.");
  }
  const counts = manifest.counts;
  if (counts.selectedSources !== 1 || counts.selectedTargets !== 1 || counts.eligibleTargets !== 1
    || counts.policyBlockedTargets !== 0 || counts.plannedTargets !== 0
    || counts.collectedTargets !== (collected ? 1 : 0)
    || counts.robotsBlockedTargets !== (targetAudit.status === "robots_blocked" ? 1 : 0)
    || counts.failedTargets !== (targetAudit.status === "failed" ? 1 : 0)
    || counts.observations !== observations.length
    || counts.observationFields !== observations.reduce((total, item) => total + item.fields.length, 0)
    || counts.networkRequests < 1 || counts.networkRequests > 5
    || counts.redirectsFollowed < 0 || counts.redirectsFollowed > 3) {
    throw new Error("TECHNICAL_PILOT_ARTIFACT_INVALID: Los conteos del piloto son incoherentes.");
  }
  if (containsPii(JSON.stringify([
    sourceAudit.sourceId,
    sourceAudit.decision.reason,
    targetAudit.sourceId,
    targetAudit.url,
    targetAudit.district,
    targetAudit.agency,
    targetAudit.projectExternalId,
    targetAudit.expectedProjectName,
    targetAudit.code,
    targetAudit.extractorArchetypes,
    targetAudit.extractionIssueCodes,
    manifest.filters,
  ]))) {
    throw new Error("TECHNICAL_PILOT_ARTIFACT_INVALID: El manifiesto contiene datos de contacto.");
  }
  return {
    staging: staging as unknown as StagingDocument,
    manifest: manifest as unknown as BatchManifest,
  };
}

export function buildTechnicalPilotReport(
  definition: TechnicalPilotDefinition,
  manifest: BatchManifest,
  reconciliation: ReconciliationDocument,
): TechnicalPilotReport {
  if (manifest.mode !== "technical-pilot" || manifest.publishable !== false
    || manifest.manifestVersion !== "pilot-1.0.0"
    || manifest.pilotAuthorizationReference !== definition.pilot.authorizationReference) {
    throw new Error("TECHNICAL_PILOT_REPORT_INVALID: El manifiesto no pertenece a un piloto no publicable.");
  }
  if (manifest.runId !== reconciliation.sourceRunId) {
    throw new Error("TECHNICAL_PILOT_REPORT_INVALID: El manifiesto y la conciliación pertenecen a corridas distintas.");
  }
  if (manifest.sources.length !== 1 || manifest.targets.length !== 1) {
    throw new Error("TECHNICAL_PILOT_REPORT_INVALID: Cada reporte admite exactamente una fuente y un target.");
  }
  const sourceId = manifest.sources[0]?.sourceId ?? "";
  const policy = definition.pilot.reportPolicies.find((item) => item.sourceId === sourceId);
  if (!policy) throw new Error(`TECHNICAL_PILOT_REPORT_INVALID: No existe política para ${sourceId}.`);
  const target = manifest.targets[0];
  if (!target || target.sourceId !== sourceId || target.projectExternalId !== policy.projectExternalId) {
    throw new Error("TECHNICAL_PILOT_REPORT_INVALID: El target no coincide con el proyecto del piloto.");
  }
  const sourceMatches = reconciliation.matches.filter((match) => match.sourceId === sourceId);
  if (sourceMatches.length > 1) {
    throw new Error("TECHNICAL_PILOT_REPORT_INVALID: El piloto produjo más de una decisión de matching.");
  }
  const match = sourceMatches[0];
  const reconciled = match?.matchedProjectId
    ? reconciliation.reconciliations.find((item) => item.observationId === match.observationId)
    : undefined;
  const allowed = new Set(policy.reportAllowedFields);
  const suppression = new Map(policy.suppressedFields.map((item) => [item.field, item.reason]));
  const comparisons = reconciled?.comparisons ?? [];
  const reportedComparisons = comparisons.filter((item) => allowed.has(item.field));
  const suppressedFindings = comparisons.flatMap((item) => {
    const reason = suppression.get(item.field);
    return reason ? [{ field: item.field, reason, observedComparisonStatus: item.status }] : [];
  });
  const unclassified = comparisons.filter((item) => !allowed.has(item.field) && !suppression.has(item.field));
  if (unclassified.length > 0) {
    throw new Error(`TECHNICAL_PILOT_REPORT_INVALID: Campos sin política: ${unclassified.map((item) => item.field).join(",")}.`);
  }
  const collectionSucceeded = target.status === "collected" && manifest.counts.failedTargets === 0;
  const reconciliationSucceeded = match?.status === "auto_matched" && match.matchedProjectId === policy.projectExternalId;
  const result: TechnicalPilotReport["result"] = collectionSucceeded && reconciliationSucceeded && reportedComparisons.length > 0
    ? "feasible"
    : target.status === "collected" || target.status === "collected_empty"
      ? "partially_feasible"
      : "not_demonstrated";
  const matchStatus: TechnicalPilotReport["reconciliation"]["matchStatus"] = match?.status ?? "not_available";
  const payload = {
    schemaVersion: "1.0.0" as const,
    pilotId: definition.pilot.pilotId,
    purpose: "technical_feasibility" as const,
    publishable: false as const,
    rawHtmlStored: false as const,
    piiStored: false as const,
    runId: manifest.runId,
    generatedAt: manifest.generatedAt,
    sourceId,
    projectExternalId: policy.projectExternalId,
    ...(match?.sourceUrl ? { sourceUrl: match.sourceUrl } : {}),
    result,
    collection: {
      requests: manifest.counts.networkRequests,
      redirects: manifest.counts.redirectsFollowed,
      targetStatus: target.status,
      extractedFieldCount: target.fieldCount,
    },
    reconciliation: {
      matchStatus,
      reasonCodes: [...(match?.reasonCodes ?? [])],
      ...(match?.matchedProjectId ? { matchedProjectId: match.matchedProjectId } : {}),
      reportedComparisons,
      suppressedFindings,
    },
    limitations: [
      "La salida demuestra factibilidad técnica y no constituye un dataset publicable.",
      "Los valores permanecen como observaciones separadas; la web oficial no sobrescribe Nexo.",
      "Los precios vencidos o no asociados inequívocamente al proyecto se suprimen del reporte.",
      "No se almacena HTML crudo ni información de formularios o contacto.",
    ],
  };
  const serialized = stableStringify(payload);
  if (containsPii(serialized)) {
    throw new Error("TECHNICAL_PILOT_REPORT_INVALID: El reporte contiene datos de contacto.");
  }
  return {
    ...payload,
    sha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

function publicUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("TECHNICAL_PILOT_REGISTRY_INVALID: URL inválida.");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("TECHNICAL_PILOT_REGISTRY_INVALID: La URL debe ser HTTPS y no contener credenciales ni parámetros.");
  }
  return url;
}

function parseObject(raw: string, label: string): Record<string, any> {
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    throw new Error(`TECHNICAL_PILOT_ARTIFACT_INVALID: ${label} no contiene JSON válido.`);
  }
  if (!isObject(value)) {
    throw new Error(`TECHNICAL_PILOT_ARTIFACT_INVALID: ${label} no contiene un objeto JSON.`);
  }
  return value;
}

function assertExactKeys(value: Record<string, unknown>, keys: string[], label: string): void {
  const expected = [...keys].sort();
  const actual = Object.keys(value).sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`TECHNICAL_PILOT_REGISTRY_INVALID: ${label} contiene claves desconocidas o incompletas.`);
  }
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (isObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
