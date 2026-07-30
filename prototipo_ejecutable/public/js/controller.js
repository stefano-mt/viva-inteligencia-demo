import { suggestedQuestions } from "./config.js";
import * as domain from "./domain.js";
import { viewFromHash } from "./navigation.js";
import {
  INSPECTOR_ACTIONS,
  canonicalScenarioSearch,
  dispatchInspector,
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

export const INSPECTOR_EVENTS = Object.freeze({
  caseSelect: "viva:inspector-case-select",
  projectSelect: "viva:inspector-project-select",
  typologySelect: "viva:inspector-typology-select",
  presetSelect: "viva:inspector-preset-select",
  evidenceOpen: "viva:inspector-evidence-open",
  evidenceClose: "viva:inspector-evidence-close",
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
let inspectorRestoreFocusId = null;
const inspectorBoundElements = new WeakSet();
const inspectorDialogBoundElements = new WeakSet();

export function bindEvents(render) {
  renderApp = render;
  bindInspectorDocumentEvents();
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
    resetScenario({
      announce: "Escenario reiniciado al preset base.",
      focusId: "reset-scenario",
    });
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
    render();
  });

  document.querySelectorAll("[data-suggest]").forEach((button) => {
    button.addEventListener("click", () => {
      state.assistantInput = button.dataset.suggest;
      render();
    });
  });

  bindInspectorElementEvents();
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
  if (options.render !== false) renderApp?.();
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
