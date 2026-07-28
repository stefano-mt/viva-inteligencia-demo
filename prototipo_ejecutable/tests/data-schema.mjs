import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadContractSchema,
  validateFixture,
  validateRootDocument,
  validateSchemaShape
} from "../scripts/data/validate.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const prototypeRoot = path.resolve(testDirectory, "..");
const repositoryRoot = path.resolve(prototypeRoot, "..");
const schema = loadContractSchema(
  path.join(prototypeRoot, "contracts", "demo-v2.schema.json")
);
const outputPath = path.join(
  prototypeRoot,
  "public",
  "demo-data",
  "viva-platform-demo.json"
);
const data = JSON.parse(await fs.readFile(outputPath, "utf8"));
const assetExists = (logicalPath) =>
  existsSync(path.join(prototypeRoot, "public", ...logicalPath.split("/")));

const rootErrors = validateRootDocument(data, { schema, assetExists });
assert.deepEqual(
  rootErrors,
  [],
  `root schema/semantics failed:\n${rootErrors
    .map((error) => `${error.code} ${error.path} ${error.message}`)
    .join("\n")}`
);

for (const name of [
  "ct-a.json",
  "ct-b.json",
  "ct-d.json",
  "ct-e.json",
  "ct-g.json",
  "ct-h.json"
]) {
  const fixturePath = path.join(
    repositoryRoot,
    "datos_relevantes",
    "demo-pilot",
    "fixtures",
    name
  );
  const fixture = JSON.parse(await fs.readFile(fixturePath, "utf8"));
  const errors = validateFixture(fixture, {
    schema,
    repositoryRoot,
    assetExists
  });
  assert.deepEqual(
    errors,
    [],
    `${name} failed:\n${errors
      .map((error) => `${error.code} ${error.path} ${error.message}`)
      .join("\n")}`
  );
}

const readFixture = async (name) =>
  JSON.parse(
    await fs.readFile(
      path.join(
        repositoryRoot,
        "datos_relevantes",
        "demo-pilot",
        "fixtures",
        name
      ),
      "utf8"
    )
  );

const validatePhase2Fixture = (fixture) => {
  const errors = [
    ...validateSchemaShape(fixture.input.scenario, "scenarioDefaults", {
      rootSchema: schema,
      path: "$.input.scenario"
    }),
    ...validateSchemaShape(fixture.input.geography, "geography", {
      rootSchema: schema,
      path: "$.input.geography"
    })
  ];
  if (fixture.input.scenario_catalogs) {
    errors.push(
      ...validateSchemaShape(fixture.input.scenario_catalogs, "scenarioCatalogs", {
        rootSchema: schema,
        path: "$.input.scenario_catalogs"
      })
    );
  }

  const observedIds = new Set(
    fixture.input.geography.districts.flatMap((district) =>
      district.quadrants.flatMap((quadrant) => quadrant.observed_project_ids)
    )
  );
  const assignedIds = new Set(
    fixture.input.geography.assignments.map(
      (assignment) => assignment.observed_project_id
    )
  );
  for (const exclusion of fixture.input.geography.exclusions) {
    if (!observedIds.has(exclusion.project_id) && !assignedIds.has(exclusion.project_id)) {
      errors.push({
        code: "GEOGRAPHY_EXCLUSION_REFERENCE",
        path: "$.input.geography.exclusions",
        message: `Unknown excluded project ${exclusion.project_id}`
      });
    }
  }
  return errors;
};

const ctC = await readFixture("ct-c.json");
const ctI = await readFixture("ct-i.json");
assert.deepEqual(validatePhase2Fixture(ctC), [], "CT-C 2.1 contract failed");
assert.deepEqual(validatePhase2Fixture(ctI), [], "CT-I 2.1 contract failed");

const ctCConsumers = Object.values(ctC.expected.result.consumer_project_ids);
assert.ok(
  ctCConsumers.every(
    (projectIds) => JSON.stringify(projectIds) === JSON.stringify(["project:ct-c-inside"])
  ),
  "CT-C must expose the same exact comparable ID to all consumers"
);
assert.deepEqual(
  ctC.input.geography.exclusions.map(({ project_id, reason }) => [
    project_id,
    reason
  ]),
  [
    ["observed:ct-c-outside", "outside_scope"],
    ["observed:ct-c-invalid", "invalid_coordinates"],
    ["observed:ct-c-unreconciled", "not_reconciled"]
  ],
  "CT-C exclusion IDs and reasons must remain frozen"
);

const ctIDistrict = ctI.input.geography.districts[0];
const ctIObservedIds = ctIDistrict.quadrants.flatMap(
  (quadrant) => quadrant.observed_project_ids
);
const ctIAuthoritativeIds = ctIDistrict.quadrants.flatMap(
  (quadrant) => quadrant.authoritative_project_ids
);
assert.equal(ctIObservedIds.length, 90, "CT-I observed quadrant sum must be 90");
assert.equal(new Set(ctIObservedIds).size, 90, "CT-I observed IDs must be unique");
assert.equal(
  ctIAuthoritativeIds.length,
  85,
  "CT-I authoritative quadrant sum must be 85"
);
assert.equal(
  new Set(ctIAuthoritativeIds).size,
  85,
  "CT-I authoritative IDs must be unique"
);
assert.deepEqual(
  ctIDistrict.quadrants.map((quadrant) => quadrant.quadrant_id),
  ["NW", "NE", "SW", "SE"],
  "CT-I must define the four analytic quadrants in canonical order"
);
assert.deepEqual(
  ctIDistrict.quadrants.map((quadrant) => quadrant.observed_project_ids.length),
  [23, 23, 22, 22],
  "CT-I quadrant counts must remain exact"
);
assert.equal(ctIDistrict.coordinate_valid_count, 90);
assert.equal(ctIDistrict.polygon_valid_count, 90);
assert.equal(ctIDistrict.authoritative_project_count, 85);
assert.equal(ctIDistrict.unreconciled_project_count, 5);

const invalidQuadrant = structuredClone(ctC);
invalidQuadrant.input.geography.districts[0].quadrants[0].quadrant_id = "CENTER";
assert.ok(
  validatePhase2Fixture(invalidQuadrant).length > 0,
  "invalid quadrant enum must fail"
);
const invalidReference = structuredClone(ctC);
invalidReference.input.geography.exclusions[0].project_id =
  "observed:not-in-the-fixture";
assert.ok(
  validatePhase2Fixture(invalidReference).some(
    (error) => error.code === "GEOGRAPHY_EXCLUSION_REFERENCE"
  ),
  "unknown exclusion reference must fail"
);
const invalidExtraProperty = structuredClone(ctI);
invalidExtraProperty.input.geography.districts[0].official_microzone = true;
assert.ok(
  validatePhase2Fixture(invalidExtraProperty).length > 0,
  "undeclared geography properties must fail"
);

assert.deepEqual(
  data.metadata.input_fingerprints.map((fingerprint) => fingerprint.path),
  [...data.metadata.input_fingerprints]
    .map((fingerprint) => fingerprint.path)
    .sort(),
  "input fingerprints must be ordered"
);

console.log(
  "Schema integration OK: root v2.0, CT-A/B/D/E/G/H and frozen CT-C/CT-I 2.1 contracts validated."
);
