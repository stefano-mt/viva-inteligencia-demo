import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { buildComparisonModel } from "../public/js/benchmark.js";
import { buildEvidenceDossier } from "../public/js/evidence-inspector.js";
import { buildChecklistModel } from "../public/js/views/checklist.js";
import {
  generateAssistantResponse,
  initializeScenarioData,
  setAssistantDraft,
  state,
} from "../public/js/state.js";

const data = JSON.parse(
  await fs.readFile(
    new URL("../../../data/generated/viva-platform-demo.json", import.meta.url),
    "utf8",
  ),
);
const validArtifact = {
  status: "valid",
  geojson: { type: "FeatureCollection", features: [] },
  url: "demo-data/district-boundaries.geojson",
  expected_sha256: data.geography.boundary_artifact_sha256,
  actual_sha256: data.geography.boundary_artifact_sha256,
  reason: null,
};

initializeScenarioData(data, { geographyArtifact: validArtifact });
const journey = state.journeyContext.stages;

assert.equal(
  journey.scale.data.modelAgencyCount,
  data.metadata.counts.canonical_agencies,
);
assert.deepEqual(journey.scale.data.pilot, {
  baseCount: data.pilot.counts.base_count,
  enrichedCount: data.pilot.counts.enriched_count,
  deepCount: data.pilot.counts.deep_count,
});
assert.deepEqual(journey.geography.data.coverage, state.scenarioContext.geography_coverage);
assert.equal(
  journey.geography.data.comparableProjectCount,
  state.scenarioContext.market_reading.comparable_project_count,
);

const qualityCase = data.inspector.cases.find(
  ({ case_id: caseId }) => caseId === "case:f3-ct-g-pardo",
);
const qualityDossier = buildEvidenceDossier({
  model: data.model,
  inspector: data.inspector,
  projectId: qualityCase.project_id,
  typologyId: qualityCase.typology_id,
});
const factsById = new Map(
  qualityDossier.facts.map((fact) => [fact.fact_id, fact]),
);
assert.deepEqual(
  journey.quality.data.cardArea,
  factsById.get("fact:pardo-coast-card-area"),
);
assert.deepEqual(
  journey.quality.data.planArea,
  factsById.get("fact:pardo-coast-plan-area"),
);
assert.deepEqual(
  journey.quality.data.areaDelta,
  factsById.get("fact:pardo-coast-area-delta"),
);
assert.deepEqual(journey.quality.data.decision, qualityDossier.decision);

assert.equal(journey.depth.data.benchmarkStatus, state.benchmarkContext.status);
assert.deepEqual(journey.depth.data.scope, state.benchmarkContext.scope);
assert.deepEqual(
  journey.depth.data.quantitative,
  state.benchmarkContext.quantitative.pricePerM2Total,
);
assert.deepEqual(
  journey.depth.data.qualitative,
  state.benchmarkContext.qualitative,
);
const canonicalSelection = state.compareProjectIds.map(
  (projectId) => `project:nexo-${projectId}`,
);
const expertComparison = buildComparisonModel({
  benchmarkContext: state.benchmarkContext,
  selectedProjectIds: canonicalSelection,
  includeTargetScenario: state.compareIncludeTarget,
});
assert.deepEqual(journey.depth.data.comparison, expertComparison);

assert.deepEqual(journey.movement.data.coverage, state.historyContext.coverage);
assert.deepEqual(journey.movement.data.timeline, state.historyContext.timeline);
assert.deepEqual(journey.movement.data.agenda, state.historyContext.agenda);

const expertChecklist = buildChecklistModel({
  data,
  scenarioContext: state.scenarioContext,
});
assert.deepEqual(journey.decision.data.checklist, {
  available: expertChecklist.available,
  scopeText: expertChecklist.scopeText,
  comparableCount: expertChecklist.comparableCount,
  priceReferenceCount: expertChecklist.priceReferenceCount,
  evidenceCoverage: expertChecklist.evidenceCoverage,
  cutoffAt: state.scenarioContext.cutoff_at,
  comparabilityStatus: state.scenarioContext.comparability_status,
  priceStatus: state.scenarioContext.price_status,
});

const intent = data.assistant.intents[0];
setAssistantDraft(intent.suggested_questions[0], intent.intent_id);
const response = generateAssistantResponse();
assert.deepEqual(
  state.journeyContext.stages.decision.data.response,
  response,
  "Decision must reproduce the existing assistant response literally",
);

const journeySource = await fs.readFile(
  new URL("../../../packages/domain/src/legacy/journey.js", import.meta.url),
  "utf8",
);
const stateSource = await fs.readFile(
  new URL("../public/js/state.js", import.meta.url),
  "utf8",
);
assert.doesNotMatch(
  journeySource,
  /\b(?:buildTerritorialContext|buildComparabilityContext|buildBenchmarkContext|buildComparisonModel|buildHistoryContext|buildAssistantResponse|buildEvidenceDossier)\s*\(/u,
);
assert.equal(
  (stateSource.match(/\bbuildJourneyContext\s*\(/gu) ?? []).length,
  1,
  "State must have exactly one journey composition site",
);
assert.equal(
  (stateSource.match(/\bbuildAssistantResponse\s*\(/gu) ?? []).length,
  1,
  "Journey integration must not create an implicit assistant response",
);

console.log(
  "Journey parity OK: six stages reuse authoritative scenario, dossier, benchmark, comparison, history, checklist and assistant outputs.",
);

