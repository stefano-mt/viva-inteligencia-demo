import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  applyJourneyRouteEffects,
} from "../public/js/controller.js";
import {
  buildJourneyContext,
  JOURNEY_STAGE_IDS,
} from "../public/js/journey.js";
import {
  dispatchScenario,
  generateAssistantResponse,
  initializeScenarioData,
  setAssistantDraft,
  setHistoryFilters,
  state,
} from "../public/js/state.js";

const data = JSON.parse(
  await fs.readFile(
    new URL("../../../data/generated/viva-platform-demo.json", import.meta.url),
    "utf8",
  ),
);

const validArtifact = (payload = data) => ({
  status: "valid",
  geojson: { type: "FeatureCollection", features: [] },
  url: "demo-data/district-boundaries.geojson",
  expected_sha256: payload.geography.boundary_artifact_sha256,
  actual_sha256: payload.geography.boundary_artifact_sha256,
  reason: null,
});

initializeScenarioData(data, { geographyArtifact: validArtifact() });

assert.ok(state.journeyContext);
assert.equal(state.journeyContextRevision, 1);
assert.equal(state.journeyContext.revision, state.journeyContextRevision);
assert.equal(
  state.journeyContext.scenarioRevision,
  state.scenarioContextRevision,
);
assert.equal(
  state.journeyContext.historyRevision,
  state.historyContextRevision,
);
assert.deepEqual(Object.keys(state.journeyContext.stages), JOURNEY_STAGE_IDS);

const scale = state.journeyContext.stages.scale;
assert.equal(scale.status, "ready");
assert.equal(
  scale.data.modelAgencyCount,
  data.metadata.counts.canonical_agencies,
);
assert.deepEqual(scale.data.pilot, {
  baseCount: data.pilot.counts.base_count,
  enrichedCount: data.pilot.counts.enriched_count,
  deepCount: data.pilot.counts.deep_count,
});
assert.equal(
  scale.data.scenario.observedProjectCount,
  state.scenarioContext.scope.observed_project_count,
);
assert.equal(
  scale.data.scenario.comparableProjectCount,
  state.scenarioContext.market_reading.comparable_project_count,
);

const geography = state.journeyContext.stages.geography;
assert.equal(geography.status, "ready");
assert.equal(geography.data.scopeText, state.scenarioContext.scope_text);
assert.deepEqual(
  geography.data.coverage,
  state.scenarioContext.geography_coverage,
);
assert.equal(
  geography.data.comparableProjectCount,
  state.scenarioContext.market_reading.comparable_project_count,
);
assert.equal(
  geography.data.excludedProjectCount,
  state.scenarioContext.excluded_projects.length,
);

const qualityBeforeScenario = structuredClone(
  state.journeyContext.stages.quality,
);
assert.equal(qualityBeforeScenario.status, "ready");
assert.equal(qualityBeforeScenario.data.transversal, true);
assert.equal(qualityBeforeScenario.data.caseId, "case:f3-ct-g-pardo");
assert.equal(qualityBeforeScenario.data.project.district, "Miraflores");
assert.equal(qualityBeforeScenario.data.cardArea.normalized_value, 104.15);
assert.equal(qualityBeforeScenario.data.planArea.normalized_value, 53.37);
assert.equal(qualityBeforeScenario.data.areaDelta.normalized_value, 50.78);
assert.equal(qualityBeforeScenario.data.decision.benchmarkEligible, false);

const scenarioBeforeQualityCheck = structuredClone(state.scenarioContext);
dispatchScenario({
  type: "SET_TERRITORY",
  patch: { district_id: "150121", scope_mode: "district" },
});
assert.notDeepEqual(state.scenarioContext, scenarioBeforeQualityCheck);
assert.deepEqual(
  state.journeyContext.stages.quality,
  qualityBeforeScenario,
  "Tipo 7 must remain transversal and independent from the active scenario",
);

const revisionBeforeHistory = state.journeyContextRevision;
setHistoryFilters({ statuses: ["certified"] });
assert.equal(state.journeyContextRevision, revisionBeforeHistory + 1);
assert.equal(
  state.journeyContext.stages.movement.data.coverage.shown_count,
  state.historyContext.coverage.shown_count,
);

assert.equal(state.journeyContext.stages.decision.data.mode, "checklist");
assert.equal(state.journeyContext.stages.decision.data.response, null);
assert.deepEqual(
  state.journeyContext.stages.decision.correctiveAction,
  { label: "Formular consulta en el asistente", href: "#assistant" },
);

const intent = data.assistant.intents.find(
  ({ intent_id: intentId }) => intentId === "intent:market-reading",
) ?? data.assistant.intents[0];
setAssistantDraft(intent.suggested_questions[0], intent.intent_id);
const response = generateAssistantResponse();
assert.equal(state.journeyContext.stages.decision.data.mode, "assistant_response");
assert.deepEqual(state.journeyContext.stages.decision.data.response, response);
assert.notStrictEqual(
  state.journeyContext.stages.decision.data.response,
  state.assistantResponse,
  "Journey must copy the existing response instead of sharing mutable state",
);

for (const [version, availableStages] of Object.entries({
  "2.0.0": [],
  "2.1.0": ["scale", "geography"],
  "2.2.0": ["scale", "geography", "quality"],
  "2.3.0": ["scale", "geography", "quality", "depth"],
  "2.4.0": JOURNEY_STAGE_IDS,
})) {
  const context = buildJourneyContext({ contractVersion: version });
  for (const stageId of JOURNEY_STAGE_IDS) {
    assert.equal(
      context.stages[stageId].capability.available,
      availableStages.includes(stageId),
      `${version} ${stageId}`,
    );
  }
}

const missingGeography = buildJourneyContext({
  contractVersion: "2.4.0",
  scenarioContext: {
    scope: { observed_project_count: 0 },
    geography_coverage: { included: 0, total: 0, pct: 0 },
    market_reading: { comparable_project_count: 0 },
    excluded_projects: [],
  },
  geographyArtifact: { status: "valid" },
});
assert.equal(missingGeography.stages.geography.status, "empty");
assert.deepEqual(missingGeography.stages.geography.correctiveAction, {
  label: "Ajustar escenario",
  href: "#dashboard",
});
assert.doesNotMatch(JSON.stringify(missingGeography), /NaN|Infinity/u);

let focused = false;
const liveRegion = { textContent: "" };
const title = {
  setAttribute() {},
  focus(options) {
    focused = options?.preventScroll === true;
  },
};
const documentRef = {
  getElementById(id) {
    return id === "journey-title" ? title : id === "journey-live" ? liveRegion : null;
  },
};
const focusTransition = applyJourneyRouteEffects({
  previousRoute: { view: "journey", stageId: "scale" },
  route: { view: "journey", stageId: "geography" },
  documentRef,
});
assert.equal(focusTransition.changed, true);
assert.equal(focusTransition.focused, true);
assert.equal(focused, true);
assert.match(focusTransition.announcement, /Etapa 2 de 6: Geograf[ií]a/u);
assert.equal(liveRegion.textContent, focusTransition.announcement);

focused = false;
const sameStage = applyJourneyRouteEffects({
  previousRoute: { view: "journey", stageId: "geography" },
  route: { view: "journey", stageId: "geography" },
  documentRef,
});
assert.equal(sameStage.changed, false);
assert.equal(sameStage.focused, false);
assert.equal(focused, false);

console.log(
  "Journey state OK: six derived stages, revisions, compatibility, transversal quality, literal decision and route focus verified.",
);
