import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadContractSchema,
  validateRootDocument
} from "../../../tools/data/src/data/validate.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const prototypeRoot = path.resolve(testDirectory, "..");
const repositoryRoot = path.resolve(prototypeRoot, "..", "..");
const schema = loadContractSchema(
  path.resolve(testDirectory, "../../..", "packages", "contracts", "schemas", "demo-v2.schema.json")
);
const assetExists = (logicalPath) =>
  existsSync(path.join(prototypeRoot, "public", ...logicalPath.split("/")));

const inspectorSemanticErrors = (document) => {
  if (!document.inspector) return [];
  const { inspector, model } = document;
  const ids = {
    source_ids: new Set(model.sources.map(({ source_id }) => source_id)),
    observation_ids: new Set(
      model.observations.map(({ observation_id }) => observation_id)
    ),
    fact_ids: new Set(model.facts.map(({ fact_id }) => fact_id)),
    document_ids: new Set(model.documents.map(({ document_id }) => document_id)),
    evidence_ids: new Set(model.evidence.map(({ evidence_id }) => evidence_id)),
    issue_ids: new Set(model.issues.map(({ issue_id }) => issue_id))
  };
  const projects = new Set(model.projects.map(({ project_id }) => project_id));
  const typologies = new Map(
    model.typologies.map((typology) => [typology.typology_id, typology])
  );
  const documents = new Map(
    model.documents.map((entry) => [entry.document_id, entry])
  );
  const observations = new Map(
    model.observations.map((entry) => [entry.observation_id, entry])
  );
  const facts = new Map(model.facts.map((entry) => [entry.fact_id, entry]));
  const evidence = new Map(
    model.evidence.map((entry) => [entry.evidence_id, entry])
  );
  const issues = new Map(model.issues.map((entry) => [entry.issue_id, entry]));
  const events = new Map(model.events.map((entry) => [entry.event_id, entry]));
  const errors = [];
  const caseIds = new Set(inspector.cases.map(({ case_id }) => case_id));
  if (!caseIds.has(inspector.default_case_id)) errors.push("default_case_id");
  for (const inspectorCase of inspector.cases) {
    if (!projects.has(inspectorCase.project_id)) errors.push("project_id");
    if (
      !typologies.has(inspectorCase.typology_id) ||
      typologies.get(inspectorCase.typology_id).project_id !==
        inspectorCase.project_id
    ) {
      errors.push("typology_id");
    }
    for (const [field, knownIds] of Object.entries(ids)) {
      if (inspectorCase[field].some((id) => !knownIds.has(id))) errors.push(field);
    }
    if (
      inspectorCase.required_fact_ids.some(
        (factId) => !inspectorCase.fact_ids.includes(factId)
      )
    ) {
      errors.push("required_fact_ids");
    }
    if (
      inspectorCase.primary_evidence_id !== null &&
      !inspectorCase.evidence_ids.includes(inspectorCase.primary_evidence_id)
    ) {
      errors.push("primary_evidence_id");
    }
    const caseEntityIds = new Set([
      inspectorCase.project_id,
      inspectorCase.typology_id,
      ...inspectorCase.observation_ids,
      ...inspectorCase.fact_ids,
      ...inspectorCase.document_ids,
      ...inspectorCase.evidence_ids
    ]);
    const usedSourceIds = new Set();
    for (const observationId of inspectorCase.observation_ids) {
      const observation = observations.get(observationId);
      if (!observation) continue;
      usedSourceIds.add(observation.source_id);
      if (!inspectorCase.source_ids.includes(observation.source_id)) {
        errors.push("observation_source");
      }
      if (
        !new Set([
          inspectorCase.project_id,
          inspectorCase.typology_id,
          ...inspectorCase.document_ids
        ]).has(observation.entity_id)
      ) {
        errors.push("observation_entity");
      }
    }
    for (const factId of inspectorCase.fact_ids) {
      const fact = facts.get(factId);
      if (!fact) continue;
      if (!inspectorCase.observation_ids.includes(fact.observation_id)) {
        errors.push("fact_observation");
      }
      if (
        fact.entity_id !== inspectorCase.project_id &&
        fact.entity_id !== inspectorCase.typology_id
      ) {
        errors.push("fact_entity");
      }
    }
    for (const documentId of inspectorCase.document_ids) {
      const sourceDocument = documents.get(documentId);
      if (!sourceDocument) continue;
      usedSourceIds.add(sourceDocument.source_id);
      if (!inspectorCase.source_ids.includes(sourceDocument.source_id)) {
        errors.push("document_source");
      }
    }
    for (const evidenceId of inspectorCase.evidence_ids) {
      const evidenceEntry = evidence.get(evidenceId);
      if (!evidenceEntry) continue;
      if (!inspectorCase.observation_ids.includes(evidenceEntry.observation_id)) {
        errors.push("evidence_observation");
      }
      if (!inspectorCase.document_ids.includes(evidenceEntry.document_id)) {
        errors.push("evidence_document");
      }
    }
    for (const issueId of inspectorCase.issue_ids) {
      const issue = issues.get(issueId);
      if (!issue) continue;
      const event = issue.entity_type === "event" ? events.get(issue.entity_id) : null;
      const eventBelongsToCase =
        event &&
        [event.previous_fact_id, event.new_fact_id].every((factId) =>
          inspectorCase.fact_ids.includes(factId)
        );
      if (!caseEntityIds.has(issue.entity_id) && !eventBelongsToCase) {
        errors.push("issue_entity");
      }
      if (
        issue.fact_ids.some((factId) => !inspectorCase.fact_ids.includes(factId))
      ) {
        errors.push("issue_facts");
      }
    }
    if (
      inspectorCase.source_ids.some((sourceId) => !usedSourceIds.has(sourceId))
    ) {
      errors.push("unused_source");
    }
    const visualDocuments = new Set(
      inspector.assets
        .filter((asset) => asset.media_type.startsWith("image/"))
        .map(({ document_id }) => document_id)
    );
    if (
      inspectorCase.public_visual_asset_count !==
      inspectorCase.document_ids.filter((id) => visualDocuments.has(id)).length
    ) {
      errors.push("public_visual_asset_count");
    }
  }
  for (const asset of inspector.assets) {
    const sourceDocument = documents.get(asset.document_id);
    if (!sourceDocument) {
      errors.push("asset_document");
      continue;
    }
    if (sourceDocument.publish_permission !== "authorized") {
      errors.push("asset_document_permission");
    }
    if (sourceDocument.availability !== "available") {
      errors.push("asset_document_availability");
    }
    if (sourceDocument.public_asset_path !== asset.logical_path) {
      errors.push("asset_public_path");
    }
    if (sourceDocument.sha256 !== asset.sha256) {
      errors.push("asset_sha256");
    }
    if (
      ![...evidence.values()].some(
        (entry) =>
          entry.document_id === asset.document_id &&
          entry.publish_permission === "authorized" &&
          entry.availability === "available" &&
          typeof entry.fragment === "string" &&
          entry.fragment.length > 0
      )
    ) {
      errors.push("asset_evidence_fragment");
    }
  }
  const expectedCoverage = {
    total_cases: inspector.cases.length,
    observed_cases: inspector.cases.filter(
      ({ provenance_classification }) => provenance_classification === "observed"
    ).length,
    controlled_cases: inspector.cases.filter(
      ({ provenance_classification }) => provenance_classification === "controlled"
    ).length,
    simulated_cases: inspector.cases.filter(
      ({ provenance_classification }) => provenance_classification === "simulated"
    ).length,
    inspectable_typologies: new Set(
      inspector.cases.map(({ typology_id }) => typology_id)
    ).size,
    authorized_visual_assets: inspector.assets.filter((entry) =>
      entry.media_type.startsWith("image/")
    ).length
  };
  if (JSON.stringify(inspector.coverage) !== JSON.stringify(expectedCoverage)) {
    errors.push("coverage");
  }
  return errors;
};

const publicData = JSON.parse(
  await fs.readFile(
    path.resolve(testDirectory, "../../..", "data", "generated", "viva-platform-demo.json"),
    "utf8"
  )
);
const ctC = JSON.parse(
  await fs.readFile(
    path.join(
      repositoryRoot,
      "data",
      "fixtures",
      "ct-c.json"
    ),
    "utf8"
  )
);
const ctI = JSON.parse(
  await fs.readFile(
    path.join(
      repositoryRoot,
      "data",
      "fixtures",
      "ct-i.json"
    ),
    "utf8"
  )
);

const minimal20 = Object.fromEntries(
  schema.required.map((property) => [property, structuredClone(publicData[property])])
);
minimal20.metadata.contract_version = "2.0.0";
assert.equal(minimal20.metadata.contract_version, "2.0.0");
assert.deepEqual(
  validateRootDocument(minimal20, { schema, assetExists }),
  [],
  "reader 2.1 must continue to read a 2.0 payload without 2.1 fields"
);

const payload21 = structuredClone(minimal20);
payload21.metadata.contract_version = "2.1.0";
payload21.scenario_catalogs = structuredClone(ctC.input.scenario_catalogs);
payload21.scenario_defaults = {
  version: 1,
  district_id: "150122",
  scope_mode: "district",
  quadrant_id: null,
  center_latitude: null,
  center_longitude: null,
  radius_meters: null,
  typology: "all",
  bedrooms: "all",
  target_area_m2: null,
  target_price_pen: null,
  delivery_year: "all",
  visualization: "geographic",
  source: "default"
};
payload21.geography = structuredClone(ctI.input.geography);
assert.deepEqual(
  validateRootDocument(payload21, { schema, assetExists }),
  [],
  "2.1 payload with geography and scenario contracts must pass"
);

const payload22 = structuredClone(payload21);
payload22.metadata.contract_version = "2.2.0";
const inspectorAssetPath = "assets/evidence/ct-d-countertop.webp";
const inspectorDocumentId = "document:ct-d-inspector-visual";
const inspectorEvidenceId = "evidence:ct-d-inspector-visual-fragment";
const inspectorSha256 =
  "76997883b31990c766b433f21da0a699ffe502d40e15072b24bbacec11bfc850";
payload22.model.documents.push({
  document_id: inspectorDocumentId,
  source_id: "source:ct-d-authorized",
  document_type: "specification",
  title: "Representación visual controlada CT-D",
  captured_at: "2026-01-01T00:00:00Z",
  source_url: null,
  sha256: inspectorSha256,
  publish_permission: "authorized",
  availability: "available",
  public_asset_path: inspectorAssetPath
});
payload22.model.documents.sort((left, right) =>
  left.document_id.localeCompare(right.document_id)
);
payload22.model.evidence.push({
  evidence_id: inspectorEvidenceId,
  observation_id: "observation:ct-d-countertop",
  document_id: inspectorDocumentId,
  kind: "fragment",
  fragment: "Representación visual controlada: cubierta de cocina de cuarzo.",
  page: 1,
  region: null,
  captured_at: "2026-01-01T00:00:00Z",
  sha256: inspectorSha256,
  publish_permission: "authorized",
  availability: "available"
});
payload22.model.evidence.sort((left, right) =>
  left.evidence_id.localeCompare(right.evidence_id)
);
payload22.model.observations
  .find(
    ({ observation_id }) => observation_id === "observation:ct-d-countertop"
  )
  .evidence_ids.push(inspectorEvidenceId);
payload22.inspector = {
  version: 1,
  default_case_id: "case:ct-d-controlled",
  cases: [
    {
      case_id: "case:ct-d-controlled",
      route_slug: "ct-d-controlled",
      project_id: "project:ct-d-controlled",
      typology_id: "typology:ct-d-controlled",
      provenance_classification: "controlled",
      source_ids: ["source:ct-d-authorized"],
      observation_ids: ["observation:ct-d-countertop"],
      fact_ids: ["fact:ct-d-countertop-material"],
      document_ids: [inspectorDocumentId],
      evidence_ids: [inspectorEvidenceId],
      issue_ids: [],
      required_fact_ids: ["fact:ct-d-countertop-material"],
      primary_evidence_id: inspectorEvidenceId,
      expected_quality_status: "certified",
      expected_benchmark_eligible: true,
      public_visual_asset_count: 1
    }
  ],
  assets: [
    {
      asset_id: "asset:ct-d-countertop",
      document_id: inspectorDocumentId,
      logical_path: inspectorAssetPath,
      sha256: inspectorSha256,
      media_type: "image/webp",
      bytes: 1024,
      width: 640,
      height: 480,
      provenance: "controlled_original",
      publish_permission: "authorized",
      license_note: "Activo controlado y autorizado para la demo."
    }
  ],
  coverage: {
    total_cases: 1,
    observed_cases: 0,
    controlled_cases: 1,
    simulated_cases: 0,
    inspectable_typologies: 1,
    authorized_visual_assets: 1
  }
};
const compatibilityAssetExists = (logicalPath) =>
  logicalPath === inspectorAssetPath || assetExists(logicalPath);
assert.deepEqual(
  validateRootDocument(payload22, {
    schema,
    assetExists: compatibilityAssetExists
  }),
  [],
  "reader 2.2 must accept a complete 2.2 payload"
);
assert.deepEqual(
  inspectorSemanticErrors(payload22),
  [],
  "2.2 inspector references, subsets, coverage and visual evidence must resolve"
);

const missingInspector = structuredClone(payload22);
delete missingInspector.inspector;
assert.ok(
  validateRootDocument(missingInspector, { schema, assetExists }).some(
    (error) => error.code === "SCHEMA_REQUIRED"
  ),
  "2.2 payload must require inspector"
);

const invalidInspectorReference = structuredClone(payload22);
invalidInspectorReference.inspector.cases[0].required_fact_ids = [
  "fact:ct-a-built-area"
];
assert.ok(
  inspectorSemanticErrors(invalidInspectorReference).includes("required_fact_ids"),
  "required inspector facts must be a non-empty subset of case fact_ids"
);

const unrelatedNativeIds = structuredClone(payload22);
unrelatedNativeIds.inspector.cases[0].observation_ids = [
  "observation:ct-a-inputs"
];
unrelatedNativeIds.inspector.cases[0].fact_ids = ["fact:ct-a-built-area"];
unrelatedNativeIds.inspector.cases[0].required_fact_ids = [
  "fact:ct-a-built-area"
];
assert.ok(
  inspectorSemanticErrors(unrelatedNativeIds).some((error) =>
    ["observation_entity", "fact_entity", "evidence_observation"].includes(error)
  ),
  "globally existing inspector IDs must still belong to the selected case"
);

const unrelatedIssue = structuredClone(payload22);
unrelatedIssue.inspector.cases[0].issue_ids = [
  "issue:ct-b-price-source-conflict"
];
assert.ok(
  inspectorSemanticErrors(unrelatedIssue).some((error) =>
    ["issue_entity", "issue_facts"].includes(error)
  ),
  "inspector issues must belong to the case and only reference case facts"
);

const unusedDeclaredSource = structuredClone(payload22);
unusedDeclaredSource.inspector.cases[0].source_ids.push("source:ct-a-controlled");
assert.ok(
  inspectorSemanticErrors(unusedDeclaredSource).includes("unused_source"),
  "every declared inspector source must be used by a selected record"
);

const visualEvidenceWithoutFragment = structuredClone(payload22);
visualEvidenceWithoutFragment.model.evidence.find(
  ({ evidence_id }) => evidence_id === inspectorEvidenceId
).fragment = "";
assert.ok(
  inspectorSemanticErrors(visualEvidenceWithoutFragment).includes(
    "asset_evidence_fragment"
  ),
  "authorized visual assets must retain a non-empty evidence fragment"
);

const traversalInspectorAsset = structuredClone(payload22);
traversalInspectorAsset.inspector.assets[0].logical_path =
  "assets/evidence/../escape.webp";
assert.ok(
  validateRootDocument(traversalInspectorAsset, {
    schema,
    assetExists: compatibilityAssetExists
  }).some((error) => error.code === "SCHEMA_PATTERN"),
  "InspectorAsset logical_path must reject traversal segments"
);

const detachedInspectorAsset = structuredClone(payload22);
detachedInspectorAsset.inspector.assets[0].logical_path =
  "assets/evidence/other.webp";
assert.ok(
  inspectorSemanticErrors(detachedInspectorAsset).includes("asset_public_path"),
  "InspectorAsset logical_path must equal document.public_asset_path"
);

for (const [mutation, expectedError] of [
  [
    (candidate) => {
      candidate.model.documents.find(
        ({ document_id }) => document_id === inspectorDocumentId
      ).publish_permission = "pending";
    },
    "asset_document_permission"
  ],
  [
    (candidate) => {
      candidate.model.documents.find(
        ({ document_id }) => document_id === inspectorDocumentId
      ).availability = "unavailable";
    },
    "asset_document_availability"
  ],
  [
    (candidate) => {
      candidate.inspector.assets[0].sha256 = "a".repeat(64);
    },
    "asset_sha256"
  ]
]) {
  const candidate = structuredClone(payload22);
  mutation(candidate);
  assert.ok(
    inspectorSemanticErrors(candidate).includes(expectedError),
    `InspectorAsset binding must reject ${expectedError}`
  );
}

const payload23 = structuredClone(payload22);
payload23.metadata.contract_version = "2.3.0";
payload23.benchmark = {
  version: 1,
  methodology: {
    cutoff_at: "2026-07-30T00:00:00-05:00",
    minimum_quantitative_sample: 3,
    minimum_qualitative_informed_sample: 5,
    quantile_method: "R7",
    price_type_policy: "from",
    allowed_area_denominators: ["total"],
    pairing_policy: "source_paired_only",
    exclusion_reason_precedence: [
      "restricted",
      "blocking_issue",
      "conflicting_observations",
      "price_area_link_unresolved",
      "currency",
      "area_denominator",
      "cutoff",
      "missing"
    ],
    certification_label: "Elegible según las reglas de la demo"
  },
  fact_index: [],
  attribute_catalog: [],
  coverage: {
    indicators: {
      price_per_m2_total: {
        input_project_ids: [],
        used_project_ids: [],
        missing_project_ids: [],
        excluded_projects: []
      }
    }
  }
};
assert.deepEqual(
  validateRootDocument(payload23, {
    schema,
    assetExists: compatibilityAssetExists
  }),
  [],
  "reader 2.3 must accept a complete 2.3 payload"
);

const missingBenchmark = structuredClone(payload23);
delete missingBenchmark.benchmark;
assert.ok(
  validateRootDocument(missingBenchmark, {
    schema,
    assetExists: compatibilityAssetExists
  }).some((error) => error.code === "SCHEMA_REQUIRED"),
  "2.3 payload must require benchmark"
);

const legacy22WithoutBenchmark = structuredClone(payload22);
delete legacy22WithoutBenchmark.benchmark;
assert.deepEqual(
  validateRootDocument(legacy22WithoutBenchmark, {
    schema,
    assetExists: compatibilityAssetExists
  }),
  [],
  "2.2 must remain valid without benchmark"
);

const missingGeography = structuredClone(payload21);
delete missingGeography.geography;
assert.ok(
  validateRootDocument(missingGeography, { schema, assetExists }).some(
    (error) => error.code === "SCHEMA_REQUIRED"
  ),
  "2.1 payload must require geography"
);

const unsupportedMajor = structuredClone(payload21);
unsupportedMajor.metadata.contract_version = "3.0.0";
assert.ok(
  validateRootDocument(unsupportedMajor, { schema, assetExists }).some(
    (error) => error.code === "SCHEMA_ENUM"
  ),
  "unsupported major contract versions must fail"
);

const invalidRadiusDependencies = structuredClone(payload21);
invalidRadiusDependencies.scenario_defaults.scope_mode = "radius";
invalidRadiusDependencies.scenario_defaults.radius_meters = 500;
assert.ok(
  validateRootDocument(invalidRadiusDependencies, { schema, assetExists }).length >
    0,
  "radius scenarios without a target point must fail"
);

const invalidCatalog = structuredClone(payload21);
invalidCatalog.scenario_catalogs.typologies.push("local-comercial");
assert.ok(
  validateRootDocument(invalidCatalog, { schema, assetExists }).some(
    (error) => error.code === "SCHEMA_CONST"
  ),
  "catalog drift must fail"
);

console.log(
  "Contract compatibility OK: reader 2.3 accepts 2.0–2.3; inspector and benchmark revisions remain gated."
);
