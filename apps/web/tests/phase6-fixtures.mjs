import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildJourneyContext,
  JOURNEY_STAGE_IDS,
  journeyAvailability,
  journeyStageById,
} from "../public/js/journey.js";
import {
  initializeScenarioData,
  state,
} from "../public/js/state.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const scenarioDirectory = path.join(testDirectory, "e2e-scenarios");
const fixtureIds = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "p",
];
const readJson = async (filePath) =>
  JSON.parse(await fs.readFile(filePath, "utf8"));
const fixtures = await Promise.all(
  fixtureIds.map((id) =>
    readJson(path.join(scenarioDirectory, `ct-${id}-journey.json`)),
  ),
);
const publicData = await readJson(
  path.resolve(testDirectory, "../../..", "data", "generated", "viva-platform-demo.json"),
);

assert.deepEqual(
  fixtures.map(({ case_id: caseId }) => caseId),
  ["CT-A", "CT-B", "CT-C", "CT-D", "CT-E", "CT-F", "CT-G", "CT-H", "CT-I", "CT-P"],
);
assert.equal(new Set(fixtures.map(({ case_id: caseId }) => caseId)).size, 10);

for (const fixture of fixtures) {
  assert.equal(fixture.fixture_version, 1, `${fixture.case_id} fixture version`);
  assert.ok(JOURNEY_STAGE_IDS.includes(fixture.stage_id), `${fixture.case_id} stage`);
  assert.equal(fixture.scenario_path, `/#journey/${fixture.stage_id}`);
  assert.ok(fixture.story_ids.includes("HU-DEMO-103"));
  assert.ok(fixture.story_ids.includes("HU-DEMO-801"));
  assert.equal(fixture.expected.capability_status, "available");
  assert.deepEqual(
    fixture.expected.expert_routes,
    [...journeyStageById(fixture.stage_id).expertLinks],
    `${fixture.case_id} expert handoff drifted`,
  );
  assert.ok(fixture.expected.claim.length >= 24, `${fixture.case_id} claim`);
  if (fixture.source_fixture) {
    await fs.access(path.join(scenarioDirectory, fixture.source_fixture));
  }
}

const expectedCapabilityMatrix = {
  "2.0.0": [],
  "2.1.0": ["scale", "geography"],
  "2.2.0": ["scale", "geography", "quality"],
  "2.3.0": ["scale", "geography", "quality", "depth"],
  "2.4.0": JOURNEY_STAGE_IDS,
};

for (const [contractVersion, availableStages] of Object.entries(
  expectedCapabilityMatrix,
)) {
  const context = buildJourneyContext({ contractVersion });
  assert.equal(
    context.status,
    contractVersion === "2.0.0" ? "contract_unavailable" : "ready",
  );
  for (const stageId of JOURNEY_STAGE_IDS) {
    const availability = journeyAvailability(contractVersion, stageId);
    assert.equal(
      availability.available,
      availableStages.includes(stageId),
      `${contractVersion} ${stageId} capability`,
    );
    assert.equal(
      context.stages[stageId].status,
      contractVersion === "2.0.0"
        ? "contract_unavailable"
        : availableStages.includes(stageId)
          ? ["scale", "geography", "depth", "movement", "decision"].includes(stageId)
            ? "insufficient"
            : "empty"
          : "capability_unavailable",
      `${contractVersion} ${stageId} fallback`,
    );
  }
  assert.doesNotMatch(JSON.stringify(context), /NaN|Infinity|∞/u);
}

const validArtifact = {
  status: "valid",
  geojson: { type: "FeatureCollection", features: [] },
  url: "demo-data/district-boundaries.geojson",
  expected_sha256: publicData.geography.boundary_artifact_sha256,
  actual_sha256: publicData.geography.boundary_artifact_sha256,
  reason: null,
};
initializeScenarioData(publicData, { geographyArtifact: validArtifact });

const publicStatuses = Object.fromEntries(
  Object.entries(state.journeyContext.stages).map(([stageId, stage]) => [
    stageId,
    stage.status,
  ]),
);
assert.deepEqual(publicStatuses, {
  scale: "ready",
  geography: "ready",
  quality: "ready",
  depth: "insufficient",
  movement: "ready",
  decision: "ready",
});
for (const fixture of fixtures) {
  assert.equal(
    publicStatuses[fixture.stage_id],
    fixture.expected.public_stage_status,
    `${fixture.case_id} public status`,
  );
}

assert.deepEqual(state.journeyContext.stages.scale.data, {
  modelAgencyCount: 184,
  pilot: { baseCount: 30, enrichedCount: 22, deepCount: 5 },
  scenario: {
    scopeText: "Miraflores · Distrito completo",
    observedProjectCount: 90,
    comparableProjectCount: 85,
  },
});
assert.equal(
  state.journeyContext.stages.geography.data.scope.observed_project_count,
  90,
);
assert.equal(
  state.journeyContext.stages.geography.data.comparableProjectCount,
  85,
);
assert.equal(
  state.journeyContext.stages.quality.data.caseId,
  "case:f3-ct-g-pardo",
);
assert.equal(
  state.journeyContext.stages.quality.data.cardArea.normalized_value,
  104.15,
);
assert.equal(
  state.journeyContext.stages.quality.data.planArea.normalized_value,
  53.37,
);
assert.equal(
  state.journeyContext.stages.quality.data.areaDelta.normalized_value,
  50.78,
);
assert.equal(
  state.journeyContext.stages.quality.data.decision.benchmarkEligible,
  false,
);
assert.ok(state.journeyContext.stages.movement.data.timeline.length > 0);
assert.equal(
  state.journeyContext.stages.movement.data.timeline[0].cause,
  null,
);
assert.equal(state.journeyContext.stages.decision.data.mode, "checklist");
assert.equal(state.journeyContext.stages.decision.data.response, null);

const emptyCases = {
  scale: buildJourneyContext({
    contractVersion: "2.4.0",
    metadataCounts: {},
    pilotCounts: {},
    scenarioContext: {},
  }).stages.scale,
  geography: buildJourneyContext({
    contractVersion: "2.4.0",
    scenarioContext: {
      scope: { observed_project_count: 0 },
      geography_coverage: { included: 0, total: 0, pct: 0 },
      market_reading: { comparable_project_count: 0 },
      excluded_projects: [],
    },
    geographyArtifact: { status: "valid" },
  }).stages.geography,
  quality: buildJourneyContext({ contractVersion: "2.4.0" }).stages.quality,
  depth: buildJourneyContext({
    contractVersion: "2.4.0",
    benchmarkContext: {
      status: "ready",
      quantitative: { pricePerM2Total: { n: 0 } },
    },
    comparisonModel: { status: "ready" },
  }).stages.depth,
  movement: buildJourneyContext({
    contractVersion: "2.4.0",
    historyContext: { status: "ready", timeline: [] },
  }).stages.movement,
  decision: buildJourneyContext({ contractVersion: "2.4.0" }).stages.decision,
};
assert.deepEqual(
  Object.fromEntries(
    Object.entries(emptyCases).map(([stageId, stage]) => [stageId, stage.status]),
  ),
  {
    scale: "insufficient",
    geography: "empty",
    quality: "empty",
    depth: "insufficient",
    movement: "empty",
    decision: "insufficient",
  },
);
for (const [stageId, stage] of Object.entries(emptyCases)) {
  assert.ok(stage.correctiveAction?.href, `${stageId} corrective action`);
  assert.doesNotMatch(JSON.stringify(stage), /NaN|Infinity|∞/u);
}

const errorCases = buildJourneyContext({
  contractVersion: "2.4.0",
  benchmarkContext: { status: "error", quantitative: {} },
  comparisonModel: { status: "ready" },
  historyContext: { status: "invalid_context", timeline: [] },
});
assert.equal(errorCases.stages.depth.status, "error");
assert.equal(errorCases.stages.movement.status, "error");

assert.doesNotMatch(JSON.stringify(state.journeyContext), /NaN|Infinity|∞/u);
console.log(
  "Phase 6 fixtures OK: CT-A–I/P, 2.0–2.4, six empty states, errors and public parity verified.",
);
