import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildDemoData } from "../scripts/build-demo-data.js";
import { validatePrivacy } from "../scripts/data/validate.js";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.."
);
const policy = JSON.parse(
  await fs.readFile(
    new URL(
      "../../../data/source/demo-pilot/history-policy.json",
      import.meta.url
    ),
    "utf8"
  )
);
const assistantCatalog = JSON.parse(
  await fs.readFile(
    new URL(
      "../../../data/source/demo-pilot/assistant-intent-catalog.json",
      import.meta.url
    ),
    "utf8"
  )
);

const first = await buildDemoData({
  repositoryRoot,
  includeBenchmark: true,
  write: false
});
const second = await buildDemoData({
  repositoryRoot,
  includeBenchmark: true,
  write: false
});
const { payload, coverageReport } = first;

assert.equal(payload.metadata.contract_version, "2.4.0");
assert.equal(first.serialized, second.serialized, "2.4 build must be byte stable");
assert.equal(first.sha256, second.sha256, "2.4 payload hash must be stable");
assert.deepEqual(payload.history.policy, policy);
assert.deepEqual(payload.assistant, assistantCatalog);
assert.equal(payload.history.events.length, 36);
assert.deepEqual(
  {
    candidates: payload.history.coverage.candidate_count,
    materialized: payload.history.coverage.materialized_count,
    certified: payload.history.coverage.certified_count,
    reviewable: payload.history.coverage.reviewable_count,
    excluded: payload.history.coverage.excluded_count
  },
  {
    candidates: 42,
    materialized: 36,
    certified: 31,
    reviewable: 5,
    excluded: 6
  }
);
assert.equal(
  payload.history.coverage.districts.reduce(
    (total, district) => total + district.candidate_count,
    0
  ),
  42
);
assert.deepEqual(payload.history.coverage.excluded_reasons, [
  { reason_code: "entity_mismatch", count: 5 },
  { reason_code: "unknown_currency", count: 1 }
]);

const observations = new Map(
  payload.model.observations.map((record) => [record.observation_id, record])
);
const facts = new Map(
  payload.model.facts.map((record) => [record.fact_id, record])
);
const evidence = new Map(
  payload.model.evidence.map((record) => [record.evidence_id, record])
);
const documents = new Map(
  payload.model.documents.map((record) => [record.document_id, record])
);
const projects = new Set(payload.model.projects.map(({ project_id }) => project_id));
const historyEventIds = new Set(
  payload.history.events.map(({ history_event_id }) => history_event_id)
);

assert.equal(historyEventIds.size, 36);
for (const event of payload.history.events) {
  assert.ok(projects.has(event.project_id), `${event.project_id} must exist`);
  assert.ok(observations.has(event.previous_observation_id));
  assert.ok(observations.has(event.current_observation_id));
  assert.equal(event.fact_ids.length, 2);
  assert.equal(event.evidence_ids.length, 2);
  for (const factId of event.fact_ids) {
    const fact = facts.get(factId);
    assert.ok(fact, `${factId} must exist`);
    assert.equal(fact.entity_id, event.project_id);
    assert.equal(fact.field_name, "published_price_from");
    assert.equal(fact.benchmark_eligible, false);
  }
  for (const evidenceId of event.evidence_ids) {
    const record = evidence.get(evidenceId);
    assert.ok(record, `${evidenceId} must exist`);
    assert.equal(record.publish_permission, "authorized");
    assert.equal(record.availability, "available");
    assert.ok(documents.has(record.document_id));
  }
  assert.equal(event.cause, null);
  assert.deepEqual(event.cause_evidence_ids, []);
}

const assertIndex = (entries, key) => {
  const flattened = [];
  for (const entry of entries) {
    assert.deepEqual(
      entry.history_event_ids,
      [...entry.history_event_ids].sort(),
      `${key} index event IDs must be ordered`
    );
    for (const eventId of entry.history_event_ids) {
      assert.ok(historyEventIds.has(eventId), `${eventId} must exist`);
      flattened.push(eventId);
    }
  }
  assert.deepEqual([...new Set(flattened)].sort(), [...historyEventIds].sort());
};
assertIndex(payload.history.by_project_id, "project");
assertIndex(payload.history.by_district_id, "district");

const fingerprintPaths = payload.metadata.input_fingerprints.map(
  ({ path }) => path
);
for (const requiredPath of [
  "data/source/demo-pilot/history-policy.json",
  "data/source/demo-pilot/assistant-intent-catalog.json",
  "data/source/viva_minimum_dataset_latest.csv"
]) {
  assert.ok(fingerprintPaths.includes(requiredPath), `${requiredPath} fingerprint`);
}
assert.deepEqual(
  payload.history.fingerprints.map(({ path }) => path),
  [
    "data/source/demo-pilot/history-policy.json",
    "data/source/geography/source-manifest.json",
    "data/source/viva_minimum_dataset_latest.csv"
  ]
);
assert.deepEqual(coverageReport.history_coverage, {
  event_count: 36,
  project_index_count: 36,
  district_index_count: payload.history.by_district_id.length,
  certified_count: 31,
  reviewable_count: 5,
  excluded_count: 6,
  model_reference_counts: {
    observations: 72,
    facts: 72,
    documents: 1,
    evidence: 72
  },
  input_fingerprint_count: 3,
  references: [
    "$.history",
    "$.model.observations",
    "$.model.facts",
    "$.model.documents",
    "$.model.evidence"
  ]
});
assert.deepEqual(validatePrivacy(payload), []);
assert.doesNotMatch(
  first.serialized,
  /(?:[A-Za-z]:\\|\/Users\/|\/home\/)/i
);

console.log(
  "Public 2.4 history OK: 36 referenced events, closed indexes, stable fingerprints and zero privacy findings."
);
