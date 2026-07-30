import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildDemoData } from "../scripts/build-demo-data.js";
import {
  loadContractSchema,
  validateInspectorSemantics,
  validateRootDocument
} from "../scripts/data/validate.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const prototypeRoot = path.resolve(testDirectory, "..");
const repositoryRoot = path.resolve(prototypeRoot, "..");
const built = await buildDemoData({ repositoryRoot, write: false });
const { payload } = built;
const { inspector, model } = payload;
const schema = loadContractSchema(
  path.join(prototypeRoot, "contracts", "demo-v2.schema.json")
);
const assetExists = (logicalPath) =>
  path
    .resolve(prototypeRoot, "public", ...logicalPath.split("/"))
    .startsWith(path.resolve(prototypeRoot, "public") + path.sep);

assert.equal(payload.metadata.contract_version, "2.2.0");
assert.deepEqual(
  validateRootDocument(payload, { schema, assetExists }),
  [],
  "the generated 2.2 payload must pass the production validator"
);
assert.deepEqual(validateInspectorSemantics(inspector, model), []);
assert.deepEqual(
  {
    sources: model.sources.length,
    agencies: model.agencies.length,
    projects: model.projects.length,
    typologies: model.typologies.length,
    observations: model.observations.length,
    facts: model.facts.length,
    documents: model.documents.length,
    evidence: model.evidence.length,
    issues: model.issues.length,
    events: model.events.length,
    cases: inspector.cases.length,
    assets: inspector.assets.length
  },
  {
    sources: 10,
    agencies: 184,
    projects: 676,
    typologies: 11,
    observations: 30,
    facts: 40,
    documents: 19,
    evidence: 19,
    issues: 10,
    events: 3,
    cases: 10,
    assets: 15
  }
);
assert.deepEqual(inspector.coverage, {
  total_cases: 10,
  observed_cases: 1,
  controlled_cases: 9,
  simulated_cases: 0,
  inspectable_typologies: 10,
  authorized_visual_assets: 15
});
assert.deepEqual(
  Object.fromEntries(
    [...Map.groupBy(
      inspector.cases,
      (inspectorCase) => inspectorCase.expected_quality_status
    )]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([status, cases]) => [status, cases.length])
  ),
  {
    certified: 3,
    illegible: 1,
    inconsistent: 4,
    insufficient: 1,
    reviewable: 1
  }
);
assert.equal(
  inspector.cases.filter(
    (inspectorCase) => inspectorCase.expected_benchmark_eligible
  ).length,
  3
);
const projectById = new Map(
  model.projects.map((project) => [project.project_id, project])
);
assert.equal(
  new Set(
    inspector.cases.map(
      (inspectorCase) =>
        projectById.get(inspectorCase.project_id).agency_id
    )
  ).size,
  5,
  "the inspector must cover five agencies"
);

const manifest = JSON.parse(
  await fs.readFile(
    path.join(
      repositoryRoot,
      "datos_relevantes",
      "demo-pilot",
      "evidence-manifest.json"
    ),
    "utf8"
  )
);
assert.deepEqual(inspector.assets, manifest.assets);
assert.equal(
  inspector.assets.reduce((total, asset) => total + asset.bytes, 0),
  211_834
);
for (const asset of inspector.assets) {
  const bytes = await fs.readFile(
    path.join(prototypeRoot, "public", ...asset.logical_path.split("/"))
  );
  const digest = createHash("sha256").update(bytes).digest("hex");
  assert.equal(digest, asset.sha256);
  const document = model.documents.find(
    (record) => record.document_id === asset.document_id
  );
  const evidence = model.evidence.find(
    (record) => record.document_id === asset.document_id
  );
  assert.equal(document.sha256, digest);
  assert.equal(evidence.sha256, digest);
  assert.equal(evidence.kind, "image_region");
}

assert.equal(payload.metadata.input_fingerprints.length, 48);
assert.deepEqual(
  payload.metadata.input_fingerprints.map((fingerprint) => fingerprint.path),
  [...payload.metadata.input_fingerprints]
    .map((fingerprint) => fingerprint.path)
    .sort()
);
assert.equal(
  built.coverageReport.phase_gaps.some(
    (gap) => gap.gap_id === "GAP-F3-INSPECTOR-EVIDENCE"
  ),
  false,
  "P3-04 closes the F3 inspector/evidence gap"
);
assert.deepEqual(
  built.coverageReport.inspector_coverage,
  {
    ...inspector.coverage,
    case_quality_distribution: {
      certified: 3,
      illegible: 1,
      inconsistent: 4,
      insufficient: 1,
      reviewable: 1
    },
    benchmark_eligible_cases: 3,
    benchmark_excluded_cases: 7,
    asset_byte_length: 211_834,
    reference: "$.inspector"
  }
);

console.log(
  `Inspector data OK: ${inspector.cases.length} cases, ${inspector.assets.length} assets, ` +
    `${payload.metadata.input_fingerprints.length} fingerprints and production semantics validated.`
);
