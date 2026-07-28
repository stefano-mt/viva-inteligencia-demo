import { suggestedQuestions } from "./config.js";
import * as domain from "./domain.js";
import { viewFromHash } from "./navigation.js";
import { state } from "./state.js";

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
  escapeHtml,
  escapeAttr,
} = domain;

let restoreFocus = null;
let renderApp = null;

export function bindEvents(render) {
  renderApp = render;
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
    resetScenario();
    render();
  });
  document.querySelectorAll("[data-district-chip]").forEach((button) => {
    button.addEventListener("click", () => {
      changeDistrict(button.dataset.districtChip);
    });
  });

  document.querySelectorAll("[data-strategy-field]").forEach((control) => {
    control.addEventListener(control.tagName === "INPUT" ? "input" : "change", (event) => {
      const field = event.target.dataset.strategyField;
      state.strategy[field] = event.target.value;
      if (field === "district") {
        state.selectedDistrict = event.target.value;
        state.projectFilters.district = event.target.value;
        seedSelectionsForDistrict();
      }
      rememberFocus(event.target);
      render();
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
      state.selectedProjectId = button.dataset.selectProject;
      render();
    });
  });

  document.querySelectorAll("[data-compare-toggle]").forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
      const id = event.target.value;
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

export function changeDistrict(district) {
  if (!district) return;
  state.selectedDistrict = district;
  state.strategy.district = district;
  if (state.projectFilters.district !== "Todos") state.projectFilters.district = district;
  state.projectLimit = 18;
  seedSelectionsForDistrict();
  renderApp?.();
}

export function resetScenario() {
  const district = state.strategy.district || defaultDistrict();
  state.strategy = {
    district,
    typology: "Todos",
    bedrooms: "Todos",
    area: "",
    targetPrice: "",
    deliveryYear: "Todos",
  };
  state.projectFilters = {
    district,
    typology: "Todos",
    phase: "Todos",
    query: "",
    sort: "direct",
  };
  state.compareQuery = "";
  state.projectLimit = 18;
  seedSelectionsForDistrict();
  state.assistantInput = suggestedQuestions[0];
  state.assistantResponse = buildAssistantResponse(state.assistantInput);
}

export function seedSelectionsForDistrict() {
  const competitors = getCompetitors(state.strategy, 6);
  state.selectedProjectId = competitors[0]?.id ?? getProjectsByDistrict(state.strategy.district)[0]?.id ?? getProjects()[0]?.id ?? null;
  state.compareProjectIds = competitors.slice(0, 3).map((project) => project.id);
}


export function rememberFocus(element) {
  restoreFocus = {
    id: element.id,
    start: element.selectionStart,
    end: element.selectionEnd,
  };
}

export function restoreActiveInput() {
  if (!restoreFocus?.id) return;
  const element = document.getElementById(restoreFocus.id);
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
}
