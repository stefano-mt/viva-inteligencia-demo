import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  evaluateAssistantRequest,
  validateAssistantCatalog
} from "../scripts/data/assistant.js";
import {
  evaluateHistoryCandidate,
  validateHistoryPolicy
} from "../scripts/data/history.js";
import {
  loadContractSchema,
  validatePrivacy,
  validateSchemaShape
} from "../scripts/data/validate.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const prototypeRoot = path.resolve(testDirectory, "..");
const repositoryRoot = path.resolve(prototypeRoot, "..", "..");

const readJson = async (...segments) =>
  JSON.parse(await fs.readFile(path.join(...segments), "utf8"));
const clone = (value) => structuredClone(value);

const [policy, catalog, fixtures] = await Promise.all([
  readJson(
    repositoryRoot,
    "data/source",
    "demo-pilot",
    "history-policy.json"
  ),
  readJson(
    repositoryRoot,
    "data/source",
    "demo-pilot",
    "assistant-intent-catalog.json"
  ),
  readJson(
    repositoryRoot,
    "data/source",
    "demo-pilot",
    "fixtures",
    "phase5-policy-cases.json"
  )
]);

const schema = loadContractSchema(
  path.join(prototypeRoot, "contracts", "demo-v2.schema.json")
);

assert.deepEqual(validateHistoryPolicy(policy), []);
assert.deepEqual(validateAssistantCatalog(catalog), []);
assert.deepEqual(
  validateSchemaShape(policy, "historyPolicy", {
    rootSchema: schema,
    path: "$.history.policy"
  }),
  [],
  "history policy must fit the frozen 2.4 contract"
);
assert.deepEqual(
  validateSchemaShape(catalog, "assistant", {
    rootSchema: schema,
    path: "$.assistant"
  }),
  [],
  "assistant catalog must fit the frozen 2.4 contract"
);

assert.equal(fixtures.fixture_version, 1);
assert.deepEqual(fixtures.contract_cases, [
  "CT-C",
  "CT-D",
  "CT-E",
  "CT-F",
  "CT-G",
  "CT-I",
  "CT-P"
]);
assert.equal(fixtures.history_cases.length, 8);
assert.equal(fixtures.assistant_cases.length, 7);

const historyById = new Map(
  fixtures.history_cases.map((fixture) => [fixture.case_id, fixture])
);
const assistantById = new Map(
  fixtures.assistant_cases.map((fixture) => [fixture.case_id, fixture])
);
assert.equal(historyById.size, fixtures.history_cases.length);
assert.equal(assistantById.size, fixtures.assistant_cases.length);

for (const fixture of fixtures.history_cases) {
  const actual = evaluateHistoryCandidate(fixture.input, policy);
  assert.deepEqual(
    actual,
    fixture.expected,
    `${fixture.case_id} history policy result changed`
  );
}

for (const fixture of fixtures.assistant_cases) {
  const actual = evaluateAssistantRequest(fixture.input, catalog);
  assert.deepEqual(
    actual,
    fixture.expected,
    `${fixture.case_id} assistant policy result changed`
  );
}

const ctC = historyById.get("ct-c-outside-scenario");
assert.equal(ctC.expected.materializable, true);
assert.equal(ctC.expected.visible_in_scenario, false);
assert.equal(ctC.expected.status, "certified");
assert.deepEqual(ctC.expected.reason_codes, []);

const normal = historyById.get("ct-e-normal-change");
assert.equal(normal.expected.delta_absolute, 30000);
assert.equal(normal.expected.delta_pct, 5);
assert.equal(normal.expected.status, "certified");
assert.equal(normal.expected.validity, "current");
assert.equal(normal.expected.cause, null);
assert.deepEqual(normal.expected.cause_evidence_ids, []);

const zeroBase = historyById.get("ct-e-zero-base");
assert.equal(zeroBase.expected.delta_pct, null);
assert.equal(zeroBase.expected.status, "reviewable");
assert.deepEqual(zeroBase.expected.reason_codes, ["base_zero"]);

const extreme = historyById.get("ct-e-extreme-change");
assert.equal(extreme.expected.delta_pct, 60);
assert.equal(extreme.expected.status, "reviewable");
assert.deepEqual(extreme.expected.reason_codes, ["extreme_change"]);

assert.deepEqual(
  historyById.get("ct-e-unknown-currency").expected.reason_codes,
  ["unknown_currency"]
);
assert.deepEqual(
  historyById.get("ct-e-inverted-date").expected.reason_codes,
  ["invalid_date_order"]
);
assert.deepEqual(
  historyById.get("ct-g-restricted-evidence").expected.reason_codes,
  ["restricted"]
);
assert.deepEqual(
  historyById.get("ct-i-unknown-evidence").expected.reason_codes,
  ["evidence_missing"]
);

const ctD = assistantById.get("ct-d-authorized-qualitative");
assert.equal(ctD.expected.outcome, "answer");
assert.equal(ctD.expected.reference_policy, "qualitative_evidence_required");
assert.equal(ctD.expected.fact_ids.length, 1);
assert.equal(ctD.expected.evidence_ids.length, 1);

const ctFClosing = assistantById.get("ct-f-closing-price");
assert.equal(ctFClosing.expected.outcome, "refuse_and_explain");
assert.equal(ctFClosing.expected.limitation_id, "limitation:closing-price");

const ctFCause = assistantById.get("ct-f-unobserved-cause");
assert.equal(ctFCause.expected.outcome, "refuse_and_explain");
assert.equal(ctFCause.expected.limitation_id, "limitation:causality");

const ctG = assistantById.get("ct-g-conflicting-evidence");
assert.equal(ctG.expected.outcome, "state_insufficient_evidence");
assert.deepEqual(ctG.expected.reason_codes, ["conflicting_evidence"]);

const ctI = assistantById.get("ct-i-unknown-intent");
assert.equal(ctI.expected.outcome, "explain_supported_questions");
assert.equal(ctI.expected.intent_id, null);
assert.equal(ctI.expected.supported_families.length, 7);

const ctP = assistantById.get("ct-p-personal-data");
assert.equal(ctP.expected.outcome, "refuse_and_explain");
assert.equal(ctP.expected.limitation_id, "limitation:personal-data");

const policyMutation = clone(policy);
policyMutation.current_max_days = 31;
assert.ok(
  validateHistoryPolicy(policyMutation).includes(
    "current_max_days must equal 30"
  ),
  "policy threshold mutation must fail by the expected reason"
);

const catalogMutation = clone(catalog);
catalogMutation.intents[1].intent_id = catalogMutation.intents[0].intent_id;
assert.ok(
  validateAssistantCatalog(catalogMutation).includes(
    `duplicate intent_id ${catalogMutation.intents[0].intent_id}`
  ),
  "duplicate catalog intent must fail by the expected reason"
);

const currencyMutation = clone(normal.input);
currencyMutation.current.currency = "USD";
assert.deepEqual(
  evaluateHistoryCandidate(currencyMutation, policy).reason_codes,
  ["unknown_currency"],
  "currency mutation must fail with unknown_currency"
);

const dateMutation = clone(normal.input);
dateMutation.previous.observed_at = dateMutation.current.observed_at;
assert.deepEqual(
  evaluateHistoryCandidate(dateMutation, policy).reason_codes,
  ["invalid_date_order"],
  "date mutation must fail with invalid_date_order"
);

const agingMutation = clone(normal.input);
agingMutation.previous.observed_at = "2026-04-01T00:00:00Z";
agingMutation.current.observed_at = "2026-06-01T00:00:00Z";
assert.equal(
  evaluateHistoryCandidate(agingMutation, policy).validity,
  "aging",
  "validity must be derived from the fixed cutoff"
);

const historicalMutation = clone(normal.input);
historicalMutation.previous.observed_at = "2025-12-01T00:00:00Z";
historicalMutation.current.observed_at = "2026-03-01T00:00:00Z";
assert.equal(
  evaluateHistoryCandidate(historicalMutation, policy).validity,
  "historical",
  "observations older than 90 days must be historical"
);

const causeMutation = clone(normal.input);
causeMutation.cause = "La demanda aumentó";
causeMutation.cause_evidence_ids = [];
const causeResult = evaluateHistoryCandidate(causeMutation, policy);
assert.equal(causeResult.cause, null);
assert.deepEqual(causeResult.cause_evidence_ids, []);

const evidenceMutation = clone(ctD.input);
evidenceMutation.evidence_state = "restricted";
assert.deepEqual(
  evaluateAssistantRequest(evidenceMutation, catalog).reason_codes,
  ["restricted_evidence"],
  "qualitative evidence mutation must fail closed"
);

assert.deepEqual(validatePrivacy({ policy, catalog, fixtures }), []);

console.log(
  "Phase 5 fixtures OK: policy, catalog, CT-C/D/E/F/G/I/P and expected mutation reasons validated."
);
