import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  aggregateCertifiedMean,
  buildChangeEvent,
  calculateDifference,
  calculateFreeArea,
  calculatePricePerM2,
  evaluateDerivedEligibility,
  halfUp,
  materializeMeasureRecords,
  sortEvents,
} from "../scripts/data/measures.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(ROOT, "..");
const PILOT_DIR = path.join(REPO_ROOT, "datos_relevantes", "demo-pilot");
const FIXTURE_DIR = path.join(PILOT_DIR, "fixtures");
const CONTRACT_PATH = path.join(ROOT, "contracts", "demo-v2.schema.json");
const MODULE_PATH = path.join(ROOT, "scripts", "data", "measures.js");

const CASE_IDS = ["CT-A", "CT-B", "CT-D", "CT-E", "CT-G"];
const fixtureByCase = Object.fromEntries(
  CASE_IDS.map((caseId) => [
    caseId,
    readJson(
      path.join(FIXTURE_DIR, `${caseId.toLowerCase()}.json`),
    ),
  ]),
);
const fixtures = CASE_IDS.map((caseId) => fixtureByCase[caseId]);
const schema = readJson(CONTRACT_PATH);
const typologiesData = readJson(path.join(PILOT_DIR, "typologies.json"));
const factsData = readJson(path.join(PILOT_DIR, "facts.json"));
const issuesData = readJson(path.join(PILOT_DIR, "issues.json"));
const eventsData = readJson(path.join(PILOT_DIR, "events.json"));
const observationsData = readJson(
  path.join(PILOT_DIR, "observations.json"),
);
const moduleSource = fs.readFileSync(MODULE_PATH, "utf8");

const factById = indexBy(factsData, "fact_id");
const issueById = indexBy(issuesData, "issue_id");
const eventById = indexBy(eventsData, "event_id");
const observationById = indexBy(
  observationsData,
  "observation_id",
);
const materialized = materializeMeasureRecords(fixtures);
const fixtureObservationIds = uniqueSorted(
  fixtures.flatMap((fixture) =>
    fixture.input.observations.map(
      (observation) => observation.observation_id,
    ),
  ),
);
const fixtureProjectIds = uniqueSorted(
  fixtures.flatMap((fixture) =>
    fixture.input.projects.map((project) => project.project_id),
  ),
);

assert.deepEqual(typologiesData, materialized.typologies);
assert.deepEqual(factsData, materialized.facts);
assert.deepEqual(issuesData, materialized.issues);
assert.deepEqual(eventsData, materialized.events);

assert.deepEqual(
  uniqueSorted(typologiesData.map((typology) => typology.project_id)),
  fixtureProjectIds,
);
assert.deepEqual(
  uniqueSorted(factsData.map((fact) => fact.observation_id)),
  materialized.external_references.observation_ids,
);
assert.ok(
  factsData.every((fact) =>
    fact.observation_id.startsWith("observation:"),
  ),
);
assert.ok(
  factsData.every((fact) =>
    fixtureObservationIds.includes(fact.observation_id),
  ),
);
assert.ok(
  typologiesData.every((typology) =>
    fixtureProjectIds.includes(typology.project_id),
  ),
);
assert.ok(
  fixtureObservationIds.every((id) =>
    id.startsWith("observation:"),
  ),
);

assert.equal(typologiesData.length, 5);
assert.equal(factsData.length, 26);
assert.equal(issuesData.length, 5);
assert.equal(eventsData.length, 3);

assertUnique(typologiesData, "typology_id");
assertUnique(factsData, "fact_id");
assertUnique(issuesData, "issue_id");
assertUnique(eventsData, "event_id");
assertSchemaEnums();
assertReferences();

assert.equal(halfUp(1.005, 2), 1.01);
assert.equal(halfUp(-1.005, 2), -1.01);
assert.equal(halfUp(Number.NaN, 2), null);
assert.equal(halfUp(Number.POSITIVE_INFINITY, 2), null);
assert.equal(halfUp(1, -1), null);
assert.equal(halfUp(Number.MAX_VALUE, 8), null);
assert.equal(halfUp(-Number.MAX_VALUE, 8), null);
assert.equal(halfUp(Number.MIN_VALUE, 8), 0);

const ctAFreeArea = calculateFreeArea(
  factById["fact:ct-a-total-area"],
  factById["fact:ct-a-built-area"],
);
assert.equal(ctAFreeArea.value, 108);
assert.equal(ctAFreeArea.area_type, "free");
assert.equal(ctAFreeArea.benchmark_eligible, true);

const ctAPricePerBuilt = calculatePricePerM2(
  factById["fact:ct-a-scenario-price"],
  factById["fact:ct-a-built-area"],
  { denominatorAreaType: "built" },
);
const ctAPricePerTotal = calculatePricePerM2(
  factById["fact:ct-a-scenario-price"],
  factById["fact:ct-a-total-area"],
  { denominatorAreaType: "total" },
);
assert.equal(ctAPricePerBuilt.value, 10_000);
assert.equal(ctAPricePerTotal.value, 4_757.28);
assert.equal(ctAPricePerBuilt.denominator_area_type, "built");
assert.equal(ctAPricePerTotal.denominator_area_type, "total");
assert.equal(ctAPricePerBuilt.benchmark_eligible, false);
assert.equal(ctAPricePerTotal.benchmark_eligible, false);
assert.ok(ctAPricePerBuilt.exclusion_reasons.includes("simulated_input"));
assert.ok(ctAPricePerTotal.exclusion_reasons.includes("simulated_input"));

const denominatorMismatch = calculatePricePerM2(
  factById["fact:ct-a-scenario-price"],
  factById["fact:ct-a-built-area"],
  { denominatorAreaType: "total" },
);
assert.equal(denominatorMismatch.status, "incompatible");
assert.equal(denominatorMismatch.value, null);

const invalidPriceType = calculatePricePerM2(
  {
    ...factById["fact:ct-a-scenario-price"],
    price_type: "banana",
  },
  factById["fact:ct-a-built-area"],
  { denominatorAreaType: "built" },
);
assert.equal(invalidPriceType.status, "incompatible");
assert.equal(invalidPriceType.value, null);
assertNoNonFinite(invalidPriceType);

const overflowingPricePerM2 = calculatePricePerM2(
  {
    ...factById["fact:ct-a-scenario-price"],
    normalized_value: Number.MAX_VALUE,
  },
  {
    ...factById["fact:ct-a-built-area"],
    normalized_value: Number.MIN_VALUE,
  },
  { denominatorAreaType: "built" },
);
assert.equal(overflowingPricePerM2.status, "insufficient");
assert.equal(overflowingPricePerM2.value, null);
assert.deepEqual(
  overflowingPricePerM2.exclusion_reasons,
  ["non_finite_result"],
);
assertNoNonFinite(overflowingPricePerM2);

const overflowingRoundedPricePerM2 = calculatePricePerM2(
  {
    ...factById["fact:ct-a-scenario-price"],
    normalized_value: Number.MAX_VALUE,
  },
  {
    ...factById["fact:ct-a-built-area"],
    normalized_value: 1,
  },
  { denominatorAreaType: "built" },
);
assert.equal(overflowingRoundedPricePerM2.status, "insufficient");
assert.equal(overflowingRoundedPricePerM2.value, null);
assertNoNonFinite(overflowingRoundedPricePerM2);

const overflowingFreeArea = calculateFreeArea(
  {
    ...factById["fact:ct-a-total-area"],
    normalized_value: Number.MAX_VALUE,
  },
  {
    ...factById["fact:ct-a-built-area"],
    normalized_value: -Number.MAX_VALUE,
  },
);
assert.equal(overflowingFreeArea.status, "insufficient");
assert.equal(overflowingFreeArea.value, null);
assert.deepEqual(
  overflowingFreeArea.exclusion_reasons,
  ["non_finite_result"],
);
assertNoNonFinite(overflowingFreeArea);

const ctBPriceA = factById["fact:ct-b-price-a"];
const ctBPriceB = factById["fact:ct-b-price-b"];
const ctBDifference = calculateDifference(ctBPriceB, ctBPriceA, {
  percentageBaseFact: ctBPriceA,
});
assert.equal(ctBDifference.delta, 25_000);
assert.equal(ctBDifference.percentage, 4.17);
assert.equal(
  ctBDifference.percentage_base_fact_id,
  "fact:ct-b-price-a",
);
assert.equal(ctBDifference.benchmark_eligible, false);
assert.deepEqual(
  [ctBPriceA.normalized_value, ctBPriceB.normalized_value],
  [600_000, 625_000],
);
assert.equal(
  issueById["issue:ct-b-price-source-conflict"].issue_code,
  "PRICE_SOURCE_CONFLICT",
);
assert.equal(
  JSON.stringify({ facts: factsData, issues: issuesData }).includes(
    "selected_truth_fact_id",
  ),
  false,
);

const invalidDifferencePriceType = calculateDifference(
  { ...ctBPriceB, price_type: "banana" },
  { ...ctBPriceA, price_type: "banana" },
  {
    percentageBaseFact: {
      ...ctBPriceA,
      price_type: "banana",
    },
  },
);
assert.equal(invalidDifferencePriceType.status, "incompatible");
assert.equal(invalidDifferencePriceType.delta, null);
assertNoNonFinite(invalidDifferencePriceType);

const overflowingDifference = calculateDifference(
  { ...ctBPriceB, normalized_value: Number.MAX_VALUE },
  { ...ctBPriceA, normalized_value: -Number.MAX_VALUE },
);
assert.equal(overflowingDifference.status, "insufficient");
assert.equal(overflowingDifference.delta, null);
assert.deepEqual(
  overflowingDifference.exclusion_reasons,
  ["non_finite_result"],
);
assertNoNonFinite(overflowingDifference);

const overflowingPercentage = calculateDifference(
  { ...ctBPriceB, normalized_value: 1 },
  { ...ctBPriceA, normalized_value: 0 },
  {
    percentageBaseFact: {
      ...ctBPriceA,
      fact_id: "fact:test-minimum-base",
      normalized_value: Number.MIN_VALUE,
    },
  },
);
assert.equal(overflowingPercentage.status, "insufficient");
assert.equal(overflowingPercentage.delta, null);
assert.equal(overflowingPercentage.percentage, null);
assert.deepEqual(
  overflowingPercentage.exclusion_reasons,
  ["non_finite_result"],
);
assert.deepEqual(overflowingPercentage.issue_codes, []);
assertNoNonFinite(overflowingPercentage);

assert.equal(
  factById["fact:ct-d-countertop-material"].normalized_value,
  "cuarzo",
);
assert.equal(
  factById["fact:ct-d-air-conditioning"].normalized_value,
  "unknown",
);
assert.notEqual(
  factById["fact:ct-d-air-conditioning"].normalized_value,
  false,
);

const normalEventBuild = buildChangeEvent({
  eventId: "event:ct-e-normal-change",
  previousFact: factById["fact:ct-e-price-600000"],
  newFact: factById["fact:ct-e-price-630000"],
  ...eventTimeline(
    factById["fact:ct-e-price-600000"],
    factById["fact:ct-e-price-630000"],
  ),
  effectiveAt: "2026-02-01T00:00:00Z",
  observedAt: "2026-02-01T00:00:00Z",
});
assert.equal(normalEventBuild.status, "certified");
assert.equal(normalEventBuild.event.delta, 30_000);
assert.equal(normalEventBuild.event.percentage, 5);
assert.equal(normalEventBuild.event.cause, null);
assert.deepEqual(normalEventBuild.event.cause_evidence_ids, []);
assert.deepEqual(normalEventBuild.issues, []);

const zeroBaseEventBuild = buildChangeEvent({
  eventId: "event:ct-e-base-zero",
  previousFact: factById["fact:ct-e-zero-base"],
  newFact: factById["fact:ct-e-after-zero"],
  ...eventTimeline(
    factById["fact:ct-e-zero-base"],
    factById["fact:ct-e-after-zero"],
  ),
  effectiveAt: "2026-04-01T00:00:00Z",
  observedAt: "2026-04-01T00:00:00Z",
  zeroBaseIssueId: "issue:ct-e-percent-base-zero",
});
assert.equal(zeroBaseEventBuild.event.delta, 100_000);
assert.equal(zeroBaseEventBuild.event.percentage, null);
assert.equal(
  zeroBaseEventBuild.issues[0].issue_code,
  "PERCENT_BASE_ZERO",
);
assert.equal(
  zeroBaseEventBuild.issues[0].issue_id,
  "issue:ct-e-percent-base-zero",
);
const zeroBaseDefaultIssue = buildChangeEvent({
  eventId: "event:ct-e-base-zero",
  previousFact: factById["fact:ct-e-zero-base"],
  newFact: factById["fact:ct-e-after-zero"],
  ...eventTimeline(
    factById["fact:ct-e-zero-base"],
    factById["fact:ct-e-after-zero"],
  ),
  effectiveAt: "2026-04-01T00:00:00Z",
  observedAt: "2026-04-01T00:00:00Z",
});
assert.match(
  zeroBaseDefaultIssue.issues[0].issue_id,
  /^[a-z][a-z0-9_-]*:[a-z0-9][a-z0-9._-]*$/,
);

const extremeEventBuild = buildChangeEvent({
  eventId: "event:ct-e-extreme-change",
  previousFact: factById["fact:ct-e-extreme-before"],
  newFact: factById["fact:ct-e-extreme-after"],
  ...eventTimeline(
    factById["fact:ct-e-extreme-before"],
    factById["fact:ct-e-extreme-after"],
  ),
  effectiveAt: "2026-04-01T00:00:00Z",
  observedAt: "2026-04-01T00:00:00Z",
  extremeIssueId: "issue:ct-e-extreme-change-review",
});
assert.equal(extremeEventBuild.event.delta, 60_000);
assert.equal(extremeEventBuild.event.percentage, 60);
assert.equal(extremeEventBuild.event.quality_status, "reviewable");
assert.equal(
  extremeEventBuild.issues[0].issue_code,
  "EXTREME_CHANGE_REVIEW",
);
assert.equal(
  extremeEventBuild.issues[0].issue_id,
  "issue:ct-e-extreme-change-review",
);

assert.deepEqual(
  sortEvents([...eventsData].reverse()).map(
    (event) => event.event_id,
  ),
  [
    "event:ct-e-normal-change",
    "event:ct-e-base-zero",
    "event:ct-e-extreme-change",
  ],
);
assert.equal(
  eventById["event:ct-e-normal-change"].percentage_base_fact_id,
  "fact:ct-e-price-600000",
);
assert.equal(
  eventById["event:ct-e-base-zero"].percentage,
  null,
);
assert.ok(
  eventsData.every(
    (event) =>
      event.cause === null && event.cause_evidence_ids.length === 0,
  ),
);

const unsupportedCause = buildChangeEvent({
  eventId: "event:unsupported-cause",
  previousFact: factById["fact:ct-e-price-600000"],
  newFact: factById["fact:ct-e-price-630000"],
  ...eventTimeline(
    factById["fact:ct-e-price-600000"],
    factById["fact:ct-e-price-630000"],
  ),
  effectiveAt: "2026-02-01T00:00:00Z",
  observedAt: "2026-02-01T00:00:00Z",
  cause: "Causa no respaldada",
});
assert.equal(unsupportedCause.status, "incompatible");
assert.equal(unsupportedCause.event, null);

const mismatchedFieldEvent = buildChangeEvent({
  eventId: "event:mismatched-field",
  previousFact: factById["fact:ct-e-price-600000"],
  newFact: {
    ...factById["fact:ct-e-price-630000"],
    field_name: "sale_price",
  },
  ...eventTimeline(
    factById["fact:ct-e-price-600000"],
    factById["fact:ct-e-price-630000"],
  ),
  effectiveAt: "2026-02-01T00:00:00Z",
  observedAt: "2026-02-01T00:00:00Z",
});
assert.equal(mismatchedFieldEvent.status, "incompatible");
assert.equal(mismatchedFieldEvent.event, null);

const reviewableNormalEvent = buildChangeEvent({
  eventId: "event:reviewable-normal",
  previousFact: {
    ...factById["fact:ct-e-price-600000"],
    quality_status: "reviewable",
    benchmark_eligible: false,
    exclusion_reason: "Pendiente de revisión.",
  },
  newFact: {
    ...factById["fact:ct-e-price-630000"],
    quality_status: "reviewable",
    benchmark_eligible: false,
    exclusion_reason: "Pendiente de revisión.",
  },
  ...eventTimeline(
    factById["fact:ct-e-price-600000"],
    factById["fact:ct-e-price-630000"],
  ),
  effectiveAt: "2026-02-01T00:00:00Z",
  observedAt: "2026-02-01T00:00:00Z",
});
assert.equal(reviewableNormalEvent.status, "review_required");
assert.equal(reviewableNormalEvent.event.quality_status, "reviewable");

const previousChronologyFact =
  factById["fact:ct-e-price-600000"];
const newChronologyFact =
  factById["fact:ct-e-price-630000"];
const chronologyTimeline = eventTimeline(
  previousChronologyFact,
  newChronologyFact,
);

const timestampOnlyEvent = buildChangeEvent({
  eventId: "event:timestamp-only",
  previousFact: previousChronologyFact,
  newFact: newChronologyFact,
  previousCapturedAt:
    chronologyTimeline.previousObservation.captured_at,
  newCapturedAt:
    chronologyTimeline.newObservation.captured_at,
  effectiveAt:
    chronologyTimeline.newObservation.captured_at,
  observedAt:
    chronologyTimeline.newObservation.captured_at,
});
assert.equal(timestampOnlyEvent.status, "certified");

for (const invalidDate of [
  "banana",
  "2026-02-01",
  "2026-02-30T00:00:00Z",
  "2026-02-01T25:00:00Z",
]) {
  const invalidDateEvent = buildChangeEvent({
    eventId: "event:invalid-date",
    previousFact: previousChronologyFact,
    newFact: newChronologyFact,
    ...chronologyTimeline,
    effectiveAt: invalidDate,
    observedAt:
      chronologyTimeline.newObservation.captured_at,
  });
  assert.equal(invalidDateEvent.status, "insufficient");
  assert.equal(invalidDateEvent.event, null);
  assertNoNonFinite(invalidDateEvent);
}

const invertedObservationEvent = buildChangeEvent({
  eventId: "event:inverted-observations",
  previousFact: previousChronologyFact,
  newFact: newChronologyFact,
  previousObservation: {
    ...chronologyTimeline.previousObservation,
    captured_at: "2026-03-01T00:00:00Z",
  },
  newObservation: chronologyTimeline.newObservation,
  effectiveAt:
    chronologyTimeline.newObservation.captured_at,
  observedAt:
    chronologyTimeline.newObservation.captured_at,
});
assert.equal(invertedObservationEvent.status, "insufficient");
assert.equal(invertedObservationEvent.event, null);
assertNoNonFinite(invertedObservationEvent);

const invalidObservationDateEvent = buildChangeEvent({
  eventId: "event:invalid-observation-date",
  previousFact: previousChronologyFact,
  newFact: newChronologyFact,
  previousObservation: {
    ...chronologyTimeline.previousObservation,
    captured_at: "banana",
  },
  newObservation: chronologyTimeline.newObservation,
  effectiveAt:
    chronologyTimeline.newObservation.captured_at,
  observedAt:
    chronologyTimeline.newObservation.captured_at,
});
assert.equal(invalidObservationDateEvent.status, "insufficient");
assert.equal(invalidObservationDateEvent.event, null);
assertNoNonFinite(invalidObservationDateEvent);

const conflictingTimestampAndObservationEvent = buildChangeEvent({
  eventId: "event:conflicting-timestamp-observation",
  previousFact: previousChronologyFact,
  newFact: newChronologyFact,
  ...chronologyTimeline,
  previousCapturedAt: "2026-01-02T00:00:00Z",
  effectiveAt:
    chronologyTimeline.newObservation.captured_at,
  observedAt:
    chronologyTimeline.newObservation.captured_at,
});
assert.equal(
  conflictingTimestampAndObservationEvent.status,
  "incompatible",
);
assert.equal(
  conflictingTimestampAndObservationEvent.event,
  null,
);
assertNoNonFinite(conflictingTimestampAndObservationEvent);

const mismatchedObservedAtEvent = buildChangeEvent({
  eventId: "event:mismatched-observed-at",
  previousFact: previousChronologyFact,
  newFact: newChronologyFact,
  ...chronologyTimeline,
  effectiveAt:
    chronologyTimeline.newObservation.captured_at,
  observedAt: "2026-02-01T00:00:01Z",
});
assert.equal(mismatchedObservedAtEvent.status, "insufficient");
assert.equal(mismatchedObservedAtEvent.event, null);
assertNoNonFinite(mismatchedObservedAtEvent);

const incoherentEffectiveAtEvent = buildChangeEvent({
  eventId: "event:incoherent-effective-at",
  previousFact: previousChronologyFact,
  newFact: newChronologyFact,
  ...chronologyTimeline,
  effectiveAt: "2025-12-31T23:59:59Z",
  observedAt:
    chronologyTimeline.newObservation.captured_at,
});
assert.equal(incoherentEffectiveAtEvent.status, "insufficient");
assert.equal(incoherentEffectiveAtEvent.event, null);
assertNoNonFinite(incoherentEffectiveAtEvent);

const ctGCardArea = factById["fact:pardo-coast-card-area"];
const ctGPlanArea = factById["fact:pardo-coast-plan-area"];
const ctGGap = calculateDifference(ctGCardArea, ctGPlanArea, {
  percentageBaseFact: ctGCardArea,
  allowAreaTypeMismatch: true,
});
assert.equal(ctGGap.delta, 50.78);
assert.equal(ctGGap.percentage, 48.76);
assert.equal(ctGGap.result_area_type, "unknown");
assert.equal(ctGGap.benchmark_eligible, false);
assert.equal(ctGCardArea.area_type, "unknown");
assert.equal(ctGPlanArea.area_type, "total");
assert.equal(
  factById["fact:pardo-coast-area-delta"].area_type,
  "unknown",
);
assert.equal(
  issueById["issue:pardo-coast-area-source-conflict"].issue_code,
  "AREA_SOURCE_CONFLICT",
);
assert.equal(
  issueById["issue:pardo-coast-floor-range-conflict-review"].issue_code,
  "FLOOR_RANGE_CONFLICT_REVIEW",
);
assert.equal(
  JSON.stringify({
    typologies: typologiesData,
    facts: factsData,
    issues: issuesData,
    events: eventsData,
  }).includes("project:nexo-3992"),
  false,
);
assert.equal(
  JSON.stringify({
    typologies: typologiesData,
    facts: factsData,
    issues: issuesData,
    events: eventsData,
  }).includes("selected_truth_fact_id"),
  false,
);

for (const fact of factsData) {
  if (fact.value_kind === "simulated") {
    assert.equal(fact.benchmark_eligible, false);
  }
  if (
    ["inconsistent", "illegible", "insufficient"].includes(
      fact.quality_status,
    )
  ) {
    assert.equal(fact.benchmark_eligible, false);
  }
  if (
    fact.area_type === "unknown" ||
    fact.currency === "unknown" ||
    fact.denominator_area_type === "unknown"
  ) {
    assert.equal(fact.benchmark_eligible, false);
  }
  if (fact.value_kind === "derived") {
    const inputFacts = fact.derivation.input_fact_ids.map(
      (factId) => factById[factId],
    );
    const eligibility = evaluateDerivedEligibility(inputFacts);
    if (!eligibility.benchmark_eligible) {
      assert.equal(fact.benchmark_eligible, false);
    }
  }
}

const eligibleBuiltFact = certifiedPricePerM2Fact({
  factId: "fact:test-pen-built",
  value: 10_000,
  currency: "PEN",
  denominatorAreaType: "built",
});
const anotherEligibleBuiltFact = certifiedPricePerM2Fact({
  factId: "fact:test-pen-built-2",
  value: 12_000,
  currency: "PEN",
  denominatorAreaType: "built",
});
const eligibleUsdBuiltFact = certifiedPricePerM2Fact({
  factId: "fact:test-usd-built",
  value: 3_000,
  currency: "USD",
  denominatorAreaType: "built",
});
const eligiblePenTotalFact = certifiedPricePerM2Fact({
  factId: "fact:test-pen-total",
  value: 5_000,
  currency: "PEN",
  denominatorAreaType: "total",
});

assert.deepEqual(
  aggregateCertifiedMean([
    eligibleBuiltFact,
    anotherEligibleBuiltFact,
  ]),
  {
    status: "certified",
    value: 11_000,
    currency: "PEN",
    price_type: "list",
    denominator_area_type: "built",
    count: 2,
    benchmark_eligible: true,
    exclusion_reasons: [],
  },
);
assert.equal(
  aggregateCertifiedMean([
    eligibleBuiltFact,
    eligibleUsdBuiltFact,
  ]).status,
  "incompatible",
);
assert.equal(
  aggregateCertifiedMean([
    eligibleBuiltFact,
    eligiblePenTotalFact,
  ]).status,
  "incompatible",
);
const invalidPriceTypeMean = aggregateCertifiedMean([
  { ...eligibleBuiltFact, price_type: "banana" },
  { ...anotherEligibleBuiltFact, price_type: "banana" },
]);
assert.equal(invalidPriceTypeMean.status, "incompatible");
assert.equal(invalidPriceTypeMean.value, null);
assert.equal(invalidPriceTypeMean.price_type, null);
assert.equal(invalidPriceTypeMean.benchmark_eligible, false);

const mixedPriceTypeMean = aggregateCertifiedMean([
  eligibleBuiltFact,
  { ...anotherEligibleBuiltFact, price_type: "sale" },
]);
assert.equal(mixedPriceTypeMean.status, "incompatible");
assert.equal(mixedPriceTypeMean.value, null);
assert.equal(mixedPriceTypeMean.price_type, null);
assert.equal(mixedPriceTypeMean.benchmark_eligible, false);

const pricePerM2DenominatorMismatch = calculateDifference(
  anotherEligibleBuiltFact,
  eligiblePenTotalFact,
  { percentageBaseFact: eligibleBuiltFact },
);
assert.equal(
  pricePerM2DenominatorMismatch.status,
  "incompatible",
);
assert.equal(pricePerM2DenominatorMismatch.delta, null);
assert.equal(pricePerM2DenominatorMismatch.percentage, null);
assertNoNonFinite(pricePerM2DenominatorMismatch);

const missingResults = [
  calculatePricePerM2(null, factById["fact:ct-a-built-area"]),
  calculateFreeArea(null, factById["fact:ct-a-built-area"]),
  calculateDifference(null, factById["fact:ct-b-price-a"]),
  calculateDifference(
    {
      ...factById["fact:ct-b-price-b"],
      normalized_value: Number.MAX_VALUE,
    },
    {
      ...factById["fact:ct-b-price-a"],
      normalized_value: -Number.MAX_VALUE,
    },
  ),
  aggregateCertifiedMean([]),
];
for (const result of missingResults) {
  assert.equal("value" in result ? result.value : result.delta, null);
  assertNoNonFinite(result);
}

assert.equal(
  evaluateDerivedEligibility([
    {
      ...eligibleBuiltFact,
      value_kind: "observed",
      quality_status: "reviewable",
      benchmark_eligible: true,
    },
  ]).benchmark_eligible,
  false,
);

const reversedFixtures = [...fixtures].reverse().map((fixture) => ({
  ...fixture,
  input: Object.fromEntries(
    Object.entries(fixture.input).map(([key, value]) => [
      key,
      Array.isArray(value) ? [...value].reverse() : value,
    ]),
  ),
}));
assert.deepEqual(
  materializeMeasureRecords(reversedFixtures),
  materialized,
);

assert.equal(moduleSource.includes("new Date("), false);
assert.equal(moduleSource.includes("fetch("), false);
assert.equal(moduleSource.includes("writeFile"), false);
assertNoNonFinite({
  typologies: typologiesData,
  facts: factsData,
  issues: issuesData,
  events: eventsData,
});

console.log(
  `P1-05 OK: ${typologiesData.length} tipologías, ${factsData.length} hechos, ${issuesData.length} issues y ${eventsData.length} eventos.`,
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function indexBy(records, idField) {
  return Object.fromEntries(
    records.map((record) => [record[idField], record]),
  );
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) =>
    left.localeCompare(right),
  );
}

function assertUnique(records, idField) {
  assert.equal(
    new Set(records.map((record) => record[idField])).size,
    records.length,
    `${idField} debe ser único`,
  );
}

function assertSchemaEnums() {
  const qualityStatuses = new Set(schema.$defs.qualityStatus.enum);
  const valueKinds = new Set(schema.$defs.valueKind.enum);
  const areaTypes = new Set(schema.$defs.areaType.enum);
  const priceTypes = new Set(schema.$defs.priceType.enum);
  const currencies = new Set(schema.$defs.currency.enum);
  const issueSeverities = new Set(
    schema.$defs.issue.properties.severity.enum,
  );

  for (const typology of typologiesData) {
    assert.ok(qualityStatuses.has(typology.quality_status));
  }
  for (const fact of factsData) {
    assert.ok(qualityStatuses.has(fact.quality_status));
    assert.ok(valueKinds.has(fact.value_kind));
    if (fact.area_type !== null) assert.ok(areaTypes.has(fact.area_type));
    if (fact.price_type !== null) {
      assert.ok(priceTypes.has(fact.price_type));
    }
    if (fact.currency !== null) assert.ok(currencies.has(fact.currency));
  }
  for (const issue of issuesData) {
    assert.ok(qualityStatuses.has(issue.quality_status));
    assert.ok(issueSeverities.has(issue.severity));
  }
  for (const event of eventsData) {
    assert.ok(qualityStatuses.has(event.quality_status));
  }
}

function assertReferences() {
  const typologyIds = new Set(
    typologiesData.map((typology) => typology.typology_id),
  );
  const factIds = new Set(factsData.map((fact) => fact.fact_id));
  const eventIds = new Set(eventsData.map((event) => event.event_id));
  const externalObservationIds = new Set(fixtureObservationIds);
  const externalProjectIds = new Set(fixtureProjectIds);

  for (const typology of typologiesData) {
    assert.ok(externalProjectIds.has(typology.project_id));
  }
  for (const fact of factsData) {
    assert.ok(typologyIds.has(fact.entity_id));
    assert.ok(externalObservationIds.has(fact.observation_id));
    for (const inputFactId of fact.derivation?.input_fact_ids ?? []) {
      assert.ok(factIds.has(inputFactId));
    }
  }
  for (const issue of issuesData) {
    for (const factId of issue.fact_ids) assert.ok(factIds.has(factId));
    if (issue.entity_type === "typology") {
      assert.ok(typologyIds.has(issue.entity_id));
    } else if (issue.entity_type === "event") {
      assert.ok(eventIds.has(issue.entity_id));
    } else {
      assert.fail(`Tipo de entidad de issue no esperado: ${issue.entity_type}`);
    }
  }
  for (const event of eventsData) {
    assert.ok(typologyIds.has(event.entity_id));
    assert.ok(factIds.has(event.previous_fact_id));
    assert.ok(factIds.has(event.new_fact_id));
    assert.ok(factIds.has(event.percentage_base_fact_id));
  }

  assert.ok(
    uniqueSorted(issuesData.flatMap((issue) => issue.fact_ids)).every(
      (factId) => factIds.has(factId),
    ),
  );
  assert.ok(
    uniqueSorted(
      issuesData
        .filter((issue) => issue.entity_type === "event")
        .map((issue) => issue.entity_id),
    ).every((eventId) => eventIds.has(eventId)),
  );
  assert.ok(
    uniqueSorted(
      eventsData.flatMap((event) => [
        event.previous_fact_id,
        event.new_fact_id,
        event.percentage_base_fact_id,
      ]),
    ).every((factId) => factIds.has(factId)),
  );
}

function eventTimeline(previousFact, newFact) {
  const previousObservation =
    observationById[previousFact.observation_id];
  const newObservation =
    observationById[newFact.observation_id];
  assert.ok(
    previousObservation,
    `Falta ${previousFact.observation_id} en observations.json`,
  );
  assert.ok(
    newObservation,
    `Falta ${newFact.observation_id} en observations.json`,
  );
  return {
    previousObservation,
    newObservation,
  };
}

function certifiedPricePerM2Fact({
  factId,
  value,
  currency,
  denominatorAreaType,
}) {
  return {
    fact_id: factId,
    normalized_value: value,
    semantic_type: "price_per_m2",
    unit: `${currency}/m2`,
    currency,
    price_type: "list",
    denominator_area_type: denominatorAreaType,
    quality_status: "certified",
    benchmark_eligible: true,
  };
}

function assertNoNonFinite(value, pathLabel = "$") {
  if (typeof value === "number") {
    assert.ok(Number.isFinite(value), `${pathLabel} no debe ser no-finito`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertNoNonFinite(entry, `${pathLabel}[${index}]`),
    );
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      assertNoNonFinite(entry, `${pathLabel}.${key}`);
    }
  }
}
