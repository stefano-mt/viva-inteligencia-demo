import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  EARTH_RADIUS_METERS,
  POINT_EPSILON_DEGREES,
  QUADRANT_ORDER,
  buildGeographyModel,
  createDistrictIndex,
  evaluateScenarioScope,
  haversineDistanceMeters,
  isValidCoordinate,
  isWithinRadius,
  median,
  normalizeCoordinates,
  normalizeDistrictName,
  pointInGeometry,
  quadrantForPoint,
  rankHighLoadDistricts,
  simplifyFeatureCollection,
  stableSerializeGeoJson
} from "../../../tools/data/src/data/geography.js";

async function readJson(relativePath) {
  return JSON.parse(
    await fs.readFile(new URL(relativePath, import.meta.url), "utf8")
  );
}

const manifest = await readJson(
  "../../../data/source/geography/source-manifest.json"
);
const boundaries = await readJson(
  "../../../data/source/geography/district-boundaries-source.geojson"
);
const demo = await readJson(
  "../../../data/generated/viva-platform-demo.json"
);
const fixtureC = await readJson(
  "../../../data/fixtures/ct-c.json"
);
const fixtureI = await readJson(
  "../../../data/fixtures/ct-i.json"
);

assert.equal(normalizeDistrictName("  Jesús-MARÍA "), "jesus maria");
const districtIndex = createDistrictIndex(manifest);
assert.equal(districtIndex.resolve("Santiago de Surco").district_id, "150140");
assert.equal(districtIndex.resolve("Santiago De Surco").district_id, "150140");
assert.equal(districtIndex.resolve("Lima").district_id, "150101");
assert.equal(districtIndex.resolve("Cercado de lima").district_id, "150101");

assert.equal(isValidCoordinate(-12.12, -77.03), true);
assert.equal(isValidCoordinate(null, -77.03), false);
assert.equal(isValidCoordinate(-91, -77.03), false);
assert.equal(isValidCoordinate(0, 0), false);
assert.equal(normalizeCoordinates({ latitude: null, longitude: null }), null);
assert.equal(normalizeCoordinates({ latitude: 0, longitude: 0 }), null);

const polygonWithHole = {
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0]
    ],
    [
      [3, 3],
      [7, 3],
      [7, 7],
      [3, 7],
      [3, 3]
    ]
  ]
};
assert.equal(pointInGeometry([1, 1], polygonWithHole), true);
assert.equal(pointInGeometry([0, 5], polygonWithHole), true);
assert.equal(
  pointInGeometry([-POINT_EPSILON_DEGREES / 2, 5], polygonWithHole),
  true,
  "outer-boundary epsilon must be included"
);
assert.equal(
  pointInGeometry([-POINT_EPSILON_DEGREES * 2, 5], polygonWithHole),
  false
);
assert.equal(pointInGeometry([5, 5], polygonWithHole), false);
assert.equal(
  pointInGeometry([3, 5], polygonWithHole),
  false,
  "hole boundary must be excluded"
);
const multiPolygon = {
  type: "MultiPolygon",
  coordinates: [
    polygonWithHole.coordinates,
    [
      [
        [20, 20],
        [22, 20],
        [22, 22],
        [20, 22],
        [20, 20]
      ]
    ]
  ]
};
assert.equal(pointInGeometry([21, 21], multiPolygon), true);
assert.equal(pointInGeometry([15, 15], multiPolygon), false);

const oneDegree = haversineDistanceMeters(1, 1, 2, 1);
assert.ok(
  Math.abs(oneDegree - (EARTH_RADIUS_METERS * Math.PI) / 180) < 1e-6
);
assert.equal(haversineDistanceMeters(-12, -77, -12, -77), 0);
assert.equal(
  isWithinRadius(-12, -77, -12, -77, 0),
  true,
  "zero radius includes the exact center"
);
assert.equal(
  isWithinRadius(2, 1, 1, 1, oneDegree),
  true,
  "distance exactly equal to radius must be included"
);
assert.equal(haversineDistanceMeters(0, 0, -12, -77), null);

assert.equal(median([4, 1, 3, 2]), 2.5);
assert.equal(median([3, 1, 2]), 2);
assert.equal(
  quadrantForPoint(5, -5, 5, -5),
  "NE",
  "a point on both medians belongs to north-east"
);
assert.equal(quadrantForPoint(5, -6, 5, -5), "NW");
assert.equal(quadrantForPoint(5, -4, 5, -5), "NE");
assert.equal(quadrantForPoint(4, -5, 5, -5), "SE");
assert.equal(quadrantForPoint(4, -6, 5, -5), "SW");
assert.equal(quadrantForPoint(4, -4, 5, -5), "SE");

const noisyBoundary = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { osm_id: 2, name: "B" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [0.5, 0],
            [1, 0],
            [1, 1],
            [0.5, 1],
            [0, 1],
            [0, 0]
          ]
        ]
      }
    },
    {
      type: "Feature",
      properties: { osm_id: 1, name: "A" },
      geometry: multiPolygon
    }
  ]
};
const simplified = simplifyFeatureCollection(noisyBoundary, 0.00001);
assert.ok(
  simplified.features.find((feature) => feature.properties.osm_id === 2)
    .geometry.coordinates[0].length <
    noisyBoundary.features[0].geometry.coordinates[0].length
);
assert.equal(
  simplified.features.find((feature) => feature.properties.osm_id === 1)
    .geometry.type,
  "MultiPolygon"
);
assert.equal(
  simplified.features.find((feature) => feature.properties.osm_id === 1)
    .geometry.coordinates[0].length,
  2,
  "holes must remain separate rings"
);
assert.equal(
  stableSerializeGeoJson(noisyBoundary),
  stableSerializeGeoJson({
    ...noisyBoundary,
    features: [...noisyBoundary.features].reverse()
  })
);

const expectedHighLoad = [
  ["150122", 90],
  ["150140", 88],
  ["150113", 67],
  ["150136", 63],
  ["150101", 43],
  ["150120", 42],
  ["150131", 40]
];
const ranked = rankHighLoadDistricts(demo.projects, {
  sourceManifest: manifest
});
assert.deepEqual(
  ranked.map((district) => [
    district.district_id,
    district.observed_project_count
  ]),
  expectedHighLoad
);
assert.deepEqual(
  rankHighLoadDistricts([...demo.projects].reverse(), {
    sourceManifest: manifest
  }),
  ranked,
  "top-seven derivation must be order independent"
);

const geography = buildGeographyModel({
  observedProjects: demo.projects,
  authoritativeProjects: demo.model.projects,
  boundaryFeatureCollection: boundaries,
  sourceManifest: manifest
});
const reversedGeography = buildGeographyModel({
  observedProjects: [...demo.projects].reverse(),
  authoritativeProjects: [...demo.model.projects].reverse(),
  boundaryFeatureCollection: {
    ...boundaries,
    features: [...boundaries.features].reverse()
  },
  sourceManifest: manifest
});
assert.deepEqual(
  reversedGeography,
  geography,
  "geography output must not depend on source row or feature order"
);
assert.deepEqual(
  geography.districts.map((district) => [
    district.district_id,
    district.observed_project_count,
    district.authoritative_project_count,
    district.unreconciled_project_count
  ]),
  [
    ["150122", 90, 85, 5],
    ["150140", 88, 83, 5],
    ["150113", 67, 65, 2],
    ["150136", 63, 62, 1],
    ["150101", 43, 38, 5],
    ["150120", 42, 40, 2],
    ["150131", 40, 33, 7]
  ]
);
assert.equal(
  geography.districts.reduce(
    (total, district) => total + district.observed_project_count,
    0
  ),
  433
);
assert.equal(
  geography.districts.every(
    (district) => district.coordinate_valid_count === district.observed_project_count
  ),
  true,
  "all 433 high-load points must retain valid source coordinates"
);
assert.deepEqual(
  geography.districts.map((district) => [
    district.district_id,
    district.polygon_valid_count
  ]),
  [
    ["150122", 90],
    ["150140", 87],
    ["150113", 67],
    ["150136", 63],
    ["150101", 43],
    ["150120", 35],
    ["150131", 37]
  ],
  "OSM polygon mismatches outside Miraflores must remain visible"
);
assert.equal(
  geography.exclusions.filter(
    (exclusion) => exclusion.reason === "outside_district_polygon"
  ).length,
  11
);

const miraflores = geography.districts.find(
  (district) => district.district_id === "150122"
);
const expectedI = fixtureI.expected.result;
assert.equal(miraflores.observed_project_count, expectedI.observed_project_count);
assert.equal(
  miraflores.authoritative_project_count,
  expectedI.authoritative_project_count
);
assert.equal(
  miraflores.unreconciled_project_count,
  expectedI.unreconciled_project_count
);
assert.equal(miraflores.coordinate_valid_count, 90);
assert.equal(miraflores.polygon_valid_count, 90);
assert.equal(miraflores.median_latitude, expectedI.median_latitude);
assert.equal(miraflores.median_longitude, expectedI.median_longitude);
assert.deepEqual(
  miraflores.quadrants.map((quadrant) => quadrant.quadrant_id),
  QUADRANT_ORDER
);
assert.deepEqual(
  Object.fromEntries(
    miraflores.quadrants.map((quadrant) => [
      quadrant.quadrant_id,
      quadrant.observed_project_ids.length
    ])
  ),
  expectedI.quadrant_observed_counts
);
assert.deepEqual(
  miraflores.quadrants.map(
    (quadrant) => quadrant.authoritative_project_ids.length
  ),
  [37, 4, 5, 39]
);
assert.equal(
  miraflores.quadrants.reduce(
    (total, quadrant) => total + quadrant.authoritative_project_ids.length,
    0
  ),
  85
);
const mirafloresObservedIds = miraflores.quadrants.flatMap(
  (quadrant) => quadrant.observed_project_ids
);
assert.equal(mirafloresObservedIds.length, 90);
assert.equal(new Set(mirafloresObservedIds).size, 90);
assert.equal(
  geography.exclusions.filter(
    (exclusion) =>
      exclusion.reason === "not_reconciled" &&
      geography.assignments.some(
        (assignment) =>
          assignment.district_id === "150122" &&
          assignment.observed_project_id === exclusion.project_id
      )
  ).length,
  5
);

const resultC = evaluateScenarioScope({
  assignments: fixtureC.input.geography.assignments,
  scenario: fixtureC.input.scenario
});
const expectedC = fixtureC.expected.result;
const { exclusions: resultCExclusions, ...resultCComparable } = resultC;
assert.deepEqual(resultCComparable, expectedC);
assert.deepEqual(
  resultCExclusions,
  fixtureC.expected.assertions.find(
    (assertion) => assertion.operation === "exclusions_equal"
  ).expected
);
assert.deepEqual(
  evaluateScenarioScope({
    assignments: [...fixtureC.input.geography.assignments].reverse(),
    scenario: fixtureC.input.scenario
  }),
  resultC,
  "CT-C must be independent of assignment order"
);
for (const consumerIds of Object.values(resultC.consumer_project_ids)) {
  assert.deepEqual(consumerIds, ["project:ct-c-inside"]);
}

console.log(
  `Geography engine OK: CT-C parity; CT-I ${miraflores.polygon_valid_count}/90 inside, ${miraflores.authoritative_project_count} authoritative + ${miraflores.unreconciled_project_count} gaps, quadrants ${miraflores.quadrants.map((quadrant) => quadrant.observed_project_ids.length).join("/")}.`
);
