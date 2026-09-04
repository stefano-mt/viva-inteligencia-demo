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
} from "../../../tools/data/src/data/validate.js";
import { parseCsv } from "../../../tools/data/src/data/agencies.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const prototypeRoot = path.resolve(testDirectory, "..");
const repositoryRoot = path.resolve(prototypeRoot, "..", "..");
const schema = loadContractSchema(
  path.resolve(testDirectory, "../../..", "packages", "contracts", "schemas", "demo-v2.schema.json")
);
const outputPath = path.join(
  repositoryRoot,
  "data",
  "generated",
  "viva-platform-demo.json"
);
const data = JSON.parse(await fs.readFile(outputPath, "utf8"));
const minimumDatasetRows = parseCsv(
  await fs.readFile(
    path.join(repositoryRoot, "data/source", "viva_minimum_dataset_latest.csv"),
    "utf8"
  )
);
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

const inspectorCaseShape = {
  case_id: "case:ct-d-controlled",
  route_slug: "ct-d-controlled",
  project_id: "project:ct-d-controlled",
  typology_id: "typology:ct-d-controlled",
  provenance_classification: "controlled",
  source_ids: ["source:ct-d-authorized"],
  observation_ids: ["observation:ct-d-countertop"],
  fact_ids: ["fact:ct-d-countertop-material"],
  document_ids: ["document:ct-d-authorized"],
  evidence_ids: ["evidence:ct-d-countertop-fragment"],
  issue_ids: [],
  required_fact_ids: ["fact:ct-d-countertop-material"],
  primary_evidence_id: "evidence:ct-d-countertop-fragment",
  expected_quality_status: "certified",
  expected_benchmark_eligible: true,
  public_visual_asset_count: 1
};
assert.deepEqual(
  validateSchemaShape(inspectorCaseShape, "inspectorCase", {
    rootSchema: schema,
    path: "$.inspector.cases[0]"
  }),
  [],
  "InspectorCase 2.2 shape must pass"
);
assert.ok(
  validateSchemaShape(
    { ...inspectorCaseShape, required_fact_ids: [] },
    "inspectorCase",
    {
      rootSchema: schema,
      path: "$.inspector.cases[0]"
    }
  ).some((error) => error.code === "SCHEMA_MIN_ITEMS"),
  "InspectorCase required_fact_ids must be non-empty"
);
assert.ok(
  validateSchemaShape(
    { ...inspectorCaseShape, duplicated_fact: true },
    "inspectorCase",
    {
      rootSchema: schema,
      path: "$.inspector.cases[0]"
    }
  ).some((error) => error.code === "SCHEMA_ADDITIONAL_PROPERTY"),
  "InspectorCase must remain closed"
);

const inspectorAssetShape = {
  asset_id: "asset:ct-d-countertop",
  document_id: "document:ct-d-authorized",
  logical_path: "assets/evidence/ct-d-countertop.webp",
  sha256:
    "76997883b31990c766b433f21da0a699ffe502d40e15072b24bbacec11bfc850",
  media_type: "image/webp",
  bytes: 1024,
  width: 640,
  height: 480,
  provenance: "controlled_original",
  publish_permission: "authorized",
  license_note: "Activo controlado y autorizado para la demo."
};
assert.deepEqual(
  validateSchemaShape(inspectorAssetShape, "inspectorAsset", {
    rootSchema: schema,
    path: "$.inspector.assets[0]"
  }),
  [],
  "InspectorAsset 2.2 shape must pass"
);
assert.ok(
  validateSchemaShape(
    { ...inspectorAssetShape, provenance: "observed_original" },
    "inspectorAsset",
    {
      rootSchema: schema,
      path: "$.inspector.assets[0]"
    }
  ).some((error) => error.code === "SCHEMA_CONST"),
  "controlled InspectorAsset must never claim original observed provenance"
);
assert.ok(
  validateSchemaShape(
    {
      ...inspectorAssetShape,
      logical_path: "assets/evidence/../escape.webp"
    },
    "inspectorAsset",
    {
      rootSchema: schema,
      path: "$.inspector.assets[0]"
    }
  ).some((error) => error.code === "SCHEMA_PATTERN"),
  "InspectorAsset logical_path must reject dot and traversal segments"
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
    "data",
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
        "data",
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
  for (const district of fixture.input.geography.districts) {
    const assignments = fixture.input.geography.assignments.filter(
      (assignment) => assignment.district_id === district.district_id
    );
    const assignmentIds = assignments.map(
      (assignment) => assignment.observed_project_id
    );
    const polygonAssignments = assignments.filter(
      (assignment) => assignment.polygon_valid
    );
    const quadrantObservedIds = district.quadrants.flatMap(
      (quadrant) => quadrant.observed_project_ids
    );
    const expectedQuadrantById = new Map(
      district.quadrants.flatMap((quadrant) =>
        quadrant.observed_project_ids.map((projectId) => [
          projectId,
          quadrant.quadrant_id
        ])
      )
    );
    if (
      assignments.length !== district.observed_project_count ||
      new Set(assignmentIds).size !== assignments.length
    ) {
      errors.push({
        code: "GEOGRAPHY_ASSIGNMENTS_INCOMPLETE",
        path: "$.input.geography.assignments",
        message: `Expected ${district.observed_project_count} unique assignments for ${district.district_id}`
      });
    }
    if (
      assignments.filter((assignment) => assignment.coordinate_valid).length !==
      district.coordinate_valid_count
    ) {
      errors.push({
        code: "GEOGRAPHY_COORDINATE_COUNT",
        path: "$.input.geography.assignments",
        message: "coordinate_valid_count does not match assignments"
      });
    }
    if (
      polygonAssignments.length !== district.polygon_valid_count ||
      new Set(quadrantObservedIds).size !== district.polygon_valid_count
    ) {
      errors.push({
        code: "GEOGRAPHY_POLYGON_COUNT",
        path: "$.input.geography.districts",
        message: "polygon_valid_count does not match unique quadrant assignments"
      });
    }
    for (const assignment of polygonAssignments) {
      if (
        expectedQuadrantById.get(assignment.observed_project_id) !==
        assignment.quadrant_id
      ) {
        errors.push({
          code: "GEOGRAPHY_QUADRANT_REFERENCE",
          path: "$.input.geography.assignments",
          message: `Quadrant mismatch for ${assignment.observed_project_id}`
        });
      }
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
  [40, 5, 5, 40],
  "CT-I quadrant counts must remain exact"
);
assert.notDeepEqual(
  ctIDistrict.quadrants.map((quadrant) => quadrant.observed_project_ids.length),
  [23, 23, 22, 22],
  "CT-I must never regress to the synthetic placeholder partition"
);
assert.equal(ctIDistrict.median_latitude, -12.12101775);
assert.equal(ctIDistrict.median_longitude, -77.02983135);
assert.equal(
  ctI.input.geography.assignments.length,
  90,
  "CT-I must carry one assignment per observed project"
);
assert.ok(
  ctI.input.geography.assignments.every(
    (assignment) =>
      assignment.coordinate_valid === true &&
      assignment.polygon_valid === true
  ),
  "all 90 CT-I snapshot points must be coordinate- and polygon-valid"
);
assert.equal(ctIDistrict.coordinate_valid_count, 90);
assert.equal(ctIDistrict.polygon_valid_count, 90);
assert.equal(ctIDistrict.authoritative_project_count, 85);
assert.equal(ctIDistrict.unreconciled_project_count, 5);

const publicMiraflores = data.projects
  .filter((project) => project.district === "Miraflores")
  .sort((left, right) => Number(left.id) - Number(right.id));
const csvMiraflores = minimumDatasetRows
  .filter((project) => project.district === "Miraflores")
  .sort((left, right) => Number(left.project_id) - Number(right.project_id));
assert.equal(csvMiraflores.length, 90, "source CSV must retain 90 Miraflores rows");
assert.deepEqual(
  publicMiraflores.map(({ id, latitude, longitude }) => ({
    id,
    latitude,
    longitude
  })),
  csvMiraflores.map((project) => ({
    id: project.project_id,
    latitude: Number(project.latitude),
    longitude: Number(project.longitude)
  })),
  "public Miraflores IDs and coordinates must match the source CSV exactly"
);
const authoritativeProjectIds = new Set(
  data.model.projects.map((project) => project.project_id)
);
const expectedCtIAssignments = publicMiraflores.map((project) => {
  const authoritativeProjectId = `project:nexo-${project.id}`;
  const quadrantId =
    `${project.latitude >= -12.12101775 ? "N" : "S"}` +
    `${project.longitude >= -77.02983135 ? "E" : "W"}`;
  return {
    observed_project_id: `observed:nexo-${project.id}`,
    authoritative_project_id: authoritativeProjectIds.has(authoritativeProjectId)
      ? authoritativeProjectId
      : null,
    district_id: "150122",
    latitude: project.latitude,
    longitude: project.longitude,
    coordinate_valid: true,
    polygon_valid: true,
    quadrant_id: quadrantId,
    reconciliation_status: authoritativeProjectIds.has(authoritativeProjectId)
      ? "matched"
      : "unreconciled"
  };
});
assert.deepEqual(
  ctI.input.geography.assignments,
  expectedCtIAssignments,
  "CT-I assignments must match the real public Miraflores rows exactly"
);

const radians = (degrees) => (degrees * Math.PI) / 180;
const haversineDistance = ([latitudeA, longitudeA], [latitudeB, longitudeB], radius) => {
  const latitudeDelta = radians(latitudeB - latitudeA);
  const longitudeDelta = radians(longitudeB - longitudeA);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(latitudeA)) *
      Math.cos(radians(latitudeB)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(haversine));
};
const haversineVector = ctC.input.controlled_vectors.haversine;
const exactRadiusDistance = haversineDistance(
  haversineVector.from,
  haversineVector.to,
  haversineVector.earth_radius_meters
);
assert.ok(Math.abs(exactRadiusDistance - 500) < 1e-9);
assert.ok(exactRadiusDistance <= haversineVector.radius_meters);

const pointOnSegment = ([x, y], [x1, y1], [x2, y2], epsilon) => {
  const cross = (x - x1) * (y2 - y1) - (y - y1) * (x2 - x1);
  return (
    Math.abs(cross) <= epsilon &&
    x >= Math.min(x1, x2) - epsilon &&
    x <= Math.max(x1, x2) + epsilon &&
    y >= Math.min(y1, y2) - epsilon &&
    y <= Math.max(y1, y2) + epsilon
  );
};
const pointInRing = (point, ring, epsilon) => {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    if (pointOnSegment(point, ring[previous], ring[index], epsilon)) return "edge";
    const [x, y] = point;
    const [xi, yi] = ring[index];
    const [xj, yj] = ring[previous];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
};
const polygonVector = ctC.input.controlled_vectors.point_in_polygon;
const pointInPolygon = (point) => {
  const outer = pointInRing(
    point,
    polygonVector.outer_ring,
    polygonVector.epsilon_degrees
  );
  if (!outer) return false;
  return !polygonVector.holes.some((hole) => {
    const result = pointInRing(point, hole, polygonVector.epsilon_degrees);
    return result === true || result === "edge";
  });
};
assert.deepEqual(
  polygonVector.cases.map((testCase) => pointInPolygon(testCase.point)),
  [true, false],
  "outer edges are inside and hole edges are outside"
);

const scoreVectors = ctC.input.controlled_vectors.comparability;
for (const vector of [scoreVectors.full_coverage, scoreVectors.partial_coverage]) {
  const rawPoints = Object.values(vector.expected_components).reduce(
    (sum, value) => sum + value,
    0
  );
  assert.equal(rawPoints, vector.expected_raw_points);
  assert.equal(
    Math.round((rawPoints / vector.expected_available_weight) * 1000) / 10,
    vector.expected_score
  );
  assert.equal(vector.expected_available_weight, vector.expected_coverage_pct);
}
assert.equal(
  scoreVectors.evidence_coverage.available_weights.reduce(
    (sum, value) => sum + value,
    0
  ) / scoreVectors.evidence_coverage.available_weights.length,
  60
);

const quantileR7 = (values, probability) => {
  const ordered = [...values].sort((left, right) => left - right);
  const index = (ordered.length - 1) * probability;
  const lower = Math.floor(index);
  const fraction = index - lower;
  return ordered[lower] + fraction * (ordered[Math.ceil(index)] - ordered[lower]);
};
for (const vector of Object.values(ctC.input.controlled_vectors.quantiles_r7)) {
  assert.equal(quantileR7(vector.values, 0.25), vector.expected_p25);
  assert.equal(quantileR7(vector.values, 0.5), vector.expected_median);
  assert.equal(quantileR7(vector.values, 0.75), vector.expected_p75);
}

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
const incompleteAssignments = structuredClone(ctI);
incompleteAssignments.input.geography.assignments.pop();
assert.ok(
  validatePhase2Fixture(incompleteAssignments).some(
    (error) => error.code === "GEOGRAPHY_ASSIGNMENTS_INCOMPLETE"
  ),
  "CT-I with only 89 assignments must fail"
);
const placeholderQuadrants = structuredClone(ctI);
placeholderQuadrants.input.geography.districts[0].quadrants.forEach(
  (quadrant, index) => {
    quadrant.observed_project_ids = ctIObservedIds.slice(
      [0, 23, 46, 68][index],
      [23, 46, 68, 90][index]
    );
  }
);
assert.ok(
  validatePhase2Fixture(placeholderQuadrants).some(
    (error) => error.code === "GEOGRAPHY_QUADRANT_REFERENCE"
  ),
  "synthetic 23/23/22/22 quadrant redistribution must fail"
);

assert.deepEqual(
  data.metadata.input_fingerprints.map((fingerprint) => fingerprint.path),
  [...data.metadata.input_fingerprints]
    .map((fingerprint) => fingerprint.path)
    .sort(),
  "input fingerprints must be ordered"
);

const benchmarkMethodologyShape = {
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
};
assert.deepEqual(
  validateSchemaShape(benchmarkMethodologyShape, "benchmarkMethodology", {
    rootSchema: schema,
    path: "$.benchmark.methodology"
  }),
  [],
  "Benchmark methodology must freeze approved thresholds and semantics"
);
assert.ok(
  validateSchemaShape(
    { ...benchmarkMethodologyShape, quantile_method: "nearest-rank" },
    "benchmarkMethodology",
    { rootSchema: schema, path: "$.benchmark.methodology" }
  ).some((error) => error.code === "SCHEMA_CONST"),
  "Benchmark quantiles must remain R7"
);

const benchmarkFactIndexShape = {
  project_id: "project:ct-a-controlled",
  observation_id: "observation:ct-a-inputs",
  total_area_fact_id: "fact:ct-a-total-area",
  published_price_fact_id: "fact:ct-a-scenario-price",
  price_per_m2_fact_id: "fact:ct-a-price-per-total-m2",
  pairing_status: "project_minima_pair_unresolved",
  pairing_basis: "project_minima",
  pairing_evidence_ids: [],
  reported_unit_count_fact_id: null,
  parking_count_fact_id: null,
  attribute_fact_ids: []
};
assert.deepEqual(
  validateSchemaShape(benchmarkFactIndexShape, "benchmarkFactIndex", {
    rootSchema: schema,
    path: "$.benchmark.fact_index[0]"
  }),
  [],
  "unresolved project minima must have an explicit non-eligible pairing state"
);
assert.ok(
  validateSchemaShape(
    {
      ...benchmarkFactIndexShape,
      pairing_status: "source_paired",
      pairing_basis: "project_minima"
    },
    "benchmarkFactIndex",
    { rootSchema: schema, path: "$.benchmark.fact_index[0]" }
  ).length > 0,
  "source_paired must reject project-minima basis without pairing evidence"
);

console.log(
  "Schema integration OK: root v2.0, CT-A/B/D/E/G/H, frozen CT-C/CT-I 2.1 and benchmark 2.3 shapes validated."
);
