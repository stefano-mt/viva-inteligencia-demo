import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "../scripts/data/agencies.js";
import {
  loadContractSchema,
  validateSchemaShape
} from "../scripts/data/validate.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const prototypeRoot = path.resolve(testDirectory, "..");
const repositoryRoot = path.resolve(prototypeRoot, "..");

const readJson = async (...segments) =>
  JSON.parse(await fs.readFile(path.join(...segments), "utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const logicalSha256 = (bytes) =>
  sha256(bytes.toString("utf8").replace(/\r\n?/g, "\n"));
const normalizedTerm = (value) =>
  String(value ?? "").normalize("NFC").trim().toLocaleLowerCase("es");
const unique = (values) => new Set(values).size === values.length;

const policyPath = path.join(
  repositoryRoot,
  "datos_relevantes",
  "demo-pilot",
  "benchmark-policy.json"
);
const catalogPath = path.join(
  repositoryRoot,
  "datos_relevantes",
  "demo-pilot",
  "benchmark-attribute-catalog.json"
);
const fixtureNames = ["ct-a", "ct-b", "ct-c", "ct-d", "ct-g", "ct-i", "ct-p"];
const [policy, catalog, publicData, ctISource, ...fixtures] = await Promise.all([
  readJson(policyPath),
  readJson(catalogPath),
  readJson(prototypeRoot, "public", "demo-data", "viva-platform-demo.json"),
  readJson(
    repositoryRoot,
    "datos_relevantes",
    "demo-pilot",
    "fixtures",
    "ct-i.json"
  ),
  ...fixtureNames.map((name) =>
    readJson(testDirectory, "e2e-scenarios", `${name}-benchmark.json`)
  )
]);
const fixtureByName = new Map(
  fixtureNames.map((name, index) => [name, fixtures[index]])
);

const snapshotBytes = await fs.readFile(
  path.join(repositoryRoot, ...policy.source.snapshot_path.split("/"))
);
const snapshotRows = parseCsv(snapshotBytes.toString("utf8"));
assert.equal(policy.policy_version, "benchmark-policy-v1");
assert.equal(policy.source.source_id, "source:nexo");
assert.equal(policy.source.access_mode, "fixed_versioned_snapshot");
assert.equal(policy.source.runtime_refresh, false);
assert.equal(policy.source.legal_status, "pending_review");
assert.equal(policy.source.snapshot_sha256, logicalSha256(snapshotBytes));
assert.equal(snapshotRows.length, 714, "the fixed Nexo snapshot must retain 714 rows");
assert.ok(
  Date.parse(policy.source.snapshot_captured_at) <=
    Date.parse(policy.source.cutoff_at),
  "snapshot capture must not exceed the benchmark cutoff"
);
const publicSnapshotFingerprint = publicData.metadata.input_fingerprints.find(
  ({ path: logicalPath }) => logicalPath === policy.source.snapshot_path
);
assert.equal(
  publicSnapshotFingerprint?.sha256,
  policy.source.snapshot_sha256,
  "policy must bind the same versioned snapshot as the public dataset"
);

const requiredSourceFields = [
  policy.field_semantics.published_price.source_field,
  policy.field_semantics.published_price.currency_field,
  policy.field_semantics.total_area.source_field,
  policy.field_semantics.reported_units.source_field,
  policy.field_semantics.parking.source_field,
  policy.field_semantics.attributes.source_field
];
for (const field of requiredSourceFields) {
  assert.ok(
    Object.hasOwn(snapshotRows[0], field),
    `benchmark source field ${field} must exist in the fixed snapshot`
  );
}
assert.equal(policy.methodology.price_type_policy, "from");
assert.deepEqual(policy.methodology.allowed_currencies, ["PEN"]);
assert.equal(policy.methodology.currency_conversion, false);
assert.deepEqual(policy.methodology.allowed_area_denominators, ["total"]);
assert.equal(policy.methodology.pairing_policy, "source_paired_only");
assert.equal(policy.methodology.minimum_quantitative_sample, 3);
assert.equal(policy.methodology.minimum_qualitative_informed_sample, 5);
assert.deepEqual(policy.representativeness.quantitative, [
  { minimum: 3, maximum: null, state: "ready" },
  { minimum: 1, maximum: 2, state: "orientative" },
  { minimum: 0, maximum: 0, state: "insufficient" }
]);
assert.deepEqual(policy.representativeness.qualitative, [
  { minimum: 5, maximum: null, state: "ready" },
  { minimum: 1, maximum: 4, state: "orientative" },
  { minimum: 0, maximum: 0, state: "insufficient" }
]);
assert.equal(policy.field_semantics.attributes.missing_is_false, false);
assert.equal(policy.field_semantics.parking.missing_is_zero, false);
assert.equal(policy.pairing.arithmetic_match_promotes_pairing, false);
assert.equal(policy.pairing.same_project_page_promotes_pairing, false);
assert.equal(
  policy.pairing.current_snapshot_default.status,
  "project_minima_pair_unresolved"
);
assert.equal(
  policy.pairing.current_snapshot_default.series,
  "orientative_noncomparable"
);
assert.equal(policy.coverage_partition.per_indicator, true);
assert.equal(policy.coverage_partition.sets_must_be_disjoint, true);
assert.equal(policy.coverage_partition.global_used_project_ids_forbidden, true);

const schema = loadContractSchema(
  path.join(prototypeRoot, "contracts", "demo-v2.schema.json")
);
const contractMethodology = {
  cutoff_at: policy.source.cutoff_at,
  minimum_quantitative_sample:
    policy.methodology.minimum_quantitative_sample,
  minimum_qualitative_informed_sample:
    policy.methodology.minimum_qualitative_informed_sample,
  quantile_method: policy.methodology.quantile_method,
  price_type_policy: policy.methodology.price_type_policy,
  allowed_area_denominators: policy.methodology.allowed_area_denominators,
  pairing_policy: policy.methodology.pairing_policy,
  exclusion_reason_precedence:
    policy.methodology.exclusion_reason_precedence,
  certification_label: policy.methodology.certification_label
};
assert.deepEqual(
  validateSchemaShape(contractMethodology, "benchmarkMethodology", {
    rootSchema: schema,
    path: "$.benchmark.methodology"
  }),
  [],
  "materialized methodology must match the frozen 2.3 contract"
);

const allowedCategories = new Set([
  "access_reception",
  "wellbeing_sport",
  "meetings_work",
  "family_recreation",
  "gastronomy_social",
  "exterior_green",
  "common_services",
  "mobility_parking"
]);
assert.equal(catalog.catalog_version, "benchmark-attributes-v1");
assert.equal(catalog.normalization.mode, "explicit_alias_only");
assert.equal(catalog.normalization.fuzzy_matching, false);
assert.ok(catalog.attributes.length >= 30);
const attributeIds = catalog.attributes.map(({ attribute_id }) => attribute_id);
const labels = catalog.attributes.map(({ normalized_label }) =>
  normalizedTerm(normalized_label)
);
assert.ok(unique(attributeIds), "attribute IDs must be unique");
assert.ok(unique(labels), "canonical labels must be unique");
const aliasOwners = new Map();
for (const attribute of catalog.attributes) {
  assert.match(attribute.attribute_id, /^attribute:[a-z0-9][a-z0-9.-]*$/);
  assert.ok(allowedCategories.has(attribute.category));
  assert.ok(attribute.aliases.length > 0);
  for (const term of [attribute.normalized_label, ...attribute.aliases]) {
    const normalized = normalizedTerm(term);
    assert.notEqual(normalized, "otros", "Otros cannot be canonical or an alias");
    const owner = aliasOwners.get(normalized);
    assert.ok(
      !owner || owner === attribute.attribute_id,
      `${term} cannot resolve to both ${owner} and ${attribute.attribute_id}`
    );
    aliasOwners.set(normalized, attribute.attribute_id);
  }
  assert.deepEqual(
    validateSchemaShape(attribute, "benchmarkAttribute", {
      rootSchema: schema,
      path: `$.benchmark.attribute_catalog.${attribute.attribute_id}`
    }),
    [],
    `${attribute.attribute_id} must fit the frozen 2.3 contract`
  );
}
assert.deepEqual(policy.ignored_attribute_tokens, ["Otros"]);
const rawAmenities = new Set(
  snapshotRows.flatMap((row) =>
    String(row.amenities ?? "")
      .split("|")
      .map((value) => value.trim())
      .filter(Boolean)
  )
);
for (const rawAmenity of rawAmenities) {
  if (
    policy.ignored_attribute_tokens.some(
      (token) => normalizedTerm(token) === normalizedTerm(rawAmenity)
    )
  ) {
    continue;
  }
  assert.ok(
    aliasOwners.has(normalizedTerm(rawAmenity)),
    `raw amenity requires an explicit alias: ${rawAmenity}`
  );
}

function assertCoveragePartition(coverage, caseId) {
  const input = coverage.input_project_ids;
  const used = coverage.used_project_ids;
  const missing = coverage.missing_project_ids;
  const excludedIds = coverage.excluded_projects.map(
    ({ project_id }) => project_id
  );
  assert.ok(unique(input), `${caseId}: input IDs must be unique`);
  assert.ok(unique(used), `${caseId}: used IDs must be unique`);
  assert.ok(unique(missing), `${caseId}: missing IDs must be unique`);
  assert.ok(unique(excludedIds), `${caseId}: excluded IDs must be unique`);
  const output = [...used, ...missing, ...excludedIds];
  assert.ok(unique(output), `${caseId}: partition sets must be disjoint`);
  assert.deepEqual(
    [...output].sort(),
    [...input].sort(),
    `${caseId}: input must equal used + missing + excluded`
  );
  const precedence = new Map(
    policy.methodology.exclusion_reason_precedence.map((reason, index) => [
      reason,
      index
    ])
  );
  for (const excluded of coverage.excluded_projects) {
    assert.ok(excluded.reasons.length > 0);
    assert.ok(unique(excluded.reasons));
    const positions = excluded.reasons.map((reason) => {
      assert.ok(precedence.has(reason), `${caseId}: unsupported ${reason}`);
      return precedence.get(reason);
    });
    assert.deepEqual(positions, [...positions].sort((left, right) => left - right));
  }
}

for (const fixture of fixtures) {
  assert.equal(fixture.policy_version, policy.policy_version);
  assert.match(fixture.case_id, /^CT-[A-Z]-benchmark$/);
  assert.ok(["controlled", "observed"].includes(fixture.classification));
  if (fixture.expected.coverage) {
    assertCoveragePartition(fixture.expected.coverage, fixture.case_id);
  }
}

const ctA = fixtureByName.get("ct-a");
assert.deepEqual(ctA.expected.preserved_area_types, ["built", "total"]);
assert.deepEqual(ctA.expected.market_denominator_area_types, ["total"]);
assert.equal(ctA.expected.selected_market_price_fact_id, null);
assert.equal(ctA.expected.built_or_free_market_fact_created, false);
assert.ok(
  ctA.input.facts
    .filter(({ semantic_type }) => semantic_type === "price_per_m2")
    .every(({ benchmark_eligible }) => benchmark_eligible === false)
);

const ctB = fixtureByName.get("ct-b");
assert.deepEqual(
  ctB.input.observations.map(({ normalized_value }) => normalized_value),
  [600000, 625000]
);
assert.equal(ctB.expected.selected_price_fact_id, null);
assert.equal(ctB.expected.selected_price_value, null);
assert.equal(ctB.input.pairing_status, "conflicting");

const ctC = fixtureByName.get("ct-c");
for (const ids of Object.values(ctC.expected.consumer_project_ids)) {
  assert.deepEqual(ids, ctC.input.comparable_project_ids);
}
assert.ok(
  ctC.input.outside_or_ineligible_ids.every(
    (id) => !ctC.expected.consumer_project_ids.benchmark.includes(id)
  )
);

const ctD = fixtureByName.get("ct-d");
const quartz = ctD.input.attributes.find(
  ({ attribute_id }) => attribute_id === "attribute:countertop-quartz"
);
const unknown = ctD.input.attributes.find(
  ({ attribute_id }) => attribute_id === "attribute:air-conditioning"
);
const restricted = ctD.input.attributes.find(
  ({ attribute_id }) => attribute_id === "attribute:restricted-example"
);
assert.equal(quartz.state, "evidence_backed");
assert.equal(quartz.evidence_id, ctD.expected.evidence_open_target);
assert.equal(quartz.publish_permission, "authorized");
assert.equal(unknown.state, "unknown");
assert.equal(ctD.expected.air_conditioning_absence_claim, false);
assert.equal(restricted.state, "restricted");
assert.equal(ctD.expected.restricted_in_denominator, false);
assert.equal(ctD.expected.include_controlled_example_in_market_prevalence, false);

const ctG = fixtureByName.get("ct-g");
assert.equal(ctG.input.card_area.normalized_value, 104.15);
assert.equal(ctG.input.plan_area.normalized_value, 53.37);
assert.equal(ctG.input.blocked_fact_count, 8);
assert.equal(ctG.expected.territorially_visible, true);
assert.equal(ctG.expected.used_by_price_benchmark, false);
assert.equal(ctG.expected.selected_area_fact_id, null);
assert.equal(ctG.expected.exclusion_detail_code, "typology_link_unresolved");
assert.equal(ctG.expected.exclusion_detail_source, "blocking_issue");
assert.equal(ctG.expected.inspector_path, "#inspector/case/f3-ct-g-pardo");

const ctI = fixtureByName.get("ct-i");
assert.equal(ctI.input.observed_project_count, 90);
assert.equal(ctI.input.comparable_project_count, 85);
assert.equal(ctI.input.unreconciled_project_count, 5);
assert.equal(
  ctI.input.comparable_project_count + ctI.input.unreconciled_project_count,
  ctI.input.observed_project_count
);
assert.deepEqual(
  ctI.input.quadrant_observed_counts,
  ctISource.expected.result.quadrant_observed_counts
);
assert.equal(
  Object.values(ctI.input.quadrant_observed_counts).reduce(
    (sum, value) => sum + value,
    0
  ),
  90
);
assert.equal(
  ctI.expected.price_partition_counts.used +
    ctI.expected.price_partition_counts.missing +
    ctI.expected.price_partition_counts.excluded,
  ctI.expected.price_partition_counts.input
);
assert.equal(ctI.expected.price_partition_counts.input, 85);
assert.equal(ctI.expected.eligible_quantitative_n, 0);
assert.equal(ctI.expected.orientative_series_n, 69);

const miraflores = publicData.geography.districts.find(
  ({ district_id: districtId }) => districtId === "150122"
);
assert.ok(miraflores, "Miraflores must exist in the public geography dataset");
const authoritativeMirafloresIds = miraflores.quadrants.flatMap(
  ({ authoritative_project_ids: projectIds }) => projectIds
);
assert.equal(authoritativeMirafloresIds.length, 85);
assert.ok(
  unique(authoritativeMirafloresIds),
  "Miraflores authoritative project ids must not repeat across quadrants"
);
const snapshotByCanonicalProjectId = new Map(
  snapshotRows.map((row) => [`project:nexo-${row.project_id}`, row])
);
assert.equal(
  authoritativeMirafloresIds.filter((projectId) =>
    snapshotByCanonicalProjectId.has(projectId)
  ).length,
  85,
  "every authoritative Miraflores project must resolve in the frozen snapshot"
);
const orientativeMirafloresRows = authoritativeMirafloresIds.filter(
  (projectId) => {
    const row = snapshotByCanonicalProjectId.get(projectId);
    return (
      Number(row.price_min) > 0 &&
      Number(row.total_area_min) > 0 &&
      row.currency === "PEN"
    );
  }
);
assert.equal(orientativeMirafloresRows.length, 69);
assert.equal(
  authoritativeMirafloresIds.length - orientativeMirafloresRows.length,
  16
);

const quantitativeState = (n) =>
  n >= policy.methodology.minimum_quantitative_sample
    ? "ready"
    : n > 0
      ? "orientative"
      : "insufficient";
const qualitativeState = (n) =>
  n >= policy.methodology.minimum_qualitative_informed_sample
    ? "ready"
    : n > 0
      ? "orientative"
      : "insufficient";

const ctP = fixtureByName.get("ct-p");
assert.deepEqual(
  ctP.input.sample_size_cases.map(({ n }) => n),
  [0, 1, 2, 3, 4, 5]
);
for (const vector of ctP.input.sample_size_cases) {
  assert.equal(vector.quantitative_state, quantitativeState(vector.n));
  assert.equal(vector.qualitative_state, qualitativeState(vector.n));
}
const recordsByProject = new Map();
for (const record of ctP.input.records) {
  const records = recordsByProject.get(record.project_id) ?? [];
  records.push(record);
  recordsByProject.set(record.project_id, records);
}
const derived = {
  used: [],
  missing: [],
  excluded: [],
  eligibleValues: [],
  orientativeValues: []
};
for (const [projectId, records] of recordsByProject) {
  if (records.some(({ publish_permission }) => publish_permission === "restricted")) {
    derived.excluded.push({ project_id: projectId, reasons: ["restricted"] });
    continue;
  }
  if (records.some(({ pairing_status }) => pairing_status === "missing")) {
    derived.missing.push(projectId);
    continue;
  }
  if (
    records.some(
      ({ pairing_status }) =>
        pairing_status === "project_minima_pair_unresolved"
    )
  ) {
    derived.excluded.push({
      project_id: projectId,
      reasons: ["price_area_link_unresolved"]
    });
    derived.orientativeValues.push(records[0].price_per_m2);
    continue;
  }
  const distinctValues = new Set(records.map(({ price_per_m2 }) => price_per_m2));
  if (distinctValues.size > 1) {
    derived.excluded.push({
      project_id: projectId,
      reasons: ["conflicting_observations"]
    });
    continue;
  }
  for (const record of records) {
    assert.equal(record.pairing_status, "source_paired");
    assert.ok(policy.pairing.eligible_bases.includes(record.pairing_basis));
    assert.ok(record.pairing_evidence_ids.length > 0);
    assert.equal(record.area_type, "total");
    assert.equal(record.currency, "PEN");
    assert.equal(
      Math.round((record.published_price / record.total_area) * 100) / 100,
      record.price_per_m2
    );
  }
  derived.used.push(projectId);
  derived.eligibleValues.push(records[0].price_per_m2);
}
derived.used.sort();
derived.missing.sort();
derived.excluded.sort((left, right) =>
  left.project_id.localeCompare(right.project_id)
);
assert.deepEqual(derived.used, ctP.expected.coverage.used_project_ids);
assert.deepEqual(derived.missing, ctP.expected.coverage.missing_project_ids);
assert.deepEqual(derived.excluded, ctP.expected.coverage.excluded_projects);
assert.deepEqual(derived.eligibleValues, ctP.expected.eligible_values);
assert.deepEqual(derived.orientativeValues, ctP.expected.orientative_values);
assert.equal(quantitativeState(derived.eligibleValues.length), "orientative");
assert.equal(ctP.expected.orientative_series_state, "orientative_noncomparable");
assert.equal(recordsByProject.get("project:ct-p-source-paired").length, 2);
assert.equal(ctP.expected.deduplicated_project_ids.length, 1);
assert.deepEqual(
  recordsByProject
    .get("project:ct-p-source-paired")
    .map(({ observation_id }) => observation_id),
  ctP.expected.deduplicated_provenance_observation_ids
);

const serializedInputs = JSON.stringify({ policy, catalog, fixtures });
assert.doesNotMatch(serializedInputs, /(?:[A-Za-z]:\\|file:\/\/|\.\.[\\/])/i);
assert.doesNotMatch(serializedInputs, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
assert.doesNotMatch(serializedInputs, /(?:\+?51[\s().-]*)?9(?:[\s().-]*\d){8}/);

console.log(
  `Phase 4 fixtures OK: fixed policy, ${catalog.attributes.length} attributes, CT-A/B/C/D/G/I/P and n=0–5 vectors validated.`
);
