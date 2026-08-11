import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  initializeScenarioData,
  state,
} from "../public/js/state.js";
import {
  buildComparableRows,
  buildProjectInspectorEntry,
  buildProjectCatalogModel,
  renderProjectDetail,
  renderProjects,
} from "../public/js/views/projects.js";
import { renderCompare } from "../public/js/views/compare.js";
import {
  buildBenchmarkContext,
  buildComparisonModel,
} from "../public/js/benchmark.js";

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
      "./e2e-scenarios/ct-c-benchmark.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

initializeScenarioData(data, { boundaryArtifactStatus: "valid" });

const baselineContext = state.scenarioContext;
const baselineBenchmark = structuredClone(state.benchmarkContext);
const baselineScenario = structuredClone(state.scenario);
const baselineContextSnapshot = structuredClone(baselineContext);
const baselineRows = buildComparableRows({
  projects: data.projects,
  scenarioContext: baselineContext,
});
const catalogScenarioSnapshot = structuredClone(state.scenario);
const catalogContextSnapshot = structuredClone(state.scenarioContext);
const catalogContextRevision = state.scenarioContextRevision;
const catalogSelectedProject = state.selectedProjectId;
const catalogCompareProjects = structuredClone(state.compareProjectIds);

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

const pardoRow = baselineRows.find(
  ({ projectId }) => projectId === "project:nexo-2951",
);
assert.ok(pardoRow, "Pardo Coast permanece en el universo territorial F2");
const pardoEntry = buildProjectInspectorEntry({
  projectId: pardoRow.projectId,
  inspectorCases: data.inspector.cases,
  typologies: data.model.typologies,
  currentCaseId: "case:f3-ct-g-pardo",
});
assert.deepEqual(pardoEntry, {
  inspectable: true,
  caseId: "case:f3-ct-g-pardo",
  routeSlug: "f3-ct-g-pardo",
  projectId: "project:nexo-2951",
  typologyId: "typology:pardo-coast-tipo-7",
  typologyLabel: "Tipo 7",
  provenance: "observed",
  href: "#inspector/case/f3-ct-g-pardo",
});
assert.equal(
  buildProjectInspectorEntry({
    projectId: pardoRow.legacyId,
    inspectorCases: data.inspector.cases,
    typologies: data.model.typologies,
  }).inspectable,
  false,
  "el cruce exige project_id canónico exacto",
);
assert.equal(
  buildProjectInspectorEntry({
    projectId: pardoRow.projectId,
    inspectorCases: data.inspector.cases,
    typologies: [],
  }).inspectable,
  false,
  "una tipología ausente no produce un CTA inspectable",
);

const deterministicEntry = buildProjectInspectorEntry({
  projectId: "project:fixture",
  inspectorCases: [
    {
      case_id: "case:z",
      project_id: "project:fixture",
      typology_id: "typology:z",
      route_slug: "fixture-z",
      provenance_classification: "controlled",
    },
    {
      case_id: "case:a",
      project_id: "project:fixture",
      typology_id: "typology:a",
      route_slug: "fixture-a",
      provenance_classification: "simulated",
    },
  ],
  typologies: [
    { typology_id: "typology:z", model: "Z" },
    { typology_id: "typology:a", model: "A" },
  ],
});
assert.equal(deterministicEntry.caseId, "case:a");
assert.equal(
  buildProjectInspectorEntry({
    projectId: "project:fixture",
    inspectorCases: [
      {
        case_id: "case:z",
        project_id: "project:fixture",
        typology_id: "typology:z",
        route_slug: "fixture-z",
        provenance_classification: "controlled",
      },
      {
        case_id: "case:a",
        project_id: "project:fixture",
        typology_id: "typology:a",
        route_slug: "fixture-a",
        provenance_classification: "simulated",
      },
    ],
    typologies: [
      { typology_id: "typology:z", model: "Z" },
      { typology_id: "typology:a", model: "A" },
    ],
    currentCaseId: "case:z",
  }).caseId,
  "case:z",
  "el expediente actual se conserva cuando pertenece al proyecto",
);

state.inspectorPreset = "case:f3-ct-g-pardo";
const pardoDetail = renderProjectDetail(pardoRow);
assert.match(pardoDetail, /data-project-inspector-entry="available"/);
assert.match(
  pardoDetail,
  /href="#inspector\/case\/f3-ct-g-pardo"/,
);
assert.match(pardoDetail, />\s*Inspeccionar evidencia\s*</);
assert.match(
  pardoDetail,
  /aria-label="Inspeccionar evidencia de PARDO COAST, Tipo 7"/,
);

const fallbackRow = baselineRows.find(
  ({ projectId }) => projectId !== "project:nexo-2951",
);
assert.ok(fallbackRow);
const fallbackDetail = renderProjectDetail(fallbackRow);
assert.match(fallbackDetail, /data-project-inspector-entry="unavailable"/);
assert.match(
  fallbackDetail,
  /Este proyecto no tiene una tipología inspeccionable en esta demo\. La cobertura territorial no implica expediente de evidencia\./,
);
assert.match(fallbackDetail, />\s*Ver cobertura disponible\s*</);
assert.match(fallbackDetail, /href="#inspector"/);
assert.match(fallbackDetail, /aria-describedby="project-inspector-description"/);
assert.doesNotMatch(fallbackDetail, /f3-ct-g-pardo|\/case\/undefined/);
assert.deepEqual(state.scenario, catalogScenarioSnapshot);
assert.deepEqual(state.scenarioContext, catalogContextSnapshot);
assert.equal(state.scenarioContextRevision, catalogContextRevision);
assert.equal(state.selectedProjectId, catalogSelectedProject);
assert.deepEqual(state.compareProjectIds, catalogCompareProjects);

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
state.benchmarkContext = baselineBenchmark;
state.compareQuery = beyondTop60.projectId;
state.compareProjectIds = [];
const beyondMarkup = renderCompare();
assert.equal((beyondMarkup.match(/data-compare-toggle/gu) ?? []).length, 1);
assert.match(
  beyondMarkup,
  new RegExp(`value="${beyondTop60.projectId}"`),
  "La búsqueda profunda debe encontrar candidatos más allá del primer bloque visible",
);

const selectedInput = [
  baselineRows[0].projectId,
  baselineRows[1].projectId,
  baselineRows[2].projectId,
  baselineRows[3].projectId,
  "project:nexo-not-in-context",
  baselineRows[0].projectId,
];
const compareModel = buildComparisonModel({
  benchmarkContext: baselineBenchmark,
  selectedProjectIds: selectedInput,
  includeTargetScenario: false,
});
assert.equal(compareModel.selected.length, 3);
assert.ok(
  compareModel.selected.map(({ projectId }) => projectId).every((projectId) =>
    projectId.startsWith("project:nexo-"),
  ),
);
assert.equal(
  compareModel.selected.some(
    ({ projectId }) => projectId === baselineRows[3].projectId,
  ),
  false,
);

state.compareProjectIds = compareModel.selected.map(({ projectId }) => projectId);
state.compareQuery = "";
const compareMarkup = renderCompare();
assert.deepEqual(
  state.compareProjectIds,
  compareModel.selected.map(({ projectId }) => projectId),
);
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
    `value="${baselineRows[3].projectId}"[\\s\\S]*?disabled`,
  ),
);
assert.match(compareMarkup, /Comparación completa/);
assert.match(compareMarkup, /role="rowheader"/);
for (const row of baselineRows) {
  assert.match(
    compareMarkup,
    new RegExp(`value="${row.projectId}"`),
  );
}
assert.doesNotMatch(
  compareMarkup,
  /data-compare-toggle[\s\S]*?value="(?:observed:|[0-9]+")/,
);
assert.equal(
  (compareMarkup.match(/data-comparison-group=/g) ?? []).length,
  9,
);
assert.match(compareMarkup, /Condición principal/);
assert.doesNotMatch(compareMarkup, /comparison-priority/);
assert.match(compareMarkup, /Precio publicado desde/);
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
const emptyBenchmark = buildBenchmarkContext({
  data,
  scenarioContext: emptyContext,
});
assert.equal(emptyBenchmark.projectSummaries.length, 0);

const originalContext = state.scenarioContext;
state.scenarioContext = emptyContext;
state.benchmarkContext = emptyBenchmark;
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
assert.match(emptyCompareMarkup, /Selecciona dos proyectos para comenzar/);
assert.doesNotMatch(
  `${emptyProjectsMarkup}${emptyCompareMarkup}`,
  /NaN|Infinity|undefined/,
);
state.scenarioContext = originalContext;
state.benchmarkContext = baselineBenchmark;

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

const ctCProjectId = ctC.input.comparable_project_ids[0];
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
  comparable_project_ids: ctC.input.comparable_project_ids,
  price_reference_project_ids: ctC.input.comparable_project_ids,
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
const ctCBenchmark = buildBenchmarkContext({
  data: {
    ...data,
    projects: [ctCProject],
  },
  scenarioContext: ctCContext,
});
assert.deepEqual(
  ctCBenchmark.projectSummaries.map(({ projectId }) => projectId),
  ctC.expected.consumer_project_ids.compare,
);
const ctCComparison = buildComparisonModel({
  benchmarkContext: ctCBenchmark,
  selectedProjectIds: [ctCProjectId],
});
assert.deepEqual(
  ctCComparison.selected.map(({ projectId }) => projectId),
  ctC.expected.consumer_project_ids.compare,
);
assert.equal(ctCComparison.status, "insufficient");
const resetCompareModel = buildComparisonModel({
  benchmarkContext: baselineBenchmark,
  selectedProjectIds: [],
});
assert.equal(baselineBenchmark.projectSummaries.length, 85);
assert.deepEqual(resetCompareModel.selected, []);

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
const maliciousBenchmark = structuredClone(baselineBenchmark);
const maliciousSummary = maliciousBenchmark.projectSummaries.find(
  ({ projectId }) => projectId === maliciousCanonicalId,
);
assert.ok(maliciousSummary);
maliciousSummary.name = maliciousProject.project_name;
state.benchmarkContext = maliciousBenchmark;
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
const maliciousInspectorData = structuredClone(data);
maliciousInspectorData.model.typologies.find(
  ({ typology_id: typologyId }) =>
    typologyId === "typology:pardo-coast-tipo-7",
).model = 'Tipo 7"><img src=x onerror=globalThis.pwned=true>';
state.data = maliciousInspectorData;
state.scenarioContext = baselineContext;
state.inspectorPreset = "case:f3-ct-g-pardo";
const escapedInspectorCta = renderProjectDetail(pardoRow);
assert.doesNotMatch(escapedInspectorCta, /<img src=x/);
assert.match(escapedInspectorCta, /&quot;&gt;&lt;img src=x/);
assert.doesNotMatch(escapedInspectorCta, /\son(?:click|change|submit)=/);

console.log(
  "Projects/compare OK: baseline 85/69, canonical order, local filters, deep search, radial distance, empty states, max 3 and escaping.",
);
