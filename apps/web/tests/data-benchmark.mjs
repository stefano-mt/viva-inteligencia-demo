import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildDemoData } from "../../../tools/data/src/build-demo-data.js";
import { parseCsv } from "../../../tools/data/src/data/agencies.js";
import { classifyBenchmarkRecords } from "../../../tools/data/src/data/benchmark.js";
import {
  loadContractSchema,
  validateRootDocument
} from "../../../tools/data/src/data/validate.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const prototypeRoot = path.resolve(testDirectory, "..");
const repositoryRoot = path.resolve(prototypeRoot, "..", "..");
const readJson = async (...segments) =>
  JSON.parse(await fs.readFile(path.join(...segments), "utf8"));
const compareText = (left, right) => left.localeCompare(right);
const unique = (values) => new Set(values).size === values.length;

const [policy, catalog, ctP, sourceText, built, rebuilt, legacyBuilt] =
  await Promise.all([
    readJson(
      repositoryRoot,
      "data/source",
      "demo-pilot",
      "benchmark-policy.json"
    ),
    readJson(
      repositoryRoot,
      "data/source",
      "demo-pilot",
      "benchmark-attribute-catalog.json"
    ),
    readJson(testDirectory, "e2e-scenarios", "ct-p-benchmark.json"),
    fs.readFile(
      path.join(
        repositoryRoot,
        "data/source",
        "viva_minimum_dataset_latest.csv"
      ),
      "utf8"
    ),
    buildDemoData({ repositoryRoot, includeBenchmark: true, write: false }),
    buildDemoData({ repositoryRoot, includeBenchmark: true, write: false }),
    buildDemoData({ repositoryRoot, write: false })
  ]);
const { payload } = built;
const { benchmark, model, geography } = payload;
const sourceRows = parseCsv(sourceText);
const sourceByProjectId = new Map(
  sourceRows.map((row) => [`project:nexo-${row.project_id}`, row])
);
const observationById = new Map(
  model.observations.map((entry) => [entry.observation_id, entry])
);
const factById = new Map(model.facts.map((entry) => [entry.fact_id, entry]));
const schema = loadContractSchema(
  path.resolve(testDirectory, "../../..", "packages", "contracts", "schemas", "demo-v2.schema.json")
);
const publicRoot = path.join(prototypeRoot, "public");
const assetExists = (logicalPath) =>
  path
    .resolve(publicRoot, ...logicalPath.split("/"))
    .startsWith(`${publicRoot}${path.sep}`);

assert.equal(
  legacyBuilt.payload.metadata.contract_version,
  "2.2.0",
  "the opt-in materializer must not break the frozen 2.2 regression harness"
);
assert.equal(legacyBuilt.payload.benchmark, undefined);
assert.equal(payload.metadata.contract_version, "2.4.0");
assert.equal(built.serialized, rebuilt.serialized, "two 2.4 builds must be byte-identical");
assert.equal(built.sha256, rebuilt.sha256);
assert.equal(
  built.coverageReport.phase_gaps.some(
    ({ gap_id: gapId }) => gapId === "GAP-F4-BENCHMARK"
  ),
  false,
  "the materialized 2.4 build must keep GAP-F4-BENCHMARK closed"
);
assert.equal(built.coverageReport.benchmark_coverage.indexed_project_count, 397);
assert.deepEqual(
  validateRootDocument(payload, { schema, assetExists }),
  [],
  "the materialized 2.4 payload must pass the production reader"
);
assert.ok(
  built.inputPaths.includes(policy.source.snapshot_path) &&
    built.inputPaths.includes(
      "data/source/demo-pilot/benchmark-policy.json"
    ) &&
    built.inputPaths.includes(
      "data/source/demo-pilot/benchmark-attribute-catalog.json"
    ),
  "the build must fingerprint its source, policy and catalog"
);
assert.equal(benchmark.version, 1);
assert.equal(benchmark.methodology.cutoff_at, policy.source.cutoff_at);
assert.equal(benchmark.methodology.price_type_policy, "from");
assert.deepEqual(benchmark.methodology.allowed_area_denominators, ["total"]);
assert.equal(benchmark.methodology.pairing_policy, "source_paired_only");
assert.deepEqual(
  benchmark.attribute_catalog,
  [...catalog.attributes].sort((left, right) =>
    compareText(left.attribute_id, right.attribute_id)
  )
);

const expectedProjectIds = geography.assignments
  .filter(
    (assignment) =>
      assignment.polygon_valid && assignment.authoritative_project_id !== null
  )
  .map((assignment) => assignment.authoritative_project_id)
  .sort(compareText);
assert.equal(expectedProjectIds.length, 397);
assert.ok(unique(expectedProjectIds));
assert.deepEqual(
  benchmark.fact_index.map(({ project_id: projectId }) => projectId),
  expectedProjectIds,
  "the index must contain exactly the canonical in-polygon Top-7 universe"
);
assert.ok(unique(benchmark.fact_index.map(({ project_id: projectId }) => projectId)));
assert.equal(
  benchmark.fact_index.filter(
    ({ pairing_status: pairingStatus }) => pairingStatus === "source_paired"
  ).length,
  0,
  "project minima must never be promoted to source_paired"
);
assert.deepEqual(
  Object.fromEntries(
    [...Map.groupBy(benchmark.fact_index, (entry) => entry.pairing_status)]
      .sort(([left], [right]) => compareText(left, right))
      .map(([status, entries]) => [status, entries.length])
  ),
  {
    conflicting: 1,
    missing: 26,
    project_minima_pair_unresolved: 370
  }
);

const benchmarkObservations = model.observations.filter(({ observation_id: id }) =>
  id.startsWith("observation:benchmark-nexo-")
);
const benchmarkFacts = model.facts.filter(({ fact_id: id }) =>
  id.startsWith("fact:benchmark-nexo-")
);
assert.equal(benchmarkObservations.length, 397);
assert.equal(benchmarkFacts.length, 3981);
assert.ok(unique(benchmarkObservations.map(({ observation_id: id }) => id)));
assert.ok(unique(benchmarkFacts.map(({ fact_id: id }) => id)));
assert.deepEqual(
  Object.fromEntries(
    [...Map.groupBy(benchmarkFacts, (fact) => fact.semantic_type)]
      .sort(([left], [right]) => compareText(left, right))
      .map(([semanticType, facts]) => [semanticType, facts.length])
  ),
  {
    area: 397,
    attribute: 2404,
    count: 413,
    price: 397,
    price_per_m2: 370
  }
);
assert.equal(
  benchmarkFacts.filter(
    (fact) =>
      fact.semantic_type === "price_per_m2" && fact.benchmark_eligible
  ).length,
  0
);
assert.equal(
  benchmarkFacts.filter(
    (fact) =>
      fact.semantic_type === "price_per_m2" &&
      fact.value_kind === "derived" &&
      fact.denominator_area_type === "total" &&
      fact.exclusion_reason.includes("mínimos de proyecto")
  ).length,
  370,
  "the arithmetic series must remain separately identifiable and ineligible"
);
assert.equal(
  benchmarkFacts.filter(
    (fact) =>
      fact.semantic_type === "area" && ["built", "free"].includes(fact.area_type)
  ).length,
  0,
  "the market materializer must not invent built or free area"
);

const sampleRow = sourceByProjectId.get("project:nexo-1415");
const sampleIndex = benchmark.fact_index.find(
  ({ project_id: projectId }) => projectId === "project:nexo-1415"
);
const samplePrice = factById.get(sampleIndex.published_price_fact_id);
const sampleArea = factById.get(sampleIndex.total_area_fact_id);
const sampleUnits = factById.get(sampleIndex.reported_unit_count_fact_id);
const sampleParking = factById.get(sampleIndex.parking_count_fact_id);
assert.equal(samplePrice.original_value, sampleRow.price_min);
assert.equal(samplePrice.normalized_value, 493000);
assert.equal(samplePrice.price_type, "from");
assert.equal(sampleArea.original_value, sampleRow.total_area_min);
assert.equal(sampleArea.normalized_value, 80);
assert.equal(sampleArea.area_type, "total");
assert.equal(sampleUnits.original_value, sampleRow.unit_count);
assert.equal(sampleUnits.normalized_value, 135);
assert.equal(sampleParking.original_value, sampleRow.parking_count);
assert.equal(sampleParking.normalized_value, 90);
for (const attributeFactId of sampleIndex.attribute_fact_ids) {
  const fact = factById.get(attributeFactId);
  assert.equal(fact.semantic_type, "attribute");
  assert.ok(catalog.attributes.some(({ attribute_id: id }) => id === fact.normalized_value));
  assert.ok(sampleRow.amenities.includes(fact.original_value));
  assert.notEqual(fact.normalized_value, "attribute:otros");
}

const referencedFactIds = new Set();
const identities = new Map();
for (const entry of benchmark.fact_index) {
  for (const factId of [
    entry.total_area_fact_id,
    entry.published_price_fact_id,
    entry.price_per_m2_fact_id,
    entry.reported_unit_count_fact_id,
    entry.parking_count_fact_id,
    ...entry.attribute_fact_ids
  ].filter(Boolean)) {
    referencedFactIds.add(factId);
    const fact = factById.get(factId);
    assert.ok(fact, `${factId} must resolve`);
    const observation = observationById.get(fact.observation_id);
    assert.ok(observation, `${fact.observation_id} must resolve`);
    if (fact.value_kind === "observed") assert.notEqual(fact.original_value, null);
    const identity = [
      entry.project_id,
      fact.field_name,
      observation.source_id,
      observation.captured_at
    ].join("|");
    assert.equal(identities.has(identity), false, `duplicate fact identity ${identity}`);
    identities.set(identity, factId);
  }
}
assert.equal(referencedFactIds.size, benchmarkFacts.length - 1);
assert.equal(
  benchmarkFacts.filter((fact) => !referencedFactIds.has(fact.fact_id)).length,
  1,
  "CT-G retains one source area fact but fail-closes its benchmark index reference"
);

for (const [indicatorId, coverage] of Object.entries(
  benchmark.coverage.indicators
)) {
  const outputs = [
    ...coverage.used_project_ids,
    ...coverage.missing_project_ids,
    ...coverage.excluded_projects.map(({ project_id: projectId }) => projectId)
  ];
  assert.equal(outputs.length, coverage.input_project_ids.length, indicatorId);
  assert.ok(unique(outputs), `${indicatorId} outputs must be disjoint`);
  assert.deepEqual([...outputs].sort(compareText), coverage.input_project_ids);
}

const miraflores = geography.districts.find(
  ({ district_id: districtId }) => districtId === "150122"
);
const mirafloresIds = miraflores.quadrants.flatMap(
  ({ authoritative_project_ids: projectIds }) => projectIds
);
const priceCoverage = benchmark.coverage.indicators.price_per_m2_total;
const mirafloresExcluded = priceCoverage.excluded_projects.filter(
  ({ project_id: projectId }) => mirafloresIds.includes(projectId)
);
assert.deepEqual(
  {
    input: mirafloresIds.length,
    used: priceCoverage.used_project_ids.filter((id) => mirafloresIds.includes(id))
      .length,
    missing: priceCoverage.missing_project_ids.filter((id) =>
      mirafloresIds.includes(id)
    ).length,
    excluded: mirafloresExcluded.length
  },
  { input: 85, used: 0, missing: 16, excluded: 69 }
);
assert.equal(
  mirafloresExcluded.filter(({ reasons }) =>
    reasons.includes("price_area_link_unresolved")
  ).length,
  68
);
assert.deepEqual(
  mirafloresExcluded.find(
    ({ project_id: projectId }) => projectId === "project:nexo-2951"
  ),
  { project_id: "project:nexo-2951", reasons: ["blocking_issue"] }
);
const pardo = benchmark.fact_index.find(
  ({ project_id: projectId }) => projectId === "project:nexo-2951"
);
assert.equal(pardo.pairing_status, "conflicting");
assert.equal(pardo.total_area_fact_id, null);
assert.equal(pardo.price_per_m2_fact_id, null);
assert.equal(factById.get(pardo.published_price_fact_id).benchmark_eligible, false);
assert.equal(
  factById.get("fact:benchmark-nexo-2951-total-area").benchmark_eligible,
  false
);
assert.ok(
  geography.assignments.some(
    ({ authoritative_project_id: projectId }) => projectId === "project:nexo-2951"
  ),
  "CT-G must remain territorially visible"
);

const ctPResult = classifyBenchmarkRecords(ctP.input.records, policy);
assert.deepEqual(ctPResult.coverage, ctP.expected.coverage);
assert.deepEqual(
  ctPResult.eligible.map(({ normalized_value: value }) => value),
  ctP.expected.eligible_values
);
assert.deepEqual(
  ctPResult.eligible[0].provenance_observation_ids,
  ctP.expected.deduplicated_provenance_observation_ids
);
assert.deepEqual(
  ctPResult.orientative.map(({ normalized_value: value }) => value),
  ctP.expected.orientative_values
);

console.log(
  `Benchmark data OK: ${benchmark.fact_index.length} Top-7 projects, ` +
    `${benchmarkFacts.length} facts, 370 non-comparable ratios and CT-G/CT-P fail-closed.`
);
