import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  buildHistoryContext,
  getHistoryEventDetail,
  normalizeHistoryFilters,
} from "../public/js/history.js";

async function readJson(relativePath) {
  return JSON.parse(
    await fs.readFile(new URL(relativePath, import.meta.url), "utf8"),
  );
}

const [data, source] = await Promise.all([
  readJson("../../../data/generated/viva-platform-demo.json"),
  fs.readFile(new URL("../../../packages/domain/src/legacy/history.js", import.meta.url), "utf8"),
]);

const clone = (value) => structuredClone(value);
const allHistoryProjectIds = [
  ...new Set(data.history.events.map(({ project_id }) => project_id)),
].sort();

function scenarioContext(comparableProjectIds = allHistoryProjectIds, overrides = {}) {
  return {
    scenario: clone(data.scenario_defaults),
    scope: {
      district_id: data.scenario_defaults.district_id,
      scope_mode: "district",
      quadrant_id: null,
      center_latitude: null,
      center_longitude: null,
      radius_meters: null,
    },
    comparable_project_ids: [...comparableProjectIds],
    cutoff_at: data.metadata.cutoff_at,
    scenario_status: "valid",
    comparability_status: "ready",
    ...overrides,
  };
}

assert.equal(data.metadata.contract_version, "2.4.0");
assert.doesNotMatch(
  source,
  /\b(?:window|document|fetch|XMLHttpRequest|localStorage|sessionStorage)\b|Date\.now\s*\(|new\s+Date\s*\(/,
  "history domain must not depend on DOM, network, browser storage or device clock",
);

assert.deepEqual(normalizeHistoryFilters(), {
  statuses: ["certified", "reviewable", "insufficient"],
  validities: ["current", "aging", "historical", "unknown"],
  directions: ["increase", "decrease", "unchanged"],
});
assert.deepEqual(
  normalizeHistoryFilters({
    statuses: ["reviewable", "certified", "reviewable", "invalid"],
    validities: ["aging"],
    directions: ["decrease", "increase"],
  }),
  {
    statuses: ["certified", "reviewable"],
    validities: ["aging"],
    directions: ["increase", "decrease"],
  },
);

const dataBefore = clone(data);
const contextBefore = scenarioContext();
const contextInputBefore = clone(contextBefore);
const ready = buildHistoryContext({ data, scenarioContext: contextBefore });
assert.deepEqual(data, dataBefore, "history engine must not mutate the payload");
assert.deepEqual(
  contextBefore,
  contextInputBefore,
  "history engine must not mutate scenarioContext",
);
assert.equal(ready.status, "ready");
assert.equal(ready.timeline.length, 36);
assert.equal(ready.coverage.scenario_event_count, 36);
assert.equal(ready.coverage.scenario_candidate_count, 36);
assert.equal(ready.coverage.scenario_excluded_count, 0);
assert.equal(ready.coverage.shown_count, 36);
assert.equal(ready.coverage.source_candidate_count, 42);
assert.equal(ready.coverage.source_excluded_count, 6);
assert.deepEqual(ready.coverage.by_status, {
  certified: 31,
  reviewable: 5,
  insufficient: 0,
});
assert.deepEqual(ready.coverage.by_validity, {
  current: 0,
  aging: 36,
  historical: 0,
  unknown: 0,
});

const statusRank = { certified: 0, reviewable: 1, insufficient: 2 };
for (let index = 1; index < ready.timeline.length; index += 1) {
  assert.ok(
    statusRank[ready.timeline[index - 1].effective_status] <=
      statusRank[ready.timeline[index].effective_status],
    "policy-first order must keep certified changes before reviewable extremes",
  );
}
assert.ok(
  Math.max(
    ...ready.timeline
      .filter(({ effective_status }) => effective_status === "reviewable")
      .map(({ delta_pct }) => Math.abs(delta_pct)),
  ) > 100,
  "the fixture must retain extreme reviewable changes",
);

const reversedData = clone(data);
reversedData.history.events.reverse();
reversedData.model.projects.reverse();
reversedData.model.observations.reverse();
reversedData.model.facts.reverse();
reversedData.model.evidence.reverse();
assert.deepEqual(
  buildHistoryContext({ data: reversedData, scenarioContext: scenarioContext() })
    .timeline.map(({ history_event_id }) => history_event_id),
  ready.timeline.map(({ history_event_id }) => history_event_id),
  "input order must not affect history order",
);

const reviewableOnly = buildHistoryContext({
  data,
  scenarioContext: scenarioContext(),
  filters: { statuses: ["reviewable"] },
});
assert.equal(reviewableOnly.timeline.length, 5);
assert.ok(
  reviewableOnly.timeline.every(
    ({ effective_status }) => effective_status === "reviewable",
  ),
);
assert.ok(
  reviewableOnly.agenda.every(({ action }) => action === "validate_signal"),
  "reviewable changes can request validation but cannot become positive actions",
);
assert.doesNotMatch(
  JSON.stringify(reviewableOnly.agenda),
  /oportunidad|esta semana|realizado/iu,
);

const currentOnly = buildHistoryContext({
  data,
  scenarioContext: scenarioContext(),
  filters: { validities: ["current"] },
});
assert.equal(currentOnly.timeline.length, 0);
assert.equal(currentOnly.coverage.filtered_out_count, 36);
assert.equal(currentOnly.agenda.length, 1);
assert.equal(currentOnly.agenda[0].action, "expand_or_review_scope");

const derivedValidityData = clone(data);
const derivedValidityEvent = derivedValidityData.history.events.find(
  ({ history_event_id }) => history_event_id === ready.timeline[0].history_event_id,
);
derivedValidityEvent.current_observed_at = "2026-07-20T00:00:00Z";
derivedValidityEvent.detected_at = "2026-07-20T00:00:00Z";
derivedValidityEvent.validity = "historical";
const derivedValidity = buildHistoryContext({
  data: derivedValidityData,
  scenarioContext: scenarioContext([derivedValidityEvent.project_id]),
});
assert.equal(
  derivedValidity.timeline[0].validity,
  "current",
  "validity must be derived from the fixed cutoff, not trusted or read from a clock",
);

// CT-C: one project in and one project out of the same district/microzone.
const mirafloresEvents = data.history.events.filter(
  ({ district_id }) => district_id === "150122",
);
assert.ok(mirafloresEvents.length >= 2);
const ctCProjectId = mirafloresEvents[0].project_id;
const ctC = buildHistoryContext({
  data,
  scenarioContext: scenarioContext([ctCProjectId], {
    scope: {
      district_id: "150122",
      scope_mode: "quadrant",
      quadrant_id: "NW",
      center_latitude: null,
      center_longitude: null,
      radius_meters: null,
    },
  }),
});
assert.ok(ctC.timeline.length > 0);
assert.ok(ctC.timeline.every(({ project_id }) => project_id === ctCProjectId));
assert.ok(
  !ctC.timeline.some(
    ({ project_id }) => project_id === mirafloresEvents[1].project_id,
  ),
  "same-district projects outside comparable_project_ids must stay out",
);

// CT-I: the high-load district is still reduced by the authoritative comparable set.
const mirafloresAssignments = data.geography.assignments.filter(
  ({ district_id }) => district_id === "150122",
);
assert.equal(mirafloresAssignments.length, 90);
const ctIComparableIds = mirafloresAssignments
  .filter(({ coordinate_valid, polygon_valid }) => coordinate_valid && polygon_valid)
  .map(({ authoritative_project_id }) => authoritative_project_id)
  .filter(Boolean)
  .sort();
assert.equal(ctIComparableIds.length, 85);
const ctI = buildHistoryContext({
  data,
  scenarioContext: scenarioContext(ctIComparableIds, {
    scope: {
      district_id: "150122",
      scope_mode: "district",
      quadrant_id: null,
      center_latitude: null,
      center_longitude: null,
      radius_meters: null,
    },
  }),
});
assert.ok(
  ctI.timeline.every(({ project_id }) => ctIComparableIds.includes(project_id)),
);
assert.equal(
  ctI.timeline.length,
  data.history.events.filter(({ project_id }) =>
    ctIComparableIds.includes(project_id),
  ).length,
);

// CT-E: the detail preserves both observations, percentages and evidence without causes.
const selected = ready.timeline.find(
  ({ effective_status }) => effective_status === "certified",
);
const detail = getHistoryEventDetail(ready, selected.history_event_id);
assert.equal(detail.previous_observed_at, selected.previous_observed_at);
assert.equal(detail.current_observed_at, selected.current_observed_at);
assert.equal(detail.detected_at, selected.detected_at);
assert.ok(Number.isFinite(detail.delta_absolute));
assert.ok(Number.isFinite(detail.delta_pct));
assert.equal(detail.cause, null);
assert.equal(detail.cause_status, "not_observed");
assert.equal(detail.facts.length, 2);
assert.equal(detail.evidence.length, 2);
assert.ok(detail.evidence.every(({ publishable }) => publishable));
assert.ok(detail.project?.canonical_name);
assert.equal(getHistoryEventDetail(ready, "history_event:missing"), null);

const unsupportedCauseData = clone(data);
const unsupportedCauseEvent = unsupportedCauseData.history.events.find(
  ({ history_event_id }) => history_event_id === selected.history_event_id,
);
unsupportedCauseEvent.cause = "Promoción comercial";
unsupportedCauseEvent.cause_evidence_ids = [];
const unsupportedCause = buildHistoryContext({
  data: unsupportedCauseData,
  scenarioContext: scenarioContext([selected.project_id]),
});
assert.equal(unsupportedCause.timeline[0].cause, null);
assert.equal(unsupportedCause.timeline[0].cause_status, "suppressed");
assert.ok(unsupportedCause.timeline[0].reason_codes.includes("unsupported_cause"));

const zeroBaseData = clone(data);
const zeroBaseEvent = zeroBaseData.history.events.find(
  ({ history_event_id }) => history_event_id === selected.history_event_id,
);
zeroBaseEvent.previous_value = 0;
zeroBaseEvent.current_value = 10;
zeroBaseEvent.delta_absolute = 10;
zeroBaseEvent.delta_pct = null;
const zeroBase = buildHistoryContext({
  data: zeroBaseData,
  scenarioContext: scenarioContext([selected.project_id]),
});
assert.equal(zeroBase.timeline[0].delta_pct, null);
assert.match(zeroBase.timeline[0].delta_pct_note, /base.*cero/iu);
assert.doesNotMatch(JSON.stringify(zeroBase.timeline[0]), /Infinity/);

// CT-G: restricted evidence fails closed and never becomes a positive signal.
const restrictedData = clone(data);
const restrictedEvent = restrictedData.history.events.find(
  ({ history_event_id }) => history_event_id === selected.history_event_id,
);
for (const evidence of restrictedData.model.evidence) {
  if (restrictedEvent.evidence_ids.includes(evidence.evidence_id)) {
    evidence.publish_permission = "restricted";
  }
}
const restricted = buildHistoryContext({
  data: restrictedData,
  scenarioContext: scenarioContext([selected.project_id]),
});
assert.equal(restricted.timeline.length, 1);
assert.equal(restricted.timeline[0].source_status, "certified");
assert.equal(restricted.timeline[0].effective_status, "insufficient");
assert.equal(restricted.timeline[0].evidence_status, "restricted");
assert.ok(restricted.timeline[0].reason_codes.includes("restricted_evidence"));
assert.equal(restricted.agenda[0].action, "expand_or_review_scope");

const invalidSemanticsData = clone(data);
const invalidEvent = invalidSemanticsData.history.events.find(
  ({ history_event_id }) => history_event_id === selected.history_event_id,
);
invalidEvent.previous_observed_at = "2026-07-01T00:00:00Z";
invalidEvent.current_observed_at = "2026-06-01T00:00:00Z";
invalidEvent.currency = "UNKNOWN";
const invalidSemantics = buildHistoryContext({
  data: invalidSemanticsData,
  scenarioContext: scenarioContext([selected.project_id]),
});
assert.equal(invalidSemantics.timeline[0].effective_status, "insufficient");
assert.ok(invalidSemantics.timeline[0].reason_codes.includes("inverted_dates"));
assert.ok(invalidSemantics.timeline[0].reason_codes.includes("unknown_currency"));

assert.ok(ready.agenda.length > 0 && ready.agenda.length <= 3);
assert.ok(ready.agenda.every(({ references }) => references.evidence_ids.length));
assert.ok(ready.agenda.every(({ action }) => action === "review_observed_change"));
assert.doesNotMatch(JSON.stringify(ready), /cambio realizado/iu);

const legacyData = clone(data);
legacyData.metadata.contract_version = "2.3.0";
delete legacyData.history;
const legacy = buildHistoryContext({
  data: legacyData,
  scenarioContext: scenarioContext(),
});
assert.equal(legacy.status, "contract_unavailable");
assert.deepEqual(legacy.timeline, []);
assert.equal(legacy.agenda[0].action, "history_unavailable");

console.log("history domain unit tests passed");

