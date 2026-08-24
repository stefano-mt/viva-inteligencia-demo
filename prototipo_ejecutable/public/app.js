import { journeyEntry } from "./js/config.js";
import {
  bindEvents,
  initializeScenarioFromLocation,
  restoreActiveInput,
  selectInspectorCase,
} from "./js/controller.js";
import * as domain from "./js/domain.js";
import {
  activeView,
  canonicalHashForRoute,
  inspectorCaseHash,
  interfaceIcon,
  parseHashRoute,
  replaceHashPreservingLocation,
  viewIcon,
} from "./js/navigation.js";
import {
  initializeScenarioData,
  state,
  updateBoundaryArtifact,
} from "./js/state.js";
import {
  buildScenarioPresentation,
  loadBoundaryArtifact,
  renderActivity,
  renderAssistant,
  renderChecklist,
  renderCompare,
  renderDashboard,
  renderInspector,
  renderJourney,
  renderJourneyTopbar,
  renderMarket,
  renderProjects,
  renderScenarioBar,
  renderScenarioSidebar,
  renderScenarioSummary,
} from "./js/views/index.js";

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

const root = document.getElementById("root");
let geographyArtifact = {
  status: "loading",
  url: null,
  expected_sha256: null,
  actual_sha256: null,
  geojson: null,
  reason: null,
};
let pendingInspectorAnnouncement = "";
let pendingInspectorAnchorId = null;
let pendingJourneyAnnouncement = "";
let scenarioEditorOpen = false;
let scenarioEditorReturnFocusId = "scenario-editor-trigger";
let scenarioEditorPreviousNavOpen = false;
let expertNavigationOpen = false;

const primaryNavigation = Object.freeze([
  { id: "journey", label: "Recorrido", hint: "Comprender la tesis completa" },
  { id: "dashboard", label: "Panorama", hint: "Leer zona y mapa" },
  { id: "projects", label: "Proyectos", hint: "Priorizar competidores" },
  { id: "assistant", label: "Decidir", hint: "Convertir evidencia en acción" },
  { id: "activity", label: "Seguimiento", hint: "Revisar cambios publicados" },
]);

const expertNavigation = Object.freeze([
  { id: "inspector", label: "Inspector", hint: "Evidencia y calidad" },
  { id: "market", label: "Benchmark", hint: "Referencias y atributos" },
  { id: "compare", label: "Comparador", hint: "Diferencias entre proyectos" },
  { id: "trust", label: "Checklist", hint: "Preparación comercial" },
]);

init();

async function init() {
  root.innerHTML = loadingTemplate();
  try {
    const data = await loadDemoData();
    initializeScenarioData(data, {
      boundaryArtifactStatus: "missing",
    });
    const initialRoute = canonicalizeJourneyRoute(
      parseHashRoute(window.location.hash),
    );
    state.view = initialRoute.view;
    initializeScenarioFromLocation();
    initializeScenario();
    hydrateInspectorRoute(initialRoute);
    window.addEventListener("hashchange", () => {
      const route = canonicalizeJourneyRoute(
        parseHashRoute(window.location.hash),
      );
      const previousView = state.view;
      const sameInspectorAnchor =
        previousView === "inspector" &&
        route.kind === "inspector-anchor";
      state.view = route.view;
      state.mobileNavOpen = false;
      if (sameInspectorAnchor) {
        focusInspectorAnchor(route.anchorId);
        return;
      }
      hydrateInspectorRoute(route);
      if (
        previousView !== "inspector" &&
        route.view === "inspector" &&
        [
          "inspector-base",
          "inspector-case",
          "inspector-invalid",
        ].includes(route.kind)
      ) {
        pendingInspectorAnchorId = "inspector-selection-title";
      }
      render();
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && scenarioEditorOpen) {
        event.preventDefault();
        closeScenarioEditor();
        return;
      }
      if (event.key === "Escape" && state.mobileNavOpen) {
        state.mobileNavOpen = false;
        render();
        document.getElementById("menu-toggle")?.focus();
      }
    });
    render();
    geographyArtifact = await loadBoundaryArtifact({
      geography: state.data.geography,
      baseUrl: window.location.href,
    });
    updateBoundaryArtifact(geographyArtifact);
    render();
  } catch (error) {
    root.innerHTML = errorTemplate(error);
  }
}

async function loadDemoData() {
  const dataUrl = new URL("demo-data/viva-platform-demo.json", window.location.href);
  const response = await fetch(dataUrl, { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudo cargar la información comercial.");
  return response.json();
}

function initializeScenario() {
  state.projectFilters.district =
    state.selectedDistrict || defaultDistrict();
  const competitors = getCompetitors(state.strategy, 6);
  state.selectedProjectId = competitors[0]?.id ?? getProjects()[0]?.id ?? null;
  state.compareProjectIds = competitors.slice(0, 3).map((project) => project.id);
}

function getCanonicalScenarioUrl() {
  return window.location.href;
}

function canonicalizeJourneyRoute(route) {
  if (route.view !== "journey") return route;
  const canonicalHash = canonicalHashForRoute(window.location.hash);
  if (canonicalHash && canonicalHash !== window.location.hash) {
    replaceHashPreservingLocation(canonicalHash);
  }
  if (route.kind === "journey-invalid") {
    pendingJourneyAnnouncement =
      "La etapa solicitada no estaba disponible; abrimos Escala para conservar un recorrido válido.";
  }
  return route;
}

function defaultInspectorCase() {
  const inspector = state.data?.inspector;
  return inspector?.cases?.find(
    ({ case_id: caseId }) => caseId === inspector.default_case_id,
  ) ?? null;
}

function hydrateInspectorRoute(
  route = parseHashRoute(window.location.hash),
) {
  if (route.view !== "inspector") return null;
  if (route.kind === "inspector-anchor") {
    pendingInspectorAnchorId = route.anchorId;
    return null;
  }

  const defaultCase = defaultInspectorCase();
  if (!defaultCase) return null;
  const requested =
    route.kind === "inspector-case"
      ? route.caseSlug
      : defaultCase.case_id;
  const transition = selectInspectorCase(requested, { render: false });
  const mustCorrect =
    route.kind === "inspector-invalid" ||
    (route.kind === "inspector-case" && transition.corrected);

  if (mustCorrect) {
    const canonicalHash = inspectorCaseHash(defaultCase.route_slug);
    if (canonicalHash) replaceHashPreservingLocation(canonicalHash);
    pendingInspectorAnnouncement =
      transition.announcement ||
      "La selección no estaba disponible; se restauró el expediente predeterminado.";
  } else if (transition.announcement) {
    pendingInspectorAnnouncement = transition.announcement;
  }
  return transition;
}

function focusInspectorAnchor(anchorId) {
  if (!anchorId) return false;
  const target = document.getElementById(anchorId);
  if (!target) return false;
  if (!target.matches("a, button, input, select, textarea, summary, [tabindex]")) {
    target.setAttribute("tabindex", "-1");
  }
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: "start" });
  return true;
}

function restoreInspectorRouteEffects() {
  if (pendingInspectorAnnouncement) {
    const liveRegion = document.getElementById("inspector-live");
    if (liveRegion) {
      liveRegion.textContent = pendingInspectorAnnouncement;
      pendingInspectorAnnouncement = "";
    }
  }
  if (
    pendingInspectorAnchorId &&
    focusInspectorAnchor(pendingInspectorAnchorId)
  ) {
    pendingInspectorAnchorId = null;
  }
}

function renderShellNavigation() {
  const journeyIsActive = state.view === "journey";
  const expertIsActive = expertNavigation.some(({ id }) => id === state.view);
  const expertIsOpen = expertIsActive || expertNavigationOpen;
  return `
    <nav class="nav-list" aria-label="Módulos principales">
      <div data-expert-navigation aria-labelledby="nav-expert">
      <span class="sr-only">Explorar análisis</span>
      <section class="nav-section nav-section--primary nav-section--journey" aria-labelledby="nav-primary">
        <p class="nav-section-label" id="nav-primary">Trabajo comercial</p>
        ${primaryNavigation.map((item) => {
          const active = item.id === "journey" ? journeyIsActive : state.view === item.id;
          const navigationAttributes = item.id === "journey"
            ? "data-journey-entry"
            : `data-view="${escapeAttr(item.id)}"`;
          const icon = item.id === "journey" ? "01→06" : viewIcon(item.id);
          return `
            <button
              class="nav-item ${item.id === "journey" ? "nav-item--journey" : ""} ${active ? "active" : ""}"
              type="button"
              data-nav-tier="primary"
              ${navigationAttributes}
              ${active ? 'aria-current="page"' : ""}
            >
              <span class="nav-icon ${item.id === "journey" ? "journey-entry-mark" : ""}" aria-hidden="true">${icon}</span>
              <span class="nav-copy">
                <strong>${escapeHtml(item.label)}</strong>
                <small>${escapeHtml(item.hint)}</small>
              </span>
            </button>`;
        }).join("")}
      </section>
      <details
        class="nav-expert-disclosure"
        ${expertIsOpen ? "open" : ""}
      >
        <summary>
          <span id="nav-expert">Profundizar</span>
          <small>4 herramientas</small>
        </summary>
        <div class="nav-section nav-section--expert" aria-label="Herramientas para profundizar">
          ${expertNavigation.map((view) => `
            <button
              class="nav-item ${state.view === view.id ? "active" : ""}"
              type="button"
              data-nav-tier="expert"
              data-view="${escapeAttr(view.id)}"
              ${state.view === view.id ? 'aria-current="page"' : ""}
            >
              <span class="nav-icon" aria-hidden="true">${viewIcon(view.id)}</span>
              <span class="nav-copy">
                <strong>${escapeHtml(view.label)}</strong>
                <small>${escapeHtml(view.hint)}</small>
              </span>
            </button>
          `).join("")}
        </div>
      </details>
      </div>
    </nav>
  `;
}

function bindJourneyShellEvents() {
  document.querySelector("[data-journey-entry]")?.addEventListener("click", () => {
    state.mobileNavOpen = false;
    const targetHash = `#journey/${journeyEntry.defaultStageId}`;
    if (window.location.hash === targetHash) render();
    else window.location.hash = targetHash;
  });
}

function compactShellMatches() {
  return globalThis.matchMedia?.("(max-width: 1120px)").matches ?? false;
}

function openScenarioEditor(trigger) {
  scenarioEditorReturnFocusId = trigger?.id || "scenario-editor-trigger";
  scenarioEditorPreviousNavOpen = state.mobileNavOpen;
  scenarioEditorOpen = true;
  if (compactShellMatches()) state.mobileNavOpen = true;
  render();
  document.getElementById("scenario-editor-close")?.focus();
}

function closeScenarioEditor({ restoreFocus = true } = {}) {
  if (!scenarioEditorOpen) return;
  scenarioEditorOpen = false;
  if (compactShellMatches()) state.mobileNavOpen = scenarioEditorPreviousNavOpen;
  render();
  if (restoreFocus) document.getElementById(scenarioEditorReturnFocusId)?.focus();
}

function focusableElements(container) {
  return [...container.querySelectorAll(
    'button:not([disabled]), select:not([disabled]), input:not([disabled]), summary, a[href], [tabindex]:not([tabindex="-1"])',
  )].filter((element) => !element.hidden && element.getClientRects().length > 0);
}

function trapFocus(event, container) {
  if (event.key !== "Tab" || !compactShellMatches()) return;
  const focusable = focusableElements(container);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function bindCommercialShellEvents() {
  const journeyScenario = document.querySelector(".journey-topbar__scenario");
  if (journeyScenario) {
    journeyScenario.id = "scenario-journey-editor-trigger";
    journeyScenario.classList.add("scenario-trigger");
    journeyScenario.setAttribute("role", "button");
    journeyScenario.setAttribute("tabindex", "0");
    journeyScenario.setAttribute("aria-controls", "scenario-editor");
    journeyScenario.setAttribute("aria-expanded", String(scenarioEditorOpen));
  }

  document.querySelectorAll("[data-scenario-editor-open], .scenario-trigger").forEach((trigger) => {
    trigger.addEventListener("click", () => openScenarioEditor(trigger));
    if (trigger.matches("[role=button]")) {
      trigger.addEventListener("keydown", (event) => {
        if (!["Enter", " "].includes(event.key)) return;
        event.preventDefault();
        openScenarioEditor(trigger);
      });
    }
  });
  document.querySelector("[data-scenario-editor-close]")?.addEventListener("click", () => {
    closeScenarioEditor();
  });

  document.querySelector(".scenario-editor")?.addEventListener("keydown", (event) => {
    trapFocus(event, event.currentTarget);
  });
  document.getElementById("top-district")?.addEventListener("change", (event) => {
    state.scenarioFocusId = event.currentTarget.id;
  }, { capture: true });
  document.querySelector(".sidebar")?.addEventListener("keydown", (event) => {
    if (!state.mobileNavOpen || scenarioEditorOpen) return;
    trapFocus(event, event.currentTarget);
  });

  document.querySelector(".nav-expert-disclosure")?.addEventListener("toggle", (event) => {
    expertNavigationOpen = event.currentTarget.open;
  });

  document.querySelectorAll("[data-view], [data-journey-entry]").forEach((control) => {
    control.addEventListener("click", () => {
      scenarioEditorOpen = false;
      state.mobileNavOpen = false;
    }, { capture: true });
  });
  document.querySelectorAll("[data-nav-close], #reset-scenario").forEach((control) => {
    control.addEventListener("click", () => {
      scenarioEditorOpen = false;
    }, { capture: true });
  });
}

function render() {
  const route = parseHashRoute(window.location.hash);
  const isJourney = state.view === "journey";
  const showScenarioSummary =
    !isJourney && !["dashboard", "projects", "compare"].includes(state.view);
  const scenarioPresentation = {
    ...buildScenarioPresentation({
      data: state.data,
      scenarioState: state.scenarioState,
      scenarioContext: state.scenarioContext,
      geographyArtifact,
      canonicalUrl: getCanonicalScenarioUrl(),
      announcement: state.scenarioAnnouncement,
      activeView: isJourney
        ? {
            group: "Recorrido",
            label: journeyEntry.label,
            hint: journeyEntry.hint,
          }
        : activeView(),
      mobileNavOpen: state.mobileNavOpen,
    }),
    editorOpen: scenarioEditorOpen,
    editorModal: compactShellMatches(),
  };
  const content = isJourney
    ? renderJourney({
        stageId: route.stageId,
        stageModel:
          geographyArtifact.status === "loading"
            ? {
                stageId: route.stageId,
                status: "loading",
                data: null,
                correctiveAction: null,
              }
            : state.journeyContext?.stages?.[route.stageId] ?? {
                stageId: route.stageId,
                status: "error",
                data: null,
                correctiveAction: {
                  label: "Reiniciar recorrido",
                  href: "#journey/scale",
                },
              },
        announcement: pendingJourneyAnnouncement,
      })
    : geographyArtifact.status === "loading"
      ? ""
      : ({
          dashboard: renderDashboard,
          projects: renderProjects,
          inspector: renderInspector,
          market: renderMarket,
          compare: renderCompare,
          trust: renderChecklist,
          assistant: renderAssistant,
          activity: renderActivity,
        }[state.view]?.() ?? renderDashboard());

  root.innerHTML = `
    <a class="skip-link" href="#main-content">Ir al contenido principal</a>
    <div class="app-shell ${state.mobileNavOpen ? "nav-is-open" : ""} ${scenarioEditorOpen ? "scenario-is-open" : ""}">
      <button class="nav-scrim" type="button" data-nav-close aria-label="Cerrar navegación"></button>
      <aside class="sidebar" id="primary-sidebar" aria-label="Navegación de Viva Inteligencia">
        <div class="sidebar-header">
          <div class="brand-block">
            <span class="brand-logo">
              <img
                src="assets/viva-negocio-inmobiliario-logo.jpg"
                alt="VIVA"
                width="200"
                height="200"
              />
            </span>
            <div>
              <strong>Inteligencia Comercial</strong>
              <span>Viva Inmobiliaria</span>
            </div>
          </div>
          <button class="icon-button sidebar-close" type="button" data-nav-close aria-label="Cerrar menú">
            ${interfaceIcon("close")}
          </button>
        </div>
        ${renderScenarioSidebar(scenarioPresentation)}
        ${renderShellNavigation()}
        <div class="sidebar-footer">
          <span>Datos actualizados</span>
          <strong>${escapeHtml(formatDate(metadataDate()))}</strong>
          <small>${formatNumber(getProjects().length)} proyectos observados</small>
        </div>
      </aside>
      <div class="workspace">
        ${
          isJourney
            ? renderJourneyTopbar(scenarioPresentation, route.stageId)
            : renderScenarioBar(scenarioPresentation)
        }
        <main class="content" id="main-content" tabindex="-1">
          ${
            showScenarioSummary
              ? renderScenarioSummary(scenarioPresentation)
              : `<p
                  class="sr-only"
                  id="scenario-live"
                  aria-live="polite"
                  aria-atomic="true"
                >${escapeHtml(scenarioPresentation.announcement)}</p>`
          }
          ${
            isJourney
              ? content
              : geographyArtifact.status === "loading"
              ? ""
              : `${renderSectionGuide(state.view)}${content}`
          }
        </main>
      </div>
    </div>
  `;

  bindEvents(render);
  bindJourneyShellEvents();
  bindCommercialShellEvents();
  restoreActiveInput();
  restoreInspectorRouteEffects();
  pendingJourneyAnnouncement = "";
}
