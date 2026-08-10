import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  dispatchScenario,
  initializeScenarioData,
  state,
} from "../public/js/state.js";
import {
  buildComparisonViewModel,
  renderCompare,
} from "../public/js/views/compare.js";

const data = JSON.parse(
  await fs.readFile(
    new URL("../public/demo-data/viva-platform-demo.json", import.meta.url),
    "utf8",
  ),
);
const source = await fs.readFile(
  new URL("../public/js/views/compare.js", import.meta.url),
  "utf8",
);
const styles = await fs.readFile(
  new URL("../public/styles/57-comparison.css", import.meta.url),
  "utf8",
);

function geographyArtifact(payload = data) {
  return {
    status: "valid",
    geojson: { type: "FeatureCollection", features: [] },
    url: "demo-data/district-boundaries.geojson",
    expected_sha256: payload.geography.boundary_artifact_sha256,
    actual_sha256: payload.geography.boundary_artifact_sha256,
    reason: null,
  };
}

function stateSnapshot() {
  return JSON.stringify({
    scenario: state.scenario,
    scenarioContext: state.scenarioContext,
    benchmarkContext: state.benchmarkContext,
    compareProjectIds: state.compareProjectIds,
    compareIncludeTarget: state.compareIncludeTarget,
    compareQuery: state.compareQuery,
  });
}

function renderWithoutMutation(label) {
  const before = stateSnapshot();
  const markup = renderCompare();
  assert.equal(stateSnapshot(), before, `${label}: render must be pure`);
  return markup;
}

function rowDomId(rowId) {
  return `comparison-row-${String(rowId)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

assert.doesNotMatch(
  source,
  /from\s+["']\.\/projects\.js["']/u,
  "the comparison view must not import another view",
);
assert.doesNotMatch(
  source,
  /state\.compareProjectIds\s*=/u,
  "rendering must not repair or mutate comparison state",
);
assert.match(source, /buildComparisonModel/u);

initializeScenarioData(data, { geographyArtifact: geographyArtifact() });
const baselineBenchmark = structuredClone(state.benchmarkContext);
const canonicalIds = baselineBenchmark.projectSummaries.map(
  ({ projectId }) => projectId,
);

const defaultMarkup = renderWithoutMutation("default legacy selection");
const defaultModel = buildComparisonViewModel();
assert.equal(defaultModel.status, "ready");
assert.equal(defaultModel.selected.length, 3);
assert.match(defaultMarkup, /data-comparison-status="ready"/u);
assert.match(defaultMarkup, /Comparador comercial/u);
assert.match(defaultMarkup, /Qué cambia la decisión/u);
assert.match(defaultMarkup, /Condición principal/u);
assert.match(defaultMarkup, /Matriz completa/u);
assert.match(defaultMarkup, /comparison-decision-sheet/u);
assert.match(defaultMarkup, /comparison-basis__summary/u);
assert.doesNotMatch(defaultMarkup, /comparison-priority/u);
assert.equal(
  (defaultMarkup.match(/data-comparison-group=/gu) ?? []).length,
  9,
  "the matrix must preserve the nine domain groups",
);
assert.match(defaultMarkup, /Precio publicado desde/u);
assert.match(defaultMarkup, /Área total/u);
assert.match(defaultMarkup, /Unidades reportadas/u);
assert.match(defaultMarkup, /Atributos anunciados/u);
assert.match(defaultMarkup, /Acabados documentados/u);
assert.match(defaultMarkup, /Estacionamientos reportados/u);
assert.match(defaultMarkup, /Fuentes y confianza/u);
assert.match(defaultMarkup, /Observado|Excluido|No informado/u);
assert.match(defaultMarkup, /Ver datos y evidencia/u);
assert.doesNotMatch(defaultMarkup, /precios? reales? de cierre/iu);
assert.doesNotMatch(defaultMarkup, /benchmark certificado/iu);
assert.doesNotMatch(defaultMarkup, /amenities verificados/iu);
assert.doesNotMatch(defaultMarkup, /Exportar/u);

assert.ok(defaultModel.conclusion.length <= 3);
for (const finding of defaultModel.conclusion) {
  assert.match(
    defaultMarkup,
    new RegExp(
      `data-comparison-row-target="${finding.rowId.replaceAll(".", "\\.")}"`,
      "u",
    ),
  );
  assert.match(defaultMarkup, new RegExp(`id="${rowDomId(finding.rowId)}"`, "u"));
  assert.match(defaultMarkup, /Para la decisión/u);
  assert.match(defaultMarkup, /Qué revisar/u);
  assert.match(defaultMarkup, /Límite de este hallazgo/u);
}

for (const [count, expectedStatus, expectedCopy] of [
  [0, "insufficient", "Selecciona dos proyectos para comenzar"],
  [1, "insufficient", "Selecciona un proyecto más"],
  [2, "ready", "Matriz completa"],
  [3, "ready", "Matriz completa"],
]) {
  state.compareProjectIds = canonicalIds.slice(0, count);
  const model = buildComparisonViewModel();
  const markup = renderWithoutMutation(`${count} selected projects`);
  assert.equal(model.status, expectedStatus);
  assert.ok(markup.includes(expectedCopy));
  if (count < 2) {
    assert.doesNotMatch(markup, /data-comparison-row-target=/u);
  }
}

state.compareProjectIds = [canonicalIds[0], "project:outside-scope", canonicalIds[1]];
const invalidSelectionBefore = structuredClone(state.compareProjectIds);
const correctedModel = buildComparisonViewModel();
const correctedMarkup = renderWithoutMutation("invalid selection");
assert.deepEqual(state.compareProjectIds, invalidSelectionBefore);
assert.deepEqual(correctedModel.removedProjectIds, ["project:outside-scope"]);
assert.match(correctedMarkup, /Se retiraron 1 selecciones fuera del escenario/u);

state.compareProjectIds = canonicalIds.slice(0, 3);
dispatchScenario({
  type: "APPLY_PRODUCT_FILTERS",
  patch: { target_area_m2: 80, target_price_pen: 650000 },
});
state.compareIncludeTarget = true;
const vivaModel = buildComparisonViewModel();
const vivaMarkup = renderWithoutMutation("three projects plus Viva");
assert.equal(vivaModel.status, "ready");
assert.equal(vivaModel.selected.length, 4);
assert.equal(vivaModel.selected.at(-1).projectId, "target:viva");
assert.equal(vivaModel.selected.at(-1).simulated, true);
assert.match(vivaMarkup, /Escenario Viva/u);
assert.match(vivaMarkup, /Simulado|Derivado/u);
assert.match(vivaMarkup, /Quitar escenario Viva/u);
assert.match(vivaMarkup, /aria-pressed="true"/u);

const ctG = state.benchmarkContext.projectSummaries.find(
  ({ projectId, inspectorPath, attributes }) =>
    projectId === "project:nexo-2951" &&
    inspectorPath &&
    attributes.length,
);
assert.ok(ctG, "CT-G must expose authorized inspector evidence");
assert.ok(
  state.benchmarkContext.quantitative.pricePerM2Total.coverage.excludedProjects.some(
    ({ projectId, reasons }) =>
      projectId === ctG.projectId && reasons.includes("blocking_issue"),
  ),
  "CT-G must remain excluded from the quantitative benchmark",
);
state.compareIncludeTarget = false;
state.compareProjectIds = [ctG.projectId, canonicalIds.find((id) => id !== ctG.projectId)];
const ctGMarkup = renderWithoutMutation("CT-G excluded value");
assert.ok(ctGMarkup.includes(ctG.projectId));
assert.ok(ctGMarkup.includes(ctG.inspectorPath.replaceAll("&", "&amp;")));
assert.match(ctGMarkup, /Atributos anunciados/u);
assert.match(ctGMarkup, /Abrir inspector de evidencia/u);

const restrictedContext = structuredClone(baselineBenchmark);
const restrictedId = restrictedContext.projectSummaries[0].projectId;
const restrictedSummary = restrictedContext.projectSummaries[0];
for (const field of [
  "publishedPrice",
  "totalArea",
  "pricePerM2",
  "reportedUnits",
  "parking",
]) {
  restrictedSummary[field] = {
    state: "unknown",
    normalizedValue: null,
    originalValue: null,
    unit: null,
    currency: null,
    factId: null,
    confidence: null,
    exclusionReason: "restricted",
  };
}
restrictedSummary.district = null;
restrictedSummary.deliveryStatus = null;
restrictedSummary.attributes = [];
restrictedSummary.source = null;
restrictedSummary.inspectorPath = "#inspector/restricted-secret";
state.benchmarkContext = restrictedContext;
state.compareProjectIds = [restrictedId, canonicalIds[1]];
const restrictedMarkup = renderWithoutMutation("restricted evidence");
assert.match(restrictedMarkup, /No informado/u);
assert.doesNotMatch(restrictedMarkup, /restricted-secret/u);
assert.doesNotMatch(restrictedMarkup, /source_url|sourceUrl/u);
for (const summary of restrictedContext.projectSummaries) {
  if (summary.source?.sourceUrl) {
    assert.ok(
      !restrictedMarkup.includes(summary.source.sourceUrl),
      "raw source URLs must not be emitted by the comparison view",
    );
  }
}

for (const contractVersion of ["2.1.0", "2.2.0"]) {
  const legacy = structuredClone(data);
  legacy.metadata.contract_version = contractVersion;
  delete legacy.benchmark;
  initializeScenarioData(legacy, { geographyArtifact: geographyArtifact(legacy) });
  const legacyMarkup = renderWithoutMutation(`legacy ${contractVersion}`);
  assert.match(legacyMarkup, /data-comparison-status="contract_unavailable"/u);
  assert.match(legacyMarkup, /Comparador no disponible para este contrato/u);
  assert.doesNotMatch(legacyMarkup, /comparison-metric-row/u);
}

const malformed = structuredClone(data);
delete malformed.benchmark.methodology.pairing_policy;
initializeScenarioData(malformed, { geographyArtifact: geographyArtifact(malformed) });
const malformedMarkup = renderWithoutMutation("invalid 2.3 benchmark");
assert.match(malformedMarkup, /data-comparison-status="error"/u);
assert.match(malformedMarkup, /No se pudo construir una comparación segura/u);
assert.match(malformedMarkup, /DUPLICATE_OR_INVALID_MODEL_IDS/u);
assert.doesNotMatch(malformedMarkup, /comparison-metric-row/u);

assert.match(styles, /--comparison-green:\s*#00943b/iu);
assert.match(styles, /--comparison-deep:\s*#016150/iu);
assert.match(styles, /\.comparison-project-head[\s\S]*?position:\s*sticky/iu);
assert.match(styles, /\.comparison-metric-row__label[\s\S]*?position:\s*sticky/iu);
assert.match(styles, /\.comparison-cell__project[\s\S]*?display:\s*none/iu);
assert.match(styles, /@media \(max-width: 760px\)/u);
assert.match(
  styles,
  /@media \(max-width: 760px\)[\s\S]*?\.comparison-cell__project[\s\S]*?display:\s*block/iu,
);
assert.match(
  styles,
  /\.comparison-command__actions > :is\(button, details > summary\)[\s\S]*?min-height:\s*44px/iu,
);
assert.match(styles, /:focus-visible/iu);
assert.doesNotMatch(styles, /font-size:\s*11px/iu);
assert.doesNotMatch(styles, /transition:\s*all/iu);

console.log(
  "Comparison view OK: pure render, grouped evidence, traceable conclusion, 0–3 + Viva states, CT-G, privacy and responsive contract verified.",
);
