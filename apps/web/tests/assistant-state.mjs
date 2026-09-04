import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  canonicalScenarioSearch,
  clearAssistantResponse,
  dispatchScenario,
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

initializeScenarioData(data, { boundaryArtifactStatus: "valid" });
assert.equal(state.assistantInput, "");
assert.equal(state.assistantIntentId, null);
assert.equal(state.assistantResponse, null);

const intent = data.assistant.intents.find(
  ({ intent_id: intentId }) => intentId === "intent:market-changes",
);
const query = intent.suggested_questions[0];
const transition = setAssistantDraft(query, intent.intent_id);
assert.equal(transition.changed, true);
assert.equal(state.assistantResponse, null);

const scenarioBefore = structuredClone(state.scenarioContext);
const dataBefore = structuredClone(data);
const response = generateAssistantResponse();
assert.equal(response.status, "ready");
assert.equal(response.intentId, intent.intent_id);
assert.deepEqual(
  response.blocks.map(({ type }) => type),
  data.assistant.answer_contract.block_types,
);
assert.ok(response.references.some(({ id }) => id === "scenario:active"));
assert.deepEqual(state.scenarioContext, scenarioBefore);
assert.deepEqual(data, dataBefore);
assert.ok(state.assistantResponseRevision > 0);
assert.doesNotMatch(canonicalScenarioSearch(), /assistant|query|pregunta/iu);

const priorRevision = state.assistantResponseRevision;
dispatchScenario({
  type: "SET_TERRITORY",
  patch: { scope_mode: "quadrant", quadrant_id: "NW" },
});
assert.ok(state.assistantResponseRevision > priorRevision);
assert.equal(state.assistantResponse.scenario.scopeMode, "quadrant");
assert.equal(
  state.assistantResponse.scenario.quadrantId,
  state.scenarioContext.scenario.quadrant_id,
);

setAssistantDraft("¿Cuál es la velocidad del viento?", null);
assert.equal(state.assistantResponse, null);
assert.equal(generateAssistantResponse().status, "unknown_intent");

setAssistantDraft(
  "a".repeat(data.assistant.policy.maximum_input_characters + 1),
  null,
);
assert.equal(generateAssistantResponse().status, "invalid_input");

assert.equal(clearAssistantResponse(), true);
assert.equal(state.assistantInput, "");
assert.equal(state.assistantIntentId, null);
assert.equal(state.assistantResponse, null);

const legacy = structuredClone(data);
legacy.metadata.contract_version = "2.3.0";
delete legacy.history;
initializeScenarioData(legacy, { boundaryArtifactStatus: "valid" });
setAssistantDraft("¿Cuál es la lectura principal del escenario activo?");
assert.equal(generateAssistantResponse().status, "contract_unavailable");

console.log(
  "Assistant state OK: session-only draft, single derived response, scenario recomputation and contract fallback verified.",
);
