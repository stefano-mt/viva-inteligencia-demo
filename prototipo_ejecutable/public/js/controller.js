import { suggestedQuestions } from "./config.js";
import * as domain from "./domain.js";
import { viewFromHash } from "./navigation.js";
import {
  canonicalScenarioSearch,
  dispatchScenario,
  resolveDistrictId,
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
  buildAssistantResponse,
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

let restoreFocus = null;
let renderApp = null;
let scenarioUrlInitialized = false;
let scenarioDocumentEventsBound = false;
let scenarioHistoryEventsBound = false;
let scenarioHistorySearch = null;

export function bindEvents(render) {
  renderApp = render;
  if (initializeScenarioFromLocation()) return;
  bindScenarioHistoryEvents();
  bindScenarioDocumentEvents();
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextView = button.dataset.view;
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
    resetScenario({
      announce: "Escenario reiniciado al preset base.",
      focusId: "reset-scenario",
    });
  });
  document.querySelectorAll("[data-district-chip]").forEach((button) => {
    button.addEventListener("click", () => {
      changeDistrict(button.dataset.districtChip);
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
        );
      },
    );
  });

  document.querySelectorAll("[data-strategy-field]").forEach((control) => {
    control.addEventListener("change", (event) => {
      const field = event.target.dataset.strategyField;
      if (field === "district") {
        rememberFocus(event.target);
        changeDistrict(event.target.value, { focusId: event.target.id });
        return;
      }
      rememberFocus(event.target);
      applyScenarioProduct(
        legacyProductPatch(field, event.target.value),
        { focusId: event.target.id },
      );
    });
  });

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
      selectScenarioProject(button.dataset.selectProject);
    });
  });

  document.querySelectorAll("[data-compare-toggle]").forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
      const id = event.target.value;
      if (!isComparableProject(id)) {
        event.target.checked = false;
        return;
      }
      if (event.target.checked) {
        if (state.compareProjectIds.length >= 3) {
          event.target.checked = false;
          return;
        }
        state.compareProjectIds = unique([...state.compareProjectIds, id]);
      } else {
        state.compareProjectIds = state.compareProjectIds.filter((item) => item !== id);
      }
      render();
    });
  });

  document.getElementById("compare-query")?.addEventListener("input", (event) => {
    state.compareQuery = event.target.value;
    rememberFocus(event.target);
    render();
  });

  document.getElementById("assistant-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("assistant-input")?.value ?? "";
    state.assistantInput = input;
    state.assistantResponse = buildAssistantResponse(input);
    render();
  });

  document.querySelectorAll("[data-suggest]").forEach((button) => {
    button.addEventListener("click", () => {
      state.assistantInput = button.dataset.suggest;
      state.assistantResponse = buildAssistantResponse(button.dataset.suggest);
      render();
    });
  });
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

export function selectScenarioProject(projectId, { render = true } = {}) {
  const project = findProjectById(projectId);
  if (!project || !isScenarioDisplayProject(project)) return false;
  state.selectedProjectId = project.id;
  if (render) renderApp?.();
  return true;
}

export function resetScenario(options = {}) {
  const transition = runScenarioAction(
    { type: "RESET" },
    {
      render: false,
      ...options,
    },
  );
  const district = state.selectedDistrict || defaultDistrict();
  state.projectFilters = {
    district,
    typology: "Todos",
    phase: "Todos",
    query: "",
    sort: "direct",
  };
  state.compareQuery = "";
  state.projectLimit = 18;
  seedSelectionsForScenario();
  state.assistantInput = suggestedQuestions[0];
  state.assistantResponse = buildAssistantResponse(state.assistantInput);
  if (options.render !== false) renderApp?.();
  return transition;
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
  if (state.assistantInput) {
    state.assistantResponse = buildAssistantResponse(
      state.assistantInput,
    );
  }
}

function initializeScenarioFromLocation() {
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
    selectScenarioProject(detail.projectId ?? detail.project_id);
  });
}

function legacyProductPatch(field, value) {
  if (field === "typology") {
    return { typology: value === "Todos" ? "all" : value };
  }
  if (field === "bedrooms") {
    return {
      bedrooms: value === "Todos" ? "all" : Number(value),
    };
  }
  if (field === "area") {
    return {
      target_area_m2: value === "" ? null : Number(value),
    };
  }
  if (field === "targetPrice") {
    return {
      target_price_pen: value === "" ? null : Number(value),
    };
  }
  if (field === "deliveryYear") {
    return {
      delivery_year: value === "Todos" ? "all" : Number(value),
    };
  }
  if (field === "visualization") {
    return { visualization: value };
  }
  return {};
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
