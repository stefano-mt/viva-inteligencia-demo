import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  dispatchScenario,
  initializeScenarioData,
  state,
} from "../public/js/state.js";
import { renderMarket } from "../public/js/views/market.js";

const data = JSON.parse(
  await fs.readFile(
    new URL("../public/demo-data/viva-platform-demo.json", import.meta.url),
    "utf8",
  ),
);
const source = await fs.readFile(
  new URL("../public/js/views/market.js", import.meta.url),
  "utf8",
);
const styles = await fs.readFile(
  new URL("../public/styles/56-benchmark.css", import.meta.url),
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

function renderWithoutMutation(label) {
  const before = JSON.stringify({
    scenario: state.scenario,
    scenarioContext: state.scenarioContext,
    benchmarkContext: state.benchmarkContext,
    compareProjectIds: state.compareProjectIds,
    compareIncludeTarget: state.compareIncludeTarget,
  });
  const markup = renderMarket();
  const after = JSON.stringify({
    scenario: state.scenario,
    scenarioContext: state.scenarioContext,
    benchmarkContext: state.benchmarkContext,
    compareProjectIds: state.compareProjectIds,
    compareIncludeTarget: state.compareIncludeTarget,
  });
  assert.equal(after, before, `${label}: render must be pure`);
  return markup;
}

assert.doesNotMatch(
  source,
  /buildBenchmarkContext\s*\(/u,
  "the view must consume the derived context instead of rebuilding it",
);
assert.equal(
  (source.match(/class="primary-button benchmark-primary-action"/gu) ?? [])
    .length,
  1,
  "P4-07 must expose one primary CTA",
);

initializeScenarioData(data, { geographyArtifact: geographyArtifact() });
const markup = renderWithoutMutation("district benchmark");

assert.match(markup, /data-scenario-consumer="benchmark"/u);
assert.match(markup, /data-benchmark-status="orientative_noncomparable"/u);
assert.match(
  markup,
  /Miraflores tiene 85 comparables; 68 permiten un índice orientativo/u,
);
assert.match(markup, /Benchmark de microzona/u);
assert.match(markup, /01 · Alcance/u);
assert.match(markup, /Cómo se usa esta muestra/u);
assert.equal(
  (markup.match(/benchmark-evidence-line__node/gu) ?? []).length,
  4,
  "the evidence line must expose its four transformations",
);
assert.match(markup, /Pareja demostrada[\s\S]*?>0</u);
assert.match(markup, /Índice orientativo de entrada/u);
assert.match(markup, /P25/u);
assert.match(markup, /Mediana/u);
assert.match(markup, /P75/u);
assert.match(markup, /Cálculo con precios y áreas mínimos publicados/u);
assert.match(markup, /Precio publicado desde/u);
assert.match(markup, /Área total/u);
assert.match(markup, /Percentiles R-7/u);
assert.match(markup, /85 de entrada = 0 usados \+ 16 faltantes \+ 69 excluidos/u);
assert.match(markup, /Oferta de la muestra/u);
assert.match(markup, /Unidades reportadas por la publicación/u);
assert.match(markup, /Ver composición de la muestra/u);
assert.match(markup, /Atributos anunciados/u);
assert.match(markup, /No informado” nunca significa “No tiene/u);
assert.match(markup, /82\/85 informados/u);
assert.match(markup, /Lobby/u);
assert.match(markup, /78\/82 informados/u);
assert.match(markup, /0 documentados/u);
assert.match(markup, /Acabados y materiales/u);
assert.match(markup, /Información insuficiente/u);
assert.match(markup, /Composición, exclusiones y metodología/u);
assert.match(markup, /Ninguna pareja precio–área demostrada/u);
assert.match(markup, /source_paired/u);
assert.match(markup, /Comparar proyectos de esta muestra/u);
assert.match(markup, /data-view="compare"/u);
assert.match(markup, /<details class="benchmark-territory span-12">/u);
assert.doesNotMatch(
  markup,
  /<details class="benchmark-territory span-12" open/u,
  "territorial context must start contracted",
);
assert.match(markup, /Ranking distrital por carga observada/u);
assert.match(markup, /Cuadrantes para analizar la muestra/u);
assert.doesNotMatch(markup, /precio real(?!es de cierre)/iu);
assert.doesNotMatch(markup, /amenities verificados/iu);

const reportedUnitCells = state.benchmarkContext.projectSummaries
  .map(({ reportedUnits }) => Number(reportedUnits?.normalizedValue))
  .filter((value) => Number.isFinite(value) && value > 0);
assert.ok(reportedUnitCells.length > 0, "the public snapshot must exercise reported units");
assert.match(
  markup,
  new RegExp(
    `${reportedUnitCells.reduce((total, value) => total + value, 0)} · ${reportedUnitCells.length}/85 informados`,
    "u",
  ),
  "offer composition must consume normalizedValue",
);
const linkedExclusion =
  state.benchmarkContext.quantitative.pricePerM2Total.coverage.excludedProjects.find(
    ({ inspectorPath }) => inspectorPath,
  );
assert.ok(linkedExclusion, "CT-G must expose an inspector-linked exclusion");
assert.ok(markup.includes(linkedExclusion.projectId));
assert.ok(markup.includes(linkedExclusion.inspectorPath.replaceAll("&", "&amp;")));
assert.match(markup, /Abrir inspector/u);

const baselineBenchmark = structuredClone(state.benchmarkContext);

function quantitativeCase({ status, values, orientationValues = [] }) {
  const context = structuredClone(baselineBenchmark);
  const quantitative = context.quantitative.pricePerM2Total;
  const sorted = [...values].sort((left, right) => left - right);
  const median = sorted.length
    ? sorted.length % 2
      ? sorted[(sorted.length - 1) / 2]
      : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : null;
  Object.assign(quantitative, {
    status,
    n: sorted.length,
    values: sorted,
    p25: sorted[0] ?? null,
    median,
    p75: sorted.at(-1) ?? null,
    records: sorted.map((value, index) => ({
      projectId: context.scope.projectIds[index],
      value,
    })),
  });
  const orientation = [...orientationValues].sort((left, right) => left - right);
  Object.assign(quantitative.orientative, {
    status: orientation.length ? "orientative_noncomparable" : "insufficient",
    n: orientation.length,
    values: orientation,
    p25: orientation[0] ?? null,
    median: orientation[0] ?? null,
    p75: orientation.at(-1) ?? null,
    records: [],
  });
  context.status =
    status === "ready" || status === "orientative"
      ? status
      : orientation.length
        ? "orientative_noncomparable"
        : "insufficient";
  state.benchmarkContext = context;
  return renderWithoutMutation(`quantitative n=${sorted.length}`);
}

const n0Markup = quantitativeCase({ status: "insufficient", values: [] });
assert.match(n0Markup, /Información insuficiente/u);
assert.match(n0Markup, /ni referencias orientativas utilizables/u);
assert.doesNotMatch(n0Markup, /0 orientativos/u);

for (const [values, expected] of [
  [[6000], "S/ 6,000 / m²"],
  [[6000, 7000], "S/ 6,500 / m²"],
]) {
  const shortMarkup = quantitativeCase({ status: "orientative", values });
  assert.match(shortMarkup, /Referencia elegible orientativa/u);
  assert.ok(shortMarkup.includes(expected));
  assert.match(shortMarkup, new RegExp(`n = ${values.length}`, "u"));
  assert.doesNotMatch(shortMarkup, /0 orientativos/u);
  assert.doesNotMatch(shortMarkup, /<span>P25<\/span>/u);
}

const n3Markup = quantitativeCase({
  status: "ready",
  values: [6000, 7000, 8000],
});
assert.match(n3Markup, /Referencia elegible por m² de área total/u);
assert.match(n3Markup, /3 elegibles/u);
assert.match(n3Markup, /<span>P25<\/span>/u);
assert.match(n3Markup, /<span>Mediana<\/span>/u);
assert.match(n3Markup, /<span>P75<\/span>/u);

const qualitativeContext = structuredClone(baselineBenchmark);
const sparseAttribute = structuredClone(qualitativeContext.qualitative.attributes[0]);
Object.assign(sparseAttribute, {
  status: "orientative",
  announcedProjectCount: 1,
  documentedProjectCount: 0,
  informedProjectCount: 1,
  prevalencePercent: 100,
  canDescribePattern: false,
  announcedProjectIds: [qualitativeContext.scope.projectIds[0]],
});
qualitativeContext.qualitative.status = "orientative";
qualitativeContext.qualitative.attributes = [sparseAttribute];
state.benchmarkContext = qualitativeContext;
const sparseMarkup = renderWithoutMutation("qualitative n=1");
const sparseStart = sparseMarkup.indexOf(
  `data-attribute-id="${sparseAttribute.attributeId}"`,
);
const sparseEnd = sparseMarkup.indexOf("</article>", sparseStart);
const sparseSection = sparseMarkup.slice(sparseStart, sparseEnd);
assert.match(sparseSection, /1\/1 informados/u);
assert.match(sparseSection, /Muestra insuficiente/u);
assert.match(sparseSection, /se muestran conteos, no prevalencia/u);
assert.doesNotMatch(sparseSection, /100%/u);
assert.doesNotMatch(sparseSection, /benchmark-prevalence/u);

state.benchmarkContext = baselineBenchmark;

dispatchScenario({
  type: "SET_TERRITORY",
  patch: { scope_mode: "quadrant", quadrant_id: "NW" },
});
const quadrantMarkup = renderWithoutMutation("quadrant benchmark");
assert.match(quadrantMarkup, /Miraflores · Cuadrante NW/u);
assert.match(quadrantMarkup, /data-benchmark-status=/u);
assert.equal(
  state.benchmarkContext.scope.projectCount,
  state.scenarioContext.comparable_project_ids.length,
);

for (const contractVersion of ["2.1.0", "2.2.0"]) {
  const legacy = structuredClone(data);
  legacy.metadata.contract_version = contractVersion;
  delete legacy.benchmark;
  initializeScenarioData(legacy, {
    geographyArtifact: geographyArtifact(legacy),
  });
  const legacyMarkup = renderWithoutMutation(`legacy contract ${contractVersion}`);
  assert.match(legacyMarkup, /data-benchmark-status="contract_unavailable"/u);
  assert.match(legacyMarkup, /Esta versión de datos conserva el análisis territorial/u);
  assert.match(legacyMarkup, /Contexto territorial/u);
  assert.doesNotMatch(legacyMarkup, /benchmark-primary-action/u);
}

const malformed = structuredClone(data);
delete malformed.benchmark.methodology.pairing_policy;
initializeScenarioData(malformed, {
  geographyArtifact: geographyArtifact(malformed),
});
const errorMarkup = renderWithoutMutation("invalid 2.3 contract");
assert.match(errorMarkup, /data-benchmark-status="error"/u);
assert.match(errorMarkup, /No se pudo construir una referencia de mercado segura/u);
assert.match(errorMarkup, /DUPLICATE_OR_INVALID_MODEL_IDS/u);
assert.match(errorMarkup, /Contexto territorial/u);

assert.match(styles, /--benchmark-green:\s*#00943b/iu);
assert.match(styles, /--benchmark-deep:\s*#016150/iu);
assert.match(styles, /\.benchmark-evidence-line::before/iu);
assert.match(styles, /\.benchmark-primary-action:focus-visible/iu);
assert.match(styles, /\.benchmark-short-sample/iu);
assert.match(styles, /min-height:\s*44px/iu);
assert.match(styles, /\.benchmark-id-list a[\s\S]*?min-height:\s*44px/iu);
assert.match(
  styles,
  /\.benchmark-territory__content :is\(button, summary, a\)[\s\S]*?min-height:\s*44px/iu,
);
assert.match(styles, /@media \(max-width: 900px\)/u);
assert.match(styles, /@media \(max-width: 620px\)/u);
assert.doesNotMatch(styles, /font-size:\s*11px/iu);
assert.doesNotMatch(styles, /transition:\s*all/iu);

console.log(
  "Benchmark view OK: technical sheet, evidence line, quantitative/qualitative coverage, contracted territory, honest states and pure render verified.",
);
