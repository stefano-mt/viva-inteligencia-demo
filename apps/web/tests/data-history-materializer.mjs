import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "../scripts/data/agencies.js";
import {
  materializeHistoryCandidates,
  serializeHistoryMaterialization
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
const snapshotPath = path.join(
  repositoryRoot,
  "data/source",
  "viva_minimum_dataset_latest.csv"
);

const [snapshotText, policy, publicData, geographyManifest] = await Promise.all([
  fs.readFile(snapshotPath, "utf8"),
  readJson(
    repositoryRoot,
    "data/source",
    "demo-pilot",
    "history-policy.json"
  ),
  readJson(
    prototypeRoot,
    "public",
    "demo-data",
    "viva-platform-demo.json"
  ),
  readJson(
    repositoryRoot,
    "data/source",
    "geography",
    "source-manifest.json"
  )
]);

const rows = parseCsv(snapshotText);
const options = {
  policy,
  authoritative_project_ids: publicData.model.projects.map(
    ({ project_id: projectId }) => projectId
  ),
  district_catalog: geographyManifest.districts,
  source_snapshot_path: "data/source/viva_minimum_dataset_latest.csv"
};
const materialized = materializeHistoryCandidates(rows, options);

assert.equal(materialized.version, 1);
assert.equal(materialized.source_row_count, 714);
assert.equal(materialized.changed_count, 42);
assert.equal(materialized.preliminary_candidate_count, 34);
assert.equal(materialized.events.length, 36);
assert.equal(materialized.coverage.materialized_count, 36);
assert.equal(materialized.coverage.certified_count, 31);
assert.equal(materialized.coverage.reviewable_count, 5);
assert.equal(materialized.coverage.excluded_count, 6);
assert.deepEqual(materialized.coverage.excluded_reasons, [
  { reason_code: "entity_mismatch", count: 5 },
  { reason_code: "unknown_currency", count: 1 }
]);

assert.deepEqual(materialized.preliminary_candidate_ids, [
  "1866",
  "2378",
  "2566",
  "2570",
  "2671",
  "2855",
  "3025",
  "3060",
  "3198",
  "3212",
  "3338",
  "3358",
  "3385",
  "3406",
  "3414",
  "3470",
  "3511",
  "3528",
  "3553",
  "3561",
  "3590",
  "3596",
  "3637",
  "3685",
  "3814",
  "3927",
  "3937",
  "3981",
  "4010",
  "4012",
  "4046",
  "4052",
  "4085",
  "4105"
]);
assert.deepEqual(materialized.audit_funnel, [
  { stage: "source_rows", count: 714 },
  { stage: "changed", count: 42 },
  { stage: "positive_values", count: 41 },
  { stage: "pen_currency", count: 40 },
  { stage: "valid_chronology", count: 40 },
  { stage: "within_certified_threshold", count: 34 },
  { stage: "canonical_within_certified_threshold", count: 31 },
  { stage: "materialized_by_policy", count: 36 }
]);
assert.deepEqual(materialized.preliminary_districts, [
  { district_name: "Santiago De Surco", count: 6 },
  { district_name: "Miraflores", count: 5 },
  { district_name: "Surquillo", count: 5 },
  { district_name: "Jesus Maria", count: 4 },
  { district_name: "Cercado de lima", count: 2 },
  { district_name: "Lince", count: 2 },
  { district_name: "Pueblo Libre", count: 2 },
  { district_name: "San Isidro", count: 2 },
  { district_name: "Breña", count: 1 },
  { district_name: "Chorrillos", count: 1 },
  { district_name: "La Victoria", count: 1 },
  { district_name: "Magdalena Del Mar", count: 1 },
  { district_name: "San Borja", count: 1 },
  { district_name: "San Miguel", count: 1 }
]);

const eventIds = materialized.events.map(
  ({ history_event_id: historyEventId }) => historyEventId
);
assert.deepEqual(eventIds, [...eventIds].sort());
assert.equal(new Set(eventIds).size, eventIds.length);

const reviewableEventIds = materialized.events
  .filter(({ status }) => status === "reviewable")
  .map(({ history_event_id: historyEventId }) => historyEventId);
assert.deepEqual(reviewableEventIds, [
  "history_event:nexo-2587-published-price",
  "history_event:nexo-3445-published-price",
  "history_event:nexo-3540-published-price",
  "history_event:nexo-3735-published-price",
  "history_event:nexo-3902-published-price"
]);

for (const event of materialized.events) {
  assert.equal(event.cause, null);
  assert.deepEqual(event.cause_evidence_ids, []);
  assert.equal(event.validity, "aging");
  assert.equal(event.fact_ids.length, 2);
  assert.equal(event.evidence_ids.length, 2);
  assert.ok(Number.isFinite(event.delta_absolute));
  assert.ok(event.delta_pct === null || Number.isFinite(event.delta_pct));
}

const schema = loadContractSchema(
  path.join(prototypeRoot, "contracts", "demo-v2.schema.json")
);
for (const [index, event] of materialized.events.entries()) {
  assert.deepEqual(
    validateSchemaShape(event, "historyEvent", {
      rootSchema: schema,
      path: `$.history.events[${index}]`
    }),
    [],
    `${event.history_event_id} must fit the frozen 2.4 contract`
  );
}

const miraflores = materialized.coverage.districts.find(
  ({ district_id: districtId }) => districtId === "150122"
);
assert.deepEqual(miraflores, {
  district_id: "150122",
  candidate_count: 5,
  materialized_count: 5,
  certified_count: 5,
  reviewable_count: 0,
  excluded_count: 0
});

assert.deepEqual(
  materialized.exclusions.map(
    ({ source_project_id: sourceProjectId, primary_reason: primaryReason }) => [
      sourceProjectId,
      primaryReason
    ]
  ),
  [
    ["3240", "entity_mismatch"],
    ["3313", "unknown_currency"],
    ["3385", "entity_mismatch"],
    ["3406", "entity_mismatch"],
    ["4052", "entity_mismatch"],
    ["4139", "entity_mismatch"]
  ]
);

const reversed = materializeHistoryCandidates([...rows].reverse(), options);
assert.deepEqual(reversed, materialized, "row order must not affect output");
assert.equal(
  serializeHistoryMaterialization(reversed),
  serializeHistoryMaterialization(materialized),
  "serialization must be byte-stable for equivalent input"
);

const duplicatedRows = [...rows, rows.find(({ project_id }) => project_id === "1866")];
const duplicateResult = materializeHistoryCandidates(duplicatedRows, options);
assert.ok(
  duplicateResult.exclusions.some(
    ({ source_project_id: sourceProjectId, primary_reason: primaryReason }) =>
      sourceProjectId === "1866" && primaryReason === "duplicate"
  ),
  "duplicate source identities must fail closed"
);
assert.ok(
  !duplicateResult.events.some(
    ({ history_event_id: historyEventId }) =>
      historyEventId === "history_event:nexo-1866-published-price"
  )
);

assert.deepEqual(validatePrivacy(materialized), []);
assert.doesNotMatch(
  serializeHistoryMaterialization(materialized),
  /(?:[A-Za-z]:\\|file:\/\/|\.\.[\\/])/i
);

console.log(
  "History materializer OK: 42 changed, 34 preliminary, 36 materialized (31 certified/5 reviewable), 6 excluded, stable and private."
);
