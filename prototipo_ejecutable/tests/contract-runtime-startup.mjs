import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildTerritorialContext,
  createScenarioEnvironment,
  createScenarioState
} from "../public/js/scenario.js";
import {
  loadContractSchema,
  validateRootDocument
} from "../scripts/data/validate.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const prototypeRoot = path.resolve(testDirectory, "..");
const schema = loadContractSchema(
  path.join(prototypeRoot, "contracts", "demo-v2.schema.json")
);
const data = JSON.parse(
  await fs.readFile(
    path.join(prototypeRoot, "public", "demo-data", "viva-platform-demo.json"),
    "utf8"
  )
);
const assetExists = (logicalPath) =>
  existsSync(path.join(prototypeRoot, "public", ...logicalPath.split("/")));

function minimalBenchmark() {
  return {
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
}

function startupSnapshot(document) {
  const environment = createScenarioEnvironment(document);
  const scenarioState = createScenarioState(environment);
  const territorial = buildTerritorialContext({
    scenarioState,
    geography: document.geography,
    boundaryArtifactStatus: "valid"
  });
  return {
    catalogs: environment.catalogs,
    defaults: environment.defaults,
    geography: environment.geography,
    scenarioState,
    observed_scope_project_ids: territorial.observed_scope_project_ids,
    geography_valid_project_ids: territorial.geography_valid_project_ids,
    scope: territorial.scope,
    geography_status: territorial.geography_status,
    benchmark_status:
      document.metadata.contract_version === "2.3.0" && document.benchmark
        ? "available"
        : "contract_unavailable"
  };
}

const payloads = new Map();
for (const contractVersion of ["2.1.0", "2.2.0", "2.3.0"]) {
  const payload = structuredClone(data);
  payload.metadata.contract_version = contractVersion;
  delete payload.history;
  if (contractVersion === "2.3.0") {
    payload.benchmark = minimalBenchmark();
  } else {
    delete payload.benchmark;
  }
  payloads.set(contractVersion, payload);
  assert.deepEqual(
    validateRootDocument(payload, { schema, assetExists }),
    [],
    `contract ${contractVersion} must remain readable`
  );
}

const snapshots = Object.fromEntries(
  [...payloads].map(([contractVersion, payload]) => [
    contractVersion,
    startupSnapshot(payload)
  ])
);
for (const contractVersion of ["2.2.0", "2.3.0"]) {
  const { benchmark_status: ignoredBaseStatus, ...baseTerritory } =
    snapshots["2.1.0"];
  const { benchmark_status: ignoredCandidateStatus, ...candidateTerritory } =
    snapshots[contractVersion];
  assert.deepEqual(
    candidateTerritory,
    baseTerritory,
    `contract ${contractVersion} must preserve F2 IDs and territorial selection`
  );
}
assert.equal(snapshots["2.1.0"].benchmark_status, "contract_unavailable");
assert.equal(snapshots["2.2.0"].benchmark_status, "contract_unavailable");
assert.equal(snapshots["2.3.0"].benchmark_status, "available");

for (const contractVersion of ["2.0.0", "3.0.0"]) {
  const payload = structuredClone(data);
  payload.metadata.contract_version = contractVersion;
  assert.throws(
    () => startupSnapshot(payload),
    /requires public contract 2\.1\.0 or 2\.2\.0/,
    `runtime must fail closed for ${contractVersion}`
  );
}

console.log(
  "Runtime startup OK: 2.1/2.2/2.3 preserve territorial IDs; only F4 availability changes."
);
