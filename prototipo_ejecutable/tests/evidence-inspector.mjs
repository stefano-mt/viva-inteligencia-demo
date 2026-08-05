import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  INSPECTOR_QUALITY_PRECEDENCE,
  INSPECTOR_ROW_ORDER,
  buildEligibilityProjection,
  buildEvidenceDossier,
  evaluateCompatibility,
  resolveEvidencePresentation,
} from "../public/js/evidence-inspector.js";

const payload = JSON.parse(
  await readFile(
    new URL("../public/demo-data/viva-platform-demo.json", import.meta.url),
    "utf8",
  ),
);
const { inspector, model } = payload;
const ctIFixture = JSON.parse(
  await readFile(
    new URL(
      "../../datos_relevantes/demo-pilot/fixtures/ct-i.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

const byId = (records, field) =>
  new Map(records.map((record) => [record[field], record]));
const modelMaps = {
  documents: byId(model.documents, "document_id"),
  evidence: byId(model.evidence, "evidence_id"),
  facts: byId(model.facts, "fact_id"),
};
const caseById = byId(inspector.cases, "case_id");
const clone = (value) => structuredClone(value);

const expectedCases = {
  "case:f3-area-match": ["certified", true],
  "case:f3-bathroom-conflict": ["inconsistent", false],
  "case:f3-bedroom-conflict": ["inconsistent", false],
  "case:f3-ct-a-area-types": ["certified", true],
  "case:f3-ct-b-price-conflict": ["inconsistent", false],
  "case:f3-ct-d-finishes": ["certified", true],
  "case:f3-ct-g-pardo": ["inconsistent", false],
  "case:f3-floor-review": ["reviewable", false],
  "case:f3-illegible-area": ["illegible", false],
  "case:f3-insufficient-source": ["insufficient", false],
};

assert.deepEqual(INSPECTOR_QUALITY_PRECEDENCE, [
  "inconsistent",
  "illegible",
  "insufficient",
  "reviewable",
  "certified",
]);
assert.deepEqual(INSPECTOR_ROW_ORDER, [
  "area",
  "floor_unit",
  "model",
  "bedrooms",
  "bathrooms",
  "other",
]);
assert.equal(payload.metadata.contract_version, "2.4.0");
assert.deepEqual(Object.keys(expectedCases).sort(), [...caseById.keys()].sort());

const dossiers = new Map();
for (const inspectorCase of inspector.cases) {
  const dossier = buildEvidenceDossier({
    model,
    inspector,
    projectId: inspectorCase.project_id,
    typologyId: inspectorCase.typology_id,
  });
  dossiers.set(inspectorCase.case_id, dossier);
  assert.deepEqual(
    [dossier.decision.rollupStatus, dossier.decision.benchmarkEligible],
    expectedCases[inspectorCase.case_id],
    inspectorCase.case_id,
  );
  assert.equal(dossier.decision.selectedTruthFactId, null);
  assert.deepEqual(
    dossier.sources.map(({ source_id }) => source_id),
    inspectorCase.source_ids,
  );
  assert.deepEqual(
    dossier.observations.map(({ observation_id }) => observation_id),
    inspectorCase.observation_ids,
  );
  assert.deepEqual(
    dossier.facts.map(({ fact_id }) => fact_id),
    inspectorCase.fact_ids,
  );
  assert.deepEqual(
    dossier.documents.map(({ document_id }) => document_id),
    inspectorCase.document_ids,
  );
  assert.deepEqual(
    dossier.evidence.map(({ evidence_id }) => evidence_id),
    inspectorCase.evidence_ids,
  );
  assert.deepEqual(
    dossier.issues.map(({ issue_id }) => issue_id),
    inspectorCase.issue_ids,
  );
  assert.deepEqual(
    dossier.compatibilityRows.map(({ key }) => key),
    INSPECTOR_ROW_ORDER,
  );
}

const qualityDistribution = [...dossiers.values()].reduce(
  (counts, dossier) => {
    const qualityStatus = dossier.decision.rollupStatus;
    counts[qualityStatus] = (counts[qualityStatus] ?? 0) + 1;
    return counts;
  },
  {},
);
assert.deepEqual(qualityDistribution, {
  certified: 3,
  illegible: 1,
  inconsistent: 4,
  insufficient: 1,
  reviewable: 1,
});
assert.equal(
  [...dossiers.values()].filter(
    ({ decision }) => decision.benchmarkEligible,
  ).length,
  3,
);

for (const projectId of new Set(
  inspector.cases.map((inspectorCase) => inspectorCase.project_id),
)) {
  const firstCase = inspector.cases.find(
    (inspectorCase) => inspectorCase.project_id === projectId,
  );
  const dossier = dossiers.get(firstCase.case_id);
  const expectedTypologyIds = [
    ...new Set(
      inspector.cases
        .filter((inspectorCase) => inspectorCase.project_id === projectId)
        .map((inspectorCase) => inspectorCase.typology_id),
    ),
  ];
  assert.deepEqual(
    dossier.typologies.map(({ typology_id }) => typology_id),
    expectedTypologyIds,
  );
}

const presentationFor = (evidenceId, baseUrl = "") => {
  const evidence = modelMaps.evidence.get(evidenceId);
  const document = modelMaps.documents.get(evidence.document_id);
  return resolveEvidencePresentation({ document, evidence, baseUrl });
};

const ctD = dossiers.get("case:f3-ct-d-finishes");
assert.equal(ctD.primaryEvidence.evidence_id, "evidence:ct-d-countertop-fragment");
assert.deepEqual(
  presentationFor("evidence:ct-d-countertop-fragment"),
  {
    mode: "fragment",
    publicUrl: null,
    canOpen: true,
    reason: null,
  },
);
const ctDRestricted = presentationFor("evidence:ct-d-restricted-metadata");
assert.equal(ctDRestricted.mode, "restricted");
assert.equal(ctDRestricted.canOpen, false);
assert.equal(ctDRestricted.publicUrl, null);
assert.ok(ctDRestricted.reason.length > 0);
assert.equal(
  modelMaps.facts.get("fact:ct-d-air-conditioning").normalized_value,
  "unknown",
);
assert.equal(ctD.decision.rollupStatus, "certified");
assert.equal(ctD.decision.benchmarkEligible, true);
assert.ok(
  ctD.decision.excludedFactIds.includes("fact:ct-d-air-conditioning"),
  "the optional insufficient fact remains excluded without degrading CT-D",
);

const ctG = dossiers.get("case:f3-ct-g-pardo");
assert.equal(ctG.project.project_id, "project:nexo-2951");
assert.equal(ctG.selectedTypology.typology_id, "typology:pardo-coast-tipo-7");
assert.equal(ctG.decision.selectedTruthFactId, null);
assert.equal(
  modelMaps.facts.get("fact:pardo-coast-card-area").normalized_value,
  104.15,
);
assert.equal(
  modelMaps.facts.get("fact:pardo-coast-card-area").area_type,
  "unknown",
);
assert.equal(
  modelMaps.facts.get("fact:pardo-coast-plan-area").normalized_value,
  53.37,
);
assert.equal(
  modelMaps.facts.get("fact:pardo-coast-plan-area").area_type,
  "total",
);
assert.equal(
  modelMaps.facts.get("fact:pardo-coast-area-delta").normalized_value,
  50.78,
);
assert.equal(
  modelMaps.facts.get("fact:pardo-coast-area-delta-percent").normalized_value,
  48.76,
);
assert.equal(
  modelMaps.facts.get("fact:pardo-coast-area-delta-percent").derivation
    .input_fact_ids[0],
  "fact:pardo-coast-card-area",
);
assert.equal(
  modelMaps.facts.get("fact:pardo-coast-inferred-floor-min").normalized_value,
  8,
);
assert.equal(
  modelMaps.facts.get("fact:pardo-coast-inferred-floor-max").normalized_value,
  10,
);
assert.equal(
  modelMaps.facts.get("fact:pardo-coast-inferred-floor-min").confidence,
  "low",
);
assert.equal(
  presentationFor("evidence:pardo-coast-card-metadata").mode,
  "pending",
);
assert.equal(
  presentationFor("evidence:pardo-coast-plan-metadata").mode,
  "restricted",
);
for (const evidenceId of [
  "evidence:pardo-coast-card-metadata",
  "evidence:pardo-coast-plan-metadata",
]) {
  const presentation = presentationFor(evidenceId);
  assert.equal(presentation.publicUrl, null);
  assert.equal(presentation.canOpen, false);
}

const typologyProjectionKeys = [
  "caseId",
  "projectId",
  "typologyId",
  "provenanceClassification",
  "rollupStatus",
  "eligibility",
  "benchmarkEligible",
  "reasonCodes",
  "requiredFactIds",
  "blockingIssueIds",
  "eligibleFactIds",
  "excludedFactIds",
  "selectedTruthFactId",
  "facts",
];
const factProjectionKeys = [
  "factId",
  "observationId",
  "fieldName",
  "semanticType",
  "valueKind",
  "provenanceClassification",
  "sourceQualityStatus",
  "required",
  "eligibility",
  "benchmarkEligible",
  "blockingIssueIds",
  "reasonCodes",
];
const factReasonOrder = [
  "BLOCKING_ISSUE",
  "QUALITY_NOT_CERTIFIED",
  "BENCHMARK_FLAG_FALSE",
];
const typologyReasonOrder = [
  "BLOCKING_REQUIRED_ISSUE",
  "REQUIRED_FACT_EXCLUDED",
  "ROLLUP_NOT_CERTIFIED",
];
const legacyProjectsBeforeProjection = clone(payload.projects);
const geographyBeforeProjection = clone(payload.geography);
const projectionInput = { model: clone(model), inspector: clone(inspector) };
const projectionInputBefore = clone(projectionInput);
const projection = buildEligibilityProjection(projectionInput);

assert.deepEqual(Object.keys(projection), ["version", "scope", "typologies"]);
assert.equal(projection.version, 1);
assert.equal(projection.scope, "inspected_facts_and_typologies_only");
assert.equal(projection.typologies.length, 10);
assert.deepEqual(JSON.parse(JSON.stringify(projection)), projection);
assert.deepEqual(projectionInput, projectionInputBefore);
assert.deepEqual(
  projection.typologies.map(({ caseId }) => caseId),
  inspector.cases.map(({ case_id }) => case_id).sort(),
);

for (const typology of projection.typologies) {
  assert.deepEqual(Object.keys(typology), typologyProjectionKeys);
  assert.ok(["eligible", "excluded"].includes(typology.eligibility));
  assert.equal(
    typology.eligibility,
    typology.benchmarkEligible ? "eligible" : "excluded",
  );
  assert.equal(typology.selectedTruthFactId, null);
  assert.equal(
    typology.reasonCodes.length === 0,
    typology.benchmarkEligible,
  );
  assert.deepEqual(
    typology.reasonCodes,
    typologyReasonOrder.filter((reason) =>
      typology.reasonCodes.includes(reason),
    ),
  );
  const inspectorCase = caseById.get(typology.caseId);
  assert.equal(typology.projectId, inspectorCase.project_id);
  assert.equal(typology.typologyId, inspectorCase.typology_id);
  assert.equal(
    typology.provenanceClassification,
    inspectorCase.provenance_classification,
  );
  assert.deepEqual(typology.requiredFactIds, inspectorCase.required_fact_ids);
  assert.deepEqual(
    typology.facts.map(({ factId }) => factId),
    inspectorCase.fact_ids,
  );
  assert.deepEqual(
    typology.eligibleFactIds,
    typology.facts
      .filter(({ benchmarkEligible }) => benchmarkEligible)
      .map(({ factId }) => factId),
  );
  assert.deepEqual(
    typology.excludedFactIds,
    typology.facts
      .filter(({ benchmarkEligible }) => !benchmarkEligible)
      .map(({ factId }) => factId),
  );
  assert.equal(
    new Set([
      ...typology.eligibleFactIds,
      ...typology.excludedFactIds,
    ]).size,
    typology.facts.length,
  );

  for (const projectedFact of typology.facts) {
    assert.deepEqual(Object.keys(projectedFact), factProjectionKeys);
    assert.equal(
      projectedFact.provenanceClassification,
      typology.provenanceClassification,
    );
    assert.equal(
      projectedFact.eligibility,
      projectedFact.benchmarkEligible ? "eligible" : "excluded",
    );
    assert.equal(
      projectedFact.reasonCodes.length === 0,
      projectedFact.benchmarkEligible,
    );
    assert.deepEqual(
      projectedFact.reasonCodes,
      factReasonOrder.filter((reason) =>
        projectedFact.reasonCodes.includes(reason),
      ),
    );
  }
}

const projectedCtG = projection.typologies.find(
  ({ caseId }) => caseId === "case:f3-ct-g-pardo",
);
assert.deepEqual(
  {
    projectId: projectedCtG.projectId,
    typologyId: projectedCtG.typologyId,
    provenanceClassification: projectedCtG.provenanceClassification,
    rollupStatus: projectedCtG.rollupStatus,
    eligibility: projectedCtG.eligibility,
    benchmarkEligible: projectedCtG.benchmarkEligible,
    reasonCodes: projectedCtG.reasonCodes,
    blockingIssueIds: projectedCtG.blockingIssueIds,
    selectedTruthFactId: projectedCtG.selectedTruthFactId,
  },
  {
    projectId: "project:nexo-2951",
    typologyId: "typology:pardo-coast-tipo-7",
    provenanceClassification: "observed",
    rollupStatus: "inconsistent",
    eligibility: "excluded",
    benchmarkEligible: false,
    reasonCodes: [
      "BLOCKING_REQUIRED_ISSUE",
      "REQUIRED_FACT_EXCLUDED",
      "ROLLUP_NOT_CERTIFIED",
    ],
    blockingIssueIds: [
      "issue:pardo-coast-area-source-conflict",
      "issue:pardo-coast-floor-range-conflict-review",
    ],
    selectedTruthFactId: null,
  },
);
assert.equal(projectedCtG.facts.length, 8);
assert.deepEqual(
  projectedCtG.excludedFactIds,
  projectedCtG.facts.map(({ factId }) => factId),
);
assert.deepEqual(projectedCtG.eligibleFactIds, []);
assert.deepEqual(
  projectedCtG.facts.find(
    ({ factId }) => factId === "fact:pardo-coast-card-area",
  ).reasonCodes,
  ["BLOCKING_ISSUE", "QUALITY_NOT_CERTIFIED", "BENCHMARK_FLAG_FALSE"],
);

const projectedCtD = projection.typologies.find(
  ({ caseId }) => caseId === "case:f3-ct-d-finishes",
);
assert.equal(projectedCtD.rollupStatus, "certified");
assert.equal(projectedCtD.eligibility, "eligible");
assert.equal(projectedCtD.benchmarkEligible, true);
assert.deepEqual(projectedCtD.reasonCodes, []);
assert.deepEqual(
  projectedCtD.facts.find(
    ({ factId }) => factId === "fact:ct-d-countertop-material",
  ),
  {
    factId: "fact:ct-d-countertop-material",
    observationId: "observation:ct-d-countertop",
    fieldName: "countertop_material",
    semanticType: "attribute",
    valueKind: "observed",
    provenanceClassification: "controlled",
    sourceQualityStatus: "certified",
    required: true,
    eligibility: "eligible",
    benchmarkEligible: true,
    blockingIssueIds: [],
    reasonCodes: [],
  },
);
assert.deepEqual(
  projectedCtD.facts.find(
    ({ factId }) => factId === "fact:ct-d-air-conditioning",
  ),
  {
    factId: "fact:ct-d-air-conditioning",
    observationId: "observation:ct-d-air-conditioning-absence",
    fieldName: "air_conditioning",
    semanticType: "attribute",
    valueKind: "observed",
    provenanceClassification: "controlled",
    sourceQualityStatus: "insufficient",
    required: false,
    eligibility: "excluded",
    benchmarkEligible: false,
    blockingIssueIds: [],
    reasonCodes: ["QUALITY_NOT_CERTIFIED", "BENCHMARK_FLAG_FALSE"],
  },
);

const projectionWithBlockedCertifiedFact = clone(payload);
const blockedCtDCase = projectionWithBlockedCertifiedFact.inspector.cases.find(
  ({ case_id }) => case_id === "case:f3-ct-d-finishes",
);
const certifiedBlockIssue = {
  issue_id: "issue:test-certified-countertop-block",
  entity_type: "typology",
  entity_id: blockedCtDCase.typology_id,
  fact_ids: ["fact:ct-d-countertop-material"],
  issue_code: "test_block",
  severity: "medium",
  quality_status: "reviewable",
  detail: "Synthetic blocking issue for projection coverage.",
  next_action: "Review the certified fact.",
  benchmark_blocking: true,
};
projectionWithBlockedCertifiedFact.model.issues.push(certifiedBlockIssue);
blockedCtDCase.issue_ids.push(certifiedBlockIssue.issue_id);
const blockedCertifiedProjection = buildEligibilityProjection({
  model: projectionWithBlockedCertifiedFact.model,
  inspector: projectionWithBlockedCertifiedFact.inspector,
});
const blockedCertifiedCtD = blockedCertifiedProjection.typologies.find(
  ({ caseId }) => caseId === blockedCtDCase.case_id,
);
assert.deepEqual(
  blockedCertifiedCtD.facts.find(
    ({ factId }) => factId === "fact:ct-d-countertop-material",
  ).reasonCodes,
  ["BLOCKING_ISSUE"],
);
assert.equal(blockedCertifiedCtD.eligibility, "excluded");
assert.deepEqual(blockedCertifiedCtD.reasonCodes, [
  "BLOCKING_REQUIRED_ISSUE",
  "REQUIRED_FACT_EXCLUDED",
  "ROLLUP_NOT_CERTIFIED",
]);

const projectionWithBlockedCertifiedOptionalFact = clone(payload);
const optionalBlockCtDCase =
  projectionWithBlockedCertifiedOptionalFact.inspector.cases.find(
    ({ case_id }) => case_id === "case:f3-ct-d-finishes",
  );
const certifiedOptionalFact =
  projectionWithBlockedCertifiedOptionalFact.model.facts.find(
    ({ fact_id }) => fact_id === "fact:ct-d-air-conditioning",
  );
certifiedOptionalFact.quality_status = "certified";
certifiedOptionalFact.benchmark_eligible = true;
const certifiedOptionalBlockIssue = {
  issue_id: "issue:test-certified-optional-air-conditioning-block",
  entity_type: "typology",
  entity_id: optionalBlockCtDCase.typology_id,
  fact_ids: [certifiedOptionalFact.fact_id],
  issue_code: "test_optional_block",
  severity: "medium",
  quality_status: "reviewable",
  detail: "Synthetic blocking issue scoped to an optional certified fact.",
  next_action: "Review the optional fact.",
  benchmark_blocking: true,
};
projectionWithBlockedCertifiedOptionalFact.model.issues.push(
  certifiedOptionalBlockIssue,
);
optionalBlockCtDCase.issue_ids.push(certifiedOptionalBlockIssue.issue_id);
const blockedCertifiedOptionalProjection = buildEligibilityProjection({
  model: projectionWithBlockedCertifiedOptionalFact.model,
  inspector: projectionWithBlockedCertifiedOptionalFact.inspector,
});
const blockedCertifiedOptionalCtD =
  blockedCertifiedOptionalProjection.typologies.find(
    ({ caseId }) => caseId === optionalBlockCtDCase.case_id,
  );
const projectedBlockedOptionalFact = blockedCertifiedOptionalCtD.facts.find(
  ({ factId }) => factId === certifiedOptionalFact.fact_id,
);
assert.equal(projectedBlockedOptionalFact.eligibility, "excluded");
assert.equal(projectedBlockedOptionalFact.benchmarkEligible, false);
assert.equal(projectedBlockedOptionalFact.sourceQualityStatus, "certified");
assert.deepEqual(projectedBlockedOptionalFact.reasonCodes, [
  "BLOCKING_ISSUE",
]);
assert.deepEqual(projectedBlockedOptionalFact.blockingIssueIds, [
  certifiedOptionalBlockIssue.issue_id,
]);
assert.equal(blockedCertifiedOptionalCtD.eligibility, "eligible");
assert.equal(blockedCertifiedOptionalCtD.benchmarkEligible, true);
assert.deepEqual(blockedCertifiedOptionalCtD.reasonCodes, []);
assert.deepEqual(blockedCertifiedOptionalCtD.blockingIssueIds, []);
const projectedRequiredCountertop = blockedCertifiedOptionalCtD.facts.find(
  ({ factId }) => factId === "fact:ct-d-countertop-material",
);
assert.equal(projectedRequiredCountertop.required, true);
assert.equal(projectedRequiredCountertop.eligibility, "eligible");
assert.equal(projectedRequiredCountertop.benchmarkEligible, true);
assert.deepEqual(projectedRequiredCountertop.reasonCodes, []);

const projectionWithRawFalseRequiredFact = clone(payload);
projectionWithRawFalseRequiredFact.model.facts.find(
  ({ fact_id }) => fact_id === "fact:ct-d-countertop-material",
).benchmark_eligible = false;
const rawFalseProjection = buildEligibilityProjection({
  model: projectionWithRawFalseRequiredFact.model,
  inspector: projectionWithRawFalseRequiredFact.inspector,
});
const rawFalseCtD = rawFalseProjection.typologies.find(
  ({ caseId }) => caseId === "case:f3-ct-d-finishes",
);
assert.deepEqual(
  rawFalseCtD.facts.find(
    ({ factId }) => factId === "fact:ct-d-countertop-material",
  ).reasonCodes,
  ["BENCHMARK_FLAG_FALSE"],
);
assert.equal(rawFalseCtD.eligibility, "excluded");
assert.deepEqual(rawFalseCtD.reasonCodes, ["REQUIRED_FACT_EXCLUDED"]);

const projectionWithExpectedMutations = clone(payload);
for (const inspectorCase of projectionWithExpectedMutations.inspector.cases) {
  inspectorCase.expected_quality_status =
    inspectorCase.expected_quality_status === "certified"
      ? "inconsistent"
      : "certified";
  inspectorCase.expected_benchmark_eligible =
    !inspectorCase.expected_benchmark_eligible;
}
assert.deepEqual(
  buildEligibilityProjection({
    model: projectionWithExpectedMutations.model,
    inspector: projectionWithExpectedMutations.inspector,
  }),
  projection,
);

const reversedProjectionPayload = clone(payload);
for (const collectionName of [
  "documents",
  "evidence",
  "sources",
  "observations",
  "facts",
  "issues",
  "projects",
]) {
  reversedProjectionPayload.model[collectionName]?.reverse();
}
reversedProjectionPayload.inspector.cases.reverse();
assert.deepEqual(
  buildEligibilityProjection({
    model: reversedProjectionPayload.model,
    inspector: reversedProjectionPayload.inspector,
  }),
  projection,
);

const secondProjection = buildEligibilityProjection(projectionInput);
projection.typologies[0].facts[0].reasonCodes.push("MUTATED_OUTPUT");
assert.deepEqual(secondProjection, buildEligibilityProjection(projectionInput));
assert.deepEqual(projectionInput, projectionInputBefore);

assert.deepEqual(payload.projects, legacyProjectsBeforeProjection);
assert.deepEqual(payload.geography, geographyBeforeProjection);
const legacyPardo = payload.projects.find(
  ({ id }) => id === "2951",
);
assert.ok(legacyPardo);
for (const eligibilityProperty of [
  "eligibility",
  "benchmarkEligible",
  "benchmark_eligible",
]) {
  assert.equal(
    Object.hasOwn(legacyPardo, eligibilityProperty),
    false,
    `legacy project 2951 must not gain ${eligibilityProperty}`,
  );
}
assert.equal(
  secondProjection.typologies.some(({ projectId }) => projectId === "2951"),
  false,
);
assert.equal(Object.hasOwn(secondProjection, "projects"), false);
assert.ok(
  ctIFixture.input.geography.districts[0].quadrants.some(
    ({ authoritative_project_ids }) =>
      authoritative_project_ids.includes("project:nexo-2951"),
  ),
);
assert.ok(
  ctIFixture.input.geography.assignments.some(
    ({ authoritative_project_id, reconciliation_status }) =>
      authoritative_project_id === "project:nexo-2951" &&
      reconciliation_status === "matched",
  ),
);

const syntheticObservation = {
  observation_id: "observation:synthetic",
  source_id: "source:synthetic",
};
const syntheticTypology = { typology_id: "typology:synthetic" };
const fact = (
  id,
  qualityStatus,
  {
    eligible = qualityStatus === "certified",
    fieldName = "total_area",
    observationId = syntheticObservation.observation_id,
  } = {},
) => ({
  fact_id: `fact:${id}`,
  observation_id: observationId,
  field_name: fieldName,
  semantic_type: fieldName.includes("area") ? "area" : "attribute",
  quality_status: qualityStatus,
  benchmark_eligible: eligible,
});
const issue = (
  id,
  qualityStatus,
  factIds,
  { blocking = true } = {},
) => ({
  issue_id: `issue:${id}`,
  fact_ids: factIds,
  quality_status: qualityStatus,
  benchmark_blocking: blocking,
});
const evaluate = ({
  facts,
  issues = [],
  requiredFactIds,
  observations = [syntheticObservation],
} = {}) =>
  evaluateCompatibility({
    typology: syntheticTypology,
    observations,
    facts,
    issues,
    ...(requiredFactIds === undefined ? {} : { requiredFactIds }),
  });

for (const status of INSPECTOR_QUALITY_PRECEDENCE) {
  const result = evaluate({ facts: [fact(status, status)] });
  assert.equal(result.rollupStatus, status);
  assert.equal(result.benchmarkEligible, status === "certified");
  assert.equal(result.selectedTruthFactId, null);
}

for (const [statuses, expected] of [
  [["certified", "reviewable"], "reviewable"],
  [["reviewable", "insufficient"], "insufficient"],
  [["insufficient", "illegible"], "illegible"],
  [["illegible", "inconsistent"], "inconsistent"],
  [["certified", "reviewable", "inconsistent"], "inconsistent"],
]) {
  const facts = statuses.map((status, index) => fact(`${status}-${index}`, status));
  assert.equal(evaluate({ facts }).rollupStatus, expected);
}

const requiredCertified = fact("required-certified", "certified");
const optionalBad = fact("optional-bad", "inconsistent", { eligible: false });
const optionalIssue = issue(
  "optional-blocking",
  "inconsistent",
  [optionalBad.fact_id],
);
const optionalDoesNotDegrade = evaluate({
  facts: [requiredCertified, optionalBad],
  issues: [optionalIssue],
  requiredFactIds: [requiredCertified.fact_id],
});
assert.equal(optionalDoesNotDegrade.rollupStatus, "certified");
assert.equal(optionalDoesNotDegrade.benchmarkEligible, true);
assert.deepEqual(optionalDoesNotDegrade.blockingIssueIds, []);
assert.deepEqual(optionalDoesNotDegrade.eligibleFactIds, [
  requiredCertified.fact_id,
]);
assert.deepEqual(optionalDoesNotDegrade.excludedFactIds, [optionalBad.fact_id]);

const optionalCertified = fact("optional-certified", "certified");
const optionalCertifiedIssue = issue(
  "optional-certified-blocked",
  "reviewable",
  [optionalCertified.fact_id],
);
const individuallyBlocked = evaluate({
  facts: [requiredCertified, optionalCertified],
  issues: [optionalCertifiedIssue],
  requiredFactIds: [requiredCertified.fact_id],
});
assert.equal(individuallyBlocked.benchmarkEligible, true);
assert.deepEqual(individuallyBlocked.blockingIssueIds, []);
assert.ok(
  individuallyBlocked.excludedFactIds.includes(optionalCertified.fact_id),
);

const requiredIssue = issue(
  "required-review",
  "reviewable",
  [requiredCertified.fact_id],
);
const requiredBlocked = evaluate({
  facts: [requiredCertified],
  issues: [requiredIssue],
});
assert.equal(requiredBlocked.rollupStatus, "reviewable");
assert.equal(requiredBlocked.benchmarkEligible, false);
assert.deepEqual(requiredBlocked.blockingIssueIds, [requiredIssue.issue_id]);

const omittedRequiredUsesAll = evaluate({
  facts: [requiredCertified, fact("all-reviewable", "reviewable")],
});
assert.equal(omittedRequiredUsesAll.rollupStatus, "reviewable");

const rowsDoNotDegrade = evaluate({
  facts: [
    fact("other-certified", "certified", {
      fieldName: "countertop_material",
    }),
  ],
});
assert.equal(rowsDoNotDegrade.rollupStatus, "certified");
assert.equal(rowsDoNotDegrade.benchmarkEligible, true);
assert.deepEqual(
  rowsDoNotDegrade.rows.map(({ key }) => key),
  INSPECTOR_ROW_ORDER,
);
assert.ok(
  rowsDoNotDegrade.rows
    .filter(({ key }) => key !== "other")
    .every(({ status }) => status === "insufficient"),
);

const baseDocument = {
  document_id: "document:test",
  publish_permission: "authorized",
  availability: "available",
  public_asset_path: null,
};
const baseEvidence = {
  evidence_id: "evidence:test",
  document_id: baseDocument.document_id,
  kind: "fragment",
  fragment: "Contenido autorizado.",
  publish_permission: "authorized",
  availability: "available",
};
const present = (documentPatch = {}, evidencePatch = {}, baseUrl = "") =>
  resolveEvidencePresentation({
    document: { ...baseDocument, ...documentPatch },
    evidence: { ...baseEvidence, ...evidencePatch },
    baseUrl,
  });

assert.deepEqual(
  present(
    { public_asset_path: "assets/evidence/example.webp" },
    { kind: "image_region" },
    "/viva-demo/",
  ),
  {
    mode: "asset",
    publicUrl: "/viva-demo/assets/evidence/example.webp",
    canOpen: true,
    reason: null,
  },
);
assert.equal(present().mode, "fragment");
for (const kind of ["transcription", "structured_value", "metadata"]) {
  assert.equal(present({}, { kind }).mode, "controlled_transcription");
}
assert.deepEqual(
  present(
    { public_asset_path: "assets/evidence/ignored-fragment.webp" },
    { kind: "fragment" },
  ),
  {
    mode: "fragment",
    publicUrl: null,
    canOpen: true,
    reason: null,
  },
);
for (const kind of ["transcription", "structured_value", "metadata"]) {
  assert.deepEqual(
    present(
      { public_asset_path: `assets/evidence/ignored-${kind}.webp` },
      { kind },
    ),
    {
      mode: "controlled_transcription",
      publicUrl: null,
      canOpen: true,
      reason: null,
    },
  );
}
assert.equal(
  present(
    { publish_permission: "restricted" },
    {
      publish_permission: "pending",
      availability: "unavailable",
      fragment: null,
    },
  ).mode,
  "restricted",
);
assert.equal(
  present(
    { publish_permission: "pending" },
    { availability: "unavailable", fragment: null },
  ).mode,
  "pending",
);
assert.equal(
  present({}, { availability: "unavailable", fragment: null }).mode,
  "unavailable",
);
assert.equal(
  present({}, { kind: "image_region", fragment: "Solo metadata textual." }).mode,
  "unavailable",
);
for (const mode of ["restricted", "pending", "unavailable"]) {
  const result =
    mode === "restricted"
      ? present({ availability: "restricted" })
      : mode === "pending"
        ? present({ publish_permission: "pending" })
        : present({ availability: "unavailable" });
  assert.equal(result.publicUrl, null);
  assert.equal(result.canOpen, false);
  assert.ok(result.reason.length > 0);
}

for (const unsafeBaseUrl of [
  "https://evil.test/",
  "//evil.test/",
  "/safe?query=1",
  "/safe#hash",
  "/safe\\escape",
  "/safe/%2e%2e/",
  "/safe/../escape",
  "relative/",
]) {
  assert.throws(
    () => present({}, {}, unsafeBaseUrl),
    /safe local application path|traversal/,
    unsafeBaseUrl,
  );
}
for (const unsafeAssetPath of [
  "https://evil.test/evidence.webp",
  "/assets/evidence/absolute.webp",
  "assets/evidence/../escape.webp",
  "assets/evidence/%2e%2e/escape.webp",
  "assets\\evidence\\escape.webp",
  "assets/other/escape.webp",
]) {
  assert.throws(
    () =>
      present(
        { public_asset_path: unsafeAssetPath },
        { kind: "image_region" },
      ),
    /safe evidence path/,
    unsafeAssetPath,
  );
}
assert.equal(
  present(
    {
      publish_permission: "restricted",
      public_asset_path: "https://evil.test/ignored.webp",
    },
    { publish_permission: "restricted", fragment: null },
  ).mode,
  "restricted",
  "fail-closed modes must never inspect or expose a contaminated path",
);
assert.throws(
  () =>
    present(
      {},
      { document_id: "document:other" },
    ),
  /does not belong/,
);
for (const [documentPatch, evidencePatch, pattern] of [
  [{ document_id: null }, {}, /document\.document_id/],
  [{ document_id: undefined }, {}, /document\.document_id/],
  [{}, { evidence_id: null }, /evidence\.evidence_id/],
  [{}, { evidence_id: undefined }, /evidence\.evidence_id/],
  [{}, { document_id: null }, /evidence\.document_id/],
  [{}, { document_id: undefined }, /evidence\.document_id/],
  [{ document_id: "document:left" }, { document_id: "document:right" }, /does not belong/],
]) {
  assert.throws(
    () => present(documentPatch, evidencePatch),
    pattern,
  );
}

const targetCase = caseById.get("case:f3-ct-g-pardo");
const dossierInput = {
  model: clone(model),
  inspector: clone(inspector),
  projectId: targetCase.project_id,
  typologyId: targetCase.typology_id,
};
const beforeDossierInput = clone(dossierInput);
const firstDossier = buildEvidenceDossier(dossierInput);
const secondDossier = buildEvidenceDossier(dossierInput);
assert.deepEqual(dossierInput, beforeDossierInput, "dossier inputs must not mutate");
assert.deepEqual(firstDossier, secondDossier, "dossier output must be deterministic");
firstDossier.project.name = "mutated output";
firstDossier.facts[0].quality_status = "certified";
assert.deepEqual(dossierInput, beforeDossierInput, "dossier output must be cloned");

const reversedModel = Object.fromEntries(
  Object.entries(model).map(([name, value]) => [
    name,
    Array.isArray(value) ? [...value].reverse() : clone(value),
  ]),
);
assert.deepEqual(
  buildEvidenceDossier({
    model: reversedModel,
    inspector,
    projectId: targetCase.project_id,
    typologyId: targetCase.typology_id,
  }),
  secondDossier,
  "global catalog order must not affect dossier order",
);

const expectedMutationPayload = clone(payload);
for (const inspectorCase of expectedMutationPayload.inspector.cases) {
  inspectorCase.expected_quality_status =
    inspectorCase.expected_quality_status === "certified"
      ? "inconsistent"
      : "certified";
  inspectorCase.expected_benchmark_eligible =
    !inspectorCase.expected_benchmark_eligible;
}
for (const inspectorCase of expectedMutationPayload.inspector.cases) {
  const dossier = buildEvidenceDossier({
    model: expectedMutationPayload.model,
    inspector: expectedMutationPayload.inspector,
    projectId: inspectorCase.project_id,
    typologyId: inspectorCase.typology_id,
  });
  assert.deepEqual(
    [dossier.decision.rollupStatus, dossier.decision.benchmarkEligible],
    expectedCases[inspectorCase.case_id],
    "expected_* fields must never drive the calculation",
  );
}

const expectDossierFailure = (mutate, pattern) => {
  const candidate = clone(payload);
  mutate(candidate);
  const selected = candidate.inspector.cases.find(
    ({ case_id: caseId }) => caseId === "case:f3-ct-g-pardo",
  );
  assert.throws(
    () =>
      buildEvidenceDossier({
        model: candidate.model,
        inspector: candidate.inspector,
        projectId: selected.project_id,
        typologyId: selected.typology_id,
      }),
    pattern,
  );
};

expectDossierFailure((candidate) => {
  candidate.model.typologies.find(
    ({ typology_id }) => typology_id === "typology:pardo-coast-tipo-7",
  ).project_id = "project:ct-a-controlled";
}, /does not belong/);
expectDossierFailure((candidate) => {
  candidate.model.facts.find(
    ({ fact_id }) => fact_id === "fact:pardo-coast-card-area",
  ).observation_id = "observation:ct-d-countertop";
}, /undeclared observation/);
expectDossierFailure((candidate) => {
  candidate.model.evidence.find(
    ({ evidence_id }) => evidence_id === "evidence:pardo-coast-card-metadata",
  ).document_id = "document:ct-d-authorized";
}, /undeclared document/);
expectDossierFailure((candidate) => {
  candidate.inspector.cases.find(
    ({ case_id }) => case_id === "case:f3-ct-g-pardo",
  ).primary_evidence_id = "evidence:ct-d-countertop-fragment";
}, /primary evidence/);
expectDossierFailure((candidate) => {
  candidate.inspector.cases.find(
    ({ case_id }) => case_id === "case:f3-ct-g-pardo",
  ).required_fact_ids.push("fact:ct-d-countertop-material");
}, /subset/);
expectDossierFailure((candidate) => {
  const original = candidate.inspector.cases.find(
    ({ case_id }) => case_id === "case:f3-ct-g-pardo",
  );
  candidate.inspector.cases.push({
    ...clone(original),
    case_id: "case:f3-ct-g-pardo-duplicate-pair",
    route_slug: "f3-ct-g-pardo-duplicate-pair",
  });
}, /ambiguous/);
expectDossierFailure((candidate) => {
  candidate.model.facts.push(clone(candidate.model.facts[0]));
}, /duplicate fact_id/);

const expectProjectionFailure = (mutate, pattern) => {
  const candidate = clone(payload);
  mutate(candidate);
  assert.throws(
    () =>
      buildEligibilityProjection({
        model: candidate.model,
        inspector: candidate.inspector,
      }),
    pattern,
  );
};

assert.throws(() => buildEligibilityProjection(), /model must be an object/);
assert.throws(
  () => buildEligibilityProjection({ model }),
  /inspector must be an object/,
);
expectProjectionFailure((candidate) => {
  candidate.inspector.cases = [];
}, /must not be empty/);
expectProjectionFailure((candidate) => {
  candidate.inspector.cases[0].provenance_classification = "legacy";
}, /unsupported value/);
expectProjectionFailure((candidate) => {
  const factId = candidate.inspector.cases[0].fact_ids[0];
  candidate.model.facts.find(({ fact_id }) => fact_id === factId).value_kind =
    "estimated";
}, /unsupported value/);
expectProjectionFailure((candidate) => {
  const factId = candidate.inspector.cases[0].fact_ids[0];
  candidate.model.facts.find(
    ({ fact_id }) => fact_id === factId,
  ).benchmark_eligible = "true";
}, /must be a boolean/);
expectProjectionFailure((candidate) => {
  const issueId = candidate.inspector.cases.find(
    ({ issue_ids }) => issue_ids.length > 0,
  ).issue_ids[0];
  candidate.model.issues.find(
    ({ issue_id }) => issue_id === issueId,
  ).benchmark_blocking = 1;
}, /must be a boolean/);
for (const fieldName of [
  "observation_id",
  "field_name",
  "semantic_type",
]) {
  expectProjectionFailure((candidate) => {
    const factId = candidate.inspector.cases[0].fact_ids[0];
    candidate.model.facts.find(({ fact_id }) => fact_id === factId)[
      fieldName
    ] = "";
  }, /must be a non-empty string|belongs to undeclared observation/);
}
expectProjectionFailure((candidate) => {
  candidate.model.typologies.find(
    ({ typology_id }) => typology_id === "typology:pardo-coast-tipo-7",
  ).project_id = "project:ct-a-controlled";
}, /does not belong/);
expectProjectionFailure((candidate) => {
  const original = candidate.inspector.cases.find(
    ({ case_id }) => case_id === "case:f3-ct-g-pardo",
  );
  candidate.inspector.cases.push({
    ...clone(original),
    case_id: "case:f3-ct-g-pardo-duplicate-pair",
    route_slug: "f3-ct-g-pardo-duplicate-pair",
  });
}, /ambiguous/);
expectProjectionFailure((candidate) => {
  candidate.model.facts.push(clone(candidate.model.facts[0]));
}, /duplicate fact_id/);

assert.throws(
  () =>
    evaluate({
      facts: [requiredCertified],
      requiredFactIds: ["fact:missing"],
    }),
  /missing fact/,
);
assert.throws(
  () =>
    evaluate({
      facts: [requiredCertified],
      issues: [
        issue("outside-fact", "inconsistent", ["fact:not-in-input"]),
      ],
    }),
  /missing fact/,
);
assert.throws(
  () =>
    evaluateCompatibility({
      typology: syntheticTypology,
      observations: [],
      facts: [],
      issues: [],
    }),
  /must not be empty/,
);

const source = await readFile(
  new URL("../public/js/evidence-inspector.js", import.meta.url),
  "utf8",
);
assert.doesNotMatch(source, /\b(?:window|fetch)\b/u);
assert.doesNotMatch(source, /\bdocument\.(?:querySelector|getElementById)\b/u);
assert.doesNotMatch(
  source,
  /from\s+["'][^"']*(?:domain|state)(?:[./\\][^"']*)?["']/u,
);
assert.doesNotMatch(source, /\bglobalThis\.document\b/u);
const eligibilityProjectionSource = source.slice(
  source.indexOf("function compareOrdinal"),
  source.indexOf("function validatePermissionRecord"),
);
assert.ok(eligibilityProjectionSource.length > 0);
assert.doesNotMatch(
  eligibilityProjectionSource,
  /\b(?:domain|state|window|document|fetch)\b/u,
);

console.log(
  "evidence-inspector.mjs: PASS — 10 dossiers, five-state roll-up, six presentation modes, ownership, purity and fail-closed paths verified.",
);
