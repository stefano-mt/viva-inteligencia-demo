import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, "..", "..", "..");

const readJson = async (...segments) =>
  JSON.parse(await fs.readFile(path.join(...segments), "utf8"));

const [ctDSource, ctGSource, ctDPublic, ctGPublic] = await Promise.all([
  readJson(
    repositoryRoot,
    "data/source",
    "demo-pilot",
    "fixtures",
    "ct-d.json"
  ),
  readJson(
    repositoryRoot,
    "data/source",
    "demo-pilot",
    "fixtures",
    "ct-g.json"
  ),
  readJson(testDirectory, "e2e-scenarios", "ct-d-public.json"),
  readJson(testDirectory, "e2e-scenarios", "ct-g-public.json")
]);

const byId = (records, property, id) => {
  const record = records.find((candidate) => candidate[property] === id);
  assert.ok(record, `Missing ${property}=${id} in source fixture`);
  return record;
};

const projectCtD = (source) => {
  const { input } = source;
  const project = byId(
    input.projects,
    "project_id",
    "project:ct-d-controlled"
  );
  const typology = byId(
    input.typologies,
    "typology_id",
    "typology:ct-d-controlled"
  );
  const countertopObservation = byId(
    input.observations,
    "observation_id",
    "observation:ct-d-countertop"
  );
  const countertopFact = byId(
    input.facts,
    "fact_id",
    "fact:ct-d-countertop-material"
  );
  const countertopDocument = byId(
    input.documents,
    "document_id",
    "document:ct-d-authorized"
  );
  const countertopEvidence = byId(
    input.evidence,
    "evidence_id",
    "evidence:ct-d-countertop-fragment"
  );
  const airObservation = byId(
    input.observations,
    "observation_id",
    "observation:ct-d-air-conditioning-absence"
  );
  const airFact = byId(
    input.facts,
    "fact_id",
    "fact:ct-d-air-conditioning"
  );
  const restrictedObservation = byId(
    input.observations,
    "observation_id",
    "observation:ct-d-restricted-document"
  );
  const restrictedDocument = byId(
    input.documents,
    "document_id",
    "document:ct-d-restricted"
  );
  const restrictedEvidence = byId(
    input.evidence,
    "evidence_id",
    "evidence:ct-d-restricted-metadata"
  );

  return {
    id: "CT-D-public",
    source_fixture: "data/source/demo-pilot/fixtures/ct-d.json",
    classification: source.classification,
    project_id: project.project_id,
    typology_id: typology.typology_id,
    countertop: {
      source_id: countertopObservation.source_id,
      observation_id: countertopObservation.observation_id,
      fact_id: countertopFact.fact_id,
      document_id: countertopDocument.document_id,
      evidence_id: countertopEvidence.evidence_id,
      original_value: countertopFact.original_value,
      normalized_value: countertopFact.normalized_value,
      unit: countertopFact.unit,
      captured_at: countertopObservation.captured_at,
      extraction_method: countertopObservation.extraction_method,
      confidence: countertopFact.confidence,
      quality_status: countertopFact.quality_status,
      benchmark_eligible: countertopFact.benchmark_eligible,
      fragment: countertopEvidence.fragment,
      page: countertopEvidence.page,
      document_publish_permission: countertopDocument.publish_permission,
      document_availability: countertopDocument.availability,
      evidence_publish_permission: countertopEvidence.publish_permission,
      evidence_availability: countertopEvidence.availability,
      public_asset_path: countertopDocument.public_asset_path,
      document_sha256: countertopDocument.sha256,
      evidence_sha256: countertopEvidence.sha256
    },
    air_conditioning: {
      source_id: airObservation.source_id,
      observation_id: airObservation.observation_id,
      fact_id: airFact.fact_id,
      original_value: airFact.original_value,
      normalized_value: airFact.normalized_value,
      unit: airFact.unit,
      captured_at: airObservation.captured_at,
      extraction_method: airObservation.extraction_method,
      confidence: airFact.confidence,
      quality_status: airFact.quality_status,
      benchmark_eligible: airFact.benchmark_eligible,
      evidence_status: airObservation.evidence_status
    },
    restricted_evidence: {
      source_id: restrictedObservation.source_id,
      observation_id: restrictedObservation.observation_id,
      document_id: restrictedDocument.document_id,
      evidence_id: restrictedEvidence.evidence_id,
      document_publish_permission: restrictedDocument.publish_permission,
      document_availability: restrictedDocument.availability,
      evidence_publish_permission: restrictedEvidence.publish_permission,
      evidence_availability: restrictedEvidence.availability,
      public_asset_path: restrictedDocument.public_asset_path,
      fragment: restrictedEvidence.fragment,
      document_sha256: restrictedDocument.sha256,
      evidence_sha256: restrictedEvidence.sha256
    },
    expected_result: structuredClone(source.expected.result)
  };
};

const projectCtG = (source) => {
  const { input } = source;
  const project = byId(input.projects, "project_id", "project:nexo-2951");
  const typology = byId(
    input.typologies,
    "typology_id",
    "typology:pardo-coast-tipo-7"
  );
  const cardObservation = byId(
    input.observations,
    "observation_id",
    "observation:pardo-coast-card"
  );
  const planObservation = byId(
    input.observations,
    "observation_id",
    "observation:pardo-coast-plan"
  );
  const cardArea = byId(
    input.facts,
    "fact_id",
    "fact:pardo-coast-card-area"
  );
  const cardFloor = byId(
    input.facts,
    "fact_id",
    "fact:pardo-coast-card-floor"
  );
  const planArea = byId(
    input.facts,
    "fact_id",
    "fact:pardo-coast-plan-area"
  );
  const planUnits = byId(
    input.facts,
    "fact_id",
    "fact:pardo-coast-plan-unit-range"
  );
  const floorMin = byId(
    input.facts,
    "fact_id",
    "fact:pardo-coast-inferred-floor-min"
  );
  const floorMax = byId(
    input.facts,
    "fact_id",
    "fact:pardo-coast-inferred-floor-max"
  );
  const areaDelta = byId(
    input.facts,
    "fact_id",
    "fact:pardo-coast-area-delta"
  );
  const areaDeltaPercent = byId(
    input.facts,
    "fact_id",
    "fact:pardo-coast-area-delta-percent"
  );
  const cardDocument = byId(
    input.documents,
    "document_id",
    "document:pardo-coast-card"
  );
  const planDocument = byId(
    input.documents,
    "document_id",
    "document:pardo-coast-plan"
  );
  const cardEvidence = byId(
    input.evidence,
    "evidence_id",
    "evidence:pardo-coast-card-metadata"
  );
  const planEvidence = byId(
    input.evidence,
    "evidence_id",
    "evidence:pardo-coast-plan-metadata"
  );

  return {
    id: "CT-G-public",
    source_fixture: "data/source/demo-pilot/fixtures/ct-g.json",
    classification: source.classification,
    canonical_path: "#inspector/case/f3-ct-g-pardo",
    project_id: project.project_id,
    typology_id: typology.typology_id,
    observations: [cardObservation, planObservation].map((observation) => ({
      observation_id: observation.observation_id,
      source_id: observation.source_id,
      captured_at: observation.captured_at,
      extraction_method: observation.extraction_method
    })),
    card: {
      document_id: cardDocument.document_id,
      evidence_id: cardEvidence.evidence_id,
      area_fact_id: cardArea.fact_id,
      floor_fact_id: cardFloor.fact_id,
      area_original_value: cardArea.original_value,
      area_normalized_value: cardArea.normalized_value,
      area_type: cardArea.area_type,
      floor_original_value: cardFloor.original_value,
      floor_normalized_value: cardFloor.normalized_value,
      quality_status: cardArea.quality_status,
      benchmark_eligible: cardArea.benchmark_eligible,
      document_publish_permission: cardDocument.publish_permission,
      document_availability: cardDocument.availability,
      evidence_publish_permission: cardEvidence.publish_permission,
      evidence_availability: cardEvidence.availability,
      public_asset_path: cardDocument.public_asset_path,
      fragment: cardEvidence.fragment,
      document_sha256: cardDocument.sha256,
      evidence_sha256: cardEvidence.sha256
    },
    plan: {
      document_id: planDocument.document_id,
      evidence_id: planEvidence.evidence_id,
      area_fact_id: planArea.fact_id,
      unit_range_fact_id: planUnits.fact_id,
      area_original_value: planArea.original_value,
      area_normalized_value: planArea.normalized_value,
      area_type: planArea.area_type,
      unit_range_original_value: planUnits.original_value,
      unit_range_normalized_value: planUnits.normalized_value,
      quality_status: planArea.quality_status,
      benchmark_eligible: planArea.benchmark_eligible,
      document_publish_permission: planDocument.publish_permission,
      document_availability: planDocument.availability,
      evidence_publish_permission: planEvidence.publish_permission,
      evidence_availability: planEvidence.availability,
      public_asset_path: planDocument.public_asset_path,
      fragment: planEvidence.fragment,
      document_sha256: planDocument.sha256,
      evidence_sha256: planEvidence.sha256
    },
    derived: {
      floor_min_fact_id: floorMin.fact_id,
      floor_min: floorMin.normalized_value,
      floor_max_fact_id: floorMax.fact_id,
      floor_max: floorMax.normalized_value,
      floor_confidence: floorMin.confidence,
      floor_quality_status: floorMin.quality_status,
      area_delta_fact_id: areaDelta.fact_id,
      area_delta: areaDelta.normalized_value,
      area_delta_type: areaDelta.area_type,
      relative_difference_fact_id: areaDeltaPercent.fact_id,
      relative_difference_percent: areaDeltaPercent.normalized_value,
      relative_difference_base_fact_id:
        areaDeltaPercent.derivation.input_fact_ids[0],
      rounding_mode: areaDeltaPercent.derivation.rounding.mode,
      rounding_digits: areaDeltaPercent.derivation.rounding.digits
    },
    issues: input.issues.map((issue) => ({
      issue_id: issue.issue_id,
      issue_code: issue.issue_code,
      quality_status: issue.quality_status,
      severity: issue.severity,
      benchmark_blocking: issue.benchmark_blocking,
      fact_ids: structuredClone(issue.fact_ids)
    })),
    publication: {
      assets: [],
      public_urls: [],
      binary_count: 0
    },
    expected_result: structuredClone(source.expected.result)
  };
};

const diffValues = (actual, expected, currentPath = "$") => {
  if (Object.is(actual, expected)) return [];
  if (
    actual === null ||
    expected === null ||
    typeof actual !== "object" ||
    typeof expected !== "object" ||
    Array.isArray(actual) !== Array.isArray(expected)
  ) {
    return [currentPath];
  }
  const actualKeys = Object.keys(actual);
  const expectedKeys = Object.keys(expected);
  const errors =
    JSON.stringify(actualKeys) === JSON.stringify(expectedKeys)
      ? []
      : [`${currentPath} keys`];
  for (const key of new Set([...actualKeys, ...expectedKeys])) {
    errors.push(
      ...diffValues(actual[key], expected[key], `${currentPath}.${key}`)
    );
  }
  return errors;
};

const collectForbiddenCtGReferences = (value, currentPath = "$") => {
  if (typeof value === "string" && /^https?:\/\//u.test(value)) {
    return [currentPath];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectForbiddenCtGReferences(item, `${currentPath}[${index}]`)
    );
  }
  if (!value || typeof value !== "object") return [];
  const errors = [];
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${currentPath}.${key}`;
    if (
      child !== null &&
      (/^(?:src|href|source_url|public_url|binary_url)$/u.test(key) ||
        (typeof child === "string" && /^https?:\/\//u.test(child)))
    ) {
      errors.push(childPath);
    }
    errors.push(...collectForbiddenCtGReferences(child, childPath));
  }
  return errors;
};

const validateCtDProjection = (projection, source) => {
  const errors = diffValues(projection, projectCtD(source)).map((pathValue) => ({
    code: "CT_D_PARITY_DRIFT",
    path: pathValue
  }));
  if (projection.air_conditioning?.normalized_value !== "unknown") {
    errors.push({
      code: "CT_D_UNKNOWN_SEMANTICS",
      path: "$.air_conditioning.normalized_value"
    });
  }
  if (
    projection.restricted_evidence?.public_asset_path !== null ||
    projection.restricted_evidence?.fragment !== null
  ) {
    errors.push({
      code: "CT_D_RESTRICTED_PUBLICATION",
      path: "$.restricted_evidence"
    });
  }
  return errors;
};

const validateCtGProjection = (projection, source) => {
  const expected = projectCtG(source);
  const errors = diffValues(projection, expected).map((pathValue) => ({
    code: "CT_G_PARITY_DRIFT",
    path: pathValue
  }));
  if (
    projection.card?.public_asset_path !== null ||
    projection.plan?.public_asset_path !== null ||
    projection.card?.fragment !== null ||
    projection.plan?.fragment !== null ||
    projection.publication?.assets?.length !== 0 ||
    projection.publication?.public_urls?.length !== 0 ||
    projection.publication?.binary_count !== 0
  ) {
    errors.push({
      code: "CT_G_PUBLIC_ASSET_FORBIDDEN",
      path: "$.publication"
    });
  }
  for (const forbiddenPath of collectForbiddenCtGReferences(projection)) {
    errors.push({
      code: "CT_G_PUBLIC_REFERENCE_FORBIDDEN",
      path: forbiddenPath
    });
  }
  if (
    projection.card?.document_publish_permission !== "pending" ||
    projection.card?.document_availability !== "unavailable" ||
    projection.card?.evidence_publish_permission !== "pending" ||
    projection.card?.evidence_availability !== "unavailable" ||
    projection.plan?.document_publish_permission !== "restricted" ||
    projection.plan?.document_availability !== "restricted" ||
    projection.plan?.evidence_publish_permission !== "restricted" ||
    projection.plan?.evidence_availability !== "restricted"
  ) {
    errors.push({
      code: "CT_G_PERMISSION_DRIFT",
      path: "$.card|$.plan"
    });
  }
  if (
    projection.card?.document_sha256 !== expected.card.document_sha256 ||
    projection.card?.evidence_sha256 !== expected.card.evidence_sha256 ||
    projection.plan?.document_sha256 !== expected.plan.document_sha256 ||
    projection.plan?.evidence_sha256 !== expected.plan.evidence_sha256
  ) {
    errors.push({
      code: "CT_G_HASH_DRIFT",
      path: "$.card.sha256|$.plan.sha256"
    });
  }
  if (
    projection.expected_result?.selected_truth_fact_id !== null ||
    projection.expected_result?.benchmark_eligible !== false
  ) {
    errors.push({
      code: "CT_G_DECISION_DRIFT",
      path: "$.expected_result"
    });
  }
  return errors;
};

assert.deepEqual(
  ctDPublic,
  projectCtD(ctDSource),
  "CT-D public projection must be derived exactly from the verified fixture"
);
assert.deepEqual(
  ctGPublic,
  projectCtG(ctGSource),
  "CT-G public projection must be derived exactly from the verified fixture"
);
assert.deepEqual(validateCtDProjection(ctDPublic, ctDSource), []);
assert.deepEqual(validateCtGProjection(ctGPublic, ctGSource), []);
assert.equal(
  new Set(ctGPublic.observations.map(({ observation_id }) => observation_id))
    .size,
  2,
  "CT-G must retain two independent observations"
);
assert.equal(
  JSON.stringify(ctGPublic).includes("project:nexo-3992"),
  false,
  "CT-G must never drift to Park 55"
);

const expectMutationRejected = ({
  projection,
  source,
  mutate,
  validate,
  expectedCode
}) => {
  const candidate = structuredClone(projection);
  mutate(candidate);
  assert.ok(
    validate(candidate, source).some(({ code }) => code === expectedCode),
    `Mutation must be rejected with ${expectedCode}`
  );
};

expectMutationRejected({
  projection: ctDPublic,
  source: ctDSource,
  mutate: (candidate) => {
    candidate.air_conditioning.normalized_value = false;
  },
  validate: validateCtDProjection,
  expectedCode: "CT_D_UNKNOWN_SEMANTICS"
});
expectMutationRejected({
  projection: ctDPublic,
  source: ctDSource,
  mutate: (candidate) => {
    candidate.restricted_evidence.public_asset_path =
      "assets/evidence/restricted.webp";
  },
  validate: validateCtDProjection,
  expectedCode: "CT_D_RESTRICTED_PUBLICATION"
});
expectMutationRejected({
  projection: ctGPublic,
  source: ctGSource,
  mutate: (candidate) => {
    candidate.card.area_type = "built";
  },
  validate: validateCtGProjection,
  expectedCode: "CT_G_PARITY_DRIFT"
});
expectMutationRejected({
  projection: ctGPublic,
  source: ctGSource,
  mutate: (candidate) => {
    candidate.card.public_asset_path = "assets/evidence/ct-g-card.webp";
    candidate.publication.assets.push("assets/evidence/ct-g-card.webp");
  },
  validate: validateCtGProjection,
  expectedCode: "CT_G_PUBLIC_ASSET_FORBIDDEN"
});
expectMutationRejected({
  projection: ctGPublic,
  source: ctGSource,
  mutate: (candidate) => {
    candidate.publication.public_urls.push("https://example.invalid/ct-g.webp");
  },
  validate: validateCtGProjection,
  expectedCode: "CT_G_PUBLIC_REFERENCE_FORBIDDEN"
});
expectMutationRejected({
  projection: ctGPublic,
  source: ctGSource,
  mutate: (candidate) => {
    candidate.plan.document_publish_permission = "authorized";
  },
  validate: validateCtGProjection,
  expectedCode: "CT_G_PERMISSION_DRIFT"
});
expectMutationRejected({
  projection: ctGPublic,
  source: ctGSource,
  mutate: (candidate) => {
    candidate.card.evidence_sha256 = "a".repeat(64);
  },
  validate: validateCtGProjection,
  expectedCode: "CT_G_HASH_DRIFT"
});
expectMutationRejected({
  projection: ctGPublic,
  source: ctGSource,
  mutate: (candidate) => {
    candidate.expected_result.selected_truth_fact_id =
      "fact:pardo-coast-card-area";
  },
  validate: validateCtGProjection,
  expectedCode: "CT_G_DECISION_DRIFT"
});

console.log(
  "Phase 3 fixtures OK: CT-D/CT-G public projections match verified sources and reject publication or semantic drift."
);
