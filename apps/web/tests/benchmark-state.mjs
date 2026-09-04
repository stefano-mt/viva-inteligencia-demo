import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  INSPECTOR_ACTIONS,
  dispatchInspector,
  dispatchScenario,
  initializeScenarioData,
  state,
  updateBoundaryArtifact
} from "../public/js/state.js";

const data = JSON.parse(
  await fs.readFile(
    new URL("../public/demo-data/viva-platform-demo.json", import.meta.url),
    "utf8"
  )
);
const stateSource = await fs.readFile(
  new URL("../public/js/state.js", import.meta.url),
  "utf8"
);
const validArtifact = {
  status: "valid",
  geojson: { type: "FeatureCollection", features: [] },
  url: "demo-data/district-boundaries.geojson",
  expected_sha256: data.geography.boundary_artifact_sha256,
  actual_sha256: data.geography.boundary_artifact_sha256,
  reason: null
};

const canonicalProjectId = (value) => {
  const id = String(value ?? "");
  if (id.startsWith("project:")) return id;
  if (id.startsWith("observed:nexo-")) {
    return `project:nexo-${id.slice("observed:nexo-".length)}`;
  }
  return id.includes(":") ? null : `project:nexo-${id}`;
};
const legacyProjectId = (value) =>
  String(value ?? "").replace(/^project:nexo-/, "");

function assertSharedRevision(label) {
  assert.ok(state.scenarioContext, `${label}: scenario context`);
  assert.ok(state.benchmarkContext, `${label}: benchmark context`);
  assert.equal(
    state.benchmarkContext.revision,
    state.scenarioContextRevision,
    `${label}: benchmark revision`
  );
  assert.equal(
    state.scenarioContext.revision,
    state.scenarioContextRevision,
    `${label}: territorial revision`
  );
  if (!["contract_unavailable", "error"].includes(state.benchmarkContext.status)) {
    assert.deepEqual(
      [...state.benchmarkContext.scope.projectIds].sort(),
      [...state.scenarioContext.comparable_project_ids].sort(),
      `${label}: benchmark must consume the canonical comparable universe`
    );
    assert.equal(
      state.benchmarkContext.scope.projectCount,
      state.scenarioContext.comparable_project_ids.length,
      `${label}: benchmark project count`
    );
    assert.equal(
      state.benchmarkContext.scope.districtId,
      state.scenarioContext.scope.district_id,
      `${label}: district scope`
    );
    assert.equal(
      state.benchmarkContext.scope.scopeMode,
      state.scenarioContext.scope.scope_mode,
      `${label}: scope mode`
    );
  }
}

assert.equal(
  (stateSource.match(/\bbuildBenchmarkContext\s*\(/gu) ?? []).length,
  1,
  "state.js must have exactly one benchmark composition site"
);
assert.equal(
  (stateSource.match(/\bbuildTerritorialContext\s*\(/gu) ?? []).length,
  1,
  "P4 must not add another territorial composition"
);
assert.doesNotMatch(stateSource, /benchmarkMicrozone|benchmarkTerritory/iu);

initializeScenarioData(data, { geographyArtifact: validArtifact });
assert.equal(state.scenarioContextRevision, 1);
assertSharedRevision("initial 2.4 composition");
assert.equal(state.benchmarkContext.status, "orientative_noncomparable");
assert.equal(state.benchmarkContext.scope.projectCount, 85);
assert.equal(state.benchmarkContext.quantitative.pricePerM2Total.n, 0);
assert.equal(state.benchmarkContext.quantitative.pricePerM2Total.orientative.n, 68);
assert.equal(state.benchmarkContext.qualitative.coverage.usedProjectIds.length, 82);
assert.equal(state.benchmarkContext.targetScenario, null);
assert.equal(state.compareIncludeTarget, false);
assert.equal(Object.hasOwn(state, "benchmarkScenarioContext"), false);

const firstInteraction = dispatchScenario({
  type: "SET_TERRITORY",
  patch: { scope_mode: "district" }
});
assert.equal(firstInteraction.recomputed, true);
assertSharedRevision("first interaction normalization");
const initialBenchmarkReference = state.benchmarkContext;
const initialScenarioReference = state.scenarioContext;
const initialRevision = state.scenarioContextRevision;
const noOp = dispatchScenario({
  type: "SET_TERRITORY",
  patch: { scope_mode: "district" }
});
assert.equal(noOp.recomputed, false);
assert.equal(state.scenarioContextRevision, initialRevision);
assert.strictEqual(state.scenarioContext, initialScenarioReference);
assert.strictEqual(state.benchmarkContext, initialBenchmarkReference);

const beforeInspectorBenchmark = state.benchmarkContext;
const beforeInspectorRevision = state.scenarioContextRevision;
dispatchInspector({
  type: INSPECTOR_ACTIONS.selectCase,
  caseId: "case:f3-ct-g-pardo"
});
assert.strictEqual(state.benchmarkContext, beforeInspectorBenchmark);
assert.equal(state.scenarioContextRevision, beforeInspectorRevision);

const validIds = state.scenarioContext.comparable_project_ids.slice(0, 2);
state.compareProjectIds = validIds.map(legacyProjectId);
const scenarioBeforeValidSelection = structuredClone(state.scenario);
const revisionBeforeValidSelection = state.scenarioContextRevision;
updateBoundaryArtifact(validArtifact);
assert.equal(state.scenarioContextRevision, revisionBeforeValidSelection + 1);
assert.deepEqual(
  state.compareProjectIds,
  validIds.map(legacyProjectId),
  "a valid two-project selection must survive recomposition without silent expansion"
);
assert.deepEqual(
  state.scenario,
  scenarioBeforeValidSelection,
  "preserving a valid selection must not rewrite the scenario"
);

state.compareProjectIds = [
  legacyProjectId(validIds[0]),
  "project:not-in-scenario",
  validIds[1],
  legacyProjectId(validIds[0])
];
state.compareIncludeTarget = true;
const scenarioBeforeSelectionCorrection = structuredClone(state.scenario);
const revisionBeforeSelectionCorrection = state.scenarioContextRevision;
const benchmarkBeforeSelectionCorrection = state.benchmarkContext;
const corrected = updateBoundaryArtifact(validArtifact);
assert.equal(corrected.recomputed, true);
assert.equal(
  state.scenarioContextRevision,
  revisionBeforeSelectionCorrection + 1,
  "one external revision must create exactly one new scenario revision"
);
assert.notStrictEqual(state.benchmarkContext, benchmarkBeforeSelectionCorrection);
assertSharedRevision("selection correction");
assert.deepEqual(
  state.scenario,
  scenarioBeforeSelectionCorrection,
  "selection repair must not rewrite the scenario"
);
assert.equal(state.compareProjectIds.length, 2);
assert.equal(new Set(state.compareProjectIds).size, 2);
assert.equal(state.compareProjectIds[0], legacyProjectId(validIds[0]));
assert.equal(state.compareProjectIds[1], legacyProjectId(validIds[1]));
assert.ok(
  state.compareProjectIds.every((id) =>
    state.scenarioContext.comparable_project_ids.includes(canonicalProjectId(id))
  ),
  "invalid comparison IDs must be removed without changing the scenario universe"
);
assert.equal(
  state.compareIncludeTarget,
  false,
  "the Viva column cannot remain active without a configured target"
);

const targetRevision = state.scenarioContextRevision;
const targetTransition = dispatchScenario({
  type: "APPLY_PRODUCT_FILTERS",
  patch: { target_area_m2: 80, target_price_pen: 650000 }
});
assert.equal(targetTransition.recomputed, true);
assert.equal(state.scenarioContextRevision, targetRevision + 1);
assertSharedRevision("configured Viva target");
assert.equal(state.benchmarkContext.targetScenario.projectId, "target:viva");
assert.equal(state.benchmarkContext.targetScenario.district, "Miraflores");
assert.equal(
  state.benchmarkContext.targetScenario.pricePerM2.normalizedValue,
  8125
);
state.compareIncludeTarget = true;

const targetBenchmarkReference = state.benchmarkContext;
const targetNoOp = dispatchScenario({
  type: "APPLY_PRODUCT_FILTERS",
  patch: { target_area_m2: 80, target_price_pen: 650000 }
});
assert.equal(targetNoOp.recomputed, false);
assert.strictEqual(state.benchmarkContext, targetBenchmarkReference);
assert.equal(state.compareIncludeTarget, true);

const quadrantRevision = state.scenarioContextRevision;
const quadrantTransition = dispatchScenario({
  type: "SET_TERRITORY",
  patch: { scope_mode: "quadrant", quadrant_id: "NW" }
});
assert.equal(quadrantTransition.recomputed, true);
assert.equal(state.scenarioContextRevision, quadrantRevision + 1);
assertSharedRevision("quadrant scenario");
assert.equal(state.benchmarkContext.scope.scopeMode, "quadrant");
assert.equal(state.benchmarkContext.scope.quadrantId, "NW");
assert.equal(state.compareIncludeTarget, true);
assert.ok(
  state.compareProjectIds.every((id) =>
    state.benchmarkContext.scope.projectIds.includes(canonicalProjectId(id))
  )
);

const resetRevision = state.scenarioContextRevision;
const reset = dispatchScenario({ type: "RESET" });
assert.equal(reset.recomputed, true);
assert.equal(state.scenarioContextRevision, resetRevision + 1);
assertSharedRevision("scenario reset");
assert.equal(state.benchmarkContext.targetScenario, null);
assert.equal(state.compareIncludeTarget, false);

for (const contractVersion of ["2.1.0", "2.2.0"]) {
  const legacy = structuredClone(data);
  legacy.metadata.contract_version = contractVersion;
  delete legacy.benchmark;
  initializeScenarioData(legacy, { geographyArtifact: validArtifact });
  assertSharedRevision(`legacy ${contractVersion}`);
  assert.equal(state.benchmarkContext.status, "contract_unavailable");
  assert.equal(state.scenarioContext.comparable_project_ids.length, 85);
  assert.equal(state.compareIncludeTarget, false);
}

const malformedBenchmark = structuredClone(data);
delete malformedBenchmark.benchmark.methodology.pairing_policy;
initializeScenarioData(malformedBenchmark, { geographyArtifact: validArtifact });
assertSharedRevision("malformed 2.4 benchmark");
assert.equal(state.benchmarkContext.status, "error");
assert.deepEqual(state.benchmarkContext.errorCodes, [
  "DUPLICATE_OR_INVALID_MODEL_IDS"
]);
assert.deepEqual(
  state.benchmarkContext.scope.projectIds,
  [],
  "an invalid benchmark contract must fail closed without partial benchmark scope"
);
assert.equal(
  state.scenarioContext.comparable_project_ids.length,
  85,
  "a failed F4 capability must not alter the F2 territorial scenario"
);

initializeScenarioData(null);
assert.equal(state.scenarioContext, null);
assert.equal(state.benchmarkContext, null);
assert.equal(state.scenarioContextRevision, 0);
assert.equal(state.compareIncludeTarget, false);

console.log(
  "Benchmark state OK: one context per revision, shared scenario universe, " +
    "selection repair and 2.1/2.2 degradation verified."
);
