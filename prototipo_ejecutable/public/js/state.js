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
import { buildEvidenceDossier } from "./evidence-inspector.js";
import {
  buildBenchmarkContext,
  buildComparisonModel,
} from "./benchmark.js";
import { buildAssistantResponse } from "./assistant-engine.js";
import {
  buildHistoryContext,
  normalizeHistoryFilters,
} from "./history.js";
import { buildJourneyContext } from "./journey.js";

let dataValue = null;
let scenarioEnvironment = null;
let boundaryArtifactStatus = "missing";
let inspectorRuntime = {
  available: false,
  reasonCode: "INSPECTOR_UNAVAILABLE",
  cases: [],
  caseById: new Map(),
  caseByRoute: new Map(),
  casesByProject: new Map(),
  caseByProjectTypology: new Map(),
  dossierByCaseId: new Map(),
  defaultCase: null,
};

const JOURNEY_QUALITY_CASE_ID = "case:f3-ct-g-pardo";

const EMPTY_GEOGRAPHY_ARTIFACT = Object.freeze({
  status: "missing",
  geojson: null,
  url: null,
  expected_sha256: null,
  actual_sha256: null,
  reason: null,
});

export const INSPECTOR_ACTIONS = Object.freeze({
  selectCase: "SELECT_CASE",
  selectProject: "SELECT_PROJECT",
  selectTypology: "SELECT_TYPOLOGY",
  selectPreset: "SELECT_PRESET",
  openEvidence: "OPEN_EVIDENCE",
  closeEvidence: "CLOSE_EVIDENCE",
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
  benchmarkContext: null,
  historyFilters: normalizeHistoryFilters(),
  historyContext: null,
  historyContextRevision: 0,
  selectedHistoryEventId: null,
  journeyContext: null,
  journeyContextRevision: 0,
  journeyAnnouncement: "",
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
  compareIncludeTarget: false,
  compareQuery: "",
  assistantInput: "",
  assistantIntentId: null,
  assistantResponse: null,
  assistantResponseRevision: 0,
  inspectorProjectId: null,
  inspectorTypologyId: null,
  inspectorEvidenceId: null,
  inspectorPreset: null,
  inspectorDialogOpen: false,
};

export function initializeScenarioData(data, options = {}) {
  dataValue = data ?? null;
  initializeInspectorState(dataValue?.inspector);
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
  state.benchmarkContext = null;
  state.historyFilters = normalizeHistoryFilters();
  state.historyContext = null;
  state.historyContextRevision = 0;
  state.selectedHistoryEventId = null;
  state.journeyContext = null;
  state.journeyContextRevision = 0;
  state.journeyAnnouncement = "";
  state.compareIncludeTarget = false;
  state.assistantInput = "";
  state.assistantIntentId = null;
  state.assistantResponse = null;
  state.assistantResponseRevision = 0;

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

export function initializeInspectorState(inspector = dataValue?.inspector) {
  resetInspectorSelection();
  inspectorRuntime = unavailableInspectorRuntime("INSPECTOR_UNAVAILABLE");
  if (!inspector) return inspectorSelection();

  try {
    if (
      !dataValue?.model ||
      !Array.isArray(inspector.cases) ||
      inspector.cases.length === 0 ||
      typeof inspector.default_case_id !== "string" ||
      inspector.default_case_id.length === 0
    ) {
      inspectorRuntime = unavailableInspectorRuntime("INSPECTOR_INVALID_DATA");
      return inspectorSelection();
    }

    const cases = [...inspector.cases].sort((left, right) =>
      compareInspectorIds(
        String(left?.case_id ?? ""),
        String(right?.case_id ?? ""),
      ),
    );
    const caseById = new Map();
    const caseByRoute = new Map();
    const casesByProject = new Map();
    const caseByProjectTypology = new Map();
    const dossierByCaseId = new Map();
    for (const inspectorCase of cases) {
      const caseId = inspectorCase?.case_id;
      const routeSlug = inspectorCase?.route_slug;
      const projectId = inspectorCase?.project_id;
      const typologyId = inspectorCase?.typology_id;
      if (
        typeof caseId !== "string" ||
        !caseId ||
        typeof routeSlug !== "string" ||
        !routeSlug ||
        typeof projectId !== "string" ||
        !projectId ||
        typeof typologyId !== "string" ||
        !typologyId ||
        caseById.has(caseId) ||
        caseByRoute.has(routeSlug)
      ) {
        throw new Error("Inspector case index is invalid");
      }
      const pairKey = inspectorPairKey(projectId, typologyId);
      if (caseByProjectTypology.has(pairKey)) {
        throw new Error("Inspector project and typology pair is ambiguous");
      }
      const dossier = buildEvidenceDossier({
        model: dataValue.model,
        inspector,
        projectId,
        typologyId,
      });
      caseById.set(caseId, inspectorCase);
      caseByRoute.set(routeSlug, inspectorCase);
      caseByProjectTypology.set(pairKey, inspectorCase);
      dossierByCaseId.set(caseId, dossier);
      const projectCases = casesByProject.get(projectId) ?? [];
      projectCases.push(inspectorCase);
      casesByProject.set(projectId, projectCases);
    }

    const defaultCase = caseById.get(inspector.default_case_id);
    if (!defaultCase) {
      inspectorRuntime = unavailableInspectorRuntime(
        "INSPECTOR_INVALID_DEFAULT",
      );
      return inspectorSelection();
    }
    inspectorRuntime = {
      available: true,
      reasonCode: null,
      cases,
      caseById,
      caseByRoute,
      casesByProject,
      caseByProjectTypology,
      dossierByCaseId,
      defaultCase,
    };
    setInspectorCase(defaultCase);
    return inspectorSelection();
  } catch {
    resetInspectorSelection();
    inspectorRuntime = unavailableInspectorRuntime("INSPECTOR_INVALID_DATA");
    return inspectorSelection();
  }
}

export function inspectorSelection() {
  return structuredClone({
    available: inspectorRuntime.available,
    reasonCode: inspectorRuntime.reasonCode,
    caseId: state.inspectorPreset,
    projectId: state.inspectorProjectId,
    typologyId: state.inspectorTypologyId,
    evidenceId: state.inspectorEvidenceId,
    preset: state.inspectorPreset,
    dialogOpen: state.inspectorDialogOpen,
  });
}

export function dispatchInspector(action) {
  if (!action || typeof action !== "object" || Array.isArray(action)) {
    throw new TypeError("Inspector action must be an object");
  }
  if (typeof action.type !== "string" || !action.type) {
    throw new TypeError("Inspector action type is required");
  }
  if (!inspectorRuntime.available) {
    return inspectorTransition({
      changed: false,
      corrected: false,
      reasonCode: inspectorRuntime.reasonCode,
      announcement: "El inspector de evidencia no está disponible.",
      focusIntent: "none",
    });
  }

  const before = inspectorSelection();
  let corrected = false;
  let reasonCode = null;
  let announcement = "";
  let focusIntent = "none";

  if (
    action.type === INSPECTOR_ACTIONS.selectCase ||
    action.type === INSPECTOR_ACTIONS.selectPreset
  ) {
    const requested =
      action.caseId ??
      action.case_id ??
      action.routeSlug ??
      action.route_slug ??
      action.preset ??
      action.value;
    const selected = resolveInspectorCase(requested);
    const target = selected ?? inspectorRuntime.defaultCase;
    corrected = !selected;
    reasonCode = corrected ? "INSPECTOR_CASE_CORRECTED" : null;
    if (target.case_id !== state.inspectorPreset) setInspectorCase(target);
    announcement = corrected
      ? "La selección no estaba disponible; se restauró el expediente predeterminado."
      : "Expediente de evidencia actualizado.";
    focusIntent = "selection";
  } else if (action.type === INSPECTOR_ACTIONS.selectProject) {
    const requested = action.projectId ?? action.project_id ?? action.value;
    const projectCases =
      typeof requested === "string"
        ? inspectorRuntime.casesByProject.get(requested)
        : null;
    let target = null;
    if (projectCases?.length) {
      const current = currentInspectorCase();
      target =
        current?.project_id === requested ? current : projectCases[0];
    } else {
      target = inspectorRuntime.defaultCase;
      corrected = true;
      reasonCode = "INSPECTOR_PROJECT_CORRECTED";
    }
    if (target.case_id !== state.inspectorPreset) setInspectorCase(target);
    announcement = corrected
      ? "El proyecto no estaba disponible; se restauró el expediente predeterminado."
      : "Proyecto del inspector actualizado.";
    focusIntent = "selection";
  } else if (action.type === INSPECTOR_ACTIONS.selectTypology) {
    const requested =
      action.typologyId ?? action.typology_id ?? action.value;
    const projectCases = inspectorRuntime.casesByProject.get(
      state.inspectorProjectId,
    );
    let target =
      typeof requested === "string" && state.inspectorProjectId
        ? inspectorRuntime.caseByProjectTypology.get(
            inspectorPairKey(state.inspectorProjectId, requested),
          )
        : null;
    if (!target) {
      target = projectCases?.[0] ?? inspectorRuntime.defaultCase;
      corrected = true;
      reasonCode = "INSPECTOR_TYPOLOGY_CORRECTED";
    }
    if (target.case_id !== state.inspectorPreset) setInspectorCase(target);
    announcement = corrected
      ? "La tipología no estaba disponible; se restauró una selección válida."
      : "Tipología del inspector actualizada.";
    focusIntent = "selection";
  } else if (action.type === INSPECTOR_ACTIONS.openEvidence) {
    const current = currentInspectorCase();
    const requested =
      action.evidenceId ?? action.evidence_id ?? action.value ?? null;
    const hasExplicitEvidence =
      typeof requested === "string" && requested.length > 0;
    let evidenceId =
      !hasExplicitEvidence
        ? current?.primary_evidence_id ?? null
        : requested;
    if (!current?.evidence_ids?.includes(evidenceId)) {
      evidenceId = current?.primary_evidence_id ?? null;
      corrected = hasExplicitEvidence;
      reasonCode =
        hasExplicitEvidence && evidenceId
          ? "INSPECTOR_EVIDENCE_CORRECTED"
          : "INSPECTOR_EVIDENCE_UNAVAILABLE";
    }
    if (evidenceId && current.evidence_ids.includes(evidenceId)) {
      state.inspectorEvidenceId = evidenceId;
      state.inspectorDialogOpen = true;
      announcement = corrected
        ? "La evidencia solicitada no estaba disponible; se abrió la evidencia principal."
        : "Evidencia abierta.";
      focusIntent = "dialog";
    } else {
      state.inspectorEvidenceId = null;
      state.inspectorDialogOpen = false;
      announcement = "Este expediente no tiene evidencia disponible para abrir.";
      focusIntent = "none";
    }
  } else if (action.type === INSPECTOR_ACTIONS.closeEvidence) {
    state.inspectorEvidenceId = null;
    state.inspectorDialogOpen = false;
    announcement = "Visor de evidencia cerrado.";
    focusIntent = before.dialogOpen || before.evidenceId ? "restore" : "none";
  } else {
    throw new TypeError(`Unsupported inspector action: ${action.type}`);
  }

  const after = inspectorSelection();
  const changed = inspectorSelectionChanged(before, after);
  if (
    !changed &&
    !corrected &&
    action.type !== INSPECTOR_ACTIONS.openEvidence
  ) {
    announcement = "";
    focusIntent = "none";
  }
  if (
    changed &&
    (before.projectId !== after.projectId ||
      before.typologyId !== after.typologyId)
  ) {
    recomputeAssistantResponse();
  }
  return inspectorTransition({
    changed,
    corrected,
    reasonCode,
    announcement,
    focusIntent,
  });
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
  const resetsHistory = action?.type === "RESET";
  const defaultHistoryFilters = resetsHistory
    ? normalizeHistoryFilters()
    : null;
  const historyChangedByReset =
    resetsHistory &&
    (JSON.stringify(state.historyFilters) !==
      JSON.stringify(defaultHistoryFilters) ||
      state.selectedHistoryEventId !== null);
  if (resetsHistory) {
    state.historyFilters = defaultHistoryFilters;
    state.selectedHistoryEventId = null;
  }

  if (!changed) {
    if (historyChangedByReset) recomputeHistoryContext();
    applyDispatchEffects(options);
    return {
      ...next,
      recomputed: false,
      revision: state.scenarioContextRevision,
      history_recomputed: historyChangedByReset,
      history_revision: state.historyContextRevision,
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
    history_recomputed: true,
    history_revision: state.historyContextRevision,
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
    state.benchmarkContext = null;
    state.historyContext = null;
    state.journeyContext = null;
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
  state.benchmarkContext = {
    ...buildBenchmarkContext({
      data: dataValue,
      scenarioContext: benchmarkScenarioProjection(state.scenarioContext),
      targetScenario: benchmarkTargetScenario(),
    }),
    revision,
  };
  recomputeHistoryContext({ recomputeJourney: false });
  normalizeScenarioSelections();
  recomputeAssistantResponse({ recomputeJourney: false });
  recomputeJourneyContext();
  return state.scenarioContext;
}

export function recomputeHistoryContext({ recomputeJourney = true } = {}) {
  if (!dataValue || !state.scenarioContext) {
    state.historyContext = null;
    state.selectedHistoryEventId = null;
    if (recomputeJourney) recomputeJourneyContext();
    return null;
  }
  const revision = state.historyContextRevision + 1;
  const scenarioProjection = historyScenarioProjection(state.scenarioContext);
  state.historyContextRevision = revision;
  state.historyContext = {
    ...buildHistoryContext({
      data: dataValue,
      scenarioContext: scenarioProjection,
      filters: state.historyFilters,
    }),
    scenario: scenarioProjection,
    revision,
    scenario_revision: state.scenarioContextRevision,
  };
  normalizeHistorySelection();
  if (recomputeJourney) recomputeJourneyContext();
  return state.historyContext;
}

export function setHistoryFilters(patch = {}) {
  const next = normalizeHistoryFilters({
    ...state.historyFilters,
    ...(patch ?? {}),
  });
  if (JSON.stringify(next) === JSON.stringify(state.historyFilters)) {
    return {
      changed: false,
      revision: state.historyContextRevision,
      historyContext: state.historyContext,
    };
  }
  state.historyFilters = next;
  const historyContext = recomputeHistoryContext();
  return {
    changed: true,
    revision: state.historyContextRevision,
    historyContext,
  };
}

export function selectHistoryEvent(historyEventId) {
  if (historyEventId === null) {
    state.selectedHistoryEventId = null;
    return true;
  }
  const requested = String(historyEventId ?? "");
  if (
    !requested ||
    !state.historyContext?.timeline?.some(
      ({ history_event_id: candidate }) => candidate === requested,
    )
  ) {
    return false;
  }
  state.selectedHistoryEventId = requested;
  return true;
}

export function setAssistantDraft(input = "", intentId = null) {
  const nextInput = String(input ?? "");
  const nextIntentId =
    typeof intentId === "string" && intentId ? intentId : null;
  const changed =
    nextInput !== state.assistantInput ||
    nextIntentId !== state.assistantIntentId;
  state.assistantInput = nextInput;
  state.assistantIntentId = nextIntentId;
  if (changed) {
    state.assistantResponse = null;
    recomputeJourneyContext();
  }
  return {
    changed,
    input: state.assistantInput,
    intentId: state.assistantIntentId,
  };
}

export function generateAssistantResponse({
  input = state.assistantInput,
  intentId = state.assistantIntentId,
  recomputeJourney = true,
} = {}) {
  state.assistantInput = String(input ?? "");
  state.assistantIntentId =
    typeof intentId === "string" && intentId ? intentId : null;
  state.assistantResponse = buildAssistantResponse({
    data: dataValue,
    scenarioContext: state.scenarioContext,
    historyContext: state.historyContext,
    benchmarkContext: state.benchmarkContext,
    comparisonModel: currentComparisonModel(),
    inspectorDossier: currentInspectorDossier(),
    input: state.assistantInput,
    intentId: state.assistantIntentId,
  });
  state.assistantIntentId = state.assistantResponse.intentId ?? null;
  state.assistantResponseRevision += 1;
  if (recomputeJourney) recomputeJourneyContext();
  return structuredClone(state.assistantResponse);
}

export function recomputeAssistantResponse({ recomputeJourney = true } = {}) {
  if (!state.assistantResponse) {
    if (recomputeJourney) recomputeJourneyContext();
    return null;
  }
  return generateAssistantResponse({ recomputeJourney });
}

export function clearAssistantResponse() {
  const changed = Boolean(
    state.assistantInput ||
      state.assistantIntentId ||
      state.assistantResponse,
  );
  state.assistantInput = "";
  state.assistantIntentId = null;
  state.assistantResponse = null;
  if (changed) state.assistantResponseRevision += 1;
  if (changed) recomputeJourneyContext();
  return changed;
}

export function recomputeJourneyContext() {
  if (!dataValue) {
    state.journeyContext = null;
    return null;
  }
  const revision = state.journeyContextRevision + 1;
  const context = buildJourneyContext({
    contractVersion: dataValue.metadata?.contract_version ?? null,
    metadataCounts: dataValue.metadata?.counts ?? null,
    pilotCounts: dataValue.pilot?.counts ?? null,
    scenarioContext: state.scenarioContext,
    geographyArtifact: state.geographyArtifact,
    qualityDossier:
      inspectorRuntime.dossierByCaseId.get(JOURNEY_QUALITY_CASE_ID) ?? null,
    benchmarkContext: state.benchmarkContext,
    comparisonModel: currentComparisonModel(),
    historyContext: state.historyContext,
    assistantCatalog: dataValue.assistant,
    assistantResponse: state.assistantResponse,
  });
  state.journeyContextRevision = revision;
  state.journeyContext = {
    ...context,
    revision,
    scenarioRevision: state.scenarioContextRevision,
    historyRevision: state.historyContextRevision,
    assistantResponseRevision: state.assistantResponseRevision,
  };
  return state.journeyContext;
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

function unavailableInspectorRuntime(reasonCode) {
  return {
    available: false,
    reasonCode,
    cases: [],
    caseById: new Map(),
    caseByRoute: new Map(),
    casesByProject: new Map(),
    caseByProjectTypology: new Map(),
    dossierByCaseId: new Map(),
    defaultCase: null,
  };
}

function resetInspectorSelection() {
  state.inspectorProjectId = null;
  state.inspectorTypologyId = null;
  state.inspectorEvidenceId = null;
  state.inspectorPreset = null;
  state.inspectorDialogOpen = false;
}

function inspectorPairKey(projectId, typologyId) {
  return `${projectId}\u0000${typologyId}`;
}

function compareInspectorIds(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function setInspectorCase(inspectorCase) {
  state.inspectorProjectId = inspectorCase.project_id;
  state.inspectorTypologyId = inspectorCase.typology_id;
  state.inspectorEvidenceId = null;
  state.inspectorPreset = inspectorCase.case_id;
  state.inspectorDialogOpen = false;
}

function currentInspectorCase() {
  return inspectorRuntime.caseById.get(state.inspectorPreset) ?? null;
}

function currentInspectorDossier() {
  const inspectorCase = currentInspectorCase();
  if (!inspectorRuntime.available || !inspectorCase || !dataValue?.model) {
    return null;
  }
  return inspectorRuntime.dossierByCaseId.get(inspectorCase.case_id) ?? null;
}

function currentComparisonModel() {
  return buildComparisonModel({
    benchmarkContext: state.benchmarkContext,
    selectedProjectIds: state.compareProjectIds
      .map(canonicalIdFromLegacy)
      .filter(Boolean),
    includeTargetScenario: Boolean(state.compareIncludeTarget),
  });
}

function resolveInspectorCase(value) {
  if (typeof value !== "string" || !value) return null;
  return (
    inspectorRuntime.caseById.get(value) ??
    inspectorRuntime.caseByRoute.get(value) ??
    null
  );
}

function inspectorSelectionChanged(before, after) {
  return (
    before.projectId !== after.projectId ||
    before.typologyId !== after.typologyId ||
    before.evidenceId !== after.evidenceId ||
    before.preset !== after.preset ||
    before.dialogOpen !== after.dialogOpen
  );
}

function inspectorTransition({
  changed,
  corrected,
  reasonCode,
  announcement,
  focusIntent,
}) {
  return {
    changed: Boolean(changed),
    corrected: Boolean(corrected),
    reasonCode: reasonCode ?? null,
    announcement: String(announcement ?? ""),
    focusIntent: focusIntent ?? "none",
    selection: inspectorSelection(),
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
  const status = value.status ?? "missing";
  return {
    status,
    geojson: status === "valid" ? value.geojson ?? null : null,
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

  const requestedCompareCount = state.compareProjectIds.length;
  const existingComparableIds = [
    ...new Set(
      state.compareProjectIds
        .map(canonicalIdFromLegacy)
        .filter(
          (projectId) =>
            projectId && context.comparable_project_ids.includes(projectId),
        )
        .map(legacyIdFromCanonical)
        .filter(Boolean),
    ),
  ].slice(0, 3);
  const rankedComparableIds = context.comparable_project_ids
    .map(legacyIdFromCanonical)
    .filter(Boolean);
  const minimumCompareCount = requestedCompareCount === 0 ? 3 : 2;
  state.compareProjectIds = [...existingComparableIds];
  for (const projectId of rankedComparableIds) {
    if (state.compareProjectIds.length >= minimumCompareCount) break;
    if (!state.compareProjectIds.includes(projectId)) {
      state.compareProjectIds.push(projectId);
    }
  }
  if (!state.benchmarkContext?.targetScenario) {
    state.compareIncludeTarget = false;
  }
}

function normalizeHistorySelection() {
  if (
    state.selectedHistoryEventId &&
    !state.historyContext?.timeline?.some(
      ({ history_event_id: candidate }) =>
        candidate === state.selectedHistoryEventId,
    )
  ) {
    state.selectedHistoryEventId = null;
  }
}

function historyScenarioProjection(context) {
  return {
    scenario: structuredClone(context.scenario),
    scope: structuredClone(context.scope),
    comparable_project_ids: [...context.comparable_project_ids],
    cutoff_at: context.cutoff_at,
    scenario_status: context.scenario_status,
    comparability_status: context.comparability_status,
  };
}

function benchmarkScenarioProjection(context) {
  return {
    comparable_project_ids: [...context.comparable_project_ids],
    district_id: context.scope?.district_id ?? state.scenario?.district_id ?? null,
    scope_mode: context.scope?.scope_mode ?? state.scenario?.scope_mode ?? null,
    quadrant_id: context.scope?.quadrant_id ?? state.scenario?.quadrant_id ?? null,
    radius_meters:
      context.scope?.radius_meters ?? state.scenario?.radius_meters ?? null,
  };
}

function benchmarkTargetScenario() {
  const targetPrice = state.scenario?.target_price_pen;
  const targetArea = state.scenario?.target_area_m2;
  if (targetPrice == null && targetArea == null) return null;
  return {
    target_price_pen: targetPrice,
    target_area_m2: targetArea,
    district: districtNameForId(state.scenario.district_id),
    delivery_status:
      state.scenario.delivery_year === "all"
        ? null
        : String(state.scenario.delivery_year),
  };
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
