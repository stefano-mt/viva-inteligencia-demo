import * as domain from "./domain.js";
import {
  parseHashRoute,
  replaceCanonicalJourneyLocation,
  viewFromHash,
} from "./navigation.js";
import { JOURNEY_STAGES, journeyStageById } from "./journey.js";
import {
  INSPECTOR_ACTIONS,
  canonicalScenarioSearch,
  clearAssistantResponse,
  dispatchInspector,
  dispatchScenario,
  generateAssistantResponse,
  recomputeAssistantResponse,
  resetApplicationState,
  resolveDistrictId,
  selectHistoryEvent,
  setAssistantDraft,
  setHistoryFilters,
  state,
} from "./state.js";

const {
  getProjects,
  getProjectsByDistrict,
  getScenarioProjects,
  filterCatalogProjects,
  compareCandidates,
  sortProjects,
  buildBenchmark,
  districtBenchmarks,
  getCompetitors,
  comparableScore,
  classifyPricePosition,
  buildCommercialRecommendation,
  buildOpportunitySignals,
  checklistRisks,
  messageAngles,
  marketEvents,
  weeklyRecommendations,
  districtInsight,
  districtExecutiveReading,
  competitiveReading,
  comparisonConclusion,
  competitionLevel,
  competitionClass,
  renderSignals,
  kpiCard,
  miniMetric,
  projectListCard,
  competitorCard,
  compareCandidate,
  compareProjectCard,
  comparisonMetric,
  signalCard,
  checkItem,
  barRow,
  summaryBar,
  districtTile,
  rangeGauge,
  scatterPlot,
  renderSectionGuide,
  componentHelp,
  panelActions,
  ensureSelectedProject,
  getDistricts,
  getTypologies,
  getPhases,
  getDeliveryYears,
  getBedroomOptions,
  defaultDistrict,
  metadataDate,
  extractDistrictFromText,
  projectHasBedroom,
  projectPriceM2,
  projectArea,
  getTargetPriceM2,
  countBy,
  sum,
  average,
  median,
  percentile,
  positiveNumber,
  numberOrZero,
  isPositive,
  sortNumeric,
  firstAvailable,
  toArray,
  unique,
  clamp,
  normalizeSearch,
  shortText,
  safeUrl,
  optionList,
  sortLabel,
  bedroomsLabel,
  deliveryLabel,
  areaLabel,
  priceM2,
  money,
  formatRange,
  formatNumber,
  formatPercent,
  formatDate,
  emptyState,
  loadingTemplate,
  errorTemplate,
  chip,
  canonicalProjectId,
  findProjectById,
  getScenarioDisplayProjects,
  isComparableProject,
  isScenarioDisplayProject,
  legacyProjectId,
  escapeHtml,
  escapeAttr,
} = domain;

export const SCENARIO_EVENTS = Object.freeze({
  territory: "viva:scenario-territory",
  product: "viva:scenario-product",
  visualization: "viva:scenario-visualization",
  projectSelect: "viva:scenario-project-select",
});

export const INSPECTOR_EVENTS = Object.freeze({
  caseSelect: "viva:inspector-case-select",
  projectSelect: "viva:inspector-project-select",
  typologySelect: "viva:inspector-typology-select",
  presetSelect: "viva:inspector-preset-select",
  evidenceOpen: "viva:inspector-evidence-open",
  evidenceClose: "viva:inspector-evidence-close",
});

export const COMPARISON_EVENTS = Object.freeze({
  selection: "viva:comparison-selection",
  target: "viva:comparison-target",
  rowFocus: "viva:comparison-row-focus",
});

const HISTORY_FILTER_VALUES = Object.freeze({
  statuses: Object.freeze(["certified", "reviewable", "insufficient"]),
  validities: Object.freeze(["current", "aging", "historical", "unknown"]),
  directions: Object.freeze(["increase", "decrease", "unchanged"]),
});

export const INSPECTOR_PRESET_CASE_IDS = Object.freeze({
  inconsistent: "case:f3-ct-g-pardo",
  certified: "case:f3-ct-d-finishes",
  reviewable: "case:f3-floor-review",
  insufficient_restricted: "case:f3-insufficient-source",
});

let restoreFocus = null;
let renderApp = null;
let scenarioUrlInitialized = false;
let scenarioDocumentEventsBound = false;
let scenarioHistoryEventsBound = false;
let scenarioHistorySearch = null;
let inspectorDocumentEventsBound = false;
let comparisonDocumentEventsBound = false;
let inspectorRestoreFocusId = null;
let lastJourneyRoute = null;
const inspectorBoundElements = new WeakSet();
const inspectorDialogBoundElements = new WeakSet();

export function bindEvents(render) {
  renderApp = render;
  bindInspectorDocumentEvents();
  bindComparisonDocumentEvents();
  if (initializeScenarioFromLocation()) return;
  bindScenarioHistoryEvents();
  bindScenarioDocumentEvents();
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextView = button.dataset.view;
      state.scenarioFocusId = button.dataset.focusTarget ?? null;
      state.mobileNavOpen = false;
      if (viewFromHash() === nextView) {
        render();
      } else {
        window.location.hash = nextView;
      }
    });
  });

  document.getElementById("menu-toggle")?.addEventListener("click", () => {
    state.mobileNavOpen = true;
    render();
    document.querySelector(".sidebar-close")?.focus();
  });
  document.querySelectorAll("[data-nav-close]").forEach((button) => {
    button.addEventListener("click", () => {
      state.mobileNavOpen = false;
      render();
      document.getElementById("menu-toggle")?.focus();
    });
  });

  document.getElementById("top-district")?.addEventListener("change", (event) => {
    changeDistrict(event.target.value);
  });
  document.getElementById("market-district")?.addEventListener("change", (event) => {
    changeDistrict(event.target.value);
  });
  document.getElementById("reset-scenario")?.addEventListener("click", () => {
    resetScenario();
  });
  document.querySelectorAll("[data-district-chip]").forEach((button) => {
    button.addEventListener("click", () => {
      changeDistrict(button.dataset.districtChip, {
        focusId: button.id || null,
      });
    });
  });
  document.querySelectorAll("[data-scenario-scope]").forEach((button) => {
    button.addEventListener("click", () => {
      setScenarioScope(button.dataset.scenarioScope, {
        focusId: button.id,
      });
    });
  });
  document.querySelectorAll("[data-scenario-quadrant]").forEach((button) => {
    button.addEventListener("click", () => {
      setScenarioTerritory(
        {
          scope_mode: "quadrant",
          quadrant_id: button.dataset.scenarioQuadrant,
        },
        { focusId: button.id },
      );
    });
  });
  document.querySelectorAll("[data-scenario-radius]").forEach((button) => {
    button.addEventListener("click", () => {
      const radiusMeters = Number(button.dataset.scenarioRadius);
      setScenarioTerritory(
        {
          scope_mode: "radius",
          radius_meters: radiusMeters,
          center_latitude: state.scenario.center_latitude,
          center_longitude: state.scenario.center_longitude,
        },
        { focusId: button.id },
      );
    });
  });
  document
    .querySelectorAll("[data-scenario-visualization]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        setScenarioVisualization(
          button.dataset.scenarioVisualization,
          { focusId: button.id },
        );
      });
    });
  document.querySelectorAll("[data-scenario-project]").forEach((control) => {
    control.addEventListener(
      control.tagName === "SELECT" ? "change" : "click",
      () => {
        selectScenarioProject(
          control.value || control.dataset.scenarioProject,
          { focusId: control.id || null },
        );
      },
    );
  });

  document.querySelectorAll("details.component-help").forEach((details) => {
    details.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !details.open) return;
      event.preventDefault();
      details.open = false;
      details.querySelector("summary")?.focus();
    });
  });

  const productForm = document.getElementById("scenario-product-form");
  productForm?.addEventListener("submit", handleScenarioProductSubmit);
  productForm?.addEventListener("reset", handleScenarioProductReset);

  document.querySelectorAll("[data-project-filter]").forEach((control) => {
    control.addEventListener(control.tagName === "INPUT" ? "input" : "change", (event) => {
      state.projectFilters[event.target.dataset.projectFilter] = event.target.value;
      state.projectLimit = 18;
      rememberFocus(event.target);
      render();
    });
  });

  document.getElementById("load-more-projects")?.addEventListener("click", () => {
    state.projectLimit += 18;
    render();
  });

  document.querySelectorAll("[data-select-project]").forEach((button) => {
    button.addEventListener("click", () => {
      selectScenarioProject(button.dataset.selectProject, {
        focusId: button.id || null,
      });
    });
  });

  bindComparisonElementEvents();

  bindAssistantElementEvents();

  bindHistoryElementEvents();

  bindInspectorElementEvents();
  bindJourneyRouteEffects();
}

export function applyJourneyRouteEffects({
  route,
  previousRoute = null,
  documentRef = globalThis.document,
} = {}) {
  const stage =
    route?.view === "journey" ? journeyStageById(route.stageId) : null;
  if (!stage) {
    state.journeyAnnouncement = "";
    return { changed: false, focused: false, announcement: "" };
  }

  const changed = Boolean(
    previousRoute &&
      (previousRoute.view !== route.view ||
        previousRoute.stageId !== route.stageId),
  );
  if (!changed) {
    return {
      changed: false,
      focused: false,
      announcement: state.journeyAnnouncement,
    };
  }

  const stageAnnouncement = `Etapa ${stage.position} de ${JOURNEY_STAGES.length}: ${stage.label}`;
  const liveRegion = documentRef?.getElementById?.("journey-live");
  const existingAnnouncement = String(liveRegion?.textContent ?? "").trim();
  const announcement = existingAnnouncement || stageAnnouncement;
  state.journeyAnnouncement = announcement;
  if (liveRegion) liveRegion.textContent = announcement;
  const title = documentRef?.getElementById?.("journey-title");
  if (title) {
    title.setAttribute?.("tabindex", "-1");
    title.focus?.({ preventScroll: true });
  }
  return {
    changed: true,
    focused: Boolean(title),
    announcement,
  };
}

function bindJourneyRouteEffects() {
  const route = parseHashRoute(globalThis.window?.location?.hash ?? "");
  applyJourneyRouteEffects({ route, previousRoute: lastJourneyRoute });
  lastJourneyRoute = {
    view: route.view,
    stageId: route.stageId ?? null,
  };
}

function bindHistoryElementEvents() {
  document.querySelectorAll("[data-history-filter]").forEach((control) => {
    control.addEventListener("change", () => {
      const key = control.dataset.historyFilter;
      const allowed = HISTORY_FILTER_VALUES[key];
      if (!allowed) return;
      const value = control.value;
      const selected = value === "all" ? [...allowed] : [value];
      const transition = setHistoryFilters({ [key]: selected });
      renderHistoryTransition({
        changed: transition.changed,
        focusId: control.id,
        announcement: `${state.historyContext?.coverage?.shown_count ?? 0} señales visibles después de filtrar.`,
      });
    });
  });

  document.querySelectorAll("[data-history-clear]").forEach((button) => {
    button.addEventListener("click", () => {
      const transition = setHistoryFilters({
        statuses: [...HISTORY_FILTER_VALUES.statuses],
        validities: [...HISTORY_FILTER_VALUES.validities],
        directions: [...HISTORY_FILTER_VALUES.directions],
      });
      renderHistoryTransition({
        changed: transition.changed,
        focusId: button.id || "history-status-filter",
        announcement: "Filtros del histórico restablecidos.",
      });
    });
  });

  document.querySelectorAll("[data-history-event]").forEach((button) => {
    button.addEventListener("click", () => {
      const eventId = button.dataset.historyEvent;
      const nextId = state.selectedHistoryEventId === eventId ? null : eventId;
      if (!selectHistoryEvent(nextId)) return;
      renderHistoryTransition({
        changed: true,
        focusId: button.id,
        announcement: nextId
          ? "Detalle y evidencia de la señal abiertos."
          : "Detalle de la señal cerrado.",
      });
    });
  });

  document.querySelectorAll("[data-history-agenda-event]").forEach((button) => {
    button.addEventListener("click", () => {
      const eventId = button.dataset.historyAgendaEvent;
      if (!selectHistoryEvent(eventId)) {
        announceWithoutRender(
          "La señal de origen ya no pertenece al escenario visible.",
        );
        return;
      }
      renderHistoryTransition({
        changed: true,
        focusId: `history-evidence-${domIdentifier(eventId)}`,
        announcement: "Se abrió la señal que origina esta acción.",
      });
    });
  });

  document.querySelectorAll("[data-history-focus]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = document.getElementById(button.dataset.historyFocus);
      if (!target) {
        announceWithoutRender("El control solicitado no está disponible.");
        return;
      }
      target.focus();
      target.scrollIntoView?.({ block: "center" });
      announceWithoutRender("Filtros del histórico listos para revisar.");
    });
  });

  document.querySelectorAll("[data-history-priority]").forEach((button) => {
    button.addEventListener("click", () => {
      const eventId = button.dataset.historyPriority;
      if (!selectHistoryEvent(eventId)) return;
      renderHistoryTransition({
        changed: true,
        focusId: `history-evidence-${domIdentifier(eventId)}`,
        announcement: "Se abrió la señal certificada prioritaria.",
      });
    });
  });

  document.querySelectorAll("[data-history-project]").forEach((button) => {
    button.addEventListener("click", () => {
      const selected = selectScenarioProject(button.dataset.historyProject, {
        render: false,
      });
      if (!selected) {
        announceWithoutRender(
          "El proyecto ya no pertenece a los comparables visibles del escenario.",
        );
        return;
      }
      state.mobileNavOpen = false;
      if (viewFromHash() === "projects") renderApp?.();
      else window.location.hash = "projects";
    });
  });

  document.querySelectorAll("[data-history-reset]").forEach((button) => {
    button.addEventListener("click", () => {
      resetScenario({
        announce: "Escenario reiniciado para reconstruir el histórico.",
        focusId: button.id || null,
      });
    });
  });
}

function bindAssistantElementEvents() {
  const form = document.getElementById("assistant-form");
  const input = document.getElementById("assistant-input");

  input?.addEventListener("input", () => {
    setAssistantDraft(input.value, null);
    const counter = document.getElementById("assistant-input-count");
    const maximum = Number(input.maxLength > 0 ? input.maxLength : 500);
    if (counter) {
      counter.textContent = `${input.value.length} de ${maximum} caracteres`;
    }
    const error = document.getElementById("assistant-input-error");
    if (error) {
      error.hidden = true;
      error.textContent = "";
    }
  });

  input?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || !event.ctrlKey) return;
    event.preventDefault();
    form?.requestSubmit();
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = input?.value ?? "";
    setAssistantDraft(query, state.assistantIntentId);
    const result = generateAssistantResponse();
    state.scenarioFocusId = "assistant-response-title";
    renderApp?.();
    const liveRegion = document.getElementById("assistant-live");
    if (liveRegion) {
      liveRegion.textContent = assistantAnnouncement(
        result?.status,
      );
    }
    document.getElementById("assistant-response-title")?.focus();
  });

  document.querySelectorAll("[data-assistant-question]").forEach((button) => {
    button.addEventListener("click", () => {
      setAssistantDraft(
        button.dataset.assistantQuestion ?? "",
        button.dataset.assistantIntent || null,
      );
      state.scenarioFocusId = "assistant-input";
      renderApp?.();
      const nextInput = document.getElementById("assistant-input");
      nextInput?.focus();
      nextInput?.setSelectionRange?.(
        nextInput.value.length,
        nextInput.value.length,
      );
    });
  });

  document.querySelector("[data-assistant-clear]")?.addEventListener("click", () => {
    clearAssistantResponse();
    state.scenarioFocusId = "assistant-input";
    renderApp?.();
    document.getElementById("assistant-input")?.focus();
  });

  document.querySelectorAll("[data-assistant-reference]").forEach((button) => {
    button.addEventListener("click", () => {
      navigateAssistantReference({
        id: button.dataset.assistantReference,
        type: button.dataset.assistantReferenceType,
        route: button.dataset.assistantReferenceRoute,
        projectId: button.dataset.assistantProject,
      });
    });
  });

  document.querySelectorAll("[data-assistant-route]").forEach((button) => {
    button.addEventListener("click", () => {
      navigateAssistantReference({
        id: button.dataset.assistantDetail,
        type: "action",
        route: button.dataset.assistantRoute,
        projectId: null,
      });
    });
  });
}

function navigateAssistantReference({ id, type, route, projectId }) {
  if (route === "assistant") {
    clearAssistantResponse();
    state.mobileNavOpen = false;
    state.scenarioFocusId = null;
    if (viewFromHash() === "assistant") renderApp?.();
    else window.location.hash = "assistant";
    document.querySelector("[data-assistant-question]")?.focus();
    return;
  }
  const normalizedRoute = route === "benchmark" ? "market" : route;
  const targetRoute = [
    "dashboard",
    "projects",
    "inspector",
    "market",
    "compare",
    "activity",
    "trust",
  ].includes(normalizedRoute)
    ? normalizedRoute
    : "dashboard";

  if (targetRoute === "activity" && type === "history_event" && id) {
    selectHistoryEvent(id);
  }
  if (targetRoute === "inspector" && projectId) {
    selectInspectorProject(projectId, { render: false });
    if (type === "evidence" && id) {
      openInspectorEvidence(id, { render: false });
    }
  }
  if (targetRoute === "projects" && projectId) {
    selectScenarioProject(projectId, { render: false });
  }

  state.mobileNavOpen = false;
  state.scenarioFocusId = null;
  if (viewFromHash() === targetRoute) renderApp?.();
  else window.location.hash = targetRoute;
}

function assistantAnnouncement(status) {
  return {
    ready: "Lectura generada. Revisa la respuesta y sus referencias.",
    refused: "La demo aplicó un límite y explica qué información no puede afirmar.",
    insufficient: "La lectura está disponible con evidencia insuficiente.",
    unknown_intent: "La pregunta no coincide con el catálogo compatible.",
    invalid_input: "La pregunta necesita un ajuste antes de generar una lectura.",
    contract_unavailable: "El asistente no está disponible para este contrato.",
  }[status] ?? "La lectura terminó sin un resultado disponible.";
}

function renderHistoryTransition({ changed, focusId, announcement }) {
  if (!changed) {
    announceWithoutRender(announcement);
    return;
  }
  state.scenarioFocusId = focusId ?? null;
  renderApp?.();
  const liveRegion = document.getElementById("history-live");
  if (liveRegion) liveRegion.textContent = announcement;
}

function domIdentifier(value) {
  return String(value ?? "history-event").replace(/[^a-zA-Z0-9_-]/gu, "-");
}

export function changeDistrict(district, options = {}) {
  if (!district) return;
  const districtId = resolveDistrictId(district);
  if (!districtId) return;
  return runScenarioAction(
    {
      type: "SET_TERRITORY",
      patch: { district_id: districtId },
    },
    {
      announce: `Distrito objetivo actualizado a ${district}.`,
      ...options,
    },
  );
}

export function setScenarioTerritory(patch, options = {}) {
  return runScenarioAction(
    { type: "SET_TERRITORY", patch },
    options,
  );
}

export function setScenarioScope(scopeMode, options = {}) {
  if (scopeMode === "district") {
    return setScenarioTerritory(
      { scope_mode: "district" },
      {
        announce: "Alcance actualizado al distrito completo.",
        ...options,
      },
    );
  }

  const district = state.scenarioEnvironment?.geography.districts.find(
    ({ district_id: districtId }) =>
      districtId === state.scenario?.district_id,
  );
  if (scopeMode === "quadrant") {
    const firstQuadrant =
      district?.quadrants?.find(({ quadrant_id: quadrantId }) =>
        ["NW", "NE", "SW", "SE"].includes(quadrantId),
      )?.quadrant_id ?? "NW";
    return setScenarioTerritory(
      {
        scope_mode: "quadrant",
        quadrant_id: firstQuadrant,
      },
      {
        announce: `Cuadrante analítico ${firstQuadrant} aplicado.`,
        ...options,
      },
    );
  }
  if (scopeMode === "radius") {
    return setScenarioTerritory(
      {
        scope_mode: "radius",
        center_latitude: district?.median_latitude,
        center_longitude: district?.median_longitude,
        radius_meters: 1000,
      },
      {
        announce:
          "Radio de 1 km aplicado desde el Centro observado del distrito.",
        ...options,
      },
    );
  }
  return null;
}

export function applyScenarioProduct(patch, options = {}) {
  return runScenarioAction(
    { type: "APPLY_PRODUCT_FILTERS", patch },
    options,
  );
}

export function setScenarioVisualization(visualization, options = {}) {
  return applyScenarioProduct(
    { visualization },
    options,
  );
}

export function selectScenarioProject(
  projectId,
  { render = true, focusId = null } = {},
) {
  const project = findProjectById(projectId);
  if (!project || !isScenarioDisplayProject(project)) return false;
  state.selectedProjectId = project.id;
  state.scenarioFocusId = focusId;
  if (render) renderApp?.();
  return true;
}

export function resetScenario(options = {}) {
  const announcement =
    options.announce ??
    "Escenario y recorrido reiniciados. Etapa 1 de 6: Escala.";
  const transition = resetApplicationState({
    announce: announcement,
    focusId: "journey-title",
  });
  const competitors = getCompetitors(state.strategy, 6);
  const displayProjects = getScenarioDisplayProjects();
  state.selectedProjectId =
    competitors[0]?.id ?? displayProjects[0]?.id ?? null;
  state.compareProjectIds = [];
  replaceCanonicalJourneyLocation({
    search: canonicalScenarioSearch(),
    stageId: "scale",
  });
  scenarioHistorySearch = canonicalScenarioSearch();
  lastJourneyRoute = null;
  if (options.render !== false) {
    renderApp?.();
    const liveRegion = document.getElementById("journey-live");
    if (liveRegion) liveRegion.textContent = announcement;
    const title = document.getElementById("journey-title");
    title?.setAttribute("tabindex", "-1");
    title?.focus({ preventScroll: true });
  }
  return transition;
}

export function selectInspectorCase(caseIdOrRoute, options = {}) {
  return runInspectorAction(
    {
      type: INSPECTOR_ACTIONS.selectCase,
      value: caseIdOrRoute,
    },
    options,
  );
}

export function selectInspectorProject(projectId, options = {}) {
  return runInspectorAction(
    {
      type: INSPECTOR_ACTIONS.selectProject,
      projectId,
    },
    options,
  );
}

export function selectInspectorTypology(typologyId, options = {}) {
  return runInspectorAction(
    {
      type: INSPECTOR_ACTIONS.selectTypology,
      typologyId,
    },
    options,
  );
}

export function applyInspectorPreset(preset, options = {}) {
  return runInspectorAction(
    {
      type: INSPECTOR_ACTIONS.selectPreset,
      caseId: INSPECTOR_PRESET_CASE_IDS[preset] ?? preset,
    },
    options,
  );
}

export function openInspectorEvidence(evidenceId, options = {}) {
  return runInspectorAction(
    {
      type: INSPECTOR_ACTIONS.openEvidence,
      evidenceId,
    },
    options,
  );
}

export function closeInspectorEvidence(options = {}) {
  return runInspectorAction(
    { type: INSPECTOR_ACTIONS.closeEvidence },
    options,
  );
}

export function seedSelectionsForScenario() {
  const competitors = getCompetitors(state.strategy, 6);
  const displayProjects = getScenarioDisplayProjects();
  if (!isScenarioDisplayProject(state.selectedProjectId)) {
    state.selectedProjectId =
      competitors[0]?.id ?? displayProjects[0]?.id ?? null;
  } else {
    state.selectedProjectId =
      legacyProjectId(state.selectedProjectId) ?? null;
  }

  const comparableIds = state.compareProjectIds
    .map((projectId) => legacyProjectId(projectId))
    .filter((projectId) => projectId && isComparableProject(projectId));
  state.compareProjectIds = unique([
    ...comparableIds,
    ...competitors.map((project) => project.id),
  ]).slice(0, 3);
}

export function seedSelectionsForDistrict() {
  return seedSelectionsForScenario();
}

function comparisonProjectIds() {
  return unique(
    state.compareProjectIds
      .map(canonicalProjectId)
      .filter((projectId) => projectId && isComparableProject(projectId)),
  ).slice(0, 3);
}

function comparisonProjectName(projectId) {
  return (
    state.benchmarkContext?.projectSummaries?.find(
      (summary) => summary.projectId === projectId,
    )?.name ?? projectId
  );
}

function comparisonTransition({ changed, reasonCode, announcement }) {
  return {
    changed: Boolean(changed),
    reasonCode,
    announcement,
    selectedProjectIds: comparisonProjectIds(),
    includeTargetScenario: Boolean(state.compareIncludeTarget),
  };
}

function applyComparisonEffects(transition, options = {}) {
  if (options.render !== false && transition.changed) renderApp?.();
  if (options.render !== false) {
    announceWithoutRender(transition.announcement);
    applyComparisonFocus(options);
  }
  return transition;
}

export function setComparisonProject(
  projectId,
  selected,
  options = {},
) {
  const canonicalId = canonicalProjectId(projectId);
  const currentIds = comparisonProjectIds();
  if (!canonicalId || !isComparableProject(canonicalId)) {
    return applyComparisonEffects(
      comparisonTransition({
        changed: false,
        reasonCode: "outside_scenario",
        announcement:
          "Ese proyecto no pertenece al escenario activo y no se añadió a la comparación.",
      }),
      options,
    );
  }

  const alreadySelected = currentIds.includes(canonicalId);
  if (selected && !alreadySelected && currentIds.length >= 3) {
    return applyComparisonEffects(
      comparisonTransition({
        changed: false,
        reasonCode: "maximum_reached",
        announcement:
          "La comparación admite hasta tres proyectos de mercado. Quita uno antes de añadir otro.",
      }),
      options,
    );
  }

  const nextIds = selected
    ? unique([...currentIds, canonicalId]).slice(0, 3)
    : currentIds.filter((id) => id !== canonicalId);
  const changed =
    nextIds.length !== currentIds.length ||
    nextIds.some((id, index) => id !== currentIds[index]);
  if (changed) state.compareProjectIds = nextIds;
  if (changed) recomputeAssistantResponse();
  const projectName = comparisonProjectName(canonicalId);
  const announcement = changed
    ? `${projectName} ${selected ? "se añadió a" : "se quitó de"} la comparación. ${nextIds.length} de 3 proyectos seleccionados.`
    : `${projectName} ya estaba ${selected ? "incluido en" : "fuera de"} la comparación.`;

  return applyComparisonEffects(
    comparisonTransition({
      changed,
      reasonCode: changed
        ? selected
          ? "project_added"
          : "project_removed"
        : "unchanged",
      announcement,
    }),
    options,
  );
}

export function setComparisonTarget(included, options = {}) {
  const targetAvailable = Boolean(state.benchmarkContext?.targetScenario);
  if (!targetAvailable) {
    state.compareIncludeTarget = false;
    return applyComparisonEffects(
      comparisonTransition({
        changed: false,
        reasonCode: "target_unavailable",
        announcement:
          "Configura precio y área del escenario antes de incluir la columna Viva.",
      }),
      options,
    );
  }

  const nextIncluded =
    typeof included === "boolean"
      ? included
      : !state.compareIncludeTarget;
  const changed = nextIncluded !== state.compareIncludeTarget;
  if (changed) state.compareIncludeTarget = nextIncluded;
  if (changed) recomputeAssistantResponse();
  return applyComparisonEffects(
    comparisonTransition({
      changed,
      reasonCode: changed
        ? nextIncluded
          ? "target_added"
          : "target_removed"
        : "unchanged",
      announcement: changed
        ? `Escenario Viva ${nextIncluded ? "incluido en" : "retirado de"} la comparación como columna simulada.`
        : `El escenario Viva ya estaba ${nextIncluded ? "incluido" : "fuera de la comparación"}.`,
    }),
    options,
  );
}

export function focusComparisonRow(rowId, options = {}) {
  const targetId = typeof rowId === "string" ? rowId : "";
  const row = Array.from(
    globalThis.document?.querySelectorAll?.("[data-comparison-row]") ?? [],
  ).find((element) => element.dataset?.comparisonRow === targetId);
  if (!row) {
    if (options.announce !== false) {
      announceWithoutRender(
        "No se encontró el criterio solicitado en la comparación activa.",
      );
    }
    return false;
  }
  const group = row.closest?.("details.comparison-group");
  if (group) group.open = true;
  row.scrollIntoView?.({ block: "start" });
  row.focus?.({ preventScroll: true });
  if (options.announce !== false) {
    const label =
      row.querySelector?.(".comparison-metric-row__label span")?.textContent?.trim() ||
      "criterio seleccionado";
    announceWithoutRender(`Criterio ${label}. Revisa sus valores y evidencia.`);
  }
  return true;
}

function bindComparisonElementEvents() {
  document.querySelectorAll("[data-compare-toggle]").forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
      dispatchComparisonEvent(COMPARISON_EVENTS.selection, {
        projectId: event.target.value,
        selected: event.target.checked,
        focusIntent: "project",
        focusProjectId: event.target.value,
        keepSelectorOpen: true,
      });
    });
  });
  document.querySelectorAll("[data-compare-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      dispatchComparisonEvent(COMPARISON_EVENTS.selection, {
        projectId: button.dataset.compareRemove,
        selected: false,
        focusIntent: "selector",
      });
    });
  });
  document.querySelectorAll("[data-compare-target-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      dispatchComparisonEvent(COMPARISON_EVENTS.target, {
        included: !state.compareIncludeTarget,
        focusIntent: "target",
      });
    });
  });
  document.querySelectorAll("[data-comparison-row-target]").forEach((button) => {
    button.addEventListener("click", () => {
      dispatchComparisonEvent(COMPARISON_EVENTS.rowFocus, {
        rowId: button.dataset.comparisonRowTarget,
      });
    });
  });

  const selector = document.querySelector("details.comparison-selector");
  selector?.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !selector.open) return;
    event.preventDefault();
    selector.open = false;
    selector.querySelector(":scope > summary")?.focus();
    announceWithoutRender("Selector de proyectos cerrado.");
  });

  document.getElementById("compare-query")?.addEventListener("input", (event) => {
    const input = event.target;
    const selection = {
      start: input.selectionStart,
      end: input.selectionEnd,
    };
    state.compareQuery = input.value;
    renderApp?.();
    applyComparisonFocus({
      focusIntent: "query",
      keepSelectorOpen: true,
      selection,
    });
    const query = normalizeSearch(state.compareQuery).trim();
    const candidateCount = (state.benchmarkContext?.projectSummaries ?? []).filter(
      (summary) =>
        !query ||
        [
          summary.projectId,
          summary.name,
          summary.agencyName,
          summary.district,
        ]
          .map(normalizeSearch)
          .join(" ")
          .includes(query),
    ).length;
    announceWithoutRender(
      `${candidateCount} ${candidateCount === 1 ? "proyecto coincide" : "proyectos coinciden"} con la búsqueda.`,
    );
  });
}

function bindComparisonDocumentEvents() {
  if (comparisonDocumentEventsBound || typeof document === "undefined") return;
  comparisonDocumentEventsBound = true;
  document.addEventListener(COMPARISON_EVENTS.selection, (event) => {
    const detail = event.detail ?? {};
    setComparisonProject(detail.projectId, Boolean(detail.selected), detail);
  });
  document.addEventListener(COMPARISON_EVENTS.target, (event) => {
    const detail = event.detail ?? {};
    setComparisonTarget(detail.included, detail);
  });
  document.addEventListener(COMPARISON_EVENTS.rowFocus, (event) => {
    focusComparisonRow(event.detail?.rowId);
  });
}

function dispatchComparisonEvent(type, detail) {
  document.dispatchEvent(new CustomEvent(type, { detail }));
}

function applyComparisonFocus({
  focusIntent = null,
  focusProjectId = null,
  keepSelectorOpen = false,
  selection = null,
} = {}) {
  if (typeof document === "undefined") return false;
  const selector = document.querySelector("details.comparison-selector");
  if (selector && keepSelectorOpen) selector.open = true;

  let target = null;
  if (focusIntent === "project") {
    const canonicalId = canonicalProjectId(focusProjectId);
    target = Array.from(
      document.querySelectorAll("[data-compare-toggle]"),
    ).find((control) => canonicalProjectId(control.value) === canonicalId);
  } else if (focusIntent === "target") {
    target = document.querySelector(".comparison-target-action");
  } else if (focusIntent === "selector") {
    target = selector?.querySelector(":scope > summary") ?? null;
  } else if (focusIntent === "query") {
    target = document.getElementById("compare-query");
  }
  target?.focus?.();
  if (target && selection) {
    try {
      target.setSelectionRange(selection.start, selection.end);
    } catch {
      // Only text controls support selection ranges.
    }
  }
  return Boolean(target);
}

function runInspectorAction(action, options = {}) {
  const isOpen = action.type === INSPECTOR_ACTIONS.openEvidence;
  const isClose = action.type === INSPECTOR_ACTIONS.closeEvidence;
  const wasDialogOpen = state.inspectorDialogOpen;
  if (isOpen && !wasDialogOpen) {
    inspectorRestoreFocusId =
      typeof options.focusId === "string" && options.focusId.length > 0
        ? options.focusId
        : null;
  }

  const transition = dispatchInspector(action);
  const applyEffects = options.render !== false;
  if (applyEffects && (transition.changed || transition.corrected)) {
    renderApp?.();
  }
  if (applyEffects) {
    syncInspectorDialog();
    announceInspectorTransition(transition.announcement);
    applyInspectorFocus(transition.focusIntent, options.focusId);
  }

  if (isClose || (!transition.selection.dialogOpen && !isOpen)) {
    inspectorRestoreFocusId = null;
  } else if (isOpen && !transition.selection.dialogOpen) {
    inspectorRestoreFocusId = null;
  }
  return transition;
}

function bindInspectorElementEvents() {
  document.querySelectorAll("[data-inspector-case]").forEach((control) => {
    if (inspectorBoundElements.has(control)) return;
    inspectorBoundElements.add(control);
    control.addEventListener(
      control.tagName === "SELECT" ? "change" : "click",
      () => {
        selectInspectorCase(
          control.value || control.dataset.inspectorCase,
          { focusId: control.id || null },
        );
      },
    );
  });
  document.querySelectorAll("[data-inspector-project]").forEach((control) => {
    if (inspectorBoundElements.has(control)) return;
    inspectorBoundElements.add(control);
    control.addEventListener(
      control.tagName === "SELECT" ? "change" : "click",
      () => {
        selectInspectorProject(
          control.value || control.dataset.inspectorProject,
          { focusId: control.id || null },
        );
      },
    );
  });
  document.querySelectorAll("[data-inspector-typology]").forEach((control) => {
    if (inspectorBoundElements.has(control)) return;
    inspectorBoundElements.add(control);
    control.addEventListener(
      control.tagName === "SELECT" ? "change" : "click",
      () => {
        selectInspectorTypology(
          control.value || control.dataset.inspectorTypology,
          { focusId: control.id || null },
        );
      },
    );
  });
  document.querySelectorAll("[data-inspector-preset]").forEach((control) => {
    if (inspectorBoundElements.has(control)) return;
    inspectorBoundElements.add(control);
    control.addEventListener(
      control.tagName === "SELECT" ? "change" : "click",
      () => {
        applyInspectorPreset(
          control.value || control.dataset.inspectorPreset,
          { focusId: control.id || null },
        );
      },
    );
  });
  document.querySelectorAll("[data-inspector-evidence]").forEach((control) => {
    if (inspectorBoundElements.has(control)) return;
    inspectorBoundElements.add(control);
    control.addEventListener("click", () => {
      openInspectorEvidence(control.dataset.inspectorEvidence || null, {
        focusId: control.id || null,
      });
    });
  });
  document.querySelectorAll("[data-inspector-close]").forEach((control) => {
    if (inspectorBoundElements.has(control)) return;
    inspectorBoundElements.add(control);
    control.addEventListener("click", () => {
      closeInspectorEvidence();
    });
  });
  syncInspectorDialog();
}

function syncInspectorDialog() {
  if (typeof document === "undefined") return;
  const dialog = document.getElementById("inspector-evidence-dialog");
  if (!dialog) return;
  if (!inspectorDialogBoundElements.has(dialog)) {
    inspectorDialogBoundElements.add(dialog);
    dialog.addEventListener?.("cancel", (event) => {
      event.preventDefault();
      closeInspectorEvidence();
    });
    dialog.addEventListener?.("keydown", (event) => {
      if (event.key !== "Tab") return;
      const focusableElements = inspectorDialogFocusableElements(dialog);
      const firstElement = focusableElements[0] ?? null;
      const lastElement = focusableElements.at(-1) ?? null;
      if (!firstElement || !lastElement) {
        event.preventDefault();
        dialog.focus?.();
        return;
      }

      const activeElement = document.activeElement;
      const activeElementIsInside = dialog.contains?.(activeElement) ?? false;
      const mustWrap =
        focusableElements.length === 1 ||
        !activeElementIsInside ||
        (event.shiftKey && activeElement === firstElement) ||
        (!event.shiftKey && activeElement === lastElement);
      if (!mustWrap) return;

      event.preventDefault();
      (event.shiftKey ? lastElement : firstElement).focus();
    });
  }
  if (state.inspectorDialogOpen) {
    if (!dialog.open && typeof dialog.showModal === "function") {
      dialog.showModal();
    }
    return;
  }
  if (dialog.open && typeof dialog.close === "function") {
    dialog.close();
  }
}

function inspectorDialogFocusableElements(dialog) {
  const selector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "summary",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");
  return Array.from(dialog.querySelectorAll?.(selector) ?? []).filter(
    (element) => {
      if (
        element.disabled ||
        element.hidden ||
        element.getAttribute?.("aria-hidden") === "true"
      ) {
        return false;
      }
      const style = globalThis.getComputedStyle?.(element);
      if (style?.display === "none" || style?.visibility === "hidden") {
        return false;
      }
      return (
        typeof element.getClientRects !== "function" ||
        element.getClientRects().length > 0
      );
    },
  );
}

function bindInspectorDocumentEvents() {
  if (inspectorDocumentEventsBound || typeof document === "undefined") return;
  inspectorDocumentEventsBound = true;
  document.addEventListener(INSPECTOR_EVENTS.caseSelect, (event) => {
    const detail = inspectorEventDetail(event);
    if (!detail) return;
    const value = inspectorDetailString(detail, [
      "caseId",
      "case_id",
      "routeSlug",
      "route_slug",
    ]);
    if (!value) return;
    selectInspectorCase(
      value,
      {
        focusId: inspectorFocusId(detail),
      },
    );
  });
  document.addEventListener(INSPECTOR_EVENTS.projectSelect, (event) => {
    const detail = inspectorEventDetail(event);
    if (!detail) return;
    const value = inspectorDetailString(detail, ["projectId", "project_id"]);
    if (!value) return;
    selectInspectorProject(value, {
      focusId: inspectorFocusId(detail),
    });
  });
  document.addEventListener(INSPECTOR_EVENTS.typologySelect, (event) => {
    const detail = inspectorEventDetail(event);
    if (!detail) return;
    const value = inspectorDetailString(detail, [
      "typologyId",
      "typology_id",
    ]);
    if (!value) return;
    selectInspectorTypology(value, {
      focusId: inspectorFocusId(detail),
    });
  });
  document.addEventListener(INSPECTOR_EVENTS.presetSelect, (event) => {
    const detail = inspectorEventDetail(event);
    if (!detail) return;
    const value = inspectorDetailString(detail, ["preset", "value"]);
    if (!value) return;
    applyInspectorPreset(value, {
      focusId: inspectorFocusId(detail),
    });
  });
  document.addEventListener(INSPECTOR_EVENTS.evidenceOpen, (event) => {
    const detail = inspectorEventDetail(event);
    if (!detail) return;
    const evidenceKeys = ["evidenceId", "evidence_id"];
    const providedEvidenceKey = evidenceKeys.find((key) =>
      Object.hasOwn(detail, key),
    );
    const evidenceId = providedEvidenceKey
      ? inspectorDetailString(detail, [providedEvidenceKey])
      : null;
    if (providedEvidenceKey && !evidenceId) return;
    openInspectorEvidence(evidenceId, {
      focusId: inspectorFocusId(detail),
    });
  });
  document.addEventListener(INSPECTOR_EVENTS.evidenceClose, () => {
    closeInspectorEvidence();
  });
}

function inspectorEventDetail(event) {
  const detail = event?.detail;
  return detail && typeof detail === "object" && !Array.isArray(detail)
    ? detail
    : null;
}

function inspectorDetailString(detail, keys) {
  for (const key of keys) {
    const value = detail[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

function inspectorFocusId(detail) {
  return typeof detail.focusId === "string" && detail.focusId.length > 0
    ? detail.focusId
    : null;
}

function announceInspectorTransition(message) {
  if (typeof document === "undefined" || !message) return;
  const liveRegion = document.getElementById("inspector-live");
  if (liveRegion) liveRegion.textContent = message;
}

function applyInspectorFocus(focusIntent, selectionFocusId) {
  if (typeof document === "undefined") return;
  if (focusIntent === "dialog") {
    focusFirstInspectorElement([
      "inspector-dialog-close",
      "inspector-evidence-dialog",
    ]);
    return;
  }
  if (focusIntent === "restore") {
    focusFirstInspectorElement([
      inspectorRestoreFocusId,
      "inspector-primary-action",
      "inspector-case-selector",
    ]);
    return;
  }
  if (focusIntent === "selection") {
    focusFirstInspectorElement([
      selectionFocusId,
      "inspector-case-selector",
    ]);
  }
}

function focusFirstInspectorElement(ids) {
  for (const id of ids) {
    if (typeof id !== "string" || !id) continue;
    const element = document.getElementById(id);
    if (element && typeof element.focus === "function") {
      element.focus();
      return true;
    }
  }
  return false;
}

function runScenarioAction(action, options = {}) {
  const transition = dispatchScenario(action, {
    announce: options.announce,
    focusId: options.focusId,
  });
  if (transition.recomputed) {
    refreshScenarioDependents();
    syncCanonicalScenarioUrl();
  }
  if (options.render !== false) renderApp?.();
  return transition;
}

function refreshScenarioDependents() {
  const district = state.selectedDistrict;
  if (state.projectFilters.district !== "Todos") {
    state.projectFilters.district = district;
  }
  state.projectLimit = 18;
  seedSelectionsForScenario();
}

export function initializeScenarioFromLocation() {
  if (scenarioUrlInitialized || !state.data) return false;
  scenarioUrlInitialized = true;
  const transition = dispatchScenario({
    type: "PARSE_URL",
    url: window.location.href,
  });
  if (transition.recomputed) refreshScenarioDependents();
  syncCanonicalScenarioUrl(
    transition.canonical_search ?? canonicalScenarioSearch(),
  );
  if (transition.recomputed) {
    renderApp?.();
    return true;
  }
  return false;
}

export function handleScenarioPopState(
  urlLike = typeof window === "undefined"
    ? "/"
    : window.location.href,
  { render = true } = {},
) {
  const targetSearch = new URL(
    String(urlLike),
    "https://scenario.invalid",
  ).search;
  if (targetSearch === scenarioHistorySearch) {
    return {
      recomputed: false,
      ignored_hash_only: true,
      revision: state.scenarioContextRevision,
    };
  }

  const transition = dispatchScenario({
    type: "PARSE_URL",
    url: urlLike,
  });
  if (transition.recomputed) refreshScenarioDependents();
  syncCanonicalScenarioUrl(
    transition.canonical_search ?? canonicalScenarioSearch(),
  );
  if (render) renderApp?.();
  return {
    ...transition,
    ignored_hash_only: false,
  };
}

function syncCanonicalScenarioUrl(search = canonicalScenarioSearch()) {
  scenarioHistorySearch = search;
  if (typeof window === "undefined") return;
  const canonicalUrl = `${window.location.pathname}${search}${window.location.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (canonicalUrl !== currentUrl) {
    window.history.replaceState(null, "", canonicalUrl);
  }
}

function bindScenarioHistoryEvents() {
  if (scenarioHistoryEventsBound) return;
  scenarioHistoryEventsBound = true;
  window.addEventListener("popstate", () => {
    handleScenarioPopState(window.location.href);
  });
}

function bindScenarioDocumentEvents() {
  if (scenarioDocumentEventsBound) return;
  scenarioDocumentEventsBound = true;
  document.addEventListener(SCENARIO_EVENTS.territory, (event) => {
    const detail = event.detail ?? {};
    setScenarioTerritory(detail.patch ?? detail, {
      announce: detail.announce,
      focusId: detail.focusId,
    });
  });
  document.addEventListener(SCENARIO_EVENTS.product, (event) => {
    const detail = event.detail ?? {};
    applyScenarioProduct(detail.patch ?? detail, {
      announce: detail.announce,
      focusId: detail.focusId,
    });
  });
  document.addEventListener(SCENARIO_EVENTS.visualization, (event) => {
    const detail = event.detail ?? {};
    setScenarioVisualization(
      detail.visualization ?? detail.value,
      {
        announce: detail.announce,
        focusId: detail.focusId,
      },
    );
  });
  document.addEventListener(SCENARIO_EVENTS.projectSelect, (event) => {
    const detail = event.detail ?? {};
    selectScenarioProject(detail.projectId ?? detail.project_id, {
      focusId: detail.focusId ?? null,
    });
  });
}

function handleScenarioProductSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const validation = validateScenarioProductForm(form);
  clearScenarioProductErrors(form);

  if (validation.errors.length) {
    for (const error of validation.errors) {
      error.control.setAttribute("aria-invalid", "true");
      const message = form.querySelector(
        `[data-product-error="${error.field}"]`,
      );
      if (message) {
        message.hidden = false;
        message.textContent = error.message;
      }
    }
    const formError = form.querySelector("#scenario-product-error");
    const announcement =
      "Revisa los campos indicados antes de actualizar el escenario.";
    if (formError) {
      formError.hidden = false;
      formError.textContent = announcement;
    }
    announceWithoutRender(announcement);
    validation.errors[0].control.focus();
    return;
  }

  const submit = form.querySelector("#scenario-product-submit");
  applyScenarioProduct(validation.patch, {
    focusId: submit?.id ?? null,
    announce: (context) =>
      `Escenario actualizado: ${context?.comparable_project_ids?.length ?? 0} comparables elegibles.`,
  });
}

function handleScenarioProductReset(event) {
  const form = event.currentTarget;
  clearScenarioProductErrors(form);
  announceWithoutRender(
    "Cambios cancelados. El formulario recuperó el escenario activo.",
  );
}

function validateScenarioProductForm(form) {
  const catalogs = state.data?.scenario_catalogs ?? {};
  const errors = [];
  const patch = {};
  const typology = productControl(form, "typology");
  const bedrooms = productControl(form, "bedrooms");
  const area = productControl(form, "target_area_m2");
  const price = productControl(form, "target_price_pen");
  const delivery = productControl(form, "delivery_year");

  patch.typology = catalogValue({
    control: typology,
    values: catalogs.typologies,
    field: "typology",
    message: "Selecciona un tipo de inmueble válido.",
    errors,
  });
  patch.bedrooms = catalogValue({
    control: bedrooms,
    values: catalogs.bedrooms,
    field: "bedrooms",
    message: "Selecciona una cantidad de dormitorios válida.",
    errors,
    numeric: true,
  });
  patch.target_area_m2 = optionalPositiveNumber({
    control: area,
    field: "target_area_m2",
    maximum: 10000,
    message: "Ingresa un área mayor que 0 y de hasta 10 000 m².",
    errors,
  });
  patch.target_price_pen = optionalPositiveNumber({
    control: price,
    field: "target_price_pen",
    maximum: 1000000000,
    message: "Ingresa un precio mayor que 0 y de hasta S/ 1 000 000 000.",
    errors,
  });
  patch.delivery_year = catalogValue({
    control: delivery,
    values: catalogs.delivery_years,
    field: "delivery_year",
    message: "Selecciona un año de entrega válido.",
    errors,
    numeric: true,
  });

  return { patch, errors };
}

function productControl(form, name) {
  return form.elements?.namedItem(name) ?? null;
}

function catalogValue({
  control,
  values,
  field,
  message,
  errors,
  numeric = false,
}) {
  const raw = String(control?.value ?? "");
  const match = Array.isArray(values)
    ? values.find((value) => String(value) === raw)
    : undefined;
  if (!control || match === undefined) {
    if (control) errors.push({ control, field, message });
    return raw === "all" ? "all" : raw;
  }
  if (match === "all") return "all";
  return numeric ? Number(match) : String(match);
}

function optionalPositiveNumber({
  control,
  field,
  maximum,
  message,
  errors,
}) {
  const raw = String(control?.value ?? "").trim();
  if (!control) return null;
  if (raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0 || value > maximum) {
    errors.push({ control, field, message });
    return null;
  }
  return value;
}

function clearScenarioProductErrors(form) {
  form
    .querySelectorAll("[data-scenario-product-field]")
    .forEach((control) => control.removeAttribute("aria-invalid"));
  form.querySelectorAll("[data-product-error]").forEach((message) => {
    message.hidden = true;
    message.textContent = "";
  });
  const formError = form.querySelector("#scenario-product-error");
  if (formError) {
    formError.hidden = true;
    formError.textContent = "";
  }
}

function announceWithoutRender(message) {
  const liveRegion = document.getElementById("scenario-live");
  if (liveRegion) liveRegion.textContent = message;
}

export function rememberFocus(element) {
  restoreFocus = {
    id: element.id,
    start: element.selectionStart,
    end: element.selectionEnd,
  };
}

export function restoreActiveInput() {
  const focusId = restoreFocus?.id ?? state.scenarioFocusId;
  if (!focusId) return;
  const element = document.getElementById(focusId);
  if (element) {
    element.focus();
    try {
      if (restoreFocus.start !== null && restoreFocus.end !== null) {
        element.setSelectionRange(restoreFocus.start, restoreFocus.end);
      }
    } catch {
      // Some form controls do not support selection ranges.
    }
  }
  restoreFocus = null;
  state.scenarioFocusId = null;
}
