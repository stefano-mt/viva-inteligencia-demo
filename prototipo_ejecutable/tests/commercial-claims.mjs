import assert from "node:assert/strict";
import fs from "node:fs/promises";

const fixture = JSON.parse(await fs.readFile(new URL("./fixtures/commercial-claims.json", import.meta.url), "utf8"));
const publicData = JSON.parse(
  await fs.readFile(
    new URL("../public/demo-data/viva-platform-demo.json", import.meta.url),
    "utf8",
  ),
);
const inventory = await fs.readFile(
  new URL("../../.planning/phases/07-commercial-workspace/CLAIMS-INVENTORY.md", import.meta.url),
  "utf8",
);

const allSurfaces = [
  "#journey/scale",
  "#journey/geography",
  "#journey/quality",
  "#journey/depth",
  "#journey/movement",
  "#journey/decision",
  "#dashboard",
  "#projects",
  "#inspector",
  "#market",
  "#compare",
  "#trust",
  "#assistant",
  "#activity",
];

const expected = {
  C01: { routes: ["#journey/scale"], fixture: "contract-2.4-default", visibility: "mandatory", action: null },
  C02: { routes: ["#journey/geography"], fixture: "miraflores-district-default", visibility: "mandatory", action: null },
  C03: { routes: ["#dashboard"], fixture: "scenario-with-target", visibility: "mandatory", action: null },
  C04: { routes: ["#dashboard", "#projects"], fixture: "miraflores-district-default", visibility: "mandatory", action: null },
  C05: { routes: ["#projects"], fixture: "miraflores-district-default", visibility: "reachable", action: null },
  C06: { routes: ["#inspector/case/f3-ct-g-pardo"], fixture: "case:f3-ct-g-pardo", visibility: "mandatory", action: null },
  C07: { routes: ["#market"], fixture: "benchmark-2.4-default", visibility: "mandatory", action: null },
  C08: { routes: ["#market"], fixture: "benchmark-miraflores-default", visibility: "mandatory", action: null },
  C09: { routes: ["#compare"], fixture: "comparison-empty", visibility: "mandatory", action: "Seleccionar proyectos" },
  C10: { routes: ["#compare"], fixture: "comparison-selected", visibility: "reachable", action: null },
  C11: { routes: ["#activity"], fixture: "history-event-null-cause", visibility: "mandatory", action: null },
  C12: { routes: ["#assistant"], fixture: "assistant-six-block-response", visibility: "mandatory", action: null },
  C13: { routes: ["#assistant"], fixture: "assistant-six-block-response", visibility: "reachable", action: null },
  C14: { routes: ["#trust"], fixture: "checklist-blocked", visibility: "mandatory", action: null },
  C15: { routes: allSurfaces, fixture: "contract-2.0-global-error", visibility: "mandatory", action: "Reintentar" },
  C16: { routes: ["#journey/quality"], fixture: "contract-2.1", visibility: "mandatory", action: "Volver a geografía" },
  C17: { routes: ["#journey/depth"], fixture: "contract-2.2", visibility: "mandatory", action: "Revisar benchmark" },
  C18: { routes: ["#journey/movement"], fixture: "contract-2.3", visibility: "mandatory", action: "Volver a profundidad" },
  C19: { routes: ["#journey/decision"], fixture: "contract-2.4-decision-without-response", visibility: "mandatory", action: "Formular consulta en el asistente" },
  C20: { routes: ["#journey/scale"], fixture: "phase6-scale-missing-counts", visibility: "mandatory", action: null },
  C21: { routes: ["#journey/geography"], fixture: "phase6-geography-empty", visibility: "mandatory", action: "Ajustar escenario" },
  C22: { routes: ["#assistant"], fixture: "ct-f-insufficient-evidence", visibility: "mandatory", action: null },
  C23: { routes: allSurfaces, fixture: "global-fetch-error", visibility: "mandatory", action: "Reintentar" },
};

const claimKeys = [
  "assertions",
  "authority",
  "claim",
  "corrective_action",
  "fixture",
  "id",
  "qualifier",
  "routes",
  "visibility",
];
const ids = Object.keys(expected);
const validRoutes = new Set([...allSurfaces, "#inspector/case/f3-ct-g-pardo"]);

assert.deepEqual(Object.keys(fixture).sort(), ["all_surfaces", "claims", "schema_version"]);
assert.equal(fixture.schema_version, "1.0.0");
assert.deepEqual(fixture.all_surfaces, allSurfaces, "all_surfaces debe expandir literalmente las 14 rutas");
assert.equal(fixture.claims.length, 23);
assert.deepEqual(fixture.claims.map(({ id }) => id), ids, "C01–C23 deben estar completos y ordenados");
assert.equal(new Set(fixture.claims.map(({ id }) => id)).size, 23, "Los IDs deben ser únicos");

for (const claim of fixture.claims) {
  const contract = expected[claim.id];
  assert.ok(contract, `${claim.id}: claim inesperado`);
  assert.deepEqual(Object.keys(claim).sort(), claimKeys, `${claim.id}: shape fuera del contrato`);
  assert.deepEqual(claim.routes, contract.routes, `${claim.id}: rutas`);
  assert.equal(claim.fixture, contract.fixture, `${claim.id}: fixture`);
  assert.equal(claim.visibility, contract.visibility, `${claim.id}: visibilidad`);
  assert.equal(claim.corrective_action, contract.action, `${claim.id}: acción correctiva`);
  assert.ok(claim.routes.length > 0 && claim.routes.every((route) => validRoutes.has(route)), `${claim.id}: ruta no permitida`);
  assert.ok(claim.routes.every((route) => route.startsWith("#")), `${claim.id}: solo hashes exactos`);
  assert.equal(typeof claim.claim, "string");
  assert.ok(claim.claim.trim().length > 10, `${claim.id}: claim vacío`);
  assert.equal(typeof claim.qualifier, "string");
  assert.ok(claim.qualifier.trim().length > 10, `${claim.id}: qualifier vacío`);
  assert.equal(typeof claim.authority, "string");
  assert.ok(claim.authority.trim().length > 3, `${claim.id}: authority vacía`);
  assert.ok(Array.isArray(claim.assertions) && claim.assertions.length > 0, `${claim.id}: assertions vacías`);
  assert.ok(claim.assertions.every((assertion) => typeof assertion === "string" && assertion.length > 2));
  assert.match(inventory, new RegExp(`^\\| ${claim.id} \\|`, "mu"), `${claim.id}: falta en CLAIMS-INVENTORY.md`);
}

const byId = new Map(fixture.claims.map((claim) => [claim.id, claim]));
assert.match(`${byId.get("C01").claim} ${byId.get("C01").qualifier}`, /184.*30\/22\/5|184.*30.*22.*5/u);
assert.match(`${byId.get("C02").claim} ${byId.get("C02").qualifier}`, /90.*85.*5.*no reconciliados/iu);
assert.doesNotMatch(`${byId.get("C02").claim} ${byId.get("C02").qualifier}`, /5 fuera/iu);
for (const value of ["104.15", "53.37", "50.78"]) assert.match(byId.get("C06").claim, new RegExp(value.replace(".", "\\."), "u"));
assert.match(byId.get("C08").claim, /69.*68.*0/u);
assert.match(byId.get("C11").qualifier, /causa no fue observada|causa no observada/iu);
assert.match(byId.get("C15").qualifier, /capability_unavailable/u);
assert.match(byId.get("C20").claim, /No disponible/u);
assert.match(`${byId.get("C22").claim} ${byId.get("C22").qualifier}`, /precio real de cierre.*no se inventa/iu);

// El fixture protege cómo se expresa cada claim, pero nunca sustituye a la
// autoridad pública. Estas comprobaciones hacen fallar el contrato cuando las
// cifras o las exclusiones dejan de coincidir con el dataset publicado.
assert.equal(publicData.metadata.contract_version, "2.4.0", "C01/C07: contrato público vigente");
assert.equal(publicData.metadata.counts.canonical_agencies, 184, "C01: agencias canónicas");
assert.deepEqual(
  {
    base: publicData.pilot.counts.base_count,
    enriched: publicData.pilot.counts.enriched_count,
    deep: publicData.pilot.counts.deep_count,
  },
  { base: 30, enriched: 22, deep: 5 },
  "C01: niveles anidados del piloto",
);

const miraflores = publicData.geography.districts.find(
  ({ district_id: districtId }) => districtId === "150122",
);
assert.ok(miraflores, "C02: Miraflores debe existir en la autoridad geográfica");
assert.deepEqual(
  {
    observed: miraflores.observed_project_count,
    comparable: miraflores.authoritative_project_count,
    unreconciled: miraflores.unreconciled_project_count,
  },
  { observed: 90, comparable: 85, unreconciled: 5 },
  "C02: cobertura geográfica autoritativa",
);

const pardoCase = publicData.inspector.cases.find(
  ({ case_id: caseId }) => caseId === "case:f3-ct-g-pardo",
);
assert.ok(pardoCase, "C06: el caso Pardo debe existir");
assert.equal(pardoCase.expected_quality_status, "inconsistent", "C06: calidad del caso");
assert.equal(pardoCase.expected_benchmark_eligible, false, "C06: exclusión del benchmark");
const factById = new Map(publicData.model.facts.map((fact) => [fact.fact_id, fact]));
for (const [factId, expectedValue] of [
  ["fact:pardo-coast-card-area", 104.15],
  ["fact:pardo-coast-plan-area", 53.37],
  ["fact:pardo-coast-area-delta", 50.78],
]) {
  const fact = factById.get(factId);
  assert.ok(fact, `C06: falta ${factId}`);
  assert.equal(fact.normalized_value, expectedValue, `C06: valor de ${factId}`);
  assert.equal(fact.benchmark_eligible, false, `C06: elegibilidad de ${factId}`);
}

const mirafloresProjectIds = miraflores.quadrants.flatMap(
  ({ authoritative_project_ids: projectIds }) => projectIds,
);
const priceCoverage = publicData.benchmark.coverage.indicators.price_per_m2_total;
const mirafloresExcluded = priceCoverage.excluded_projects.filter(
  ({ project_id: projectId }) => mirafloresProjectIds.includes(projectId),
);
assert.deepEqual(
  {
    raw: mirafloresExcluded.length,
    indicative: mirafloresExcluded.filter(({ reasons }) =>
      reasons.includes("price_area_link_unresolved"),
    ).length,
    eligible: priceCoverage.used_project_ids.filter((projectId) =>
      mirafloresProjectIds.includes(projectId),
    ).length,
  },
  { raw: 69, indicative: 68, eligible: 0 },
  "C08: partición autoritativa del benchmark de Miraflores",
);

assert.ok(publicData.history.events.length > 0, "C11: debe existir histórico público");
assert.ok(
  publicData.history.events.every(
    (event) => event.cause === null && event.cause_evidence_ids.length === 0,
  ),
  "C11: una causa no observada no puede materializarse como causalidad",
);

console.log("Commercial claims OK: C01–C23 materializados y trazados contra autoridades públicas; 14 rutas, visibilidad y acciones congeladas.");
