import assert from "node:assert/strict";
import {
  loadContractSchema,
  validateSchemaShape
} from "../../../tools/data/src/data/validate.js";

const schema = loadContractSchema();
const clone = (value) => structuredClone(value);
const hasError = (errors, code, path) =>
  errors.some((error) => error.code === code && error.path === path);
const expectDefinitionValid = (value, definition, path) =>
  assert.deepEqual(
    validateSchemaShape(value, definition, { rootSchema: schema, path }),
    [],
    `${definition} must accept its canonical 2.4 shape`
  );

const historyEvent = {
  history_event_id: "history_event:test-change",
  project_id: "project:test",
  district_id: "150122",
  field: "published_price_from",
  unit: "PEN",
  currency: "PEN",
  previous_observation_id: "observation:test-before",
  current_observation_id: "observation:test-after",
  previous_value: 600000,
  current_value: 630000,
  delta_absolute: 30000,
  delta_pct: 5,
  previous_observed_at: "2026-01-01T00:00:00Z",
  current_observed_at: "2026-02-01T00:00:00Z",
  detected_at: "2026-02-01T00:00:00Z",
  status: "certified",
  validity: "current",
  reason_codes: [],
  fact_ids: ["fact:test-before", "fact:test-after"],
  evidence_ids: [],
  cause: null,
  cause_evidence_ids: []
};

const history = {
  version: 1,
  policy: {
    cutoff_at: "2026-07-30T00:00:00-05:00",
    field_semantics: ["published_price_from_project"],
    currency: "PEN",
    current_max_days: 30,
    aging_max_days: 90,
    maximum_certified_absolute_delta_pct: 30,
    ordering: [
      "scenario_membership",
      "quality",
      "validity",
      "evidence",
      "magnitude",
      "recency",
      "canonical_id"
    ],
    cause_policy: "observed_evidence_only"
  },
  events: [historyEvent],
  by_project_id: [
    {
      project_id: "project:test",
      history_event_ids: ["history_event:test-change"]
    }
  ],
  by_district_id: [
    {
      district_id: "150122",
      history_event_ids: ["history_event:test-change"]
    }
  ],
  coverage: {
    candidate_count: 1,
    materialized_count: 1,
    certified_count: 1,
    reviewable_count: 0,
    excluded_count: 0,
    districts: [
      {
        district_id: "150122",
        candidate_count: 1,
        materialized_count: 1,
        certified_count: 1,
        reviewable_count: 0,
        excluded_count: 0
      }
    ],
    excluded_reasons: []
  },
  fingerprints: [
    {
      input_id: "input:history-test",
      path: "data/fixtures/history-test.json",
      sha256: "a".repeat(64)
    }
  ]
};

const assistant = {
  version: 1,
  policy: {
    mode: "deterministic_catalog",
    locale: "es-PE",
    query_persistence: false,
    external_requests: false,
    maximum_input_characters: 500,
    unknown_intent_behavior: "explain_supported_questions"
  },
  intents: [
    {
      intent_id: "intent:scenario-summary",
      family: "scenario_summary",
      label: "Entender el escenario",
      suggested_questions: ["¿Qué muestra el escenario activo?"],
      required_capabilities: ["scenario"],
      response_kind: "summary",
      reference_policy: "scenario_required"
    }
  ],
  answer_contract: {
    block_types: [
      "answer",
      "data",
      "interpretation",
      "limitations",
      "references",
      "next_step"
    ],
    scenario_reference_required: true,
    numeric_reference_required: true,
    qualitative_evidence_required: true
  },
  limitations: [
    {
      limitation_id: "limitation:closing-price",
      topic: "closing_price",
      message: "La demo no dispone de precios reales de cierre.",
      behavior: "refuse_and_explain"
    }
  ],
  compatibility: {
    minimum_contract_version: "2.4.0",
    previous_contract_behavior: "contract_unavailable"
  }
};

assert.deepEqual(
  schema.$defs.metadata.properties.contract_version.enum,
  ["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0"],
  "reader must expose the complete ordered 2.0–2.4 compatibility range"
);
expectDefinitionValid(history, "history", "$.history");
expectDefinitionValid(historyEvent, "historyEvent", "$.history.events[0]");
expectDefinitionValid(assistant, "assistant", "$.assistant");
expectDefinitionValid(assistant.intents[0], "assistantIntent", "$.assistant.intents[0]");

const openHistory = clone(history);
openHistory.duplicated_values = true;
assert.ok(
  hasError(
    validateSchemaShape(openHistory, "history", {
      rootSchema: schema,
      path: "$.history"
    }),
    "SCHEMA_ADDITIONAL_PROPERTY",
    "$.history.duplicated_values"
  ),
  "history must reject duplicated/open payload values"
);

const causeWithoutEvidence = clone(historyEvent);
causeWithoutEvidence.cause = "Cambio comercial";
assert.ok(
  hasError(
    validateSchemaShape(causeWithoutEvidence, "historyEvent", {
      rootSchema: schema,
      path: "$.history.events[0]"
    }),
    "SCHEMA_MIN_ITEMS",
    "$.history.events[0].cause_evidence_ids"
  ),
  "a non-null cause must require causal evidence"
);

const legacyAssistant = {};
assert.ok(
  hasError(
    validateSchemaShape(legacyAssistant, "assistant", {
      rootSchema: schema,
      path: "$.assistant"
    }),
    "SCHEMA_REQUIRED",
    "$.assistant.version"
  ),
  "2.4 assistant must reject the open legacy shape"
);

const gate24 = validateSchemaShape(
  { metadata: { contract_version: "2.4.0" } },
  schema,
  { rootSchema: schema, path: "$" }
);
for (const requiredPath of [
  "$.scenario_catalogs",
  "$.scenario_defaults",
  "$.geography",
  "$.inspector",
  "$.benchmark",
  "$.history"
]) {
  assert.ok(
    hasError(gate24, "SCHEMA_REQUIRED", requiredPath),
    `2.4 must gate ${requiredPath}`
  );
}

const legacy23WithHistory = validateSchemaShape(
  {
    metadata: { contract_version: "2.3.0" },
    history
  },
  schema,
  { rootSchema: schema, path: "$" }
);
assert.ok(
  hasError(legacy23WithHistory, "SCHEMA_FALSE", "$.history"),
  "2.0–2.3 must not advertise the 2.4 history capability"
);

console.log(
  "History/assistant contract OK: closed 2.4 indexes, causal evidence gate and 2.0–2.4 revision gates verified."
);
