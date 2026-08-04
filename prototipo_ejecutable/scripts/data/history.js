const EXPECTED_POLICY = Object.freeze({
  cutoff_at: "2026-07-28T01:24:28Z",
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
});

export const HISTORY_REASON_PRECEDENCE = Object.freeze([
  "base_zero",
  "extreme_change",
  "unknown_currency",
  "invalid_date_order",
  "semantic_mismatch",
  "entity_mismatch",
  "evidence_missing",
  "restricted",
  "outside_cutoff",
  "duplicate"
]);

const BLOCKING_REASONS = new Set([
  "unknown_currency",
  "invalid_date_order",
  "semantic_mismatch",
  "entity_mismatch",
  "evidence_missing",
  "restricted",
  "outside_cutoff",
  "duplicate"
]);

const compareStrings = (left, right) => String(left).localeCompare(String(right));
const uniqueSorted = (values = []) => [...new Set(values)].sort(compareStrings);
const sameJson = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function rounded(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function timestamp(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validityFor(currentObservedAt, cutoffAt, policy) {
  const current = timestamp(currentObservedAt);
  const cutoff = timestamp(cutoffAt);
  if (current === null || cutoff === null || current > cutoff) return "unknown";
  const ageDays = Math.floor((cutoff - current) / 86_400_000);
  if (ageDays <= policy.current_max_days) return "current";
  if (ageDays <= policy.aging_max_days) return "aging";
  return "historical";
}

function orderedReasons(reasons) {
  const positions = new Map(
    HISTORY_REASON_PRECEDENCE.map((reason, index) => [reason, index])
  );
  return [...new Set(reasons)].sort(
    (left, right) =>
      (positions.get(left) ?? Number.MAX_SAFE_INTEGER) -
        (positions.get(right) ?? Number.MAX_SAFE_INTEGER) ||
      compareStrings(left, right)
  );
}

export function validateHistoryPolicy(policy) {
  const errors = [];
  if (policy === null || typeof policy !== "object" || Array.isArray(policy)) {
    return ["history policy must be an object"];
  }
  const expectedKeys = Object.keys(EXPECTED_POLICY).sort(compareStrings);
  const actualKeys = Object.keys(policy).sort(compareStrings);
  if (!sameJson(actualKeys, expectedKeys)) {
    errors.push("history policy keys must match the approved 2.4 contract");
  }
  for (const [key, expected] of Object.entries(EXPECTED_POLICY)) {
    if (!sameJson(policy[key], expected)) {
      errors.push(
        Array.isArray(expected)
          ? `${key} must match the approved ordered values`
          : `${key} must equal ${expected}`
      );
    }
  }
  if (timestamp(policy.cutoff_at) === null) {
    errors.push("cutoff_at must be a valid RFC3339 date-time");
  }
  return uniqueSorted(errors);
}

export function evaluateHistoryCandidate(candidate, policy) {
  const policyErrors = validateHistoryPolicy(policy);
  if (policyErrors.length > 0) {
    throw new Error(`Invalid history policy:\n- ${policyErrors.join("\n- ")}`);
  }

  const previous = candidate?.previous ?? {};
  const current = candidate?.current ?? {};
  const reasons = [];
  const previousValue = finiteNumber(previous.value);
  const currentValue = finiteNumber(current.value);
  const previousAt = timestamp(previous.observed_at);
  const currentAt = timestamp(current.observed_at);
  const detectedAt = timestamp(candidate?.detected_at);
  const cutoffAt = timestamp(policy.cutoff_at);

  if (
    candidate?.field_semantic !== policy.field_semantics[0] ||
    previous.field_semantic !== candidate?.field_semantic ||
    current.field_semantic !== candidate?.field_semantic
  ) {
    reasons.push("semantic_mismatch");
  }
  if (
    !candidate?.project_id ||
    previous.entity_id !== candidate.project_id ||
    current.entity_id !== candidate.project_id
  ) {
    reasons.push("entity_mismatch");
  }
  if (
    previous.currency !== policy.currency ||
    current.currency !== policy.currency
  ) {
    reasons.push("unknown_currency");
  }
  if (
    previousAt === null ||
    currentAt === null ||
    detectedAt === null ||
    previousAt >= currentAt ||
    currentAt > detectedAt
  ) {
    reasons.push("invalid_date_order");
  }
  if (
    cutoffAt === null ||
    (currentAt !== null && currentAt > cutoffAt) ||
    (detectedAt !== null && detectedAt > cutoffAt)
  ) {
    reasons.push("outside_cutoff");
  }
  if (candidate?.duplicate === true) reasons.push("duplicate");

  const evidenceStates = [previous.evidence_state, current.evidence_state];
  const evidenceIds = uniqueSorted([
    ...(previous.evidence_ids ?? []),
    ...(current.evidence_ids ?? [])
  ]);
  if (evidenceStates.includes("restricted")) {
    reasons.push("restricted");
  } else if (
    evidenceStates.some((state) => state !== "authorized") ||
    (previous.evidence_ids ?? []).length === 0 ||
    (current.evidence_ids ?? []).length === 0
  ) {
    reasons.push("evidence_missing");
  }

  const deltaAbsolute =
    previousValue === null || currentValue === null
      ? null
      : rounded(currentValue - previousValue);
  const deltaPct =
    previousValue === null || currentValue === null || previousValue === 0
      ? null
      : rounded(((currentValue - previousValue) / previousValue) * 100);
  if (previousValue === 0 && currentValue !== null) reasons.push("base_zero");
  if (
    deltaPct !== null &&
    Math.abs(deltaPct) > policy.maximum_certified_absolute_delta_pct
  ) {
    reasons.push("extreme_change");
  }

  const reasonCodes = orderedReasons(reasons);
  const blocked = reasonCodes.some((reason) => BLOCKING_REASONS.has(reason));
  const status = blocked
    ? "insufficient"
    : reasonCodes.length > 0
      ? "reviewable"
      : "certified";
  const materializable = status !== "insufficient";
  const scenarioProjectIds = new Set(candidate?.scenario_project_ids ?? []);
  const visibleInScenario =
    materializable && scenarioProjectIds.has(candidate?.project_id);
  const causeEvidenceIds = uniqueSorted(candidate?.cause_evidence_ids ?? []);
  const observedCause =
    typeof candidate?.cause === "string" &&
    candidate.cause.trim() !== "" &&
    causeEvidenceIds.length > 0
      ? candidate.cause.trim()
      : null;

  return {
    project_id: candidate?.project_id ?? null,
    district_id: candidate?.district_id ?? null,
    materializable,
    visible_in_scenario: visibleInScenario,
    status,
    validity: validityFor(current.observed_at, policy.cutoff_at, policy),
    delta_absolute: deltaAbsolute,
    delta_pct: deltaPct,
    reason_codes: reasonCodes,
    fact_ids: uniqueSorted([previous.fact_id, current.fact_id].filter(Boolean)),
    evidence_ids: evidenceIds,
    cause: observedCause,
    cause_evidence_ids: observedCause === null ? [] : causeEvidenceIds
  };
}
