import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  COMPARISON_EVENTS,
  bindEvents,
  focusComparisonRow,
  setComparisonProject,
  setComparisonTarget,
} from "../public/js/controller.js";
import {
  dispatchScenario,
  initializeScenarioData,
  state,
} from "../public/js/state.js";

const data = JSON.parse(
  await fs.readFile(
    new URL("../public/demo-data/viva-platform-demo.json", import.meta.url),
    "utf8",
  ),
);
const controllerSource = await fs.readFile(
  new URL("../public/js/controller.js", import.meta.url),
  "utf8",
);
const configSource = await fs.readFile(
  new URL("../public/js/config.js", import.meta.url),
  "utf8",
);
const styleManifest = await fs.readFile(
  new URL("../public/styles.css", import.meta.url),
  "utf8",
);
const packageJson = JSON.parse(
  await fs.readFile(new URL("../package.json", import.meta.url), "utf8"),
);

initializeScenarioData(data, { boundaryArtifactStatus: "valid" });
const canonicalIds = [...state.scenarioContext.comparable_project_ids];
assert.equal(canonicalIds.length, 85);
assert.equal(state.compareProjectIds.length, 3);

const initialBenchmark = state.benchmarkContext;
const initialSelection = [...state.compareProjectIds];
const removed = setComparisonProject(initialSelection[0], false, {
  render: false,
});
assert.equal(removed.changed, true);
assert.equal(removed.reasonCode, "project_removed");
assert.equal(removed.selectedProjectIds.length, 2);
assert.ok(removed.selectedProjectIds.every((id) => id.startsWith("project:")));
assert.strictEqual(
  state.benchmarkContext,
  initialBenchmark,
  "selection events must not rebuild the benchmark context",
);

const added = setComparisonProject(canonicalIds[3], true, { render: false });
assert.equal(added.changed, true);
assert.equal(added.reasonCode, "project_added");
assert.equal(added.selectedProjectIds.length, 3);
assert.match(added.announcement, /3 de 3 proyectos seleccionados/u);

const maximum = setComparisonProject(canonicalIds[4], true, {
  render: false,
});
assert.equal(maximum.changed, false);
assert.equal(maximum.reasonCode, "maximum_reached");
assert.deepEqual(maximum.selectedProjectIds, added.selectedProjectIds);

const outside = setComparisonProject("project:outside-scenario", true, {
  render: false,
});
assert.equal(outside.changed, false);
assert.equal(outside.reasonCode, "outside_scenario");
assert.deepEqual(outside.selectedProjectIds, added.selectedProjectIds);

const targetUnavailable = setComparisonTarget(true, { render: false });
assert.equal(targetUnavailable.changed, false);
assert.equal(targetUnavailable.reasonCode, "target_unavailable");
assert.equal(state.compareIncludeTarget, false);
assert.match(targetUnavailable.announcement, /Configura precio y área/u);

dispatchScenario({
  type: "APPLY_PRODUCT_FILTERS",
  patch: { target_area_m2: 80, target_price_pen: 650000 },
});
const targetBenchmark = state.benchmarkContext;
const targetAdded = setComparisonTarget(true, { render: false });
assert.equal(targetAdded.changed, true);
assert.equal(targetAdded.reasonCode, "target_added");
assert.equal(state.compareIncludeTarget, true);
assert.match(targetAdded.announcement, /columna simulada/u);
assert.strictEqual(state.benchmarkContext, targetBenchmark);
const targetRemoved = setComparisonTarget(false, { render: false });
assert.equal(targetRemoved.changed, true);
assert.equal(targetRemoved.reasonCode, "target_removed");
assert.equal(state.compareIncludeTarget, false);
assert.strictEqual(state.benchmarkContext, targetBenchmark);

const liveRegion = { textContent: "" };
const comparisonGroup = { open: false };
let rowFocused = false;
let rowScrolled = false;
const comparisonRow = {
  dataset: { comparisonRow: "areas.total" },
  closest(selector) {
    return selector === "details.comparison-group" ? comparisonGroup : null;
  },
  querySelector(selector) {
    return selector === ".comparison-metric-row__label span"
      ? { textContent: "Área total" }
      : null;
  },
  focus() {
    rowFocused = true;
  },
  scrollIntoView(options) {
    rowScrolled = options?.block === "start";
  },
};

const documentListeners = new Map();
const windowListeners = new Map();
const fakeLocation = {
  href: "https://demo.test/?sv=1#compare",
  pathname: "/",
  search: "?sv=1",
  hash: "#compare",
};
globalThis.window = {
  location: fakeLocation,
  history: {
    replaceState(_state, _unused, value) {
      const url = new URL(value, "https://demo.test");
      Object.assign(fakeLocation, {
        href: url.href,
        pathname: url.pathname,
        search: url.search,
        hash: url.hash,
      });
    },
  },
  addEventListener(type, listener) {
    const listeners = windowListeners.get(type) ?? [];
    listeners.push(listener);
    windowListeners.set(type, listeners);
  },
};
globalThis.document = {
  activeElement: null,
  querySelectorAll(selector) {
    return selector === "[data-comparison-row]" ? [comparisonRow] : [];
  },
  querySelector() {
    return null;
  },
  getElementById(id) {
    return id === "scenario-live" ? liveRegion : null;
  },
  addEventListener(type, listener) {
    const listeners = documentListeners.get(type) ?? [];
    listeners.push(listener);
    documentListeners.set(type, listeners);
  },
};

assert.equal(focusComparisonRow("areas.total"), true);
assert.equal(comparisonGroup.open, true);
assert.equal(rowFocused, true);
assert.equal(rowScrolled, true);
assert.match(liveRegion.textContent, /Criterio Área total/u);
assert.equal(focusComparisonRow("missing.row"), false);
assert.match(liveRegion.textContent, /No se encontró/u);

let renderCount = 0;
bindEvents(() => {
  renderCount += 1;
});
bindEvents(() => {
  renderCount += 1;
});
for (const eventName of Object.values(COMPARISON_EVENTS)) {
  assert.equal(
    documentListeners.get(eventName)?.length,
    1,
    `${eventName} must have exactly one central document listener`,
  );
}

const selectedBeforeEvent = state.compareProjectIds[0];
const renderCountBeforeEvent = renderCount;
documentListeners.get(COMPARISON_EVENTS.selection)[0]({
  detail: {
    projectId: selectedBeforeEvent,
    selected: false,
    render: false,
  },
});
assert.ok(!state.compareProjectIds.includes(selectedBeforeEvent));
assert.equal(renderCount, renderCountBeforeEvent);

dispatchScenario({
  type: "APPLY_PRODUCT_FILTERS",
  patch: { target_area_m2: 80, target_price_pen: 650000 },
});
documentListeners.get(COMPARISON_EVENTS.target)[0]({
  detail: { included: true, render: false },
});
assert.equal(state.compareIncludeTarget, true);
documentListeners.get(COMPARISON_EVENTS.rowFocus)[0]({
  detail: { rowId: "areas.total" },
});
assert.equal(rowFocused, true);

delete globalThis.window;
delete globalThis.document;

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
assert.match(controllerSource, /event\.key !== "Escape"/u);
assert.doesNotMatch(controllerSource, /\bbuildComparisonModel\s*\(/u);
assert.doesNotMatch(controllerSource, /from\s+["']\.\/views\//u);
assert.match(configSource, /Benchmark de microzona/u);
assert.match(configSource, /Comparador comercial/u);

const expectedStyles = [
  "./styles/50-views.css",
  "./styles/55-inspector.css",
  "./styles/56-benchmark.css",
  "./styles/57-comparison.css",
  "./styles/60-states.css",
];
const stylePositions = expectedStyles.map((specifier) =>
  styleManifest.indexOf(specifier),
);
assert.ok(stylePositions.every((position) => position >= 0));
assert.deepEqual(
  stylePositions,
  [...stylePositions].sort((left, right) => left - right),
);

assert.match(packageJson.scripts.check, /public\/js\/benchmark\.js/u);
assert.match(packageJson.scripts.check, /tests\/benchmark-events\.mjs/u);
assert.match(packageJson.scripts["test:benchmark"], /test:benchmark:data/u);
assert.match(packageJson.scripts["test:benchmark"], /test:benchmark:view/u);
assert.match(packageJson.scripts.verify, /test:benchmark/u);

console.log(
  "Benchmark events OK: canonical selection, max-three rule, Viva target, announcements, row focus, central listeners, labels and ordered CSS verified.",
);
