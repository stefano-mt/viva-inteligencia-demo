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
    current.entity_id !== candidate.project_id ||
    (candidate?.entity_resolution_status !== undefined &&
      candidate.entity_resolution_status !== "resolved")
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

function clean(value) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized || null;
}

function sourceNumber(value) {
  const normalized = clean(value);
  if (normalized === null) return null;
  const parsed = Number(normalized.replace("%", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function sourceDateTime(value) {
  const normalized = clean(value);
  if (normalized === null) return null;
  if (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      normalized
    )
  ) {
    return normalized;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return `${normalized}T00:00:00Z`;
  }
  const sqlLike =
    /^(\d{4}-\d{2}-\d{2})[ ](\d{2}:\d{2}:\d{2})$/.exec(normalized);
  return sqlLike ? `${sqlLike[1]}T${sqlLike[2]}Z` : null;
}

function normalizedName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLocaleLowerCase("es");
}

function stableSlug(value) {
  const slug = normalizedName(value).replace(/\s+/g, "-");
  return slug || "unknown";
}

function districtIndex(catalog = []) {
  const index = new Map();
  for (const district of catalog) {
    const names = [
      district.ui_name,
      district.source_name,
      district.district_name,
      district.canonical_name,
      district.name
    ];
    for (const name of names) {
      const key = normalizedName(name);
      if (key) index.set(key, district.district_id);
    }
  }
  return index;
}

function resolvedDistrictId(name, index) {
  return index.get(normalizedName(name)) ?? `district:legacy-${stableSlug(name)}`;
}

function currentPublishedPrice(row) {
  return sourceNumber(clean(row.list_price_avg) ?? row.price_min);
}

function previousPublishedPrice(row) {
  return sourceNumber(row.latest_price_history_from);
}

function isChangedRow(row) {
  const previous = previousPublishedPrice(row);
  const current = currentPublishedPrice(row);
  return previous !== null && current !== null && previous !== current;
}

function isPreliminaryCandidate(row, policy) {
  if (!isChangedRow(row)) return false;
  const previous = previousPublishedPrice(row);
  const current = currentPublishedPrice(row);
  const previousAt = timestamp(sourceDateTime(row.latest_price_history_date));
  const currentAt = timestamp(sourceDateTime(row.captured_at));
  const deltaPct =
    previous === 0 ? null : ((current - previous) / previous) * 100;
  return (
    previous > 0 &&
    current > 0 &&
    clean(row.currency) === policy.currency &&
    previousAt !== null &&
    currentAt !== null &&
    previousAt < currentAt &&
    deltaPct !== null &&
    Math.abs(deltaPct) <= policy.maximum_certified_absolute_delta_pct
  );
}

function historyIds(sourceProjectId) {
  const prefix = `history-nexo-${sourceProjectId}`;
  return {
    event_id: `history_event:nexo-${sourceProjectId}-published-price`,
    previous_observation_id: `observation:${prefix}-a-previous`,
    current_observation_id: `observation:${prefix}-b-current`,
    previous_fact_id: `fact:${prefix}-a-previous`,
    current_fact_id: `fact:${prefix}-b-current`,
    previous_evidence_id: `evidence:${prefix}-a-previous`,
    current_evidence_id: `evidence:${prefix}-b-current`
  };
}

function primaryBlockingReason(reasonCodes) {
  return reasonCodes.find((reason) => BLOCKING_REASONS.has(reason)) ?? null;
}

function buildSourceCandidate(
  row,
  {
    policy,
    authoritativeProjectIds,
    districtIds,
    duplicate = false
  }
) {
  const sourceProjectId = clean(row.project_id);
  const projectId = sourceProjectId ? `project:nexo-${sourceProjectId}` : null;
  const ids = historyIds(sourceProjectId ?? "unknown");
  const previousObservedAt = sourceDateTime(row.latest_price_history_date);
  const currentObservedAt = sourceDateTime(row.captured_at);
  const sourceUrl = clean(row.source_url);
  const evidenceState = sourceUrl ? "authorized" : "unknown";
  return {
    source_project_id: sourceProjectId,
    source_url: sourceUrl,
    candidate: {
      project_id: projectId,
      district_id: resolvedDistrictId(row.district, districtIds),
      district_name: clean(row.district),
      scenario_project_ids: [...authoritativeProjectIds],
      entity_resolution_status: authoritativeProjectIds.has(projectId)
        ? "resolved"
        : "unresolved",
      field_semantic: policy.field_semantics[0],
      previous: {
        entity_id: projectId,
        field_semantic: policy.field_semantics[0],
        currency: clean(row.currency) === policy.currency ? policy.currency : "unknown",
        value: previousPublishedPrice(row),
        observed_at: previousObservedAt,
        observation_id: ids.previous_observation_id,
        fact_id: ids.previous_fact_id,
        evidence_ids: [ids.previous_evidence_id],
        evidence_state: evidenceState
      },
      current: {
        entity_id: projectId,
        field_semantic: policy.field_semantics[0],
        currency: clean(row.currency) === policy.currency ? policy.currency : "unknown",
        value: currentPublishedPrice(row),
        observed_at: currentObservedAt,
        observation_id: ids.current_observation_id,
        fact_id: ids.current_fact_id,
        evidence_ids: [ids.current_evidence_id],
        evidence_state: evidenceState
      },
      detected_at: currentObservedAt,
      cause: null,
      cause_evidence_ids: [],
      duplicate
    },
    ids
  };
}

function historyEventFromCandidate(candidateRecord, assessment) {
  const { candidate, ids } = candidateRecord;
  return {
    history_event_id: ids.event_id,
    project_id: candidate.project_id,
    district_id: candidate.district_id,
    field: "published_price_from",
    unit: "PEN",
    currency: "PEN",
    previous_observation_id: candidate.previous.observation_id,
    current_observation_id: candidate.current.observation_id,
    previous_value: candidate.previous.value,
    current_value: candidate.current.value,
    delta_absolute: assessment.delta_absolute,
    delta_pct: assessment.delta_pct,
    previous_observed_at: candidate.previous.observed_at,
    current_observed_at: candidate.current.observed_at,
    detected_at: candidate.detected_at,
    status: assessment.status,
    validity: assessment.validity,
    reason_codes: assessment.reason_codes,
    fact_ids: assessment.fact_ids,
    evidence_ids: assessment.evidence_ids,
    cause: assessment.cause,
    cause_evidence_ids: assessment.cause_evidence_ids
  };
}

function lineageFromCandidate(candidateRecord) {
  const { candidate, ids, source_project_id: sourceProjectId, source_url: sourceUrl } =
    candidateRecord;
  return {
    history_event_id: ids.event_id,
    source_project_id: sourceProjectId,
    source_url: sourceUrl,
    previous: {
      observation_id: candidate.previous.observation_id,
      fact_id: candidate.previous.fact_id,
      evidence_id: ids.previous_evidence_id,
      observed_at: candidate.previous.observed_at,
      value: candidate.previous.value
    },
    current: {
      observation_id: candidate.current.observation_id,
      fact_id: candidate.current.fact_id,
      evidence_id: ids.current_evidence_id,
      observed_at: candidate.current.observed_at,
      value: candidate.current.value
    }
  };
}

function coverageByDistrict(candidateRecords, events, exclusions) {
  const eventById = new Map(
    events.map((event) => [event.history_event_id, event])
  );
  const exclusionBySourceId = new Map(
    exclusions.map((exclusion) => [exclusion.source_project_id, exclusion])
  );
  const rows = new Map();
  for (const record of candidateRecords) {
    const districtId = record.candidate.district_id;
    const coverage = rows.get(districtId) ?? {
      district_id: districtId,
      candidate_count: 0,
      materialized_count: 0,
      certified_count: 0,
      reviewable_count: 0,
      excluded_count: 0
    };
    coverage.candidate_count += 1;
    const event = eventById.get(record.ids.event_id);
    if (event) {
      coverage.materialized_count += 1;
      if (event.status === "certified") coverage.certified_count += 1;
      if (event.status === "reviewable") coverage.reviewable_count += 1;
    } else if (exclusionBySourceId.has(record.source_project_id)) {
      coverage.excluded_count += 1;
    }
    rows.set(districtId, coverage);
  }
  return [...rows.values()].sort((left, right) =>
    compareStrings(left.district_id, right.district_id)
  );
}

function districtCounts(records) {
  const counts = new Map();
  for (const { row } of records) {
    const districtName = clean(row.district) ?? "Sin distrito";
    counts.set(districtName, (counts.get(districtName) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([district_name, count]) => ({ district_name, count }))
    .sort(
      (left, right) =>
        right.count - left.count || compareStrings(left.district_name, right.district_name)
    );
}

export function materializeHistoryCandidates(
  rows,
  {
    policy,
    authoritative_project_ids: authoritativeProjectIds = [],
    district_catalog: districtCatalog = [],
    source_snapshot_path: sourceSnapshotPath =
      "data/source/viva_minimum_dataset_latest.csv"
  } = {}
) {
  const policyErrors = validateHistoryPolicy(policy);
  if (policyErrors.length > 0) {
    throw new Error(`Invalid history policy:\n- ${policyErrors.join("\n- ")}`);
  }
  if (!Array.isArray(rows)) throw new TypeError("history source rows must be an array");

  const authoritativeIds = new Set(authoritativeProjectIds);
  const districtIds = districtIndex(districtCatalog);
  const grouped = new Map();
  for (const row of rows) {
    const sourceProjectId = clean(row?.project_id) ?? "unknown";
    const records = grouped.get(sourceProjectId) ?? [];
    records.push(row);
    grouped.set(sourceProjectId, records);
  }

  const uniqueRows = [...grouped.entries()]
    .map(([sourceProjectId, records]) => ({
      sourceProjectId,
      row: records[0],
      duplicate: records.length > 1
    }))
    .sort((left, right) => compareStrings(left.sourceProjectId, right.sourceProjectId));
  const changedRows = uniqueRows.filter(({ row }) => isChangedRow(row));
  const positiveChangedRows = changedRows.filter(({ row }) =>
    previousPublishedPrice(row) > 0 && currentPublishedPrice(row) > 0
  );
  const penChangedRows = positiveChangedRows.filter(
    ({ row }) => clean(row.currency) === policy.currency
  );
  const chronologicalChangedRows = penChangedRows.filter(({ row }) => {
    const previousAt = timestamp(sourceDateTime(row.latest_price_history_date));
    const currentAt = timestamp(sourceDateTime(row.captured_at));
    return previousAt !== null && currentAt !== null && previousAt < currentAt;
  });
  const preliminaryRows = changedRows.filter(
    ({ row, duplicate }) => !duplicate && isPreliminaryCandidate(row, policy)
  );
  const preliminaryCandidateIds = preliminaryRows
    .map(({ sourceProjectId }) => sourceProjectId);

  const candidateRecords = changedRows.map(({ row, duplicate }) =>
    buildSourceCandidate(row, {
      policy,
      authoritativeProjectIds: authoritativeIds,
      districtIds,
      duplicate
    })
  );
  const events = [];
  const exclusions = [];
  const lineage = [];

  for (const candidateRecord of candidateRecords) {
    const assessment = evaluateHistoryCandidate(candidateRecord.candidate, policy);
    if (assessment.materializable) {
      events.push(historyEventFromCandidate(candidateRecord, assessment));
      lineage.push(lineageFromCandidate(candidateRecord));
      continue;
    }
    exclusions.push({
      source_project_id: candidateRecord.source_project_id,
      project_id: candidateRecord.candidate.project_id,
      district_id: candidateRecord.candidate.district_id,
      district_name: candidateRecord.candidate.district_name,
      primary_reason: primaryBlockingReason(assessment.reason_codes),
      reason_codes: assessment.reason_codes
    });
  }

  events.sort((left, right) =>
    compareStrings(left.history_event_id, right.history_event_id)
  );
  exclusions.sort((left, right) =>
    compareStrings(left.source_project_id, right.source_project_id)
  );
  lineage.sort((left, right) =>
    compareStrings(left.history_event_id, right.history_event_id)
  );

  const excludedReasonCounts = new Map();
  for (const exclusion of exclusions) {
    const reason = exclusion.primary_reason;
    excludedReasonCounts.set(reason, (excludedReasonCounts.get(reason) ?? 0) + 1);
  }
  const excludedReasons = [...excludedReasonCounts.entries()]
    .map(([reason_code, count]) => ({ reason_code, count }))
    .sort((left, right) => compareStrings(left.reason_code, right.reason_code));

  return {
    version: 1,
    source_snapshot_path: sourceSnapshotPath,
    source_row_count: rows.length,
    changed_count: changedRows.length,
    preliminary_candidate_count: preliminaryCandidateIds.length,
    preliminary_candidate_ids: preliminaryCandidateIds,
    preliminary_districts: districtCounts(preliminaryRows),
    audit_funnel: [
      { stage: "source_rows", count: rows.length },
      { stage: "changed", count: changedRows.length },
      { stage: "positive_values", count: positiveChangedRows.length },
      { stage: "pen_currency", count: penChangedRows.length },
      { stage: "valid_chronology", count: chronologicalChangedRows.length },
      { stage: "within_certified_threshold", count: preliminaryRows.length },
      {
        stage: "canonical_within_certified_threshold",
        count: preliminaryRows.filter(({ sourceProjectId }) =>
          authoritativeIds.has(`project:nexo-${sourceProjectId}`)
        ).length
      },
      { stage: "materialized_by_policy", count: events.length }
    ],
    events,
    lineage,
    exclusions,
    coverage: {
      candidate_count: changedRows.length,
      materialized_count: events.length,
      certified_count: events.filter(({ status }) => status === "certified").length,
      reviewable_count: events.filter(({ status }) => status === "reviewable").length,
      excluded_count: exclusions.length,
      districts: coverageByDistrict(candidateRecords, events, exclusions),
      excluded_reasons: excludedReasons
    }
  };
}

export function serializeHistoryMaterialization(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}
