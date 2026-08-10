import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import {
  normalizeAppBaseUrl,
  resolveAppPath,
  resolveAppUrl,
} from "./helpers/app-url.mjs";
import {
  buildScenarioPresentation,
  loadBoundaryArtifact,
  renderScenarioBar,
  renderScenarioSidebar,
  renderScenarioSummary,
} from "../public/js/views/scenario-context.js";

async function readJson(relativePath) {
  return JSON.parse(
    await fs.readFile(new URL(relativePath, import.meta.url), "utf8"),
  );
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(Buffer.from(bytes)).digest();
}

function asArrayBuffer(bytes) {
  const buffer = Buffer.from(bytes);
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
}

function responseFor(bytes, ok = true) {
  return {
    ok,
    async arrayBuffer() {
      return asArrayBuffer(bytes);
    },
  };
}

const data = await readJson(
  "../public/demo-data/viva-platform-demo.json",
);
const boundaryBytes = await fs.readFile(
  new URL(
    "../public/demo-data/district-boundaries.geojson",
    import.meta.url,
  ),
);
const miraflores = data.geography.districts.find(
  (district) => district.district_id === "150122",
);
const observedIds = miraflores.quadrants
  .flatMap((quadrant) => quadrant.observed_project_ids)
  .sort();
const canonicalIds = observedIds
  .slice(0, 85)
  .map((id) => id.replace("observed:", "project:"));

function makeScenario(overrides = {}) {
  return {
    ...structuredClone(data.scenario_defaults),
    ...overrides,
  };
}

function makeContext(overrides = {}) {
  const observed =
    overrides.observed_scope_project_ids ?? [...observedIds];
  const geography =
    overrides.geography_valid_project_ids ?? [...observed];
  const comparable =
    overrides.comparable_project_ids ?? [...canonicalIds];
  const priceReferences =
    overrides.price_reference_project_ids ?? comparable.slice(0, 12);
  return {
    scenario: makeScenario(),
    scope: {
      district_id: "150122",
      scope_mode: "district",
      quadrant_id: null,
      center_latitude: null,
      center_longitude: null,
      radius_meters: null,
      observed_project_count: observed.length,
      geography_valid_project_count: geography.length,
    },
    observed_scope_project_ids: observed,
    geography_valid_project_ids: geography,
    comparable_project_ids: comparable,
    price_reference_project_ids: priceReferences,
    geography_coverage: {
      included: geography.length,
      total: observed.length,
      pct: observed.length
        ? Math.round((geography.length / observed.length) * 1000) / 10
        : 0,
    },
    cutoff_at: data.metadata.cutoff_at,
    scenario_status: "valid",
    geography_status: "ready",
    comparability_status: "ready",
    price_status: "ready",
    evidence_coverage_pct: 80,
    ...overrides,
  };
}

const validArtifact = {
  status: "valid",
  url: "https://demo.test/repo/demo-data/district-boundaries.geojson",
  expected_sha256: data.geography.boundary_artifact_sha256,
  actual_sha256: data.geography.boundary_artifact_sha256,
  geojson: { type: "FeatureCollection", features: [] },
  reason: null,
};

function makePresentation({
  scenario = makeScenario(),
  scenarioStatus = "valid",
  corrections = [],
  context = makeContext(),
  artifact = validArtifact,
  dataOverride = data,
  canonicalUrl =
    "https://demo.test/repo/?sv=1&scope=quadrant&quadrant=NW#dashboard",
  announcement = "Escenario actualizado.",
  mobileNavOpen = false,
} = {}) {
  return buildScenarioPresentation({
    data: dataOverride,
    scenarioState: {
      scenario,
      scenario_status: scenarioStatus,
      corrections,
    },
    scenarioContext: { ...context, scenario },
    geographyArtifact: artifact,
    canonicalUrl,
    announcement,
    activeView: {
      group: "Análisis",
      label: "Radar comercial",
      hint: "Decisión del distrito",
    },
    mobileNavOpen,
  });
}

const readyModel = makePresentation();
for (const contractVersion of ["2.1.0", "2.2.0", "2.3.0"]) {
  const compatibleData = structuredClone(data);
  compatibleData.metadata.contract_version = contractVersion;
  assert.deepEqual(
    makePresentation({ dataOverride: compatibleData }),
    readyModel,
    `contract ${contractVersion} must not change the territorial presentation`
  );
}
assert.equal(readyModel.scopeTitle, "Miraflores · Distrito completo");
assert.equal(readyModel.observedCount, 90);
assert.equal(readyModel.comparableCount, 85);
assert.equal(readyModel.reviewCount, 5);
assert.ok(readyModel.agencyCount > 0);
assert.equal(readyModel.cutoffLabel, "Corte 28 jul. 2026");
assert.equal(readyModel.statuses.geography.label, "Cobertura territorial completa");
assert.equal(readyModel.statuses.comparability.label, "Comparabilidad lista");
assert.equal(readyModel.statuses.price.label, "Referencia de precio no demostrada");
assert.equal(readyModel.statuses.price.tone, "partial");
assert.equal(readyModel.statuses.price.symbol, "!");
assert.match(
  readyModel.statuses.price.detail,
  /12 publicaciones declaran precio y área total; no prueban que ambos valores pertenezcan a la misma oferta/u,
);

const readyBar = renderScenarioBar(readyModel);
const readySidebar = renderScenarioSidebar(readyModel);
const readySummary = renderScenarioSummary(readyModel);
for (const expected of [
  'id="scenario-view-title"',
  "Escenario activo",
  readyModel.scopeTitle,
]) {
  assert.ok(readyBar.includes(expected), `Missing bar contract: ${expected}`);
}
assert.doesNotMatch(readyBar, /Viva Inteligencia \/ Análisis/u);
assert.doesNotMatch(readyBar, /id="top-district"|data-scenario-scope|id="reset-scenario"/u);

for (const expected of [
  'id="scenario-sidebar-title"',
  'id="top-district"',
  'id="scenario-scope-district"',
  'data-scenario-scope="quadrant"',
  'data-scenario-scope="radius"',
  'id="scenario-view-comparables"',
  'data-view="projects"',
  'data-focus-target="main-content"',
  'id="reset-scenario"',
  "Ver comparables",
  "Reiniciar",
]) {
  assert.ok(readySidebar.includes(expected), `Missing sidebar contract: ${expected}`);
}
assert.match(
  readySidebar,
  /id="scenario-scope-district"[\s\S]*?aria-pressed="true"/,
);
assert.doesNotMatch(readySidebar, /data-scenario-quadrant="/);
assert.doesNotMatch(readySidebar, /data-scenario-radius="/);
assert.match(readyBar, /aria-expanded="false"/);

for (const expected of [
  'id="scenario-summary-title"',
  "90",
  "Proyectos comparables",
  "Fuera o por revisar",
  "Ver detalle técnico",
  "Cobertura territorial completa",
  "Comparabilidad lista",
  "Referencia de precio no demostrada",
  'id="scenario-canonical-url"',
  readyModel.canonicalUrl.replaceAll("&", "&amp;"),
  'id="scenario-live"',
  'aria-live="polite"',
  "Escenario actualizado.",
]) {
  assert.ok(
    readySummary.includes(expected),
    `Missing summary contract: ${expected}`,
  );
}
assert.doesNotMatch(readySummary, /kpi-card/);
assert.doesNotMatch(
  readySummary,
  /Referencia de precio lista|precios publicados compatibles/iu,
);
assert.match(readySummary, /<dl class="scenario-summary__metrics">/);

const openNavBar = renderScenarioBar(
  makePresentation({ mobileNavOpen: true }),
);
assert.match(openNavBar, /aria-expanded="true"/);

const quadrantScenario = makeScenario({
  scope_mode: "quadrant",
  quadrant_id: "NW",
});
const quadrantIds = miraflores.quadrants.find(
  (quadrant) => quadrant.quadrant_id === "NW",
).observed_project_ids;
const quadrantModel = makePresentation({
  scenario: quadrantScenario,
  context: makeContext({
    scenario: quadrantScenario,
    scope: {
      district_id: "150122",
      scope_mode: "quadrant",
      quadrant_id: "NW",
      center_latitude: null,
      center_longitude: null,
      radius_meters: null,
      observed_project_count: quadrantIds.length,
      geography_valid_project_count: quadrantIds.length,
    },
    observed_scope_project_ids: [...quadrantIds],
    geography_valid_project_ids: [...quadrantIds],
    comparable_project_ids: canonicalIds.slice(0, 35),
  }),
});
const quadrantBar = renderScenarioSidebar(quadrantModel);
assert.equal(quadrantModel.scopeTitle, "Miraflores · Noroeste");
assert.match(quadrantBar, /data-scenario-quadrant="NW"/);
assert.match(
  quadrantBar,
  /id="scenario-quadrant-nw"[\s\S]*?aria-pressed="true"/,
);
assert.match(quadrantBar, /División creada para analizar la muestra/);
assert.doesNotMatch(quadrantBar, /data-scenario-radius="/);

const radiusScenario = makeScenario({
  scope_mode: "radius",
  center_latitude: miraflores.median_latitude,
  center_longitude: miraflores.median_longitude,
  radius_meters: 1000,
});
const radiusModel = makePresentation({ scenario: radiusScenario });
const radiusBar = renderScenarioSidebar(radiusModel);
assert.equal(radiusModel.scopeTitle, "Miraflores · Radio 1 km");
assert.match(radiusBar, /data-scenario-radius="1000"/);
assert.match(
  radiusBar,
  /id="scenario-radius-1000"[\s\S]*?aria-pressed="true"/,
);
assert.match(radiusBar, /Centro observado del distrito/);
assert.doesNotMatch(radiusBar, /data-scenario-quadrant="/);

const targetModel = makePresentation({
  scenario: makeScenario({
    target_area_m2: 80,
    target_price_pen: 650000,
  }),
});
assert.equal(targetModel.targetPricePerM2, "S/ 8,125");

const invalidModel = makePresentation({
  scenarioStatus: "invalid",
  corrections: [
    { code: "INVALID_RADIUS_SCOPE" },
    { code: "UNKNOWN_PARAMETER" },
  ],
});
const invalidSummary = renderScenarioSummary(invalidModel);
assert.match(invalidSummary, /Ajustamos parte del escenario compartido/);
assert.match(invalidSummary, /punto o radio no era válido/);
assert.match(invalidSummary, /parámetro no reconocido/);
assert.match(invalidSummary, /Cobertura territorial completa/);
assert.match(invalidSummary, /Comparabilidad lista/);

const partialContext = makeContext({
  geography_valid_project_ids: observedIds.slice(0, 89),
  geography_coverage: { included: 89, total: 90, pct: 98.9 },
  geography_status: "partial",
  comparability_status: "orientative",
  price_status: "insufficient",
  evidence_coverage_pct: 42.5,
  price_reference_project_ids: canonicalIds.slice(0, 2),
});
const partialSummary = renderScenarioSummary(
  makePresentation({ context: partialContext }),
);
assert.match(partialSummary, /Cobertura territorial parcial/);
assert.match(partialSummary, /89\/90 con geografía válida/);
assert.match(
  partialSummary,
  /Comparabilidad orientativa · 42.5% evidencia/,
);
assert.match(partialSummary, /Referencia de precio no demostrada/);
assert.match(
  partialSummary,
  /2 publicaciones declaran precio y área total; ninguna pareja está demostrada a nivel de oferta/u,
);
assert.doesNotMatch(
  partialSummary,
  /Referencia de precio lista|precios publicados compatibles/iu,
);

for (const artifactStatus of [
  "missing",
  "hash_mismatch",
  "parse_error",
]) {
  const unavailableModel = makePresentation({
    context: makeContext({
      geography_valid_project_ids: [],
      geography_coverage: { included: 0, total: 90, pct: 0 },
      geography_status: "unavailable",
      comparability_status: "insufficient",
      price_status: "insufficient",
      comparable_project_ids: [],
      price_reference_project_ids: [],
    }),
    artifact: {
      ...validArtifact,
      status: artifactStatus,
      geojson: null,
    },
  });
  const html = renderScenarioSummary(unavailableModel);
  assert.match(html, /Geografía no disponible/);
  assert.match(html, /Comparables insuficientes/);
}

const loadingModel = makePresentation({
  artifact: {
    status: "loading",
    geojson: null,
  },
});
const loadingBar = renderScenarioBar(loadingModel);
const loadingSidebar = renderScenarioSidebar(loadingModel);
const loadingSummary = renderScenarioSummary(loadingModel);
assert.match(loadingBar, /aria-busy="true"/);
assert.match(loadingSidebar, /id="top-district" disabled/);
assert.match(loadingSummary, /Preparando escenario geográfico/);
assert.match(loadingSummary, /aria-busy="true"/);

const districtWithoutQuadrantsData = structuredClone(data);
const syntheticDistrict =
  districtWithoutQuadrantsData.geography.districts.find(
    (district) => district.district_id === "150122",
  );
syntheticDistrict.high_load = false;
syntheticDistrict.quadrants = [];
const noQuadrantsBar = renderScenarioSidebar(
  makePresentation({ dataOverride: districtWithoutQuadrantsData }),
);
assert.match(
  noQuadrantsBar,
  /data-scenario-scope="quadrant"[\s\S]*?disabled/,
);
assert.match(noQuadrantsBar, /no tiene división por cuadrantes/);

const escapedSummary = renderScenarioSummary(
  makePresentation({
    canonicalUrl: 'https://demo.test/?x="<script>alert(1)</script>',
    announcement: "<b>updated</b>",
  }),
);
assert.doesNotMatch(escapedSummary, /<script>/);
assert.doesNotMatch(escapedSummary, /<b>updated<\/b>/);
assert.match(escapedSummary, /&lt;script&gt;/);

let requestedUrl = null;
let requestedOptions = null;
const loaded = await loadBoundaryArtifact({
  geography: data.geography,
  baseUrl: "https://demo.test/repo/?sv=1#dashboard",
  fetchImpl: async (url, options) => {
    requestedUrl = url;
    requestedOptions = options;
    return responseFor(boundaryBytes);
  },
  digestImpl: async (bytes) => sha256Bytes(bytes),
});
assert.equal(loaded.status, "valid");
assert.equal(loaded.actual_sha256, data.geography.boundary_artifact_sha256);
assert.equal(loaded.geojson.type, "FeatureCollection");
assert.equal(loaded.geojson.features.length, 7);
assert.equal(
  requestedUrl,
  "https://demo.test/repo/demo-data/district-boundaries.geojson",
);
assert.deepEqual(requestedOptions, {
  cache: "no-store",
  credentials: "same-origin",
  redirect: "error",
});

const invalidJsonBytes = Buffer.from("{not-json", "utf8");
const wrongHashFirst = await loadBoundaryArtifact({
  geography: {
    ...data.geography,
    boundary_artifact_sha256: "0".repeat(64),
  },
  baseUrl: "https://demo.test/repo/",
  fetchImpl: async () => responseFor(invalidJsonBytes),
  digestImpl: async (bytes) => sha256Bytes(bytes),
});
assert.equal(wrongHashFirst.status, "hash_mismatch");
assert.equal(wrongHashFirst.geojson, null);

const invalidJsonHash = createHash("sha256")
  .update(invalidJsonBytes)
  .digest("hex");
const parseError = await loadBoundaryArtifact({
  geography: {
    ...data.geography,
    boundary_artifact_sha256: invalidJsonHash,
  },
  baseUrl: "https://demo.test/repo/",
  fetchImpl: async () => responseFor(invalidJsonBytes),
  digestImpl: async (bytes) => sha256Bytes(bytes),
});
assert.equal(parseError.status, "parse_error");
assert.equal(parseError.reason, "content_invalid");
assert.equal(parseError.geojson, null);

const relationMismatchJson = JSON.stringify({
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { osm_id: 1 },
      geometry: { type: "Polygon", coordinates: [] },
    },
  ],
});
const relationMismatchBytes = Buffer.from(relationMismatchJson);
const relationMismatch = await loadBoundaryArtifact({
  geography: {
    ...data.geography,
    boundary_artifact_sha256: createHash("sha256")
      .update(relationMismatchBytes)
      .digest("hex"),
  },
  baseUrl: "https://demo.test/repo/",
  fetchImpl: async () => responseFor(relationMismatchBytes),
  digestImpl: async (bytes) => sha256Bytes(bytes),
});
assert.equal(relationMismatch.status, "parse_error");
assert.equal(relationMismatch.reason, "geojson_contract_invalid");

for (const [name, input, expectedReason] of [
  [
    "missing reference",
    {
      geography: {
        ...data.geography,
        boundary_artifact_path: null,
      },
      baseUrl: "https://demo.test/repo/",
      fetchImpl: async () => responseFor(boundaryBytes),
    },
    "reference_missing",
  ],
  [
    "cross-origin reference",
    {
      geography: {
        ...data.geography,
        boundary_artifact_path:
          "https://external.test/district-boundaries.geojson",
      },
      baseUrl: "https://demo.test/repo/",
      fetchImpl: async () => responseFor(boundaryBytes),
    },
    "reference_not_same_origin",
  ],
  [
    "http failure",
    {
      geography: data.geography,
      baseUrl: "https://demo.test/repo/",
      fetchImpl: async () => responseFor(boundaryBytes, false),
    },
    "response_unavailable",
  ],
  [
    "network failure",
    {
      geography: data.geography,
      baseUrl: "https://demo.test/repo/",
      fetchImpl: async () => {
        throw new Error("offline");
      },
    },
    "fetch_failed",
  ],
]) {
  const result = await loadBoundaryArtifact({
    ...input,
    digestImpl: async (bytes) => sha256Bytes(bytes),
  });
  assert.equal(result.status, "missing", name);
  assert.equal(result.reason, expectedReason, name);
  assert.equal(result.geojson, null, name);
}

const digestFailure = await loadBoundaryArtifact({
  geography: data.geography,
  baseUrl: "https://demo.test/repo/",
  fetchImpl: async () => responseFor(boundaryBytes),
  digestImpl: async () => {
    throw new Error("digest unavailable");
  },
});
assert.equal(digestFailure.status, "parse_error");
assert.equal(digestFailure.reason, "digest_failed");
assert.equal(digestFailure.geojson, null);

const appSource = await fs.readFile(
  new URL("../public/app.js", import.meta.url),
  "utf8",
);
const indexSource = await fs.readFile(
  new URL("../public/js/views/index.js", import.meta.url),
  "utf8",
);
const manifestSource = await fs.readFile(
  new URL("../public/styles.css", import.meta.url),
  "utf8",
);
const cssSource = await fs.readFile(
  new URL(
    "../public/styles/25-scenario-context.css",
    import.meta.url,
  ),
  "utf8",
);

assert.match(appSource, /initializeScenarioData\(data,\s*\{/);
assert.match(appSource, /initializeScenarioFromLocation\(\)/);
assert.doesNotMatch(appSource, /\bdispatchScenario\b/);
assert.doesNotMatch(appSource, /window\.history\.replaceState/);
assert.match(appSource, /loadBoundaryArtifact\(/);
assert.match(appSource, /updateBoundaryArtifact\(geographyArtifact\)/);
assert.match(appSource, /renderScenarioBar\(scenarioPresentation\)/);
assert.match(appSource, /renderScenarioSidebar\(scenarioPresentation\)/);
assert.match(appSource, /renderScenarioSummary\(scenarioPresentation\)/);
assert.doesNotMatch(appSource, /function renderTopbar/);
const initBlock = appSource.slice(
  appSource.indexOf("async function init"),
  appSource.indexOf("async function loadDemoData"),
);
assert.ok(
  initBlock.indexOf("initializeScenarioFromLocation()") <
    initBlock.indexOf("render();"),
  "URL must hydrate before first render",
);
assert.match(indexSource, /buildScenarioPresentation/);
assert.match(indexSource, /renderScenarioBar/);
assert.match(indexSource, /renderScenarioSidebar/);
assert.match(indexSource, /renderScenarioSummary/);
const imports = [
  "./styles/20-shell.css",
  "./styles/25-scenario-context.css",
  "./styles/30-components.css",
  "./styles/40-visualizations.css",
  "./styles/45-geography.css",
  "./styles/50-views.css",
].map((item) => manifestSource.indexOf(item));
assert.ok(imports.every((index) => index >= 0));
assert.deepEqual(imports, [...imports].sort((left, right) => left - right));
assert.match(cssSource, /min-height:\s*44px/);
assert.match(cssSource, /outline:\s*3px/);
assert.match(cssSource, /@media \(max-width:\s*1320px\)/);
assert.match(cssSource, /@media \(max-width:\s*620px\)/);
assert.match(cssSource, /prefers-reduced-motion:\s*reduce/);

const viewSource = await fs.readFile(
  new URL("../public/js/views/scenario-context.js", import.meta.url),
  "utf8",
);
assert.doesNotMatch(
  viewSource,
  /\b(?:localStorage|sessionStorage|XMLHttpRequest)\b/,
);
assert.doesNotMatch(viewSource, /\son(?:click|change|submit)=/);

assert.equal(
  normalizeAppBaseUrl("http://127.0.0.1:4177").href,
  "http://127.0.0.1:4177/",
);
assert.equal(
  resolveAppUrl(
    "http://127.0.0.1:4177",
    "/?sv=1&scope=radius#dashboard",
  ),
  "http://127.0.0.1:4177/?sv=1&scope=radius#dashboard",
);
assert.equal(
  resolveAppUrl(
    "https://example.test/viva-inteligencia-demo/",
    "/?sv=1&scope=radius#dashboard",
  ),
  "https://example.test/viva-inteligencia-demo/?sv=1&scope=radius#dashboard",
);
assert.equal(
  resolveAppUrl(
    "https://example.test/viva-inteligencia-demo",
    "/#projects",
  ),
  "https://example.test/viva-inteligencia-demo/#projects",
);
assert.equal(
  resolveAppPath(
    "https://example.test/viva-inteligencia-demo/",
    "/?sv=1#compare",
  ),
  "/viva-inteligencia-demo/?sv=1#compare",
);

console.log(
  "Scenario context OK: territory lens render states, a11y hooks, same-origin byte-hash loader, base-path URL hydration and responsive contract verified.",
);
