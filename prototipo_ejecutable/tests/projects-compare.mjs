import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  initializeScenarioData,
  state,
} from "../public/js/state.js";
import {
  buildComparableRows,
  buildProjectCatalogModel,
  renderProjects,
} from "../public/js/views/projects.js";
import {
  buildCompareModel,
  renderCompare,
} from "../public/js/views/compare.js";

const data = JSON.parse(
  await fs.readFile(
    new URL(
      "../public/demo-data/viva-platform-demo.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const ctC = JSON.parse(
  await fs.readFile(
    new URL(
      "../../datos_relevantes/demo-pilot/fixtures/ct-c.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

initializeScenarioData(data, { boundaryArtifactStatus: "valid" });

const baselineContext = state.scenarioContext;
const baselineScenario = structuredClone(state.scenario);
const baselineContextSnapshot = structuredClone(baselineContext);
const baselineRows = buildComparableRows({
  projects: data.projects,
  scenarioContext: baselineContext,
});

assert.equal(baselineRows.length, 85);
assert.equal(
  baselineRows.filter((row) => row.priceEligible).length,
  69,
);
assert.deepEqual(
  baselineRows.map((row) => row.projectId),
  baselineContext.comparable_project_ids,
);
assert.ok(
  baselineRows.every(
    (row) =>
      Number.isFinite(row.score) &&
      Number.isFinite(row.evidenceCoverage) &&
      !String(row.distanceMeters).includes("NaN"),
  ),
);

const localCatalog = buildProjectCatalogModel({
  projects: data.projects,
  scenarioContext: baselineContext,
  filters: {
    district: "San Isidro",
    typology: "Casa",
    phase: baselineRows[0].project.project_phase,
    query: baselineRows[0].project.agency_name,
    sort: "price_m2",
  },
  selectedProjectId: baselineRows[0].projectId,
});
assert.ok(localCatalog.rows.length > 0);
assert.equal(
  localCatalog.selected.projectId,
  baselineRows[0].projectId,
);
assert.equal(localCatalog.selected.project.district, "Miraflores");
assert.ok(
  localCatalog.rows.every(
    (row) =>
      row.project.project_phase ===
        baselineRows[0].project.project_phase &&
      row.project.agency_name ===
        baselineRows[0].project.agency_name,
  ),
);
assert.deepEqual(state.scenario, baselineScenario);
assert.deepEqual(state.scenarioContext, baselineContextSnapshot);

const beyondTop60 = baselineRows[70];
const beyondModel = buildCompareModel({
  projects: data.projects,
  scenarioContext: baselineContext,
  query: beyondTop60.projectId,
  selectedProjectIds: [],
});
assert.equal(beyondModel.comparableCount, 85);
assert.deepEqual(
  beyondModel.candidates.map((row) => row.projectId),
  [beyondTop60.projectId],
);

const selectedInput = [
  baselineRows[0].legacyId,
  baselineRows[1].projectId,
  baselineRows[2].legacyId,
  baselineRows[3].projectId,
  "project:nexo-not-in-context",
  baselineRows[0].projectId,
];
const compareModel = buildCompareModel({
  projects: data.projects,
  scenarioContext: baselineContext,
  selectedProjectIds: selectedInput,
  maxSelected: 99,
});
assert.equal(compareModel.selected.length, 3);
assert.equal(compareModel.maxSelected, 3);
assert.ok(
  compareModel.selectedIds.every((projectId) =>
    projectId.startsWith("project:nexo-"),
  ),
);
assert.equal(compareModel.isAtMaximum, true);
assert.equal(
  compareModel.selectedIdSet.has(baselineRows[3].projectId),
  false,
);

state.compareProjectIds = compareModel.selected.map(
  (row) => row.legacyId,
);
state.compareQuery = "";
const compareMarkup = renderCompare();
assert.deepEqual(state.compareProjectIds, compareModel.selectedIds);
assert.match(
  compareMarkup,
  /data-scenario-consumer="compare"/,
);
assert.equal(
  (compareMarkup.match(/data-compare-toggle/g) ?? []).length,
  85,
);
assert.equal(
  (compareMarkup.match(/data-compare-toggle[\s\S]*?disabled/g) ?? [])
    .length > 0,
  true,
);
assert.match(
  compareMarkup,
  new RegExp(
    `data-canonical-project-id="${baselineRows[3].projectId}"\\s+disabled`,
  ),
);
assert.match(compareMarkup, /Matriz de comparación/);
assert.match(compareMarkup, /<th scope="row">/);
for (const row of baselineRows) {
  assert.match(
    compareMarkup,
    new RegExp(
      `data-canonical-project-id="${row.projectId}"`,
    ),
  );
}
assert.doesNotMatch(
  compareMarkup,
  /data-canonical-project-id="(?:observed:|[0-9]+")/,
);
assert.match(compareMarkup, /Score de comparabilidad/);
assert.match(compareMarkup, /Cobertura de evidencia/);
assert.match(compareMarkup, /Precio publicado provisional/);
assert.doesNotMatch(compareMarkup, /NaN|Infinity|undefined/);

const ineligiblePriceRow = baselineRows.find(
  (row) => !row.priceEligible,
);
assert.ok(ineligiblePriceRow);
assert.equal(ineligiblePriceRow.priceTotal, null);
assert.equal(ineligiblePriceRow.pricePerM2, null);

const radialContext = structuredClone(baselineContext);
radialContext.scope_text = "Miraflores · Radio 1 km";
radialContext.scope.scope_mode = "radius";
radialContext.comparable_project_ids =
  radialContext.comparable_project_ids.slice(0, 3);
radialContext.price_reference_project_ids =
  radialContext.price_reference_project_ids.filter((projectId) =>
    radialContext.comparable_project_ids.includes(projectId),
  );
radialContext.comparable_scores =
  radialContext.comparable_scores
    .filter((record) =>
      radialContext.comparable_project_ids.includes(record.project_id),
    )
    .map((record, index) => ({
      ...record,
      distance_meters: [0, 420.4, 999.9][index],
    }));
const radialRows = buildComparableRows({
  projects: data.projects,
  scenarioContext: radialContext,
});
assert.deepEqual(
  radialRows.map((row) => row.distanceMeters),
  [0, 420.4, 999.9],
);
assert.match(
  buildProjectCatalogModel({
    projects: data.projects,
    scenarioContext: radialContext,
  }).scopeText,
  /Radio 1 km/,
);

const emptyContext = {
  ...structuredClone(baselineContext),
  scope_text: "Miraflores · Radio 500 m",
  comparable_project_ids: [],
  price_reference_project_ids: [],
  comparable_scores: [],
};
assert.equal(
  buildProjectCatalogModel({
    projects: data.projects,
    scenarioContext: emptyContext,
  }).rows.length,
  0,
);
assert.equal(
  buildCompareModel({
    projects: data.projects,
    scenarioContext: emptyContext,
  }).candidates.length,
  0,
);

const originalContext = state.scenarioContext;
state.scenarioContext = emptyContext;
state.selectedProjectId = null;
state.projectFilters = {
  district: "Otro distrito",
  typology: "Casa",
  phase: "Todos",
  query: "",
  sort: "direct",
};
const emptyProjectsMarkup = renderProjects();
const emptyCompareMarkup = renderCompare();
assert.match(
  emptyProjectsMarkup,
  /data-scenario-consumer="catalog"/,
);
assert.match(
  emptyCompareMarkup,
  /data-scenario-consumer="compare"/,
);
assert.match(
  emptyProjectsMarkup,
  /Sin comparables para estos filtros locales/,
);
assert.match(emptyProjectsMarkup, /no se amplió ni cambió de distrito/);
assert.match(emptyCompareMarkup, /Sin candidatos para esta búsqueda/);
assert.doesNotMatch(
  `${emptyProjectsMarkup}${emptyCompareMarkup}`,
  /NaN|Infinity|undefined/,
);
state.scenarioContext = originalContext;

state.projectFilters = {
  phase: "Todos",
  query: "",
  sort: "direct",
};
state.projectLimit = 18;
state.selectedProjectId = baselineRows[0].legacyId;
const baselineProjectsMarkup = renderProjects();
assert.match(
  baselineProjectsMarkup,
  /data-scenario-consumer="catalog"/,
);
for (const row of baselineRows.slice(0, 18)) {
  assert.match(
    baselineProjectsMarkup,
    new RegExp(
      `data-canonical-project-id="${row.projectId}"`,
    ),
  );
}
assert.doesNotMatch(
  baselineProjectsMarkup,
  /data-canonical-project-id="(?:observed:|[0-9]+")/,
);

const ctCProjectId =
  ctC.expected.result.comparable_project_ids[0];
const ctCProject = {
  id: "ct-c-inside",
  project_id: ctCProjectId,
  project_name: "Comparable controlado CT-C",
  agency_name: "Inmobiliaria controlada",
  district: "Miraflores",
  project_phase: "En construcción",
  total_area: 72,
  bedrooms_min: 2,
  bedrooms_max: 3,
  delivery_year: 2026,
  list_price_avg: 518400,
  price_per_m2_list: 7200,
};
const ctCContext = {
  scope_text: "Miraflores · Radio 500 m",
  comparable_project_ids:
    ctC.expected.result.comparable_project_ids,
  price_reference_project_ids:
    ctC.expected.result.price_reference_project_ids,
  comparable_scores: [
    {
      project_id: ctCProjectId,
      score: 84,
      evidence_coverage_pct: 100,
      evidence_label: "Alta",
      distance_meters: 125,
      components: {},
    },
  ],
};
assert.deepEqual(
  buildProjectCatalogModel({
    projects: [ctCProject],
    scenarioContext: ctCContext,
  }).rows.map((row) => row.projectId),
  [ctCProjectId],
);
assert.deepEqual(
  buildCompareModel({
    projects: [ctCProject],
    scenarioContext: ctCContext,
  }).candidates.map((row) => row.projectId),
  ctC.expected.result.consumer_project_ids.comparator,
);
const resetCompareModel = buildCompareModel({
  projects: data.projects,
  scenarioContext: baselineContext,
  query: "",
  selectedProjectIds: [],
});
assert.equal(resetCompareModel.candidates.length, 85);
assert.deepEqual(resetCompareModel.selectedIds, []);

const maliciousData = structuredClone(data.projects);
const maliciousCanonicalId = baselineRows[0].projectId;
const maliciousProject = maliciousData.find(
  (project) =>
    `project:nexo-${project.id}` === maliciousCanonicalId,
);
maliciousProject.project_name =
  '<img src=x onerror="globalThis.pwned=true">';
const maliciousContext = {
  ...structuredClone(baselineContext),
  comparable_project_ids: [maliciousCanonicalId],
  price_reference_project_ids: [],
  comparable_scores: [
    {
      ...structuredClone(baselineContext.comparable_scores[0]),
      project_id: maliciousCanonicalId,
      score: Number.NaN,
      evidence_coverage_pct: Number.NaN,
    },
  ],
};
state.data = {
  ...data,
  projects: maliciousData,
};
state.scenarioContext = maliciousContext;
state.projectFilters = {
  phase: "Todos",
  query: "",
  sort: "direct",
};
state.selectedProjectId = maliciousProject.id;
state.compareProjectIds = [maliciousProject.id];
const escapedMarkup = `${renderProjects()}${renderCompare()}`;
assert.doesNotMatch(escapedMarkup, /<img src=x/);
assert.match(
  escapedMarkup,
  /&lt;img src=x onerror=&quot;globalThis\.pwned=true&quot;&gt;/,
);
assert.doesNotMatch(escapedMarkup, /NaN|Infinity|undefined/);

console.log(
  "Projects/compare OK: baseline 85/69, canonical order, local filters, deep search, radial distance, empty states, max 3 and escaping.",
);
