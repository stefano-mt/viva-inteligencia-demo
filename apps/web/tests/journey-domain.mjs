import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_JOURNEY_STAGE_ID,
  JOURNEY_CAPABILITY_STATUS,
  JOURNEY_MODULE_RETURN_STAGE,
  JOURNEY_STAGE_IDS,
  JOURNEY_STAGES,
  canonicalReturnStageForModule,
  expertLinksForStage,
  isJourneyStageId,
  journeyAvailability,
  journeyNeighbors,
  journeyStageById,
} from "../public/js/journey.js";
import { journeyEntry, journeyStages, views } from "../public/js/config.js";

const projectDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const expectedStageIds = [
  "scale",
  "geography",
  "quality",
  "depth",
  "movement",
  "decision",
];

assert.equal(DEFAULT_JOURNEY_STAGE_ID, "scale");
assert.deepEqual(JOURNEY_STAGE_IDS, expectedStageIds);
assert.deepEqual(JOURNEY_STAGES.map(({ id }) => id), expectedStageIds);
assert.strictEqual(journeyStages, JOURNEY_STAGES);
assert.deepEqual(journeyEntry, {
  id: "journey",
  label: "Recorrido ejecutivo",
  hint: "Seis decisiones con evidencia",
  defaultStageId: "scale",
});

assert.equal(Object.isFrozen(JOURNEY_STAGES), true);
assert.equal(Object.isFrozen(JOURNEY_STAGE_IDS), true);
for (const [index, stage] of JOURNEY_STAGES.entries()) {
  assert.equal(Object.isFrozen(stage), true);
  assert.equal(Object.isFrozen(stage.sourceKeys), true);
  assert.equal(Object.isFrozen(stage.provenanceKeys), true);
  assert.equal(Object.isFrozen(stage.expertLinks), true);
  assert.equal(stage.position, index + 1);
  assert.equal(stage.id, expectedStageIds[index]);
  assert.match(stage.label, /\S/u);
  assert.match(stage.question, /^\u00bf.+\?$/u);
  assert.match(stage.primaryActionLabel, /\S/u);
  assert.match(stage.fallbackCode, /^[a-z0-9_]+$/u);
  assert.match(stage.minimumContractVersion, /^2\.[1-4]\.0$/u);
  assert.ok(stage.sourceKeys.length >= 1);
  assert.ok(stage.provenanceKeys.length >= 1);
  assert.ok(stage.expertLinks.length >= 1);
}

assert.deepEqual(JOURNEY_STAGES[0].sourceKeys, [
  "data.metadata.counts",
  "data.pilot.counts",
  "state.scenarioContext",
]);
assert.deepEqual(JOURNEY_STAGES[2].sourceKeys, [
  "data.inspector.case:case:f3-ct-g-pardo",
]);
assert.equal(JOURNEY_STAGES[2].scope, "transversal_miraflores");
assert.deepEqual(JOURNEY_STAGES[5].sourceKeys, [
  "state.assistantResponse",
  "checklist",
]);
assert.equal(JOURNEY_STAGES[5].implicitComputation, false);

assert.equal(isJourneyStageId("scale"), true);
assert.equal(isJourneyStageId("decision"), true);
assert.equal(isJourneyStageId("unknown"), false);
assert.equal(isJourneyStageId(null), false);
assert.strictEqual(journeyStageById("quality"), JOURNEY_STAGES[2]);
assert.equal(journeyStageById("QUALITY"), null);

assert.deepEqual(journeyNeighbors("scale"), {
  previousStageId: null,
  nextStageId: "geography",
});
assert.deepEqual(journeyNeighbors("quality"), {
  previousStageId: "geography",
  nextStageId: "depth",
});
assert.deepEqual(journeyNeighbors("decision"), {
  previousStageId: "movement",
  nextStageId: null,
});
assert.equal(journeyNeighbors("unknown"), null);

assert.deepEqual(JOURNEY_MODULE_RETURN_STAGE, {
  dashboard: "geography",
  projects: "depth",
  inspector: "quality",
  market: "scale",
  compare: "depth",
  activity: "movement",
  assistant: "decision",
  trust: "decision",
});
assert.deepEqual(
  Object.keys(JOURNEY_MODULE_RETURN_STAGE).sort(),
  views.map(({ id }) => id).sort(),
);
for (const [moduleId, stageId] of Object.entries(
  JOURNEY_MODULE_RETURN_STAGE,
)) {
  assert.equal(canonicalReturnStageForModule(moduleId), stageId);
  assert.equal(isJourneyStageId(stageId), true);
}
assert.equal(canonicalReturnStageForModule("sources"), null);
assert.equal(canonicalReturnStageForModule("unknown"), null);

const expertLinks = {
  scale: ["market"],
  geography: ["dashboard", "projects"],
  quality: ["inspector"],
  depth: ["market", "compare", "projects"],
  movement: ["activity"],
  decision: ["assistant", "trust"],
};
for (const [stageId, links] of Object.entries(expertLinks)) {
  assert.deepEqual(expertLinksForStage(stageId), links);
  assert.ok(
    links.every((moduleId) => views.some(({ id }) => id === moduleId)),
  );
}
assert.deepEqual(expertLinksForStage("unknown"), []);

const expectedCapabilities = {
  "2.0.0": [],
  "2.1.0": ["scale", "geography"],
  "2.2.0": ["scale", "geography", "quality"],
  "2.3.0": ["scale", "geography", "quality", "depth"],
  "2.4.0": expectedStageIds,
};
for (const [version, availableStageIds] of Object.entries(
  expectedCapabilities,
)) {
  for (const stageId of expectedStageIds) {
    const result = journeyAvailability(version, stageId);
    const isAvailable = availableStageIds.includes(stageId);
    assert.equal(result.stageId, stageId);
    assert.equal(result.contractVersion, version);
    assert.equal(result.available, isAvailable);
    assert.equal(
      result.status,
      version === "2.0.0"
        ? JOURNEY_CAPABILITY_STATUS.contractUnavailable
        : isAvailable
          ? JOURNEY_CAPABILITY_STATUS.available
          : JOURNEY_CAPABILITY_STATUS.capabilityUnavailable,
    );
  }
}
assert.deepEqual(journeyAvailability("3.0.0", "scale"), {
  stageId: "scale",
  contractVersion: "3.0.0",
  available: false,
  status: JOURNEY_CAPABILITY_STATUS.contractUnavailable,
  minimumContractVersion: "2.1.0",
});
assert.deepEqual(journeyAvailability("2.4.0", "unknown"), {
  stageId: null,
  contractVersion: "2.4.0",
  available: false,
  status: JOURNEY_CAPABILITY_STATUS.invalidStage,
  minimumContractVersion: null,
});

const source = await fs.readFile(
  path.join(projectDir, "public", "js", "journey.js"),
  "utf8",
);
assert.doesNotMatch(source, /^\s*import\s/mu);
assert.doesNotMatch(
  source,
  /\b(?:window|document|localStorage|sessionStorage|fetch|XMLHttpRequest)\b/u,
);
assert.doesNotMatch(
  source,
  /\b(?:buildTerritorialContext|buildBenchmarkContext|buildComparisonModel|buildAssistantResponse)\s*\(/u,
);

console.log(
  "Journey domain OK: six frozen stages, deterministic handoffs, compatibility 2.0–2.4 and zero hidden computation.",
);
