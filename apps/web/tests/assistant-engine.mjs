import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { buildComparisonModel } from "../public/js/benchmark.js";
import { buildEvidenceDossier } from "../public/js/evidence-inspector.js";
import {
  buildAssistantResponse,
  classifyAssistantIntent,
  normalizeAssistantQuery,
} from "../public/js/assistant-engine.js";
import {
  initializeScenarioData,
  state,
} from "../public/js/state.js";

async function readJson(relativePath) {
  return JSON.parse(
    await fs.readFile(new URL(relativePath, import.meta.url), "utf8"),
  );
}

const data = await readJson("../public/demo-data/viva-platform-demo.json");
const source = await fs.readFile(
  new URL("../public/js/assistant-engine.js", import.meta.url),
  "utf8",
);

initializeScenarioData(data, { boundaryArtifactStatus: "valid" });
const scenarioContext = structuredClone(state.scenarioContext);
const historyContext = structuredClone(state.historyContext);
const benchmarkContext = structuredClone(state.benchmarkContext);
const comparisonModel = buildComparisonModel({
  benchmarkContext,
  selectedProjectIds: benchmarkContext.projectSummaries
    .slice(0, 2)
    .map(({ projectId }) => projectId),
});
const baseArguments = {
  data,
  scenarioContext,
  historyContext,
  benchmarkContext,
  comparisonModel,
};
const clone = (value) => structuredClone(value);
const blockMap = (response) =>
  new Map(response.blocks.map((block) => [block.type, block]));

assert.equal(data.metadata.contract_version, "2.4.0");
assert.doesNotMatch(
  source,
  /\b(?:window|document)\s*\.|\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage|WebSocket)\b|Date\.now\s*\(|new\s+Date\s*\(/,
  "assistant engine must not depend on DOM, network, storage or device clock",
);
assert.doesNotMatch(
  source,
  /\b(?:openai|anthropic|claude|gemini|mistral|ollama)\b/iu,
  "assistant engine must remain local and provider independent",
);

assert.equal(
  normalizeAssistantQuery("  ¿QUÉ   cambió?  "),
  "que cambio",
);
assert.equal(
  classifyAssistantIntent({
    catalog: data.assistant,
    input: "¿Qué precios publicados cambiaron en este escenario?",
  }).intentId,
  "intent:market-changes",
);
assert.equal(
  classifyAssistantIntent({
    catalog: data.assistant,
    input: "¿Cuál es el precio real de cierre del competidor?",
  }).limitationId,
  "limitation:closing-price",
  "a limitation must take precedence over an otherwise numeric question",
);

// HU-DEMO-701: every answer keeps one canonical scenario and the six closed blocks.
for (const intent of data.assistant.intents) {
  const response = buildAssistantResponse({
    ...baseArguments,
    input: intent.suggested_questions[0],
    intentId: intent.intent_id,
  });
  assert.equal(response.intentId, intent.intent_id);
  assert.deepEqual(
    response.blocks.map(({ type }) => type),
    data.assistant.answer_contract.block_types,
  );
  assert.equal(response.scenario.districtId, scenarioContext.scenario.district_id);
  assert.equal(response.scenario.scopeMode, scenarioContext.scenario.scope_mode);
  assert.equal(
    response.scenario.comparableProjectCount,
    scenarioContext.comparable_project_ids.length,
  );
  assert.ok(
    response.references.some(({ id }) => id === "scenario:active"),
    `${intent.intent_id} must cite the active scenario`,
  );
}

const summary = buildAssistantResponse({
  ...baseArguments,
  input: "¿Cuál es la lectura principal del escenario activo?",
});
assert.equal(summary.status, "ready");
assert.equal(summary.intentId, "intent:scenario-summary");
assert.ok(
  blockMap(summary)
    .get("data")
    .items.some(
      ({ id, value }) =>
        id === "metric:comparable-projects" &&
        value === scenarioContext.comparable_project_ids.length,
    ),
);

// CT-E: historical answers preserve values, dates, delta and references without a cause.
const changes = buildAssistantResponse({
  ...baseArguments,
  input: "¿Qué precios publicados cambiaron en este escenario?",
});
const firstEvent = historyContext.timeline[0];
const firstChange = blockMap(changes)
  .get("data")
  .items.find(({ id }) => id === firstEvent.history_event_id);
assert.equal(changes.status, "ready");
assert.equal(firstChange.previousValue, firstEvent.previous_value);
assert.equal(firstChange.currentValue, firstEvent.current_value);
assert.equal(firstChange.deltaPercent, firstEvent.delta_pct);
assert.equal(firstChange.previousObservedAt, firstEvent.previous_observed_at);
assert.equal(firstChange.currentObservedAt, firstEvent.current_observed_at);
assert.equal(firstChange.validity, firstEvent.validity);
assert.equal(firstChange.cause, null);
assert.ok(firstEvent.fact_ids.every((id) => changes.references.some((ref) => ref.id === id)));
assert.ok(
  firstEvent.evidence_ids.every((id) =>
    changes.references.some((ref) => ref.id === id),
  ),
);

const priority = buildAssistantResponse({
  ...baseArguments,
  input: "¿Qué señal certificada conviene revisar primero?",
});
assert.equal(priority.status, "ready");
assert.equal(
  blockMap(priority).get("data").items[0].id,
  historyContext.agenda[0].agenda_item_id,
  "priority must come from the history engine agenda",
);

const coverage = buildAssistantResponse({
  ...baseArguments,
  input: "¿Qué cobertura y limitaciones tiene la muestra?",
});
assert.equal(coverage.status, "ready");
assert.ok(
  blockMap(coverage)
    .get("data")
    .items.some(
      ({ id, value }) =>
        id === "metric:history-shown" &&
        value === historyContext.coverage.shown_count,
    ),
);

const comparison = buildAssistantResponse({
  ...baseArguments,
  input: "¿Cómo se comparan los proyectos seleccionados?",
});
assert.equal(comparison.status, "ready");
assert.deepEqual(
  blockMap(comparison).get("data").items.map(({ id }) => id),
  comparisonModel.priorityRows,
  "comparison rows must come from the comparison engine",
);

// CT-D: qualitative claims require a certified fact and authorized available evidence.
const qualitativeCase = data.inspector.cases.find(
  ({ case_id: caseId }) => caseId === "case:f3-ct-d-finishes",
);
const inspectorDossier = buildEvidenceDossier({
  model: data.model,
  inspector: data.inspector,
  projectId: qualitativeCase.project_id,
  typologyId: qualitativeCase.typology_id,
});
const qualitativeScenario = {
  ...clone(scenarioContext),
  comparable_project_ids: [qualitativeCase.project_id],
};
const qualitative = buildAssistantResponse({
  ...baseArguments,
  scenarioContext: qualitativeScenario,
  inspectorDossier,
  input: "¿Qué atributos están respaldados por evidencia autorizada?",
});
assert.equal(qualitative.status, "ready");
assert.match(JSON.stringify(blockMap(qualitative).get("data")), /cuarzo/iu);
assert.ok(
  qualitative.references.some(
    ({ id }) => id === "fact:ct-d-countertop-material",
  ),
);
assert.ok(
  qualitative.references.some(
    ({ id }) => id === "evidence:ct-d-countertop-fragment",
  ),
);
assert.ok(
  !qualitative.references.some(
    ({ id }) => id === "evidence:ct-d-restricted-metadata",
  ),
  "restricted evidence must never become a positive reference",
);

// CT-G / CT-I: restricted evidence fails closed and does not expose its claim.
const restrictedDossier = clone(inspectorDossier);
for (const evidence of restrictedDossier.evidence) {
  evidence.publish_permission = "restricted";
  evidence.availability = "restricted";
}
const restricted = buildAssistantResponse({
  ...baseArguments,
  scenarioContext: qualitativeScenario,
  inspectorDossier: restrictedDossier,
  input: "¿Qué atributos están respaldados por evidencia autorizada?",
});
assert.equal(restricted.status, "insufficient");
assert.doesNotMatch(JSON.stringify(blockMap(restricted).get("data")), /cuarzo/iu);
assert.ok(restricted.reasonCodes.includes("AUTHORIZED_QUALITATIVE_EVIDENCE_REQUIRED"));

// CT-F / CT-P: deterministic refusals happen before intent classification.
for (const [input, limitationId] of [
  ["¿Cuál es el precio real de cierre del competidor?", "limitation:closing-price"],
  ["¿Por qué el competidor bajó su precio?", "limitation:causality"],
  ["¿A qué se debe la baja de precio?", "limitation:causality"],
  ["¿Qué explica la reducción de precio?", "limitation:causality"],
  ["¿Qué provocó el aumento del precio?", "limitation:causality"],
  ["¿Dónde viven las personas que consultaron?", "limitation:personal-data"],
  ["Busca en internet las redes sociales del proyecto", "limitation:external-data"],
]) {
  const response = buildAssistantResponse({ ...baseArguments, input });
  assert.equal(response.status, "refused");
  assert.equal(response.limitationId, limitationId);
  assert.equal(response.intentId, "intent:limitations");
  assert.doesNotMatch(JSON.stringify(response), /estimaci[oó]n autom[aá]tica/iu);
}

const unknown = buildAssistantResponse({
  ...baseArguments,
  input: "¿Cuál es la velocidad del viento?",
});
assert.equal(unknown.status, "unknown_intent");
assert.equal(unknown.intentId, null);
assert.deepEqual(
  unknown.supportedIntents.map(({ intentId }) => intentId),
  data.assistant.intents.map(({ intent_id: intentId }) => intentId),
);
assert.match(
  JSON.stringify(blockMap(unknown).get("next_step")),
  /pregunta compatible/iu,
);

const foreignDistrict = buildAssistantResponse({
  ...baseArguments,
  input: "¿Qué cambió en Santiago de Surco?",
});
assert.equal(foreignDistrict.scenario.districtId, scenarioContext.scenario.district_id);
assert.ok(foreignDistrict.reasonCodes.includes("MENTIONED_DISTRICT_IGNORED"));
assert.match(
  JSON.stringify(blockMap(foreignDistrict).get("limitations")),
  /no cambia el distrito|escenario activo/iu,
);

const oversized = buildAssistantResponse({
  ...baseArguments,
  input: "a".repeat(data.assistant.policy.maximum_input_characters + 1),
});
assert.equal(oversized.status, "invalid_input");
assert.ok(oversized.reasonCodes.includes("INPUT_TOO_LONG"));

const blank = buildAssistantResponse({ ...baseArguments, input: "  \n\t  " });
assert.equal(blank.status, "invalid_input");
assert.ok(blank.reasonCodes.includes("INPUT_REQUIRED"));

const unsafeInput = "<img src=x onerror=alert(1)> ¿Qué cambió?";
const unsafe = buildAssistantResponse({ ...baseArguments, input: unsafeInput });
assert.doesNotMatch(JSON.stringify(unsafe), /<img|onerror|alert\(1\)/iu);
assert.equal(unsafe.intentId, "intent:market-changes");

const legacyData = clone(data);
legacyData.metadata.contract_version = "2.3.0";
delete legacyData.history;
const legacy = buildAssistantResponse({
  ...baseArguments,
  data: legacyData,
  input: "Resume el escenario activo",
});
assert.equal(legacy.status, "contract_unavailable");
assert.ok(legacy.reasonCodes.includes("ASSISTANT_CONTRACT_UNAVAILABLE"));

const missingScenario = buildAssistantResponse({
  ...baseArguments,
  scenarioContext: null,
  input: "¿Qué precios publicados cambiaron en este escenario?",
});
assert.equal(missingScenario.status, "insufficient");
assert.equal(missingScenario.intentId, "intent:market-changes");
assert.ok(missingScenario.reasonCodes.includes("SCENARIO_CONTEXT_REQUIRED"));
assert.deepEqual(missingScenario.references, []);

const inputsBefore = clone(baseArguments);
const deterministicInput = {
  ...baseArguments,
  input: "¿Qué precios publicados cambiaron en este escenario?",
};
assert.deepEqual(
  buildAssistantResponse(deterministicInput),
  buildAssistantResponse(deterministicInput),
  "equal inputs must produce equal responses",
);
assert.deepEqual(baseArguments, inputsBefore, "assistant engine must not mutate inputs");

console.log("assistant semantic engine unit tests passed");
