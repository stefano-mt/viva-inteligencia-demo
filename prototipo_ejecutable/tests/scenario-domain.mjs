import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  EARTH_RADIUS_METERS,
  SCENARIO_QUERY_ORDER,
  buildTerritorialContext,
  canonicalizeScenarioUrl,
  createScenarioEnvironment,
  createScenarioState,
  haversineDistanceMeters,
  normalizeTypologySlug,
  parseScenarioUrl,
  reduceScenarioState,
  serializeScenarioQuery,
  validateScenario
} from "../public/js/scenario.js";

async function readJson(relativePath) {
  return JSON.parse(
    await fs.readFile(new URL(relativePath, import.meta.url), "utf8")
  );
}

const data = await readJson("../public/demo-data/viva-platform-demo.json");
const ctC = await readJson(
  "../../datos_relevantes/demo-pilot/fixtures/ct-c.json"
);
const ctI = await readJson(
  "../../datos_relevantes/demo-pilot/fixtures/ct-i.json"
);
const environment = createScenarioEnvironment(data);
const defaults = environment.defaults;

assert.equal(data.metadata.contract_version, "2.1.0");
assert.deepEqual(createScenarioState(environment), {
  scenario: defaults,
  scenario_status: "valid",
  corrections: []
});
assert.equal(normalizeTypologySlug("  DEPARTAMENTO "), "departamento");
assert.deepEqual(SCENARIO_QUERY_ORDER, [
  "sv",
  "district",
  "scope",
  "quadrant",
  "lat",
  "lon",
  "radius",
  "typology",
  "bedrooms",
  "area",
  "price",
  "delivery",
  "viz"
]);

const empty = parseScenarioUrl("/#dashboard", environment);
assert.deepEqual(empty.scenario, defaults);
assert.equal(empty.scenario_status, "valid");
assert.equal(empty.canonical_search, "");
assert.equal(serializeScenarioQuery(defaults, environment), "");

const fullRadius = validateScenario(
  {
    ...defaults,
    district_id: "150140",
    scope_mode: "radius",
    center_latitude: -12.12345649,
    center_longitude: -77.01234549,
    radius_meters: 1000,
    typology: "Departamento",
    bedrooms: 2,
    target_area_m2: 80.5,
    target_price_pen: 650000,
    delivery_year: 2027,
    visualization: "positioning"
  },
  environment
);
assert.equal(fullRadius.scenario_status, "valid");
const fullRadiusQuery = serializeScenarioQuery(
  fullRadius.scenario,
  environment
);
assert.equal(
  fullRadiusQuery,
  "sv=1&district=150140&scope=radius&lat=-12.123456&lon=-77.012345&radius=1000&typology=departamento&bedrooms=2&area=80.5&price=650000&delivery=2027&viz=positioning"
);
const radiusRoundTrip = parseScenarioUrl(`/?${fullRadiusQuery}`, environment);
assert.equal(radiusRoundTrip.scenario_status, "valid");
assert.deepEqual(radiusRoundTrip.scenario, {
  ...fullRadius.scenario,
  center_latitude: -12.123456,
  center_longitude: -77.012345,
  source: "url"
});
assert.equal(radiusRoundTrip.canonical_search, `?${fullRadiusQuery}`);

const quadrant = parseScenarioUrl(
  "/?sv=1&scope=quadrant&quadrant=NW&typology=casa#market",
  environment
);
assert.equal(quadrant.scenario.scope_mode, "quadrant");
assert.equal(quadrant.scenario.quadrant_id, "NW");
assert.equal(quadrant.scenario.typology, "casa");
assert.equal(quadrant.scenario.source, "url");
assert.equal(
  canonicalizeScenarioUrl(
    "/?typology=casa&quadrant=NW&scope=quadrant&sv=1#market",
    environment
  ).canonical_url,
  "/?sv=1&scope=quadrant&quadrant=NW&typology=casa#market"
);

for (const query of [
  "?sv=2&district=150122&typology=casa",
  "?district=150122&typology=casa",
  "?sv=1&district=999999&typology=casa"
]) {
  const result = parseScenarioUrl(query, environment);
  assert.equal(result.scenario_status, "invalid");
  assert.deepEqual(result.scenario, { ...defaults, source: "url" });
  assert.equal(result.canonical_search, "");
}

const invalidScope = parseScenarioUrl(
  "?sv=1&scope=other&typology=casa&bedrooms=2",
  environment
);
assert.equal(invalidScope.scenario_status, "invalid");
assert.equal(invalidScope.scenario.scope_mode, "district");
assert.equal(invalidScope.scenario.typology, "casa");
assert.equal(invalidScope.scenario.bedrooms, 2);

for (const query of [
  "?sv=1&scope=quadrant&quadrant=XX&typology=casa",
  "?sv=1&scope=radius&lat=x&lon=-77&radius=500&typology=casa",
  "?sv=1&scope=radius&lat=-12&lon=-77&radius=123&typology=casa",
  "?sv=1&scope=radius&lat=0&lon=0&radius=500&typology=casa"
]) {
  const result = parseScenarioUrl(query, environment);
  assert.equal(result.scenario_status, "invalid");
  assert.equal(result.scenario.scope_mode, "district");
  assert.equal(result.scenario.typology, "casa");
  assert.equal(result.scenario.quadrant_id, null);
  assert.equal(result.scenario.radius_meters, null);
}

const fieldFallback = parseScenarioUrl(
  "?sv=1&typology=hotel&bedrooms=8&area=-1&price=NaN&delivery=2030&viz=table",
  environment
);
assert.equal(fieldFallback.scenario_status, "invalid");
assert.equal(fieldFallback.scenario.scope_mode, "district");
for (const field of [
  "typology",
  "bedrooms",
  "target_area_m2",
  "target_price_pen",
  "delivery_year",
  "visualization"
]) {
  assert.equal(fieldFallback.scenario[field], defaults[field]);
}

const unknownAndDuplicate = parseScenarioUrl(
  "?sv=1&typology=casa&typology=lote&utm_source=test",
  environment
);
assert.equal(unknownAndDuplicate.scenario_status, "invalid");
assert.equal(unknownAndDuplicate.scenario.typology, "casa");
assert.deepEqual(
  unknownAndDuplicate.corrections.map((issue) => issue.code),
  ["DUPLICATE_PARAMETER", "UNKNOWN_PARAMETER"]
);

let reducerState = createScenarioState(environment);
reducerState = reduceScenarioState(
  reducerState,
  {
    type: "SET_TERRITORY",
    patch: {
      scope_mode: "quadrant",
      quadrant_id: "NW"
    }
  },
  environment
);
assert.equal(reducerState.scenario.scope_mode, "quadrant");
assert.equal(reducerState.scenario.source, "interaction");
const beforeRejectedProduct = structuredClone(reducerState.scenario);
reducerState = reduceScenarioState(
  reducerState,
  {
    type: "APPLY_PRODUCT_FILTERS",
    patch: { typology: "casa", target_area_m2: -1 }
  },
  environment
);
assert.deepEqual(reducerState.scenario, beforeRejectedProduct);
assert.equal(reducerState.scenario_status, "invalid");
reducerState = reduceScenarioState(
  reducerState,
  { type: "DISMISS_CORRECTIONS" },
  environment
);
assert.equal(reducerState.scenario_status, "valid");
reducerState = reduceScenarioState(
  reducerState,
  {
    type: "APPLY_PRODUCT_FILTERS",
    patch: { typology: "casa", target_area_m2: 75 }
  },
  environment
);
assert.equal(reducerState.scenario.typology, "casa");
assert.equal(reducerState.scenario.target_area_m2, 75);
assert.equal(reducerState.scenario.source, "interaction");
const beforeNullProduct = structuredClone(reducerState.scenario);
reducerState = reduceScenarioState(
  reducerState,
  {
    type: "APPLY_PRODUCT_FILTERS",
    patch: { typology: null }
  },
  environment
);
assert.equal(reducerState.scenario_status, "invalid");
assert.deepEqual(reducerState.scenario, beforeNullProduct);
reducerState = reduceScenarioState(
  reducerState,
  { type: "RESET" },
  environment
);
assert.deepEqual(reducerState, createScenarioState(environment));

const oneDegree = haversineDistanceMeters(1, 1, 2, 1);
assert.ok(
  Math.abs(oneDegree - (EARTH_RADIUS_METERS * Math.PI) / 180) < 1e-6
);
const controlledHaversine = ctC.input.controlled_vectors.haversine;
const controlledDistance = haversineDistanceMeters(
  controlledHaversine.from[0],
  controlledHaversine.from[1],
  controlledHaversine.to[0],
  controlledHaversine.to[1]
);
assert.ok(
  Math.abs(
    controlledDistance - controlledHaversine.expected_distance_meters
  ) < 1e-9
);
assert.equal(
  controlledDistance <= controlledHaversine.radius_meters,
  controlledHaversine.expected_inside_radius
);

const stateC = createStateForFixture(ctC.input.scenario);
function createStateForFixture(scenario) {
  return {
    scenario: structuredClone(scenario),
    scenario_status: "valid",
    corrections: []
  };
}
const territorialC = buildTerritorialContext({
  scenarioState: stateC,
  geography: ctC.input.geography,
  boundaryArtifactStatus: "valid"
});
assert.deepEqual(
  territorialC.observed_scope_project_ids,
  ctC.expected.result.observed_scope_project_ids
);
assert.deepEqual(
  territorialC.geography_valid_project_ids,
  ctC.expected.result.geography_valid_project_ids
);
assert.equal(territorialC.geography_status, "partial");
assert.deepEqual(
  territorialC.exclusions.map((item) => [item.project_id, item.reason]),
  [
    ["observed:ct-c-outside", "outside_scope"],
    ["observed:ct-c-invalid", "invalid_coordinates"]
  ]
);
assert.equal(
  Object.keys(territorialC.distance_meters_by_observed_project_id).length,
  3
);
const insideDistance =
  territorialC.distance_meters_by_observed_project_id[
    "observed:ct-c-inside"
  ];
assert.equal(
  insideDistance,
  haversineDistanceMeters(-12.1205, -77.0295, -12.121, -77.03)
);
assert.ok(insideDistance < 500);
assert.ok(
  territorialC.distance_meters_by_observed_project_id[
    "observed:ct-c-outside"
  ] > 500
);
assert.equal(
  Object.hasOwn(
    territorialC.distance_meters_by_observed_project_id,
    "observed:ct-c-invalid"
  ),
  false
);

const radialPrecedenceGeography = structuredClone(ctC.input.geography);
const radialOutside = radialPrecedenceGeography.assignments.find(
  (assignment) =>
    assignment.observed_project_id === "observed:ct-c-outside"
);
radialOutside.polygon_valid = false;
const radialOutsideContext = buildTerritorialContext({
  scenarioState: stateC,
  geography: radialPrecedenceGeography,
  boundaryArtifactStatus: "valid"
});
assert.deepEqual(
  radialOutsideContext.exclusions.find(
    (item) => item.project_id === "observed:ct-c-outside"
  ),
  {
    project_id: "observed:ct-c-outside",
    stage: "scope",
    reason: "outside_scope",
    visible_as_coverage: false
  }
);

const radialInside = radialPrecedenceGeography.assignments.find(
  (assignment) =>
    assignment.observed_project_id === "observed:ct-c-inside"
);
radialInside.polygon_valid = false;
const radialInsideContext = buildTerritorialContext({
  scenarioState: stateC,
  geography: radialPrecedenceGeography,
  boundaryArtifactStatus: "valid"
});
assert.deepEqual(
  radialInsideContext.exclusions.find(
    (item) => item.project_id === "observed:ct-c-inside"
  ),
  {
    project_id: "observed:ct-c-inside",
    stage: "geography",
    reason: "outside_district_polygon",
    visible_as_coverage: true
  }
);

const districtI = buildTerritorialContext({
  scenarioState: createScenarioState(environment),
  geography: data.geography,
  boundaryArtifactStatus: "valid"
});
assert.equal(districtI.geography_status, "ready");
assert.equal(districtI.observed_scope_project_ids.length, 90);
assert.equal(districtI.geography_valid_project_ids.length, 90);
assert.deepEqual(districtI.distance_meters_by_observed_project_id, {});

const northwestIState = validateScenario(
  {
    ...defaults,
    scope_mode: "quadrant",
    quadrant_id: "NW"
  },
  environment
);
const northwestI = buildTerritorialContext({
  scenarioState: northwestIState,
  geography: data.geography
});
assert.equal(northwestI.geography_status, "ready");
assert.equal(northwestI.observed_scope_project_ids.length, 40);
assert.equal(northwestI.geography_valid_project_ids.length, 40);
assert.deepEqual(
  northwestI.observed_scope_project_ids,
  ctI.input.geography.districts[0].quadrants[0].observed_project_ids
);

for (const artifactStatus of ["missing", "hash_mismatch", "parse_error"]) {
  const unavailable = buildTerritorialContext({
    scenarioState: createScenarioState(environment),
    geography: data.geography,
    boundaryArtifactStatus: artifactStatus
  });
  assert.equal(unavailable.geography_status, "unavailable");
  assert.equal(unavailable.observed_scope_project_ids.length, 90);
  assert.deepEqual(unavailable.geography_valid_project_ids, []);
}

const partialGeography = structuredClone(data.geography);
const mirafloresAssignments = partialGeography.assignments.filter(
  (assignment) => assignment.district_id === "150122"
);
mirafloresAssignments[0].polygon_valid = false;
const partial = buildTerritorialContext({
  scenarioState: createScenarioState(environment),
  geography: partialGeography
});
assert.equal(partial.observed_scope_project_ids.length, 90);
assert.equal(partial.geography_valid_project_ids.length, 89);
assert.equal(partial.geography_status, "partial");

const emptyRadiusState = validateScenario(
  {
    ...defaults,
    scope_mode: "radius",
    center_latitude: -12.14,
    center_longitude: -77.056,
    radius_meters: 500
  },
  environment
);
const emptyRadius = buildTerritorialContext({
  scenarioState: emptyRadiusState,
  geography: data.geography
});
assert.equal(emptyRadius.scope.observed_project_count, 0);
assert.equal(emptyRadius.scope.geography_valid_project_count, 0);
assert.equal(emptyRadius.geography_status, "ready");

const sourceText = await fs.readFile(
  new URL("../public/js/scenario.js", import.meta.url),
  "utf8"
);
assert.doesNotMatch(
  sourceText,
  /\b(?:window|history|localStorage|sessionStorage|fetch|XMLHttpRequest)\b/
);
for (const forbidden of [
  "comparable_project_ids",
  "price_reference_project_ids",
  "comparability_status",
  "price_status",
  "evidence_coverage_pct",
  "score"
]) {
  assert.equal(Object.hasOwn(districtI, forbidden), false);
}

console.log(
  `Scenario domain OK: URL/reducer pure, CT-C ${territorialC.geography_valid_project_ids.length}/${territorialC.observed_scope_project_ids.length}, CT-I ${districtI.geography_valid_project_ids.length}/${districtI.observed_scope_project_ids.length}, radial distance retained at full precision.`
);
