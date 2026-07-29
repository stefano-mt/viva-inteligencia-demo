import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadContractSchema,
  validateEntityCatalog,
  validateSchemaShape
} from "../scripts/data/validate.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const prototypeRoot = path.resolve(testDirectory, "..");
const repositoryRoot = path.resolve(prototypeRoot, "..");
const catalogRoot = path.join(repositoryRoot, "datos_relevantes", "demo-pilot");
const publicRoot = path.join(prototypeRoot, "public");
const assetDirectory = path.join(publicRoot, "assets", "evidence");
const schema = loadContractSchema(
  path.join(prototypeRoot, "contracts", "demo-v2.schema.json")
);
const requireFromTest = createRequire(import.meta.url);
const loadPlaywright = async () => {
  try {
    return requireFromTest("playwright");
  } catch (error) {
    if (error?.code !== "MODULE_NOT_FOUND") throw error;
    const runtimeRoot = path.join(
      process.env.LOCALAPPDATA ?? "",
      "OpenAI",
      "Codex",
      "runtimes",
      "cua_node"
    );
    const runtimeNames = existsSync(runtimeRoot)
      ? await fs.readdir(runtimeRoot)
      : [];
    for (const runtimeName of runtimeNames) {
      const bundledModule = path.join(
        runtimeRoot,
        runtimeName,
        "bin",
        "node_modules",
        "playwright"
      );
      if (existsSync(bundledModule)) return requireFromTest(bundledModule);
    }
    throw error;
  }
};
const { chromium } = await loadPlaywright();
const CONTROLLED_REPRESENTATION_PREFIX =
  "Representación controlada para demo; no es el documento original";

const readJson = async (...segments) =>
  JSON.parse(await fs.readFile(path.join(...segments), "utf8"));
const sorted = (values) => [...values].sort((left, right) =>
  left.localeCompare(right)
);
const ids = (records, property) => records.map((record) => record[property]);
const asMap = (records, property) =>
  new Map(records.map((record) => [record[property], record]));
const assertUniqueSorted = (records, property) => {
  const values = ids(records, property);
  assert.equal(new Set(values).size, values.length, `${property} must be unique`);
  assert.deepEqual(values, sorted(values), `${property} must be deterministic`);
};
const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

const catalogNames = [
  "sources",
  "agencies",
  "typologies",
  "observations",
  "facts",
  "documents",
  "evidence",
  "issues"
];
const loaded = Object.fromEntries(
  await Promise.all(
    catalogNames.map(async (name) => [
      name,
      name === "agencies"
        ? (await readJson(catalogRoot, `${name}.json`)).agencies
        : await readJson(catalogRoot, `${name}.json`)
    ])
  )
);
const [inspectorCases, evidenceManifest, ...fixtures] = await Promise.all([
  readJson(catalogRoot, "inspector-cases.json"),
  readJson(catalogRoot, "evidence-manifest.json"),
  ...["ct-a", "ct-b", "ct-d", "ct-e", "ct-g"].map((fixture) =>
    readJson(catalogRoot, "fixtures", `${fixture}.json`)
  )
]);

assert.deepEqual(
  {
    sources: loaded.sources.length,
    typologies: loaded.typologies.length,
    observations: loaded.observations.length,
    facts: loaded.facts.length,
    documents: loaded.documents.length,
    evidence: loaded.evidence.length,
    issues: loaded.issues.length,
    cases: inspectorCases.cases.length,
    assets: evidenceManifest.assets.length
  },
  {
    sources: 10,
    typologies: 11,
    observations: 30,
    facts: 40,
    documents: 19,
    evidence: 19,
    issues: 10,
    cases: 10,
    assets: 15
  },
  "P3-03 catalog counts are frozen"
);

for (const name of catalogNames) {
  assert.deepEqual(
    validateEntityCatalog(name, loaded[name], { schema }),
    [],
    `${name}.json must match the 2.2 contract shape`
  );
}
assert.deepEqual(
  validateSchemaShape(inspectorCases.cases, {
    type: "array",
    items: { $ref: "#/$defs/inspectorCase" }
  }, { rootSchema: schema }),
  []
);
assert.deepEqual(
  validateSchemaShape(evidenceManifest.assets, {
    type: "array",
    items: { $ref: "#/$defs/inspectorAsset" }
  }, { rootSchema: schema }),
  []
);

const idPropertyByCatalog = {
  sources: "source_id",
  typologies: "typology_id",
  observations: "observation_id",
  facts: "fact_id",
  documents: "document_id",
  evidence: "evidence_id",
  issues: "issue_id"
};
for (const [name, property] of Object.entries(idPropertyByCatalog)) {
  assertUniqueSorted(loaded[name], property);
}
assertUniqueSorted(inspectorCases.cases, "case_id");
assertUniqueSorted(evidenceManifest.assets, "asset_id");

const EXPECTED_NEW_IDS = Object.freeze({
  sources: ["source:f3-neutral-card", "source:f3-neutral-measurement"],
  typologies: [
    "typology:f3-area-match",
    "typology:f3-bathroom-conflict",
    "typology:f3-bedroom-conflict",
    "typology:f3-floor-review",
    "typology:f3-illegible-area",
    "typology:f3-insufficient-source"
  ],
  observations: [
    "observation:f3-area-match-card",
    "observation:f3-area-match-measurement",
    "observation:f3-bathroom-conflict-card",
    "observation:f3-bathroom-conflict-measurement",
    "observation:f3-bedroom-conflict-card",
    "observation:f3-bedroom-conflict-measurement",
    "observation:f3-floor-review-card",
    "observation:f3-floor-review-derived",
    "observation:f3-floor-review-measurement",
    "observation:f3-illegible-area-card",
    "observation:f3-illegible-area-measurement",
    "observation:f3-insufficient-source-absence",
    "observation:f3-insufficient-source-card"
  ],
  facts: [
    "fact:f3-area-match-card-area",
    "fact:f3-area-match-measurement-area",
    "fact:f3-bathroom-conflict-card-bathrooms",
    "fact:f3-bathroom-conflict-measurement-bathrooms",
    "fact:f3-bedroom-conflict-card-bedrooms",
    "fact:f3-bedroom-conflict-measurement-bedrooms",
    "fact:f3-floor-review-card-floor",
    "fact:f3-floor-review-inferred-floor-max",
    "fact:f3-floor-review-inferred-floor-min",
    "fact:f3-floor-review-measurement-unit-range",
    "fact:f3-illegible-area-card-area",
    "fact:f3-illegible-area-measurement-area",
    "fact:f3-insufficient-source-card-area",
    "fact:f3-insufficient-source-missing-area"
  ],
  documents: [
    "document:f3-area-match-card",
    "document:f3-area-match-measurement",
    "document:f3-bathroom-conflict-card",
    "document:f3-bathroom-conflict-measurement",
    "document:f3-bedroom-conflict-card",
    "document:f3-bedroom-conflict-measurement",
    "document:f3-ct-a-card",
    "document:f3-ct-a-measurement",
    "document:f3-ct-b-source-a",
    "document:f3-ct-b-source-b",
    "document:f3-floor-review-card",
    "document:f3-floor-review-measurement",
    "document:f3-illegible-area-card",
    "document:f3-illegible-area-measurement",
    "document:f3-insufficient-source-card"
  ],
  evidence: [
    "evidence:f3-area-match-card",
    "evidence:f3-area-match-measurement",
    "evidence:f3-bathroom-conflict-card",
    "evidence:f3-bathroom-conflict-measurement",
    "evidence:f3-bedroom-conflict-card",
    "evidence:f3-bedroom-conflict-measurement",
    "evidence:f3-ct-a-card",
    "evidence:f3-ct-a-measurement",
    "evidence:f3-ct-b-source-a",
    "evidence:f3-ct-b-source-b",
    "evidence:f3-floor-review-card",
    "evidence:f3-floor-review-measurement",
    "evidence:f3-illegible-area-card",
    "evidence:f3-illegible-area-measurement",
    "evidence:f3-insufficient-source-card"
  ],
  issues: [
    "issue:f3-bathroom-source-conflict",
    "issue:f3-bedroom-source-conflict",
    "issue:f3-floor-review-inference",
    "issue:f3-illegible-area-evidence",
    "issue:f3-insufficient-source-absence"
  ],
  cases: [
    "case:f3-area-match",
    "case:f3-bathroom-conflict",
    "case:f3-bedroom-conflict",
    "case:f3-ct-a-area-types",
    "case:f3-ct-b-price-conflict",
    "case:f3-ct-d-finishes",
    "case:f3-ct-g-pardo",
    "case:f3-floor-review",
    "case:f3-illegible-area",
    "case:f3-insufficient-source"
  ],
  assets: [
    "asset:f3-area-match-card",
    "asset:f3-area-match-measurement",
    "asset:f3-bathroom-conflict-card",
    "asset:f3-bathroom-conflict-measurement",
    "asset:f3-bedroom-conflict-card",
    "asset:f3-bedroom-conflict-measurement",
    "asset:f3-ct-a-card",
    "asset:f3-ct-a-measurement",
    "asset:f3-ct-b-source-a",
    "asset:f3-ct-b-source-b",
    "asset:f3-floor-review-card",
    "asset:f3-floor-review-measurement",
    "asset:f3-illegible-area-card",
    "asset:f3-illegible-area-measurement",
    "asset:f3-insufficient-source-card"
  ]
});
for (const name of ["sources", "typologies", "observations", "facts", "documents", "evidence", "issues"]) {
  const property = idPropertyByCatalog[name];
  assert.deepEqual(
    ids(loaded[name], property).filter((id) => id.includes(":f3-")),
    EXPECTED_NEW_IDS[name],
    `${name} namespaced P3-03 IDs are frozen`
  );
}
assert.deepEqual(ids(inspectorCases.cases, "case_id"), EXPECTED_NEW_IDS.cases);
assert.deepEqual(ids(evidenceManifest.assets, "asset_id"), EXPECTED_NEW_IDS.assets);

const projectCatalog = [
  ...new Map(
    fixtures
      .flatMap((fixture) => fixture.input.projects)
      .map((project) => [project.project_id, project])
  ).values()
];
const agencyCatalog = [
  ...new Map(
    [
      ...loaded.agencies,
      ...fixtures.flatMap((fixture) => fixture.input.agencies)
    ].map((agency) => [agency.agency_id, agency])
  ).values()
];
const maps = {
  sources: asMap(loaded.sources, "source_id"),
  agencies: asMap(agencyCatalog, "agency_id"),
  projects: asMap(projectCatalog, "project_id"),
  typologies: asMap(loaded.typologies, "typology_id"),
  observations: asMap(loaded.observations, "observation_id"),
  facts: asMap(loaded.facts, "fact_id"),
  documents: asMap(loaded.documents, "document_id"),
  evidence: asMap(loaded.evidence, "evidence_id"),
  issues: asMap(loaded.issues, "issue_id"),
  assets: asMap(evidenceManifest.assets, "document_id")
};

const parseWebp = (buffer) => {
  if (
    buffer.length < 30 ||
    buffer.subarray(0, 4).toString("ascii") !== "RIFF" ||
    buffer.subarray(8, 12).toString("ascii") !== "WEBP"
  ) return null;
  const riffBytes = buffer.readUInt32LE(4) + 8;
  if (riffBytes !== buffer.length) return null;
  const chunk = buffer.subarray(12, 16).toString("ascii");
  if (
    chunk !== "VP8 " ||
    buffer[23] !== 0x9d ||
    buffer[24] !== 0x01 ||
    buffer[25] !== 0x2a
  ) return null;
  return {
    width: buffer.readUInt16LE(26) & 0x3fff,
    height: buffer.readUInt16LE(28) & 0x3fff
  };
};

const physicalAssets = new Map();
const executablePath = [
  process.env.PLAYWRIGHT_CHROME_PATH,
  chromium.executablePath(),
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
].find((candidate) => candidate && existsSync(candidate));
const browser = await chromium.launch({
  ...(executablePath ? { executablePath } : {}),
  headless: true
});
try {
  const page = await browser.newPage();
  await page.setContent("<!doctype html><meta charset=\"utf-8\"><title>offline WebP decoder</title>");
  for (const asset of evidenceManifest.assets) {
    const absolutePath = path.join(publicRoot, ...asset.logical_path.split("/"));
    const buffer = await fs.readFile(absolutePath);
    const dimensions = parseWebp(buffer);
    assert.ok(dimensions, `${asset.logical_path} must have a valid VP8 WebP header`);
    const decoded = await page.evaluate(async (dataUrl) => {
      const image = new Image();
      image.src = dataUrl;
      await image.decode();
      return {
        width: image.naturalWidth,
        height: image.naturalHeight,
        complete: image.complete
      };
    }, `data:image/webp;base64,${buffer.toString("base64")}`);
    assert.deepEqual(
      decoded,
      { width: dimensions.width, height: dimensions.height, complete: true },
      `${asset.logical_path} must decode in offline Chromium`
    );
    physicalAssets.set(asset.logical_path, {
      bytes: buffer.length,
      sha256: sha256(buffer),
      chromium_decoded: true,
      ...dimensions
    });
  }
} finally {
  await browser.close();
}

const FROZEN_COVERAGE = Object.freeze({
  total_cases: 10,
  observed_cases: 1,
  controlled_cases: 9,
  simulated_cases: 0,
  inspectable_typologies: 10,
  authorized_visual_assets: 15
});
const QUALITY_PRECEDENCE = [
  "inconsistent",
  "illegible",
  "insufficient",
  "reviewable",
  "certified"
];
const deriveCaseDecision = (inspectorCase, model) => {
  const requiredFacts = inspectorCase.required_fact_ids
    .map((factId) => model.facts.get(factId))
    .filter(Boolean);
  const requiredFactIds = new Set(inspectorCase.required_fact_ids);
  const blockingIssues = inspectorCase.issue_ids
    .map((issueId) => model.issues.get(issueId))
    .filter(
      (issue) =>
        issue?.benchmark_blocking === true &&
        issue.fact_ids.some((factId) => requiredFactIds.has(factId))
    );
  const statuses = new Set([
    ...requiredFacts.map(({ quality_status }) => quality_status),
    ...blockingIssues.map(({ quality_status }) => quality_status)
  ]);
  const qualityStatus =
    QUALITY_PRECEDENCE.find((status) => statuses.has(status)) ?? "certified";
  const benchmarkEligible =
    qualityStatus === "certified" &&
    requiredFacts.length === inspectorCase.required_fact_ids.length &&
    requiredFacts.every(
      (fact) =>
        fact.quality_status === "certified" &&
        fact.benchmark_eligible === true
    ) &&
    blockingIssues.length === 0;
  return { qualityStatus, benchmarkEligible };
};

const validateCatalog = (
  { defaultCaseId, cases, assets, coverage, model },
  physical = physicalAssets
) => {
  const errors = [];
  const add = (code) => {
    if (!errors.includes(code)) errors.push(code);
  };
  const {
    sources,
    agencies,
    projects,
    typologies,
    observations,
    facts,
    documents,
    evidence,
    issues
  } = model;
  const assetByDocument = asMap(assets, "document_id");
  const visualDocumentIds = new Set(assetByDocument.keys());
  const assetDocumentIds = assets.map(({ document_id }) => document_id);
  const assetPaths = assets.map(({ logical_path }) => logical_path);
  if (new Set(assetDocumentIds).size !== assets.length) {
    add("ASSET_DOCUMENT_DUPLICATE");
  }
  if (new Set(assetPaths).size !== assets.length) add("ASSET_PATH_DUPLICATE");
  const caseDocumentIds = new Set(cases.flatMap(({ document_ids }) => document_ids));
  if (assets.some(({ document_id }) => !caseDocumentIds.has(document_id))) {
    add("ASSET_ORPHAN_CASE");
  }
  if (!cases.some(({ case_id }) => case_id === defaultCaseId)) {
    add("DEFAULT_CASE_REFERENCE");
  }
  const derivedCoverage = {
    total_cases: cases.length,
    observed_cases: cases.filter(
      ({ provenance_classification }) =>
        provenance_classification === "observed"
    ).length,
    controlled_cases: cases.filter(
      ({ provenance_classification }) =>
        provenance_classification === "controlled"
    ).length,
    simulated_cases: cases.filter(
      ({ provenance_classification }) =>
        provenance_classification === "simulated"
    ).length,
    inspectable_typologies: new Set(cases.map(({ typology_id }) => typology_id))
      .size,
    authorized_visual_assets: assets.filter(
      (asset) =>
        asset.media_type.startsWith("image/") &&
        asset.publish_permission === "authorized"
    ).length
  };
  if (derivedCoverage.total_cases !== FROZEN_COVERAGE.total_cases) {
    add("COVERAGE_TOTAL_CASES");
  }
  if (
    derivedCoverage.observed_cases !== FROZEN_COVERAGE.observed_cases ||
    derivedCoverage.controlled_cases !== FROZEN_COVERAGE.controlled_cases ||
    derivedCoverage.simulated_cases !== FROZEN_COVERAGE.simulated_cases
  ) add("COVERAGE_PROVENANCE");
  if (
    derivedCoverage.inspectable_typologies !==
    FROZEN_COVERAGE.inspectable_typologies
  ) add("COVERAGE_TYPOLOGY_COUNT");
  if (
    derivedCoverage.authorized_visual_assets !==
    FROZEN_COVERAGE.authorized_visual_assets
  ) add("COVERAGE_AUTHORIZED_ASSETS");
  if (JSON.stringify(coverage) !== JSON.stringify(derivedCoverage)) {
    add("COVERAGE_DECLARATION");
  }
  if (
    cases.reduce(
      (sum, inspectorCase) => sum + inspectorCase.public_visual_asset_count,
      0
    ) !== FROZEN_COVERAGE.authorized_visual_assets
  ) add("CASE_VISUAL_TOTAL");

  const caseAgencyIds = new Set();
  for (const inspectorCase of cases) {
    const project = projects.get(inspectorCase.project_id);
    const typology = typologies.get(inspectorCase.typology_id);
    if (!project) {
      add("CASE_PROJECT_REFERENCE");
    } else if (!agencies.has(project.agency_id)) {
      add("CASE_PROJECT_AGENCY_REFERENCE");
    } else {
      caseAgencyIds.add(project.agency_id);
    }
    if (!typology || typology.project_id !== inspectorCase.project_id) {
      add("CASE_TYPOLOGY_REFERENCE");
    }
    if (inspectorCase.source_ids.some((sourceId) => !sources.has(sourceId))) {
      add("CASE_SOURCE_REFERENCE");
    }
    const sourceUsage = new Set();
    for (const observationId of inspectorCase.observation_ids) {
      const observation = observations.get(observationId);
      if (!observation) {
        add("CASE_OBSERVATION_REFERENCE");
        continue;
      }
      sourceUsage.add(observation.source_id);
      if (!inspectorCase.source_ids.includes(observation.source_id)) {
        add("CASE_OBSERVATION_SOURCE");
      }
      if (![inspectorCase.project_id, inspectorCase.typology_id, ...inspectorCase.document_ids].includes(observation.entity_id)) {
        add("CASE_OBSERVATION_ENTITY");
      }
    }
    for (const factId of inspectorCase.fact_ids) {
      const fact = facts.get(factId);
      if (!fact) {
        add("CASE_FACT_REFERENCE");
        continue;
      }
      if (!inspectorCase.observation_ids.includes(fact.observation_id)) {
        add("CASE_FACT_OBSERVATION");
      }
      if (![inspectorCase.project_id, inspectorCase.typology_id].includes(fact.entity_id)) {
        add("CASE_FACT_ENTITY");
      }
    }
    if (inspectorCase.required_fact_ids.some((id) => !inspectorCase.fact_ids.includes(id))) {
      add("CASE_REQUIRED_FACT_SUBSET");
    }
    if (
      inspectorCase.required_fact_ids.some((factId) => !facts.has(factId))
    ) add("CASE_REQUIRED_FACT_REFERENCE");
    for (const documentId of inspectorCase.document_ids) {
      const document = documents.get(documentId);
      if (!document) {
        add("CASE_DOCUMENT_REFERENCE");
        continue;
      }
      sourceUsage.add(document.source_id);
      if (!inspectorCase.source_ids.includes(document.source_id)) {
        add("CASE_DOCUMENT_SOURCE");
      }
    }
    for (const evidenceId of inspectorCase.evidence_ids) {
      const evidenceEntry = evidence.get(evidenceId);
      if (!evidenceEntry) {
        add("CASE_EVIDENCE_REFERENCE");
        continue;
      }
      if (!inspectorCase.observation_ids.includes(evidenceEntry.observation_id)) {
        add("CASE_EVIDENCE_OBSERVATION");
      }
      if (!inspectorCase.document_ids.includes(evidenceEntry.document_id)) {
        add("CASE_EVIDENCE_DOCUMENT");
      }
    }
    if (
      inspectorCase.primary_evidence_id !== null &&
      !inspectorCase.evidence_ids.includes(inspectorCase.primary_evidence_id)
    ) add("CASE_PRIMARY_EVIDENCE");
    for (const issueId of inspectorCase.issue_ids) {
      const issue = issues.get(issueId);
      if (!issue) {
        add("CASE_ISSUE_REFERENCE");
        continue;
      }
      if (issue.entity_id !== inspectorCase.typology_id) add("CASE_ISSUE_ENTITY");
      if (issue.fact_ids.some((id) => !inspectorCase.fact_ids.includes(id))) {
        add("CASE_ISSUE_FACTS");
      }
    }
    if (inspectorCase.source_ids.some((id) => !sourceUsage.has(id))) {
      add("CASE_UNUSED_SOURCE");
    }
    const visualCount = inspectorCase.document_ids.filter((id) =>
      visualDocumentIds.has(id)
    ).length;
    if (visualCount !== inspectorCase.public_visual_asset_count) {
      add("CASE_VISUAL_COUNT");
    }
    const derivedDecision = deriveCaseDecision(inspectorCase, model);
    if (
      inspectorCase.expected_quality_status !== derivedDecision.qualityStatus
    ) add("CASE_EXPECTED_QUALITY_STATUS");
    if (
      inspectorCase.expected_benchmark_eligible !==
      derivedDecision.benchmarkEligible
    ) add("CASE_EXPECTED_BENCHMARK_ELIGIBLE");
  }
  if (caseAgencyIds.size !== 5) add("COVERAGE_AGENCY_COUNT");
  for (const asset of assets) {
    if (
      path.isAbsolute(asset.logical_path) ||
      asset.logical_path.includes("\\") ||
      asset.logical_path.split("/").includes("..") ||
      !/^assets\/evidence\/[A-Za-z0-9_-]+\.webp$/u.test(asset.logical_path)
    ) add("ASSET_PATH_TRAVERSAL");
    const document = documents.get(asset.document_id);
    if (!document) {
      add("ASSET_DOCUMENT_REFERENCE");
      continue;
    }
    if (document.public_asset_path !== asset.logical_path) add("ASSET_DOCUMENT_PATH");
    if (document.sha256 !== asset.sha256) add("ASSET_DOCUMENT_HASH");
    if (
      document.publish_permission !== "authorized" ||
      document.availability !== "available" ||
      asset.publish_permission !== "authorized" ||
      asset.provenance !== "controlled_original"
    ) add("ASSET_PERMISSION");
    if (asset.provenance !== "controlled_original") add("ASSET_PROVENANCE");
    const evidenceEntry = [...evidence.values()].find(
      (entry) => entry.document_id === asset.document_id
    );
    if (
      !evidenceEntry ||
      evidenceEntry.kind !== "image_region" ||
      evidenceEntry.publish_permission !== "authorized" ||
      evidenceEntry.availability !== "available" ||
      typeof evidenceEntry.fragment !== "string" ||
      evidenceEntry.fragment.trim().length === 0
    ) add("ASSET_EVIDENCE_FRAGMENT");
    if (
      typeof evidenceEntry?.fragment !== "string" ||
      !evidenceEntry.fragment.startsWith(CONTROLLED_REPRESENTATION_PREFIX)
    ) add("ASSET_EVIDENCE_PREFIX");
    if (evidenceEntry?.sha256 !== asset.sha256) add("ASSET_EVIDENCE_HASH");
    const actual = physical.get(asset.logical_path);
    if (!actual || actual.sha256 !== asset.sha256) add("ASSET_FILE_HASH");
    if (!actual || actual.bytes !== asset.bytes || asset.bytes >= 250000) {
      add("ASSET_FILE_SIZE");
    }
    if (!actual || actual.width !== asset.width || actual.height !== asset.height) {
      add("ASSET_FILE_DIMENSIONS");
    }
    if (!actual?.chromium_decoded) add("ASSET_CHROMIUM_DECODE");
  }
  if (assets.reduce((sum, asset) => sum + asset.bytes, 0) >= 4_000_000) {
    add("ASSET_TOTAL_SIZE");
  }
  return errors;
};

const state = {
  defaultCaseId: inspectorCases.default_case_id,
  cases: inspectorCases.cases,
  assets: evidenceManifest.assets,
  coverage: inspectorCases.coverage,
  model: maps
};
assert.deepEqual(validateCatalog(state), [], "all case/model/asset bindings resolve");

assert.equal(evidenceManifest.version, 1);
assert.equal(inspectorCases.version, 1);
assert.equal(inspectorCases.default_case_id, "case:f3-ct-g-pardo");
assert.deepEqual(inspectorCases.coverage, FROZEN_COVERAGE);
assert.equal(
  evidenceManifest.assets.reduce((sum, asset) => sum + asset.bytes, 0),
  211834
);
assert.ok(
  evidenceManifest.assets.every(
    (asset) =>
      asset.media_type === "image/webp" &&
      asset.width === 800 &&
      asset.height === 560 &&
      asset.bytes < 250000 &&
      asset.license_note.trim().length > 0
  )
);

const diskNames = sorted(
  (await fs.readdir(assetDirectory)).filter((name) => name.endsWith(".webp"))
);
const manifestNames = sorted(
  evidenceManifest.assets.map((asset) => path.basename(asset.logical_path))
);
assert.deepEqual(diskNames, manifestNames, "manifest cannot omit or invent WebP assets");

for (const asset of evidenceManifest.assets) {
  const document = maps.documents.get(asset.document_id);
  assert.ok(!/\bplano\b/iu.test(document.title), "neutral F3 documents use ficha de medición");
}
const forbiddenCtGHashes = new Set([
  "41ab273c521fcc66025653e8cfe44f894afb01b2f1b9be72847dcf87db2f2c4b",
  "3c108732cc1f9c0dbd884ed3d171a0abacffc96d9e80a95d994dc1d1a43bd60a"
]);
assert.ok(
  evidenceManifest.assets.every((asset) => !forbiddenCtGHashes.has(asset.sha256)),
  "CT-G observed hashes are denied from the public manifest"
);
for (const id of ["document:pardo-coast-card", "document:pardo-coast-plan"]) {
  const document = maps.documents.get(id);
  assert.equal(document.public_asset_path, null);
  assert.equal(maps.assets.has(id), false);
}

const expectMutation = (mutate, expectedCode) => {
  const cloneMap = (source) =>
    new Map(
      [...source].map(([id, value]) => [id, structuredClone(value)])
    );
  const candidate = {
    defaultCaseId: inspectorCases.default_case_id,
    cases: structuredClone(inspectorCases.cases),
    assets: structuredClone(evidenceManifest.assets),
    coverage: structuredClone(inspectorCases.coverage),
    model: Object.fromEntries(
      Object.entries(maps).map(([name, source]) => [name, cloneMap(source)])
    )
  };
  mutate(candidate);
  assert.ok(
    validateCatalog(candidate).includes(expectedCode),
    `mutation must fail with ${expectedCode}`
  );
};
expectMutation((candidate) => {
  candidate.assets[0].logical_path = "assets/evidence/../escape.webp";
}, "ASSET_PATH_TRAVERSAL");
expectMutation((candidate) => {
  candidate.assets[0].sha256 = "a".repeat(64);
}, "ASSET_FILE_HASH");
expectMutation((candidate) => {
  candidate.assets[0].bytes += 1;
}, "ASSET_FILE_SIZE");
expectMutation((candidate) => {
  candidate.assets[0].width += 1;
}, "ASSET_FILE_DIMENSIONS");
expectMutation((candidate) => {
  const document = candidate.model.documents.get(candidate.assets[0].document_id);
  document.publish_permission = "pending";
}, "ASSET_PERMISSION");
expectMutation((candidate) => {
  const documentId = candidate.assets[0].document_id;
  const evidenceEntry = [...candidate.model.evidence.values()].find(
    (entry) => entry.document_id === documentId
  );
  evidenceEntry.fragment = "";
}, "ASSET_EVIDENCE_FRAGMENT");
expectMutation((candidate) => {
  const documentId = candidate.assets[0].document_id;
  const evidenceEntry = [...candidate.model.evidence.values()].find(
    (entry) => entry.document_id === documentId
  );
  evidenceEntry.fragment =
    "Contenido controlado para demo; no es el documento original.";
}, "ASSET_EVIDENCE_PREFIX");
expectMutation((candidate) => {
  candidate.cases[0].evidence_ids[0] = "evidence:f3-ct-a-card";
}, "CASE_EVIDENCE_OBSERVATION");
expectMutation((candidate) => {
  candidate.cases[0].provenance_classification = "simulated";
}, "COVERAGE_PROVENANCE");
expectMutation((candidate) => {
  candidate.coverage.total_cases += 1;
}, "COVERAGE_DECLARATION");
expectMutation((candidate) => {
  candidate.cases.at(-1).typology_id = "typology:ct-a-controlled";
}, "COVERAGE_TYPOLOGY_COUNT");
expectMutation((candidate) => {
  candidate.model.projects.get("project:ct-e-controlled").agency_id =
    "agency:ct-a-controlled";
}, "COVERAGE_AGENCY_COUNT");
expectMutation((candidate) => {
  candidate.cases[0].expected_quality_status = "reviewable";
}, "CASE_EXPECTED_QUALITY_STATUS");
expectMutation((candidate) => {
  candidate.cases[0].expected_benchmark_eligible = false;
}, "CASE_EXPECTED_BENCHMARK_ELIGIBLE");
expectMutation((candidate) => {
  candidate.model.typologies.get("typology:f3-area-match").project_id =
    "project:ct-b-controlled";
}, "CASE_TYPOLOGY_REFERENCE");
expectMutation((candidate) => {
  candidate.assets[1].document_id = candidate.assets[0].document_id;
}, "ASSET_DOCUMENT_DUPLICATE");
expectMutation((candidate) => {
  candidate.assets[1].logical_path = candidate.assets[0].logical_path;
}, "ASSET_PATH_DUPLICATE");
expectMutation((candidate) => {
  const orphanDocumentId = candidate.assets[0].document_id;
  for (const inspectorCase of candidate.cases) {
    inspectorCase.document_ids = inspectorCase.document_ids.filter(
      (documentId) => documentId !== orphanDocumentId
    );
  }
}, "ASSET_ORPHAN_CASE");
expectMutation((candidate) => {
  candidate.assets[0].provenance = "observed";
}, "ASSET_PROVENANCE");
expectMutation((candidate) => {
  candidate.assets[0].publish_permission = "pending";
}, "COVERAGE_AUTHORIZED_ASSETS");
expectMutation((candidate) => {
  candidate.cases[0].public_visual_asset_count -= 1;
}, "CASE_VISUAL_TOTAL");

console.log(
  "Evidence manifest OK: derived coverage/agencies/decisions, Chromium-decoded WebP assets, exact relations, CT-G denylist and negative mutations are enforced."
);
