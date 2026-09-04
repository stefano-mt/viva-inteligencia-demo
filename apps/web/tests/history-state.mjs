import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  dispatchScenario,
  initializeScenarioData,
  selectHistoryEvent,
  setHistoryFilters,
  state,
  updateBoundaryArtifact,
} from "../public/js/state.js";

const data = JSON.parse(
  await fs.readFile(
    new URL("../../../data/generated/viva-platform-demo.json", import.meta.url),
    "utf8",
  ),
);
const stateSource = await fs.readFile(
  new URL("../public/js/state.js", import.meta.url),
  "utf8",
);
const validArtifact = {
  status: "valid",
  geojson: { type: "FeatureCollection", features: [] },
  url: "demo-data/district-boundaries.geojson",
  expected_sha256: data.geography.boundary_artifact_sha256,
  actual_sha256: data.geography.boundary_artifact_sha256,
  reason: null,
};
const defaultFilters = {
  statuses: ["certified", "reviewable", "insufficient"],
  validities: ["current", "aging", "historical", "unknown"],
  directions: ["increase", "decrease", "unchanged"],
};

function expectedScenarioEventCount() {
  const comparable = new Set(state.scenarioContext.comparable_project_ids);
  return data.history.events.filter(({ project_id }) => comparable.has(project_id))
    .length;
}

function assertSharedHistoryRevision(label) {
  assert.ok(state.scenarioContext, `${label}: scenario context`);
  assert.ok(state.historyContext, `${label}: history context`);
  assert.equal(
    state.historyContext.scenario_revision,
    state.scenarioContextRevision,
    `${label}: scenario revision`,
  );
  assert.equal(
    state.historyContext.revision,
    state.historyContextRevision,
    `${label}: history revision`,
  );
  assert.deepEqual(
    state.historyContext.scenario.comparable_project_ids,
    [...state.scenarioContext.comparable_project_ids].sort(),
    `${label}: canonical comparable universe`,
  );
  assert.ok(
    state.historyContext.timeline.every(({ project_id }) =>
      state.scenarioContext.comparable_project_ids.includes(project_id),
    ),
    `${label}: no signal outside the active scenario`,
  );
}

assert.equal(data.metadata.contract_version, "2.4.0");
assert.equal(
  (stateSource.match(/\bbuildHistoryContext\s*\(/gu) ?? []).length,
  1,
  "state.js must have exactly one history composition site",
);
assert.doesNotMatch(
  stateSource,
  /price_delta_pct|latest_price_history/iu,
  "state integration must not rebuild history from the legacy projection",
);

const payloadBefore = structuredClone(data);
initializeScenarioData(data, { geographyArtifact: validArtifact });
assert.deepEqual(data, payloadBefore, "state composition must not mutate payload");
assert.equal(state.scenarioContextRevision, 1);
assert.equal(state.historyContextRevision, 1);
assertSharedHistoryRevision("initial 2.4 composition");
assert.equal(state.historyContext.status, "ready");
assert.equal(state.historyContext.timeline.length, expectedScenarioEventCount());
assert.deepEqual(state.historyFilters, defaultFilters);
assert.equal(state.selectedHistoryEventId, null);
assert.notEqual(state.benchmarkContext.status, "error");

const scenarioReference = state.scenarioContext;
const scenarioRevision = state.scenarioContextRevision;
const historyRevision = state.historyContextRevision;
const certifiedTransition = setHistoryFilters({ statuses: ["certified"] });
assert.equal(certifiedTransition.changed, true);
assert.equal(state.scenarioContextRevision, scenarioRevision);
assert.strictEqual(state.scenarioContext, scenarioReference);
assert.equal(state.historyContextRevision, historyRevision + 1);
assert.ok(
  state.historyContext.timeline.every(
    ({ effective_status }) => effective_status === "certified",
  ),
);
assert.deepEqual(state.historyFilters.statuses, ["certified"]);
assertSharedHistoryRevision("filtered composition");

const sameHistoryReference = state.historyContext;
const sameHistoryRevision = state.historyContextRevision;
const filterNoOp = setHistoryFilters({ statuses: ["certified"] });
assert.equal(filterNoOp.changed, false);
assert.equal(state.historyContextRevision, sameHistoryRevision);
assert.strictEqual(state.historyContext, sameHistoryReference);

const firstEventId = state.historyContext.timeline[0]?.history_event_id;
assert.ok(firstEventId);
assert.equal(selectHistoryEvent(firstEventId), true);
assert.equal(state.selectedHistoryEventId, firstEventId);
assert.equal(selectHistoryEvent("history_event:not-visible"), false);
assert.equal(state.selectedHistoryEventId, firstEventId);

const emptyTransition = setHistoryFilters({ validities: ["current"] });
assert.equal(emptyTransition.changed, true);
assert.equal(state.historyContext.status, "empty");
assert.equal(state.historyContext.timeline.length, 0);
assert.equal(
  state.selectedHistoryEventId,
  null,
  "selection must be invalidated when filters hide its event",
);
assert.equal(state.scenarioContextRevision, scenarioRevision);

setHistoryFilters({
  statuses: defaultFilters.statuses,
  validities: defaultFilters.validities,
  directions: defaultFilters.directions,
});
const districtBefore = state.scenario.district_id;
const alternateDistrict = data.geography.districts.find(
  ({ district_id }) => district_id !== districtBefore,
);
assert.ok(alternateDistrict);
const districtRevision = state.scenarioContextRevision;
const districtHistoryRevision = state.historyContextRevision;
const districtTransition = dispatchScenario({
  type: "SET_TERRITORY",
  patch: { district_id: alternateDistrict.district_id },
});
assert.equal(districtTransition.recomputed, true);
assert.equal(state.scenarioContextRevision, districtRevision + 1);
assert.equal(state.historyContextRevision, districtHistoryRevision + 1);
assertSharedHistoryRevision("district change");

const quadrantTransition = dispatchScenario({
  type: "SET_TERRITORY",
  patch: {
    district_id: data.scenario_defaults.district_id,
    scope_mode: "quadrant",
    quadrant_id: "NW",
  },
});
assert.equal(quadrantTransition.recomputed, true);
assert.equal(state.scenario.scope_mode, "quadrant");
assertSharedHistoryRevision("quadrant change");

setHistoryFilters({ statuses: ["reviewable"], directions: ["decrease"] });
const resetScenarioRevision = state.scenarioContextRevision;
const resetHistoryRevision = state.historyContextRevision;
const reset = dispatchScenario({ type: "RESET" });
assert.equal(reset.recomputed, true);
assert.equal(state.scenarioContextRevision, resetScenarioRevision + 1);
assert.equal(state.historyContextRevision, resetHistoryRevision + 1);
assert.deepEqual(state.historyFilters, defaultFilters);
assert.equal(state.selectedHistoryEventId, null);
assertSharedHistoryRevision("reset");

const beforeNoOpResetScenarioRevision = state.scenarioContextRevision;
setHistoryFilters({ statuses: ["reviewable"] });
const beforeNoOpResetHistoryRevision = state.historyContextRevision;
const noOpReset = dispatchScenario({ type: "RESET" });
assert.equal(noOpReset.recomputed, false);
assert.equal(state.scenarioContextRevision, beforeNoOpResetScenarioRevision);
assert.equal(state.historyContextRevision, beforeNoOpResetHistoryRevision + 1);
assert.deepEqual(state.historyFilters, defaultFilters);
assertSharedHistoryRevision("history-only reset");

for (const contractVersion of ["2.1.0", "2.2.0", "2.3.0"]) {
  const legacy = structuredClone(data);
  legacy.metadata.contract_version = contractVersion;
  delete legacy.history;
  if (contractVersion !== "2.3.0") delete legacy.benchmark;
  initializeScenarioData(legacy, { geographyArtifact: validArtifact });
  assert.equal(state.historyContext.status, "contract_unavailable");
  assert.deepEqual(state.historyContext.timeline, []);
  assertSharedHistoryRevision(`legacy ${contractVersion}`);
  assert.equal(
    state.benchmarkContext.status,
    contractVersion === "2.3.0"
      ? "orientative_noncomparable"
      : "contract_unavailable",
  );
}

initializeScenarioData(null);
assert.equal(state.scenarioContext, null);
assert.equal(state.benchmarkContext, null);
assert.equal(state.historyContext, null);
assert.equal(state.scenarioContextRevision, 0);
assert.equal(state.historyContextRevision, 0);
assert.deepEqual(state.historyFilters, defaultFilters);
assert.equal(state.selectedHistoryEventId, null);

console.log(
  "History state OK: one derived context, local filters, selection invalidation, reset and 2.1–2.4 degradation verified.",
);
