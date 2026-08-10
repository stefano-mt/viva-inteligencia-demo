import { journeyEntry, views } from "./js/config.js";
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
  return `
    <nav class="nav-list" aria-label="Módulos principales">
      <section class="nav-section nav-section--journey" aria-labelledby="nav-journey">
        <p class="nav-section-label" id="nav-journey">Recorrido</p>
        <button
          class="nav-item nav-item--journey ${journeyIsActive ? "active" : ""}"
          type="button"
          data-journey-entry
          ${journeyIsActive ? 'aria-current="page"' : ""}
        >
          <span class="nav-icon journey-entry-mark" aria-hidden="true">01→06</span>
          <span class="nav-copy">
            <strong>${escapeHtml(journeyEntry.label)}</strong>
            <small>${escapeHtml(journeyEntry.hint)}</small>
          </span>
        </button>
      </section>
      <section
        class="nav-section nav-section--expert"
        aria-labelledby="nav-expert"
        data-expert-navigation
      >
        <p class="nav-section-label" id="nav-expert">Explorar análisis</p>
        ${views.map((view) => `
          <button
            class="nav-item ${state.view === view.id ? "active" : ""}"
            type="button"
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
      </section>
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

function render() {
  const route = parseHashRoute(window.location.hash);
  const isJourney = state.view === "journey";
  const showScenarioSummary =
    !isJourney && !["dashboard", "projects"].includes(state.view);
  const scenarioPresentation = buildScenarioPresentation({
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
  });
  const content = isJourney
    ? renderJourney({
        stageId: route.stageId,
        status:
          geographyArtifact.status === "loading" ? "loading" : "ready",
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
    <div class="app-shell ${state.mobileNavOpen ? "nav-is-open" : ""}">
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
          ${showScenarioSummary ? renderScenarioSummary(scenarioPresentation) : ""}
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
  restoreActiveInput();
  restoreInspectorRouteEffects();
  pendingJourneyAnnouncement = "";
}
