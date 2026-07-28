import {
  buildTerritorialContext,
  createScenarioEnvironment,
  createScenarioState,
  reduceScenarioState,
  serializeScenarioQuery,
} from "./scenario.js";
import {
  buildComparabilityContext,
  roundHalfAwayFromZero,
} from "./comparability.js";

let dataValue = null;
let scenarioEnvironment = null;
let boundaryArtifactStatus = "missing";

const EMPTY_GEOGRAPHY_ARTIFACT = Object.freeze({
  status: "missing",
  geojson: null,
  url: null,
  expected_sha256: null,
  actual_sha256: null,
  reason: null,
});

export const state = {
  get data() {
    return dataValue;
  },
  set data(value) {
    initializeScenarioData(value);
  },
  view: "dashboard",
  mobileNavOpen: false,
  scenario: null,
  scenario_status: "valid",
  scenario_corrections: [],
  get scenarioState() {
    return state.scenario ? currentScenarioState() : null;
  },
  get scenarioEnvironment() {
    return scenarioEnvironment;
  },
  scenarioAnnouncement: "",
  scenarioFocusId: null,
  geographyArtifact: { ...EMPTY_GEOGRAPHY_ARTIFACT },
  scenarioContext: null,
  scenarioContextRevision: 0,
  get selectedDistrict() {
    return districtNameForId(state.scenario?.district_id);
  },
  set selectedDistrict(value) {
    const districtId = resolveDistrictId(value);
    if (districtId && districtId !== state.scenario?.district_id) {
      dispatchScenario({
        type: "SET_TERRITORY",
        patch: { district_id: districtId },
      });
    }
  },
  get strategy() {
    return legacyScenarioProjection();
  },
  projectFilters: {
    district: "",
    typology: "Todos",
    phase: "Todos",
    query: "",
    sort: "direct",
  },
  projectLimit: 18,
  selectedProjectId: null,
  compareProjectIds: [],
  compareQuery: "",
  assistantInput: "",
  assistantResponse: null,
};

export function initializeScenarioData(data, options = {}) {
  dataValue = data ?? null;
  const initialArtifact = normalizeGeographyArtifact(
    options.geographyArtifact ?? {
      ...EMPTY_GEOGRAPHY_ARTIFACT,
      status: options.boundaryArtifactStatus ?? "missing",
    },
  );
  boundaryArtifactStatus = initialArtifact.status;
  state.scenario = null;
  state.scenario_status = "valid";
  state.scenario_corrections = [];
  state.scenarioAnnouncement = "";
  state.scenarioFocusId = null;
  state.geographyArtifact = initialArtifact;
  state.scenarioContext = null;
  state.scenarioContextRevision = 0;

  if (!dataValue) {
    scenarioEnvironment = null;
    return null;
  }

  scenarioEnvironment = createScenarioEnvironment(dataValue);
  const initial = createScenarioState(scenarioEnvironment);
  state.scenario = initial.scenario;
  state.scenario_status = initial.scenario_status;
  state.scenario_corrections = initial.corrections;
  state.projectFilters.district = districtNameForId(state.scenario.district_id);
  return recomputeScenarioContext();
}

export function dispatchScenario(action, options = {}) {
  if (!scenarioEnvironment || !state.scenario) {
    throw new Error("Scenario data must be initialized before dispatch");
  }

  const previous = currentScenarioState();
  const next = reduceScenarioState(previous, action, scenarioEnvironment);
  const changed =
    JSON.stringify(previous.scenario) !== JSON.stringify(next.scenario) ||
    previous.scenario_status !== next.scenario_status ||
    JSON.stringify(previous.corrections) !== JSON.stringify(next.corrections);

  if (!changed) {
    applyDispatchEffects(options);
    return {
      ...next,
      recomputed: false,
      revision: state.scenarioContextRevision,
    };
  }

  state.scenario = next.scenario;
  state.scenario_status = next.scenario_status;
  state.scenario_corrections = next.corrections;
  recomputeScenarioContext();
  applyDispatchEffects(options);
  return {
    ...next,
    recomputed: true,
    revision: state.scenarioContextRevision,
  };
}

export function updateBoundaryArtifactStatus(status, options = {}) {
  return updateBoundaryArtifact(
    {
      ...state.geographyArtifact,
      status,
    },
    options,
  );
}

export function updateBoundaryArtifact(artifact, options = {}) {
  const normalized = normalizeGeographyArtifact(artifact);
  const status = normalized.status;
  if (!["valid", "missing", "hash_mismatch", "parse_error"].includes(status)) {
    throw new TypeError(`Unsupported boundary artifact status: ${status}`);
  }
  boundaryArtifactStatus = status;
  state.geographyArtifact = normalized;
  const scenarioContext = recomputeScenarioContext();
  applyDispatchEffects(options);
  return {
    recomputed: true,
    revision: state.scenarioContextRevision,
    scenarioContext,
  };
}

export function recomputeScenarioContext() {
  if (!dataValue || !scenarioEnvironment || !state.scenario) {
    state.scenarioContext = null;
    return null;
  }

  const territorialContext = buildTerritorialContext({
    scenarioState: currentScenarioState(),
    geography: dataValue.geography,
    boundaryArtifactStatus,
  });
  const authoritativeProjectIds = dataValue.model.projects.map(
    ({ project_id: projectId }) => projectId,
  );
  const comparabilityContext = buildComparabilityContext({
    territorialContext,
    projects: dataValue.projects,
    authoritativeProjectIds,
    cutoffAt: dataValue.metadata.cutoff_at,
  });
  const geographyTotal = territorialContext.observed_scope_project_ids.length;
  const geographyIncluded = territorialContext.geography_valid_project_ids.length;
  const observedScopeSet = new Set(
    territorialContext.observed_scope_project_ids,
  );
  const displayProjectIds = dataValue.geography.assignments
    .filter(
      (assignment) =>
        assignment.coordinate_valid &&
        observedScopeSet.has(assignment.observed_project_id),
    )
    .map((assignment) => assignment.observed_project_id)
    .sort();
  const geographyCoveragePct =
    geographyTotal === 0
      ? 0
      : roundHalfAwayFromZero((geographyIncluded / geographyTotal) * 100, 1);
  const revision = state.scenarioContextRevision + 1;

  state.scenarioContextRevision = revision;
  state.scenarioContext = {
    revision,
    scenario: structuredClone(state.scenario),
    scope: structuredClone(territorialContext.scope),
    scope_text: scopeTextForScenario(state.scenario),
    observed_scope_project_ids: [
      ...territorialContext.observed_scope_project_ids,
    ],
    geography_valid_project_ids: [
      ...territorialContext.geography_valid_project_ids,
    ],
    display_project_ids: displayProjectIds,
    distance_meters_by_observed_project_id: {
      ...territorialContext.distance_meters_by_observed_project_id,
    },
    comparable_project_ids: [
      ...comparabilityContext.comparable_project_ids,
    ],
    price_reference_project_ids: [
      ...comparabilityContext.price_reference_project_ids,
    ],
    comparable_scores: structuredClone(
      comparabilityContext.comparable_scores,
    ),
    price_diagnosis: structuredClone(
      comparabilityContext.price_diagnosis,
    ),
    excluded_projects: [
      ...territorialContext.exclusions.map((item) =>
        normalizeContextExclusion(item, "territorial"),
      ),
      ...comparabilityContext.excluded_projects.map((item) =>
        normalizeContextExclusion(item, "analytical"),
      ),
    ],
    geography_coverage: {
      included: geographyIncluded,
      total: geographyTotal,
      pct: geographyCoveragePct ?? 0,
    },
    market_reading: {
      comparable_project_count:
        comparabilityContext.comparable_project_ids.length,
      price_reference_count:
        comparabilityContext.price_reference_project_ids.length,
      median_price_per_m2:
        comparabilityContext.price_diagnosis.median,
      price_position:
        comparabilityContext.price_diagnosis.position,
    },
    cutoff_at: dataValue.metadata.cutoff_at,
    scenario_status: state.scenario_status,
    geography_status: territorialContext.geography_status,
    comparability_status: comparabilityContext.comparability_status,
    price_status: comparabilityContext.price_status,
    evidence_coverage_pct:
      comparabilityContext.evidence_coverage_pct,
  };
  normalizeScenarioSelections();
  return state.scenarioContext;
}

export function canonicalScenarioSearch() {
  if (!scenarioEnvironment || !state.scenario) return "";
  const query = serializeScenarioQuery(state.scenario, scenarioEnvironment);
  return query ? `?${query}` : "";
}

export function resolveDistrictId(value) {
  const normalized = normalizeText(value);
  if (!normalized || !scenarioEnvironment) return null;
  const district = scenarioEnvironment.geography.districts.find(
    (item) =>
      normalizeText(item.district_id) === normalized ||
      normalizeText(item.district_name) === normalized ||
      normalizeText(item.source_name) === normalized,
  );
  return district?.district_id ?? null;
}

export function districtNameForId(districtId) {
  if (!districtId || !scenarioEnvironment) return "";
  const district = scenarioEnvironment.geography.districts.find(
    (item) => item.district_id === districtId,
  );
  return district?.district_name ?? district?.source_name ?? "";
}

export function legacyScenarioProjection() {
  const scenario = state.scenario;
  if (!scenario) {
    return {
      district: "",
      typology: "Todos",
      bedrooms: "Todos",
      area: "",
      targetPrice: "",
      deliveryYear: "Todos",
      visualization: "geographic",
    };
  }
  return {
    district: districtNameForId(scenario.district_id),
    typology:
      scenario.typology === "all"
        ? "Todos"
        : titleCase(scenario.typology),
    bedrooms:
      scenario.bedrooms === "all" ? "Todos" : String(scenario.bedrooms),
    area: scenario.target_area_m2 ?? "",
    targetPrice: scenario.target_price_pen ?? "",
    deliveryYear:
      scenario.delivery_year === "all"
        ? "Todos"
        : String(scenario.delivery_year),
    visualization: scenario.visualization,
  };
}

function currentScenarioState() {
  return {
    scenario: structuredClone(state.scenario),
    scenario_status: state.scenario_status,
    corrections: structuredClone(state.scenario_corrections),
  };
}

function applyDispatchEffects({ announce, focusId } = {}) {
  if (announce !== undefined) {
    state.scenarioAnnouncement =
      typeof announce === "function"
        ? String(announce(state.scenarioContext) ?? "")
        : String(announce ?? "");
  }
  if (focusId !== undefined) {
    state.scenarioFocusId = focusId || null;
  }
}

function normalizeContextExclusion(item, origin) {
  return {
    project_id: item.project_id,
    stage: item.stage,
    reason: item.reason,
    visible_as_coverage: Boolean(item.visible_as_coverage),
    blocking_fields:
      origin === "analytical"
        ? [...new Set(item.blocked_fields ?? item.details ?? [])]
        : [],
    origin,
  };
}

function normalizeGeographyArtifact(artifact) {
  const value = artifact ?? EMPTY_GEOGRAPHY_ARTIFACT;
  return {
    status: value.status ?? "missing",
    geojson: value.geojson ?? null,
    url: value.url ?? null,
    expected_sha256: value.expected_sha256 ?? null,
    actual_sha256: value.actual_sha256 ?? null,
    reason: value.reason ?? null,
  };
}

function normalizeScenarioSelections() {
  const context = state.scenarioContext;
  if (!context) return;
  const selectedObservedId = observedIdFromLegacy(state.selectedProjectId);
  if (
    !selectedObservedId ||
    !context.display_project_ids.includes(selectedObservedId)
  ) {
    state.selectedProjectId =
      legacyIdFromCanonical(context.comparable_project_ids[0]) ??
      legacyIdFromObserved(context.display_project_ids[0]) ??
      null;
  } else {
    state.selectedProjectId =
      legacyIdFromObserved(selectedObservedId) ?? state.selectedProjectId;
  }

  const existingComparableIds = state.compareProjectIds
    .map(canonicalIdFromLegacy)
    .filter(
      (projectId) =>
        projectId && context.comparable_project_ids.includes(projectId),
    )
    .map(legacyIdFromCanonical)
    .filter(Boolean);
  const rankedComparableIds = context.comparable_project_ids
    .map(legacyIdFromCanonical)
    .filter(Boolean);
  state.compareProjectIds = [
    ...new Set([...existingComparableIds, ...rankedComparableIds]),
  ].slice(0, 3);
}

function canonicalIdFromLegacy(value) {
  const id = String(value ?? "");
  if (!id) return null;
  if (id.startsWith("project:")) return id;
  if (id.startsWith("observed:nexo-")) {
    return `project:nexo-${id.slice("observed:nexo-".length)}`;
  }
  return id.includes(":") ? null : `project:nexo-${id}`;
}

function observedIdFromLegacy(value) {
  const id = String(value ?? "");
  if (!id) return null;
  if (id.startsWith("observed:")) return id;
  if (id.startsWith("project:nexo-")) {
    return `observed:nexo-${id.slice("project:nexo-".length)}`;
  }
  return id.includes(":") ? null : `observed:nexo-${id}`;
}

function legacyIdFromCanonical(value) {
  const id = String(value ?? "");
  return id.startsWith("project:nexo-")
    ? id.slice("project:nexo-".length)
    : null;
}

function legacyIdFromObserved(value) {
  const id = String(value ?? "");
  return id.startsWith("observed:nexo-")
    ? id.slice("observed:nexo-".length)
    : null;
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();
}

function titleCase(value) {
  const text = String(value ?? "");
  return text ? `${text[0].toUpperCase()}${text.slice(1)}` : "";
}

function scopeTextForScenario(scenario) {
  const districtName = districtNameForId(scenario.district_id);
  if (scenario.scope_mode === "quadrant") {
    const district = scenarioEnvironment?.geography.districts.find(
      ({ district_id: districtId }) =>
        districtId === scenario.district_id,
    );
    const quadrant = district?.quadrants?.find(
      ({ quadrant_id: quadrantId }) =>
        quadrantId === scenario.quadrant_id,
    );
    return `${districtName} · ${quadrant?.label ?? scenario.quadrant_id}`;
  }
  if (scenario.scope_mode === "radius") {
    const radius =
      scenario.radius_meters >= 1000
        ? `${scenario.radius_meters / 1000} km`
        : `${scenario.radius_meters} m`;
    return `${districtName} · Radio ${radius}`;
  }
  return `${districtName} · Distrito completo`;
}
