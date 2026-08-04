import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  dispatchScenario,
  state,
  updateBoundaryArtifact,
} from "../public/js/state.js";
import {
  canonicalProjectId,
  getComparableProjects,
  isComparableProject,
  isScenarioDisplayProject,
} from "../public/js/domain.js";
import {
  COMPARISON_EVENTS,
  applyScenarioProduct,
  bindEvents,
  focusComparisonRow,
  resetScenario,
  selectInspectorCase,
  selectScenarioProject,
  setComparisonProject,
  setComparisonTarget,
  setScenarioScope,
} from "../public/js/controller.js";
import { sectionGuides, views } from "../public/js/config.js";
import {
  inspectorCaseHash,
  parseHashRoute,
  replaceHashPreservingLocation,
  viewIcon,
} from "../public/js/navigation.js";

const projectDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const entry = path.join(projectDir, "public", "app.js");
const expectedModules = [
  "benchmark.js",
  "comparability.js",
  "config.js",
  "controller.js",
  "domain.js",
  "evidence-inspector.js",
  "history.js",
  "navigation.js",
  "scenario.js",
  "state.js",
].map((filename) => path.join(projectDir, "public", "js", filename));
const expectedViews = [
  "index.js",
  "dashboard.js",
  "projects.js",
  "inspector.js",
  "market.js",
  "compare.js",
  "checklist.js",
  "assistant.js",
  "activity.js",
].map((filename) =>
  path.join(projectDir, "public", "js", "views", filename),
);
const graph = new Map();

await visit(entry);

const cycles = [];
const visiting = new Set();
const visited = new Set();
const stack = [];
walk(entry);

assert.deepEqual(
  cycles,
  [],
  `El grafo de módulos contiene ciclos:\n${cycles.join("\n")}`,
);
for (const modulePath of [...expectedModules, ...expectedViews]) {
  assert.ok(
    graph.has(modulePath),
    `El entrypoint no alcanza ${path.relative(projectDir, modulePath)}`,
  );
}

for (const [modulePath, dependencies] of graph) {
  if (modulePath === entry) continue;
  assert.ok(
    !dependencies.includes(entry),
    `${path.basename(modulePath)} no puede importar app.js`,
  );
}

assert.deepEqual(
  views.map(({ id }) => id),
  [
    "dashboard",
    "projects",
    "inspector",
    "market",
    "compare",
    "trust",
    "assistant",
    "activity",
  ],
);
assert.deepEqual(views[2], {
  id: "inspector",
  label: "Inspector de evidencia",
  hint: "Fuentes, tipologías y calidad",
  group: "Análisis",
});
assert.deepEqual(views[3], {
  id: "market",
  label: "Benchmark de microzona",
  hint: "Muestra, atributos y exclusiones",
  group: "Análisis",
});
assert.deepEqual(views[4], {
  id: "compare",
  label: "Comparador comercial",
  hint: "Diferencias y siguiente acción",
  group: "Análisis",
});
assert.equal(sectionGuides.inspector.steps.length, 3);
assert.equal(sectionGuides.market.steps.length, 3);
assert.equal(sectionGuides.compare.steps.length, 3);
assert.match(sectionGuides.market.outcome, /limitaciones explícitas/u);
assert.match(sectionGuides.compare.outcome, /siguiente acción/u);
assert.deepEqual(COMPARISON_EVENTS, {
  selection: "viva:comparison-selection",
  target: "viva:comparison-target",
  rowFocus: "viva:comparison-row-focus",
});
assert.equal(typeof setComparisonProject, "function");
assert.equal(typeof setComparisonTarget, "function");
assert.equal(typeof focusComparisonRow, "function");
assert.match(viewIcon("inspector"), /<svg/);

assert.deepEqual(parseHashRoute("#inspector"), {
  view: "inspector",
  kind: "inspector-base",
  caseSlug: null,
  anchorId: null,
  valid: true,
});
assert.deepEqual(
  parseHashRoute("#inspector/case/f3-ct-g-pardo"),
  {
    view: "inspector",
    kind: "inspector-case",
    caseSlug: "f3-ct-g-pardo",
    anchorId: null,
    valid: true,
  },
);
for (const anchorId of [
  "inspector-row-area",
  "inspector-row-floor_unit",
  "inspector-row-model",
  "inspector-row-bedrooms",
  "inspector-row-bathrooms",
  "inspector-limitations",
  "inspector-evidence-shell",
]) {
  assert.deepEqual(parseHashRoute(`#${anchorId}`), {
    view: "inspector",
    kind: "inspector-anchor",
    caseSlug: null,
    anchorId,
    valid: true,
  });
}
for (const invalidHash of [
  "#inspector/case/case:f3-ct-g-pardo",
  "#inspector/case/f3-ct-g-pardo?source=catalog",
  "#inspector/case/f3-ct-g-pardo/extra",
  "#inspector/case/f3%2Fct-g-pardo",
  "#inspector/case/%E0%A4%A",
  "#inspector/other/f3-ct-g-pardo",
]) {
  const parsed = parseHashRoute(invalidHash);
  assert.equal(parsed.view, "inspector");
  assert.equal(parsed.kind, "inspector-invalid");
  assert.equal(parsed.valid, false);
  assert.equal(parsed.caseSlug, null);
}
assert.equal(parseHashRoute("#sources").view, "market");
assert.equal(parseHashRoute("#matching").view, "compare");
assert.equal(parseHashRoute("#quality").view, "trust");
assert.equal(parseHashRoute("#pipeline").view, "activity");
assert.equal(parseHashRoute("#market/extra").view, "dashboard");
assert.equal(
  inspectorCaseHash("case:f3-ct-g-pardo"),
  null,
  "los case_id técnicos no son slugs públicos",
);
assert.equal(inspectorCaseHash("f3/ct-g-pardo"), null);
assert.equal(
  inspectorCaseHash("f3-ct-g-pardo"),
  "#inspector/case/f3-ct-g-pardo",
);
const replacedRoutes = [];
assert.equal(
  replaceHashPreservingLocation("#inspector/case/f3-ct-g-pardo", {
    location: { pathname: "/viva/demo/", search: "?sv=1&area=80" },
    history: {
      replaceState(_state, _unused, value) {
        replacedRoutes.push(value);
      },
    },
  }),
  true,
);
assert.deepEqual(replacedRoutes, [
  "/viva/demo/?sv=1&area=80#inspector/case/f3-ct-g-pardo",
]);

const demoData = JSON.parse(
  await fs.readFile(
    path.join(
      projectDir,
      "public",
      "demo-data",
      "viva-platform-demo.json",
    ),
    "utf8",
  ),
);
const geographyExclusionsBefore = JSON.stringify(
  demoData.geography.exclusions,
);
state.data = demoData;
const inspectorScenarioSnapshot = structuredClone(state.scenario);
const inspectorContextSnapshot = structuredClone(state.scenarioContext);
const inspectorContextRevision = state.scenarioContextRevision;
const inspectorSelectedProject = state.selectedProjectId;
const inspectorCompareProjects = structuredClone(state.compareProjectIds);
assert.equal(
  selectInspectorCase("f3-ct-d-finishes", { render: false }).corrected,
  false,
);
assert.equal(state.inspectorPreset, "case:f3-ct-d-finishes");
const correctedInspector = selectInspectorCase("not-a-real-case", {
  render: false,
});
assert.equal(correctedInspector.corrected, true);
assert.equal(state.inspectorPreset, "case:f3-ct-g-pardo");
assert.deepEqual(state.scenario, inspectorScenarioSnapshot);
assert.deepEqual(state.scenarioContext, inspectorContextSnapshot);
assert.equal(state.scenarioContextRevision, inspectorContextRevision);
assert.equal(state.selectedProjectId, inspectorSelectedProject);
assert.deepEqual(state.compareProjectIds, inspectorCompareProjects);
assert.equal(
  state.scenarioContextRevision,
  1,
  "state.data debe componer el contexto antes del primer render",
);
assert.ok(state.scenarioEnvironment);
assert.deepEqual(state.scenarioState.scenario, state.scenario);
assert.deepEqual(state.geographyArtifact, {
  status: "missing",
  geojson: null,
  url: null,
  expected_sha256: null,
  actual_sha256: null,
  reason: null,
});
assert.equal(state.scenarioContext.geography_status, "unavailable");
assert.equal(state.scenarioContext.comparability_status, "insufficient");
assert.equal(state.scenarioContext.comparable_project_ids.length, 0);
assert.equal(Object.hasOwn(state.scenarioContext, "state"), false);

const beforeArtifactRevision = state.scenarioContextRevision;
const artifactTransition = updateBoundaryArtifact({
  status: "valid",
  geojson: { type: "FeatureCollection", features: [] },
  url: "demo-data/district-boundaries.geojson",
  expected_sha256: "fixture-sha",
  actual_sha256: "fixture-sha",
  reason: null,
});
assert.equal(artifactTransition.recomputed, true);
assert.equal(
  state.scenarioContextRevision,
  beforeArtifactRevision + 1,
  "un artefacto validado recompone exactamente una vez",
);
assert.equal(state.scenarioContext.geography_status, "ready");
assert.equal(state.scenarioContext.display_project_ids.length, 90);
assert.equal(state.scenarioContext.comparable_project_ids.length, 85);
assert.equal(getComparableProjects().length, 85);
assert.ok(isScenarioDisplayProject(state.selectedProjectId));
assert.ok(state.compareProjectIds.every(isComparableProject));
assert.deepEqual(
  state.compareProjectIds.map(canonicalProjectId),
  state.scenarioContext.comparable_project_ids.slice(0, 3),
);
updateBoundaryArtifact({
  status: "hash_mismatch",
  geojson: { type: "FeatureCollection", features: [{ type: "Feature" }] },
  url: "demo-data/district-boundaries.geojson",
  expected_sha256: "expected",
  actual_sha256: "rejected",
  reason: "hash_mismatch",
});
assert.equal(
  state.geographyArtifact.geojson,
  null,
  "un artefacto no válido elimina la geometría aunque el caller intente inyectarla",
);
assert.equal(state.scenarioContext.geography_status, "unavailable");
assert.equal(state.scenarioContext.comparable_project_ids.length, 0);
updateBoundaryArtifact({
  status: "valid",
  geojson: { type: "FeatureCollection", features: [] },
  url: "demo-data/district-boundaries.geojson",
  expected_sha256: "fixture-sha",
  actual_sha256: "fixture-sha",
  reason: null,
});
assert.equal(state.scenarioContext.geography_status, "ready");
assert.equal(state.scenarioContext.comparable_project_ids.length, 85);
assert.equal(
  JSON.stringify(demoData.geography.exclusions),
  geographyExclusionsBefore,
  "las exclusiones analíticas no se serializan en geography.exclusions",
);
assert.ok(
  state.scenarioContext.excluded_projects.some(
    ({ origin, reason }) =>
      origin === "analytical" && reason === "not_reconciled",
  ),
);
const unreconciledDisplay = state.scenarioContext.excluded_projects.find(
  ({ origin, reason, project_id: projectId }) =>
    origin === "analytical" &&
    reason === "not_reconciled" &&
    state.scenarioContext.display_project_ids.includes(projectId),
);
assert.ok(unreconciledDisplay);
assert.equal(
  selectScenarioProject(unreconciledDisplay.project_id, {
    render: false,
  }),
  true,
);
assert.ok(isScenarioDisplayProject(state.selectedProjectId));
assert.equal(isComparableProject(state.selectedProjectId), false);

const beforeQuadrantRevision = state.scenarioContextRevision;
const quadrantTransition = dispatchScenario({
  type: "SET_TERRITORY",
  patch: { scope_mode: "quadrant", quadrant_id: "NW" },
});
assert.equal(quadrantTransition.recomputed, true);
assert.equal(
  state.scenarioContextRevision,
  beforeQuadrantRevision + 1,
  "un cambio de escenario recompone exactamente una vez",
);
assert.equal(state.scenario.scope_mode, "quadrant");
assert.ok(state.compareProjectIds.every(isComparableProject));

const noOpRevision = state.scenarioContextRevision;
const noOpTransition = dispatchScenario({
  type: "SET_TERRITORY",
  patch: { scope_mode: "quadrant", quadrant_id: "NW" },
});
assert.equal(noOpTransition.recomputed, false);
assert.equal(state.scenarioContextRevision, noOpRevision);

const radiusRevision = state.scenarioContextRevision;
const radiusTransition = setScenarioScope("radius", { render: false });
const activeDistrict = state.scenarioEnvironment.geography.districts.find(
  ({ district_id: districtId }) =>
    districtId === state.scenario.district_id,
);
assert.equal(radiusTransition.recomputed, true);
assert.equal(state.scenarioContextRevision, radiusRevision + 1);
assert.equal(state.scenario.scope_mode, "radius");
assert.equal(state.scenario.radius_meters, 1000);
assert.equal(
  state.scenario.center_latitude,
  activeDistrict.median_latitude,
);
assert.equal(
  state.scenario.center_longitude,
  activeDistrict.median_longitude,
);

const productRevision = state.scenarioContextRevision;
const productTransition = dispatchScenario({
  type: "APPLY_PRODUCT_FILTERS",
  patch: { target_area_m2: 80 },
});
assert.equal(productTransition.recomputed, true);
assert.equal(state.scenarioContextRevision, productRevision + 1);
const resetRevision = state.scenarioContextRevision;
const resetTransition = resetScenario({
  render: false,
  announce: "Escenario reiniciado al preset base.",
  focusId: "reset-scenario",
});
assert.equal(resetTransition.recomputed, true);
assert.equal(state.scenarioContextRevision, resetRevision + 1);
assert.equal(state.scenario.scope_mode, "district");
assert.equal(state.scenario.target_area_m2, null);
assert.equal(
  state.scenarioAnnouncement,
  "Escenario reiniciado al preset base.",
);
assert.equal(state.scenarioFocusId, "reset-scenario");
assert.ok(state.compareProjectIds.every(isComparableProject));

const windowListeners = new Map();
const documentListeners = new Map();
const fakeLocation = {
  href: "https://demo.test/#dashboard",
  pathname: "/",
  search: "",
  hash: "#dashboard",
};
let replaceStateCount = 0;
function setFakeLocation(urlLike) {
  const url = new URL(String(urlLike), "https://demo.test");
  fakeLocation.href = url.href;
  fakeLocation.pathname = url.pathname;
  fakeLocation.search = url.search;
  fakeLocation.hash = url.hash;
}
globalThis.window = {
  location: fakeLocation,
  history: {
    replaceState(_state, _unused, urlLike) {
      replaceStateCount += 1;
      setFakeLocation(urlLike);
    },
  },
  addEventListener(type, listener) {
    const listeners = windowListeners.get(type) ?? [];
    listeners.push(listener);
    windowListeners.set(type, listeners);
  },
  dispatchEvent(event) {
    for (const listener of windowListeners.get(event.type) ?? []) {
      listener(event);
    }
  },
};
globalThis.document = {
  querySelectorAll() {
    return [];
  },
  getElementById() {
    return null;
  },
  querySelector() {
    return null;
  },
  addEventListener(type, listener) {
    const listeners = documentListeners.get(type) ?? [];
    listeners.push(listener);
    documentListeners.set(type, listeners);
  },
};

let historyRenderCount = 0;
bindEvents(() => {
  historyRenderCount += 1;
});
bindEvents(() => {
  historyRenderCount += 1;
});
assert.equal(
  windowListeners.get("popstate")?.length,
  1,
  "bindEvents repetido no duplica el listener global popstate",
);

applyScenarioProduct(
  { target_area_m2: 80 },
  { render: false },
);
const scenarioA = {
  search: "?sv=1&area=80",
  area: state.scenario.target_area_m2,
};
applyScenarioProduct(
  { target_area_m2: 90 },
  { render: false },
);
assert.equal(state.scenario.target_area_m2, 90);
const beforeBackRevision = state.scenarioContextRevision;
const beforeBackHistoryRevision = state.historyContextRevision;
setFakeLocation("https://demo.test/?area=80&sv=1#dashboard");
const beforeBackReplaceCount = replaceStateCount;
window.dispatchEvent({ type: "popstate" });
assert.equal(state.scenarioContextRevision, beforeBackRevision + 1);
assert.equal(state.historyContextRevision, beforeBackHistoryRevision + 1);
assert.equal(
  state.historyContext.scenario_revision,
  state.scenarioContextRevision,
  "Back recompone histórico con la misma revisión territorial",
);
assert.equal(state.scenario.target_area_m2, scenarioA.area);
assert.equal(fakeLocation.search, scenarioA.search);
assert.equal(
  replaceStateCount,
  beforeBackReplaceCount + 1,
  "Back normaliza la URL no canónica con un solo replaceState",
);
assert.equal(historyRenderCount, 1);

const beforeHashRevision = state.scenarioContextRevision;
const beforeHashHistoryRevision = state.historyContextRevision;
const beforeHashHistoryContext = state.historyContext;
setFakeLocation(`${fakeLocation.pathname}${fakeLocation.search}#market`);
window.dispatchEvent({ type: "hashchange" });
assert.equal(
  state.scenarioContextRevision,
  beforeHashRevision,
  "hashchange solo navega y no recompone el escenario",
);
assert.equal(
  state.historyContextRevision,
  beforeHashHistoryRevision,
  "hashchange conserva el histórico porque el escenario no cambió",
);
assert.strictEqual(
  state.historyContext,
  beforeHashHistoryContext,
  "navegar entre rutas conserva la misma derivación histórica",
);
delete globalThis.window;
delete globalThis.document;

const stateSource = await fs.readFile(
  path.join(projectDir, "public", "js", "state.js"),
  "utf8",
);
const controllerSource = await fs.readFile(
  path.join(projectDir, "public", "js", "controller.js"),
  "utf8",
);
const domainSource = await fs.readFile(
  path.join(projectDir, "public", "js", "domain.js"),
  "utf8",
);
const appSource = await fs.readFile(entry, "utf8");
const indexSource = await fs.readFile(
  path.join(projectDir, "public", "js", "views", "index.js"),
  "utf8",
);
const stylesManifestSource = await fs.readFile(
  path.join(projectDir, "public", "styles.css"),
  "utf8",
);
assert.equal(
  (stateSource.match(/\bbuildTerritorialContext\s*\(/g) ?? []).length,
  1,
);
assert.equal(
  (stateSource.match(/\bbuildComparabilityContext\s*\(/g) ?? []).length,
  1,
);
for (const source of [controllerSource, domainSource]) {
  assert.doesNotMatch(source, /\bbuildTerritorialContext\s*\(/);
  assert.doesNotMatch(source, /\bbuildComparabilityContext\s*\(/);
}
assert.match(controllerSource, /window\.history\.replaceState/);
assert.equal(
  (controllerSource.match(/addEventListener\("popstate"/g) ?? [])
    .length,
  1,
);
assert.doesNotMatch(appSource, /\bdispatchScenario\b/);
assert.match(appSource, /inspector:\s*renderInspector/);
assert.match(appSource, /selectInspectorCase\(requested,\s*\{\s*render:\s*false\s*\}\)/);
assert.match(indexSource, /renderInspector/);
const featureStyleOrder = [
  "./styles/50-views.css",
  "./styles/55-inspector.css",
  "./styles/56-benchmark.css",
  "./styles/57-comparison.css",
  "./styles/60-states.css",
].map((specifier) => stylesManifestSource.indexOf(specifier));
assert.ok(featureStyleOrder.every((index) => index >= 0));
assert.deepEqual(
  featureStyleOrder,
  [...featureStyleOrder].sort((left, right) => left - right),
);
for (const eventName of [
  "viva:scenario-territory",
  "viva:scenario-product",
  "viva:scenario-visualization",
  "viva:scenario-project-select",
]) {
  assert.ok(controllerSource.includes(eventName));
}
for (const eventName of Object.values(COMPARISON_EVENTS)) {
  assert.ok(controllerSource.includes(eventName));
}
for (const hook of [
  "data-compare-toggle",
  "data-compare-remove",
  "data-compare-target-toggle",
  "data-comparison-row-target",
]) {
  assert.ok(controllerSource.includes(hook));
}
assert.doesNotMatch(controllerSource, /from\s+["']\.\/views\//u);
assert.doesNotMatch(controllerSource, /\bbuildComparisonModel\s*\(/u);
for (const hook of [
  "data-scenario-scope",
  "data-scenario-quadrant",
  "data-scenario-radius",
  "data-scenario-visualization",
  "data-scenario-project",
]) {
  assert.ok(controllerSource.includes(hook));
}
assert.ok(controllerSource.includes("median_latitude"));
assert.ok(controllerSource.includes("median_longitude"));
assert.ok(controllerSource.includes("radius_meters: 1000"));
assert.ok(controllerSource.includes("Centro observado del distrito"));

console.log(
  `Arquitectura OK: ${graph.size} módulos alcanzables, contexto único 90/85 y una recomposición por cambio.`,
);

async function visit(modulePath) {
  if (graph.has(modulePath)) return;
  const source = await fs.readFile(modulePath, "utf8");
  const dependencies = [
    ...source.matchAll(
      /^\s*(?:import|export)(?:[\s\S]*?\sfrom\s*)?["']([^"']+)["'];?\s*$/gm,
    ),
  ]
    .map((match) => match[1])
    .filter((specifier) => specifier.startsWith("."))
    .map((specifier) => path.resolve(path.dirname(modulePath), specifier));
  graph.set(modulePath, dependencies);
  await Promise.all(dependencies.map(visit));
}

function walk(modulePath) {
  if (visiting.has(modulePath)) {
    const start = stack.indexOf(modulePath);
    cycles.push(
      [...stack.slice(start), modulePath]
        .map((item) => path.basename(item))
        .join(" → "),
    );
    return;
  }
  if (visited.has(modulePath)) return;
  visiting.add(modulePath);
  stack.push(modulePath);
  for (const dependency of graph.get(modulePath) ?? []) walk(dependency);
  stack.pop();
  visiting.delete(modulePath);
  visited.add(modulePath);
}
