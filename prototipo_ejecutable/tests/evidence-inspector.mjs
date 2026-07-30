import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  INSPECTOR_QUALITY_PRECEDENCE,
  INSPECTOR_ROW_ORDER,
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
assert.equal(payload.metadata.contract_version, "2.2.0");
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

console.log(
  "evidence-inspector.mjs: PASS — 10 dossiers, five-state roll-up, six presentation modes, ownership, purity and fail-closed paths verified.",
);
