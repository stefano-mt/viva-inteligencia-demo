const HISTORY_PAYLOAD_VERSION = 1;

const STATUS_ORDER = ["certified", "reviewable", "insufficient"];
const VALIDITY_ORDER = ["current", "aging", "historical", "unknown"];
const DIRECTION_ORDER = ["increase", "decrease", "unchanged"];
const KNOWN_CURRENCIES = new Set(["PEN", "USD"]);
const REASON_ORDER = [
  "invalid_status",
  "inverted_dates",
  "invalid_dates",
  "unknown_currency",
  "invalid_values",
  "inconsistent_delta",
  "missing_project_reference",
  "missing_observation_reference",
  "missing_fact_reference",
  "incompatible_fact",
  "missing_evidence_reference",
  "unavailable_evidence",
  "restricted_evidence",
  "unsupported_cause",
];

const compareText = (left, right) =>
  String(left ?? "").localeCompare(String(right ?? ""));
const isFiniteNumber = (value) =>
  typeof value === "number" && Number.isFinite(value);
const clone = (value) => structuredClone(value);
const toArray = (value) => (Array.isArray(value) ? value : []);
const unique = (values) => [...new Set(toArray(values).filter(Boolean).map(String))];

function orderedSubset(value, precedence) {
  if (value === undefined) return [...precedence];
  const requested = new Set(unique(value));
  return precedence.filter((candidate) => requested.has(candidate));
}

function orderedReasons(values) {
  const rank = new Map(REASON_ORDER.map((reason, index) => [reason, index]));
  return unique(values).sort(
    (left, right) =>
      (rank.get(left) ?? Number.MAX_SAFE_INTEGER) -
        (rank.get(right) ?? Number.MAX_SAFE_INTEGER) ||
      compareText(left, right),
  );
}

function indexed(records, idField) {
  const map = new Map();
  const duplicates = new Set();
  for (const record of toArray(records)) {
    const id = record?.[idField];
    if (typeof id !== "string" || !id) continue;
    if (map.has(id)) duplicates.add(id);
    else map.set(id, record);
  }
  return { map, duplicates };
}

function parseTimestamp(value) {
  if (typeof value !== "string" || !value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function approximatelyEqual(left, right, tolerance = 0.02) {
  return isFiniteNumber(left) &&
    isFiniteNumber(right) &&
    Math.abs(left - right) <= tolerance;
}

function directionFor(delta) {
  if (delta > 0) return "increase";
  if (delta < 0) return "decrease";
  return "unchanged";
}

function validityAtCutoff(event, policy) {
  const cutoff = parseTimestamp(policy?.cutoff_at);
  const observed = parseTimestamp(event?.current_observed_at);
  const currentMax = policy?.current_max_days;
  const agingMax = policy?.aging_max_days;
  if (
    cutoff === null ||
    observed === null ||
    observed > cutoff ||
    !Number.isInteger(currentMax) ||
    !Number.isInteger(agingMax) ||
    currentMax < 0 ||
    agingMax < currentMax
  ) {
    return "unknown";
  }
  const ageDays = (cutoff - observed) / 86_400_000;
  if (ageDays <= currentMax) return "current";
  if (ageDays <= agingMax) return "aging";
  return "historical";
}

function evidenceAssessment(records) {
  if (!records.length || records.some((record) => !record)) {
    return { status: "missing", reasons: ["missing_evidence_reference"] };
  }
  if (records.some(({ publish_permission }) => publish_permission !== "authorized")) {
    return { status: "restricted", reasons: ["restricted_evidence"] };
  }
  if (records.some(({ availability }) => availability !== "available")) {
    return { status: "unavailable", reasons: ["unavailable_evidence"] };
  }
  return { status: "available", reasons: [] };
}

function historyContractAvailable(data) {
  const [major, minor] = String(data?.metadata?.contract_version ?? "")
    .split(".")
    .map(Number);
  return major === 2 && minor >= 4 && data?.history?.version === HISTORY_PAYLOAD_VERSION;
}

export function normalizeHistoryFilters(filters = {}) {
  return {
    statuses: orderedSubset(filters?.statuses, STATUS_ORDER),
    validities: orderedSubset(filters?.validities, VALIDITY_ORDER),
    directions: orderedSubset(filters?.directions, DIRECTION_ORDER),
  };
}

function createIndexes(data) {
  const model = data?.model ?? {};
  return {
    projects: indexed(model.projects, "project_id"),
    observations: indexed(model.observations, "observation_id"),
    facts: indexed(model.facts, "fact_id"),
    evidence: indexed(model.evidence, "evidence_id"),
  };
}

function factCompatible({ fact, observationId, event, expectedValue }) {
  return (
    fact &&
    fact.observation_id === observationId &&
    fact.entity_id === event.project_id &&
    fact.field_name === event.field &&
    approximatelyEqual(fact.normalized_value, expectedValue) &&
    (event.currency === null || fact.currency === event.currency)
  );
}

function eventModel(event, indexes, policy) {
  const reasons = [...toArray(event?.reason_codes)];
  const sourceStatus = STATUS_ORDER.includes(event?.status)
    ? event.status
    : "insufficient";
  if (!STATUS_ORDER.includes(event?.status)) reasons.push("invalid_status");

  const previousAt = parseTimestamp(event?.previous_observed_at);
  const currentAt = parseTimestamp(event?.current_observed_at);
  const detectedAt = parseTimestamp(event?.detected_at);
  if (previousAt === null || currentAt === null || detectedAt === null) {
    reasons.push("invalid_dates");
  } else if (previousAt >= currentAt || currentAt > detectedAt) {
    reasons.push("inverted_dates");
  }

  if (event?.currency !== null && !KNOWN_CURRENCIES.has(event?.currency)) {
    reasons.push("unknown_currency");
  }
  if (
    !isFiniteNumber(event?.previous_value) ||
    !isFiniteNumber(event?.current_value) ||
    !isFiniteNumber(event?.delta_absolute)
  ) {
    reasons.push("invalid_values");
  } else {
    const expectedAbsolute = event.current_value - event.previous_value;
    if (!approximatelyEqual(expectedAbsolute, event.delta_absolute)) {
      reasons.push("inconsistent_delta");
    }
    if (event.previous_value === 0) {
      if (event.delta_pct !== null) reasons.push("inconsistent_delta");
    } else {
      const expectedPct = (expectedAbsolute / event.previous_value) * 100;
      if (!approximatelyEqual(expectedPct, event.delta_pct)) {
        reasons.push("inconsistent_delta");
      }
    }
  }

  const project = indexes.projects.map.get(event?.project_id) ?? null;
  if (!project || indexes.projects.duplicates.has(event?.project_id)) {
    reasons.push("missing_project_reference");
  }

  const observationIds = [
    event?.previous_observation_id,
    event?.current_observation_id,
  ];
  const observations = observationIds.map((id) => indexes.observations.map.get(id));
  if (
    observations.some((record, index) =>
      !record ||
      indexes.observations.duplicates.has(observationIds[index]) ||
      record.entity_id !== event?.project_id,
    )
  ) {
    reasons.push("missing_observation_reference");
  }

  const factIds = unique(event?.fact_ids);
  const facts = factIds.map((id) => indexes.facts.map.get(id) ?? null);
  if (
    factIds.length !== 2 ||
    facts.some((record, index) =>
      !record || indexes.facts.duplicates.has(factIds[index]),
    )
  ) {
    reasons.push("missing_fact_reference");
  } else {
    const factsByObservation = new Map(facts.map((fact) => [fact.observation_id, fact]));
    if (
      !factCompatible({
        fact: factsByObservation.get(event.previous_observation_id),
        observationId: event.previous_observation_id,
        event,
        expectedValue: event.previous_value,
      }) ||
      !factCompatible({
        fact: factsByObservation.get(event.current_observation_id),
        observationId: event.current_observation_id,
        event,
        expectedValue: event.current_value,
      })
    ) {
      reasons.push("incompatible_fact");
    }
  }

  const evidenceIds = unique(event?.evidence_ids);
  const evidence = evidenceIds.map((id) => indexes.evidence.map.get(id) ?? null);
  const evidenceResult = evidenceAssessment(evidence);
  reasons.push(...evidenceResult.reasons);
  if (evidenceIds.length !== 2) reasons.push("missing_evidence_reference");

  const rawCause =
    typeof event?.cause === "string" && event.cause.trim()
      ? event.cause.trim()
      : null;
  const causeEvidenceIds = unique(event?.cause_evidence_ids);
  const causeEvidence = causeEvidenceIds.map(
    (id) => indexes.evidence.map.get(id) ?? null,
  );
  const causeEvidenceResult = evidenceAssessment(causeEvidence);
  const causeSupported =
    rawCause !== null &&
    causeEvidenceIds.length > 0 &&
    causeEvidenceResult.status === "available";
  if (rawCause !== null && !causeSupported) reasons.push("unsupported_cause");

  const ordered = orderedReasons(reasons);
  const hasIntegrityFailure = ordered.some((reason) => REASON_ORDER.includes(reason));
  const effectiveStatus = hasIntegrityFailure ? "insufficient" : sourceStatus;
  const deltaPctNote =
    event?.previous_value === 0
      ? "Variación porcentual no calculable: la base observada es cero."
      : event?.delta_pct === null
        ? "Variación porcentual no disponible en la evidencia observada."
        : null;

  return {
    history_event_id: event.history_event_id,
    project_id: event.project_id,
    district_id: event.district_id,
    field: event.field,
    unit: event.unit,
    currency: event.currency,
    previous_observation_id: event.previous_observation_id,
    current_observation_id: event.current_observation_id,
    previous_value: event.previous_value,
    current_value: event.current_value,
    delta_absolute: event.delta_absolute,
    delta_pct: event.delta_pct,
    delta_pct_note: deltaPctNote,
    direction: directionFor(event.delta_absolute),
    previous_observed_at: event.previous_observed_at,
    current_observed_at: event.current_observed_at,
    detected_at: event.detected_at,
    source_status: STATUS_ORDER.includes(event.status) ? event.status : null,
    effective_status: effectiveStatus,
    validity: validityAtCutoff(event, policy),
    evidence_status: evidenceResult.status,
    reason_codes: ordered,
    fact_ids: [...factIds],
    evidence_ids: [...evidenceIds],
    cause: causeSupported ? rawCause : null,
    cause_evidence_ids: causeSupported ? causeEvidenceIds : [],
    cause_status:
      rawCause === null ? "not_observed" : causeSupported ? "supported" : "suppressed",
    project: project ? clone(project) : null,
    observations: observations.filter(Boolean).map(clone),
    facts: facts.filter(Boolean).map(clone),
    evidence: evidence.filter(Boolean).map((record) => ({
      ...clone(record),
      publishable:
        record.publish_permission === "authorized" &&
        record.availability === "available",
    })),
  };
}

function policyCompare(left, right) {
  const statusRank = new Map(STATUS_ORDER.map((value, index) => [value, index]));
  const validityRank = new Map(
    VALIDITY_ORDER.map((value, index) => [value, index]),
  );
  const evidenceRank = new Map(
    ["available", "unavailable", "restricted", "missing"].map(
      (value, index) => [value, index],
    ),
  );
  return (
    statusRank.get(left.effective_status) - statusRank.get(right.effective_status) ||
    validityRank.get(left.validity) - validityRank.get(right.validity) ||
    evidenceRank.get(left.evidence_status) - evidenceRank.get(right.evidence_status) ||
    Math.abs(right.delta_pct ?? right.delta_absolute ?? 0) -
      Math.abs(left.delta_pct ?? left.delta_absolute ?? 0) ||
    (parseTimestamp(right.detected_at) ?? 0) -
      (parseTimestamp(left.detected_at) ?? 0) ||
    compareText(left.history_event_id, right.history_event_id)
  );
}

function countBy(values, keys, field) {
  return Object.fromEntries(
    keys.map((key) => [key, values.filter((value) => value[field] === key).length]),
  );
}

function sourceExclusionReasons(history) {
  return toArray(history?.coverage?.excluded_reasons)
    .map(({ reason_code, count }) => ({
      reason_code: String(reason_code),
      count: Number.isInteger(count) && count >= 0 ? count : 0,
    }))
    .sort((left, right) => right.count - left.count || compareText(left.reason_code, right.reason_code));
}

function scenarioReasons(events, integrityExclusions) {
  const counts = new Map();
  for (const event of events) {
    for (const reason of event.reason_codes) {
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
    }
  }
  for (const reason of integrityExclusions) {
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([reason_code, count]) => ({ reason_code, count }))
    .sort(
      (left, right) =>
        right.count - left.count || compareText(left.reason_code, right.reason_code),
    );
}

function buildAgenda(timeline) {
  const certified = timeline.filter(
    ({ effective_status }) => effective_status === "certified",
  );
  const reviewable = timeline.filter(
    ({ effective_status }) => effective_status === "reviewable",
  );
  const selected = certified.length ? certified.slice(0, 3) : reviewable.slice(0, 3);
  if (!selected.length) {
    return [{
      agenda_item_id: "agenda:history-expand-or-review-scope",
      position: 1,
      action: "expand_or_review_scope",
      title: "Validar cobertura o ampliar el escenario",
      description:
        "No hay señales certificadas visibles; revise filtros y cobertura antes de concluir.",
      references: { history_event_ids: [], fact_ids: [], evidence_ids: [] },
    }];
  }
  return selected.map((item, index) => ({
    agenda_item_id: `agenda:${item.history_event_id}`,
    position: index + 1,
    action: certified.length ? "review_observed_change" : "validate_signal",
    title: certified.length
      ? "Revisar cambio observado"
      : "Validar señal observada",
    description: certified.length
      ? `Contrastar el cambio observado en ${item.project?.canonical_name ?? item.project_id}.`
      : `Validar la señal de ${item.project?.canonical_name ?? item.project_id} antes de utilizarla.`,
    references: {
      history_event_ids: [item.history_event_id],
      fact_ids: [...item.fact_ids],
      evidence_ids: [...item.evidence_ids],
    },
  }));
}

function unavailableContext(status, filters) {
  return {
    contract_version: null,
    status,
    filters,
    timeline: [],
    coverage: {
      scenario_project_count: 0,
      scenario_candidate_count: 0,
      scenario_event_count: 0,
      scenario_excluded_count: 0,
      shown_count: 0,
      filtered_out_count: 0,
      integrity_excluded_count: 0,
      source_candidate_count: 0,
      source_excluded_count: 0,
      excluded_count: 0,
      by_status: countBy([], STATUS_ORDER, "effective_status"),
      by_validity: countBy([], VALIDITY_ORDER, "validity"),
      primary_excluded_reasons: [],
      source_excluded_reasons: [],
    },
    agenda: [{
      agenda_item_id: "agenda:history-unavailable",
      position: 1,
      action: "history_unavailable",
      title: "Histórico no disponible",
      description: "Este contrato no publica un histórico compatible.",
      references: { history_event_ids: [], fact_ids: [], evidence_ids: [] },
    }],
  };
}

export function buildHistoryContext({ data, scenarioContext, filters } = {}) {
  const normalizedFilters = normalizeHistoryFilters(filters);
  if (!historyContractAvailable(data)) {
    return unavailableContext("contract_unavailable", normalizedFilters);
  }
  if (!Array.isArray(scenarioContext?.comparable_project_ids)) {
    return unavailableContext("invalid_context", normalizedFilters);
  }

  const comparableProjectIds = unique(scenarioContext.comparable_project_ids).sort(compareText);
  const comparableSet = new Set(comparableProjectIds);
  const indexes = createIndexes(data);
  const seenEventIds = new Set();
  const integrityExclusions = [];
  const scenarioEvents = [];

  for (const event of toArray(data.history.events)) {
    if (!comparableSet.has(event?.project_id)) continue;
    if (
      typeof event?.history_event_id !== "string" ||
      !event.history_event_id ||
      seenEventIds.has(event.history_event_id)
    ) {
      integrityExclusions.push("duplicate_or_missing_event_id");
      continue;
    }
    seenEventIds.add(event.history_event_id);
    scenarioEvents.push(eventModel(event, indexes, data.history.policy));
  }
  scenarioEvents.sort(policyCompare);

  const timeline = scenarioEvents.filter(
    (item) =>
      normalizedFilters.statuses.includes(item.effective_status) &&
      normalizedFilters.validities.includes(item.validity) &&
      normalizedFilters.directions.includes(item.direction),
  );
  const sourceCoverage = data.history.coverage ?? {};
  const primaryExcludedReasons = scenarioReasons(
    scenarioEvents,
    integrityExclusions,
  );

  return {
    contract_version: data.metadata.contract_version,
    status: timeline.length ? "ready" : "empty",
    filters: normalizedFilters,
    scenario: {
      district_id:
        scenarioContext?.scope?.district_id ??
        scenarioContext?.scenario?.district_id ??
        null,
      scope_mode:
        scenarioContext?.scope?.scope_mode ??
        scenarioContext?.scenario?.scope_mode ??
        null,
      quadrant_id:
        scenarioContext?.scope?.quadrant_id ??
        scenarioContext?.scenario?.quadrant_id ??
        null,
      comparable_project_ids: comparableProjectIds,
    },
    timeline,
    coverage: {
      scenario_project_count: comparableProjectIds.length,
      scenario_candidate_count: scenarioEvents.length + integrityExclusions.length,
      scenario_event_count: scenarioEvents.length,
      scenario_excluded_count: integrityExclusions.length,
      shown_count: timeline.length,
      filtered_out_count: scenarioEvents.length - timeline.length,
      integrity_excluded_count: integrityExclusions.length,
      source_candidate_count: sourceCoverage.candidate_count ?? 0,
      source_excluded_count: sourceCoverage.excluded_count ?? 0,
      excluded_count: integrityExclusions.length,
      by_status: countBy(scenarioEvents, STATUS_ORDER, "effective_status"),
      by_validity: countBy(scenarioEvents, VALIDITY_ORDER, "validity"),
      primary_excluded_reasons: primaryExcludedReasons,
      source_excluded_reasons: sourceExclusionReasons(data.history),
    },
    agenda: buildAgenda(timeline),
  };
}

export function getHistoryEventDetail(historyContext, historyEventId) {
  if (typeof historyEventId !== "string" || !historyEventId) return null;
  const event = toArray(historyContext?.timeline).find(
    (candidate) => candidate.history_event_id === historyEventId,
  );
  return event ? clone(event) : null;
}
