import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  COMPARABILITY_WEIGHTS,
  buildComparabilityContext,
  buildPriceDiagnosis,
  calculateComparabilityScore,
  compareComparableScores,
  evaluatePriceEligibility,
  quantileR7,
  roundHalfAwayFromZero,
} from "../public/js/comparability.js";

const cutoffAt = "2026-01-16T00:00:00.000Z";
const ctC = JSON.parse(
  await readFile(
    new URL("../../../data/source/demo-pilot/fixtures/ct-c.json", import.meta.url),
    "utf8",
  ),
);
const demoData = JSON.parse(
  await readFile(
    new URL("../public/demo-data/viva-platform-demo.json", import.meta.url),
    "utf8",
  ),
);

function project(overrides = {}) {
  return {
    id: "base",
    total_area: 72,
    bedrooms_min: 2,
    bedrooms_max: 3,
    typology: "Departamento",
    delivery_year: 2026,
    list_price_avg: 518400,
    price_per_m2_list: 7200,
    currency: "PEN",
    source_url: "https://example.test/project/base",
    captured_at: "2026-01-15T00:00:00.000Z",
    missing_required_fields: [],
    ...overrides,
  };
}

function scenario(overrides = {}) {
  return {
    scope_mode: "radius",
    radius_meters: 500,
    target_area_m2: 80,
    bedrooms: 2,
    typology: "departamento",
    delivery_year: 2027,
    target_price_per_m2: 8000,
    ...overrides,
  };
}

function territorial(ids, distances = {}, mapping = {}) {
  return {
    geography_valid_project_ids: ids,
    distance_meters_by_observed_project_id: distances,
    authoritative_project_id_by_observed_project_id: mapping,
  };
}

function assertFiniteTree(value, path = "result") {
  if (typeof value === "number") {
    assert.ok(Number.isFinite(value), `${path} must not contain NaN or Infinity`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertFiniteTree(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      assertFiniteTree(item, `${path}.${key}`);
    }
  }
}

assert.deepEqual(COMPARABILITY_WEIGHTS, {
  geography: 30,
  area: 20,
  bedrooms: 15,
  typology: 10,
  delivery: 10,
  price_per_m2: 15,
});
assert.equal(roundHalfAwayFromZero(1.25, 1), 1.3);
assert.equal(roundHalfAwayFromZero(-1.25, 1), -1.3);
assert.equal(roundHalfAwayFromZero(Number.NaN), null);

const full = calculateComparabilityScore({
  project: project(),
  scenario: scenario(),
  distanceMeters: 125,
});
assert.deepEqual(
  Object.fromEntries(
    Object.entries(full.components).map(([key, component]) => [key, component.earned_points]),
  ),
  {
    geography: 22.5,
    area: 18,
    bedrooms: 15,
    typology: 10,
    delivery: 5,
    price_per_m2: 13.5,
  },
);
assert.equal(full.raw_points, 84);
assert.equal(full.available_weight, 100);
assert.equal(full.score, 84);
assert.equal(full.evidence_label, "Alta");
assert.deepEqual(
  {
    raw_points: full.raw_points,
    available_weight: full.available_weight,
    score: full.score,
    coverage_pct: full.evidence_coverage_pct,
  },
  ctC.expected.assertions.find(
    ({ assertion_id }) => assertion_id === "assertion:ct-c-score-components",
  ).expected_value[0],
);

const partial = calculateComparabilityScore({
  project: project({
    bedrooms_min: null,
    bedrooms_max: null,
    delivery_year: null,
    price_per_m2_list: null,
  }),
  scenario: scenario({ scope_mode: "district" }),
});
assert.equal(partial.components.geography.earned_points, 30);
assert.equal(partial.components.area.earned_points, 18);
assert.equal(partial.components.typology.earned_points, 10);
assert.equal(partial.raw_points, 58);
assert.equal(partial.available_weight, 60);
assert.equal(partial.score, 96.7);
assert.equal(partial.evidence_label, "Alta");

const missing = calculateComparabilityScore({
  project: project({
    total_area: null,
    bedrooms_min: null,
    bedrooms_max: null,
    typology: null,
    delivery_year: null,
    price_per_m2_list: null,
  }),
  scenario: scenario({
    scope_mode: "radius",
    radius_meters: null,
    target_area_m2: null,
    bedrooms: null,
    typology: null,
    delivery_year: null,
    target_price_per_m2: null,
  }),
  distanceMeters: null,
});
assert.equal(missing.score, 0);
assert.equal(missing.available_weight, 0);
assert.equal(missing.evidence_label, "Orientativa");
assertFiniteTree(missing);

const rangeOnly = calculateComparabilityScore({
  project: project({ total_area: null, total_area_min: 60, total_area_max: 100 }),
  scenario: scenario({ scope_mode: "district" }),
});
assert.equal(rangeOnly.components.area.available_weight, 0);
assert.equal(rangeOnly.components.area.earned_points, 0);

const ties = [
  { project_id: "project:c", score: 80, available_weight: 60, distance_meters: 1 },
  { project_id: "project:b", score: 80, available_weight: 80, distance_meters: 20 },
  { project_id: "project:a", score: 80, available_weight: 80, distance_meters: 10 },
  { project_id: "project:d", score: 90, available_weight: 20, distance_meters: null },
].sort(compareComparableScores);
assert.deepEqual(
  ties.map(({ project_id }) => project_id),
  ["project:d", "project:a", "project:b", "project:c"],
);

assert.deepEqual(
  [
    quantileR7([10, 20, 30, 40, 50], 0.25),
    quantileR7([10, 20, 30, 40, 50], 0.5),
    quantileR7([10, 20, 30, 40, 50], 0.75),
  ],
  [20, 30, 40],
);
assert.deepEqual(
  [
    quantileR7([10, 20, 30, 40], 0.25),
    quantileR7([10, 20, 30, 40], 0.5),
    quantileR7([10, 20, 30, 40], 0.75),
  ],
  [17.5, 25, 32.5],
);
assert.equal(quantileR7([], 0.5), null);
assert.equal(quantileR7([10, Number.NaN, Infinity], 0.5), 10);

const priceReady = buildPriceDiagnosis({
  priceReferenceProjects: [10, 20, 30, 40],
  targetPricePerM2: 17.5,
});
assert.equal(priceReady.status, "ready");
assert.equal(priceReady.position, "Alineado");
assert.equal(priceReady.p25, 17.5);
assert.equal(priceReady.p75, 32.5);
assert.equal(priceReady.absolute_difference_from_median, -7.5);
assert.equal(priceReady.relative_difference_from_median_pct, -30);
assert.equal(
  priceReady.methodology,
  "Escenario estimado frente a precios de lista publicados. No representa precios reales de cierre.",
);
assert.equal(
  buildPriceDiagnosis({
    priceReferenceProjects: [10, 20, 30, 40],
    targetPricePerM2: 32.5,
  }).position,
  "Alineado",
);
assert.equal(
  buildPriceDiagnosis({
    priceReferenceProjects: [10, 20, 30, 40],
    targetPricePerM2: 17.49,
  }).position,
  "Entrada",
);
assert.equal(
  buildPriceDiagnosis({
    priceReferenceProjects: [10, 20, 30, 40],
    targetPricePerM2: 32.51,
  }).position,
  "Premium",
);
assert.equal(
  buildPriceDiagnosis({ priceReferenceProjects: [10, 20], targetPricePerM2: 15 }).status,
  "insufficient",
);

const priceEligible = evaluatePriceEligibility({ project: project(), cutoffAt });
assert.equal(priceEligible.eligible, true);
for (const [overrides, expectedReason] of [
  [{ currency: "USD" }, "currency_incompatible"],
  [{ total_area: 0 }, "total_area_unavailable"],
  [{ list_price_avg: null }, "list_price_unavailable"],
  [{ price_per_m2_list: 7000 }, "price_per_m2_inconsistent"],
  [{ source_url: "" }, "source_url_unavailable"],
  [{ captured_at: "2026-01-17T00:00:00.000Z" }, "captured_after_cutoff"],
  [{ missing_required_fields: ["total_area"] }, "missing_price_or_area_evidence"],
  [{ price_per_m2_denominator: "techada" }, "price_semantics_incompatible"],
]) {
  const result = evaluatePriceEligibility({ project: project(overrides), cutoffAt });
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.includes(expectedReason));
  assertFiniteTree(result);
}

const ctProject = project({
  id: "ct-c-inside",
  project_id: "project:ct-c-inside",
  observed_project_id: "observed:ct-c-inside",
  delivery_year: 2027,
});
const territorialC = {
  scenario: structuredClone(ctC.input.scenario),
  geography_valid_project_ids: structuredClone(
    ctC.expected.result.geography_valid_project_ids,
  ),
  distance_meters_by_observed_project_id: {
    "observed:ct-c-inside": 125,
    "observed:ct-c-unreconciled": 100,
  },
};
const ctContext = buildComparabilityContext({
  territorialContext: territorialC,
  projects: [
    ctProject,
    project({
      id: "ct-c-outside",
      project_id: "project:ct-c-outside",
      observed_project_id: "observed:ct-c-outside",
    }),
  ],
  cutoffAt,
  authoritativeProjectIds: ["project:ct-c-inside", "project:ct-c-outside"],
});
assert.deepEqual(ctContext.comparable_project_ids, ["project:ct-c-inside"]);
assert.deepEqual(ctContext.price_reference_project_ids, ["project:ct-c-inside"]);
assert.equal(ctContext.comparability_status, "orientative");
assert.equal(ctContext.price_status, "insufficient");
assert.ok(
  ctContext.excluded_projects.some(
    ({ project_id, reason }) =>
      project_id === "observed:ct-c-unreconciled" && reason === "not_reconciled",
  ),
);
assertFiniteTree(ctContext);

function buildStatusContext(rows, contextScenario, distances = {}) {
  const ids = rows.map((row) => `observed:nexo-${row.id}`);
  return buildComparabilityContext({
    territorialContext: territorial(ids, distances),
    scenario: contextScenario,
    projects: rows,
    cutoffAt,
    authoritativeProjectIds: rows.map((row) => `project:nexo-${row.id}`),
  });
}

const zeroContext = buildStatusContext([], scenario());
assert.equal(zeroContext.evidence_coverage_pct, 0);
assert.equal(zeroContext.comparability_status, "insufficient");

const twoRows = [1, 2].map((index) =>
  project({
    id: `two-${index}`,
    typology: null,
    delivery_year: null,
  }),
);
const twoContext = buildStatusContext(
  twoRows,
  scenario({
    scope_mode: "district",
    typology: "all",
    delivery_year: "all",
  }),
);
assert.deepEqual(
  twoContext.comparable_scores.map(({ available_weight }) => available_weight),
  [80, 80],
);
assert.equal(twoContext.evidence_coverage_pct, 80);
assert.equal(twoContext.comparability_status, "orientative");
assert.equal(twoContext.price_status, "insufficient");

const coverageRows = [
  project({ id: "coverage-full", delivery_year: 2027 }),
  project({
    id: "coverage-partial",
    bedrooms_min: null,
    bedrooms_max: null,
    delivery_year: null,
    price_per_m2_list: null,
    list_price_avg: null,
    missing_required_fields: ["price_per_m2_list"],
  }),
  project({
    id: "coverage-minimal",
    total_area: 72,
    bedrooms_min: null,
    bedrooms_max: null,
    typology: null,
    delivery_year: null,
    price_per_m2_list: null,
    list_price_avg: null,
    missing_required_fields: ["price_per_m2_list"],
  }),
];
const coverageContext = buildStatusContext(
  coverageRows,
  scenario(),
  {
    "observed:nexo-coverage-full": 125,
    "observed:nexo-coverage-partial": 125,
  },
);
assert.deepEqual(
  [...coverageContext.comparable_scores]
    .map(({ available_weight }) => available_weight)
    .sort((left, right) => right - left),
  [100, 60, 20],
);
assert.equal(coverageContext.evidence_coverage_pct, 60);
assert.equal(coverageContext.comparability_status, "ready");
assert.equal(coverageContext.price_status, "insufficient");
assertFiniteTree(coverageContext);

const threePriceRows = [1, 2, 3].map((index) =>
  project({
    id: `price-${index}`,
    list_price_avg: 72 * (7000 + index * 100),
    price_per_m2_list: 7000 + index * 100,
  }),
);
const threePriceContext = buildStatusContext(
  threePriceRows,
  scenario({ scope_mode: "district", delivery_year: 2026 }),
);
assert.equal(threePriceContext.price_reference_project_ids.length, 3);
assert.equal(threePriceContext.price_status, "ready");

const explicitMismatch = buildStatusContext(
  [
    project({ id: "match", typology: "departamento" }),
    project({ id: "mismatch", typology: "casa" }),
    project({ id: "unknown", typology: null }),
  ],
  scenario({ scope_mode: "district", bedrooms: "all", delivery_year: "all" }),
);
assert.deepEqual(explicitMismatch.comparable_project_ids, [
  "project:nexo-match",
  "project:nexo-unknown",
]);
assert.ok(
  explicitMismatch.excluded_projects.some(
    ({ project_id, reason }) =>
      project_id === "project:nexo-mismatch" && reason === "typology_mismatch",
  ),
);

const resetTerritorial = {
  scenario: structuredClone(demoData.scenario_defaults),
  geography_valid_project_ids: demoData.geography.assignments
    .filter(
      ({ district_id, coordinate_valid, polygon_valid }) =>
        district_id === demoData.scenario_defaults.district_id &&
        coordinate_valid &&
        polygon_valid,
    )
    .map(({ observed_project_id }) => observed_project_id),
  distance_meters_by_observed_project_id: {},
};
const resetContext = buildComparabilityContext({
  territorialContext: resetTerritorial,
  projects: demoData.projects,
  cutoffAt: demoData.metadata.cutoff_at,
  authoritativeProjectIds: demoData.model.projects.map(({ project_id }) => project_id),
});
assert.equal(resetTerritorial.geography_valid_project_ids.length, 90);
assert.equal(resetContext.comparable_project_ids.length, 85);
assert.equal(
  resetContext.excluded_projects.filter(({ reason }) => reason === "not_reconciled").length,
  5,
);
assertFiniteTree(resetContext);

const source = await readFile(
  new URL("../../../packages/domain/src/legacy/comparability.js", import.meta.url),
  "utf8",
);
assert.ok(
  source.includes("distance_meters_by_observed_project_id"),
  "radius scoring must consume territorial distance facts",
);
assert.doesNotMatch(source, /haversine|pointInPolygon|computeDistance/i);
assert.doesNotMatch(source, /\b(?:latitude|longitude)\b/i);

console.log("comparability.mjs: PASS");

