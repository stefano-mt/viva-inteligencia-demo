import { suggestedQuestions, views } from "./js/config.js";
import { bindEvents, restoreActiveInput } from "./js/controller.js";
import * as domain from "./js/domain.js";
import { activeView, interfaceIcon, viewFromHash, viewIcon } from "./js/navigation.js";
import { state } from "./js/state.js";
import {
  renderActivity,
  renderAssistant,
  renderChecklist,
  renderCompare,
  renderDashboard,
  renderMarket,
  renderProjects,
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

const root = document.getElementById("root");

init();

async function init() {
  root.innerHTML = loadingTemplate();
  try {
    state.data = await loadDemoData();
    state.view = viewFromHash();
    initializeScenario();
    window.addEventListener("hashchange", () => {
      state.view = viewFromHash();
      state.mobileNavOpen = false;
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
  const district = defaultDistrict();
  state.selectedDistrict = district;
  state.strategy.district = district;
  state.projectFilters.district = district;
  const competitors = getCompetitors(state.strategy, 6);
  state.selectedProjectId = competitors[0]?.id ?? getProjects()[0]?.id ?? null;
  state.compareProjectIds = competitors.slice(0, 3).map((project) => project.id);
  state.assistantInput = suggestedQuestions[0];
  state.assistantResponse = buildAssistantResponse(state.assistantInput);
}

function render() {
  const content = {
    dashboard: renderDashboard,
    projects: renderProjects,
    market: renderMarket,
    compare: renderCompare,
    trust: renderChecklist,
    assistant: renderAssistant,
    activity: renderActivity,
  }[state.view]?.() ?? renderDashboard();

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
        <nav class="nav-list" aria-label="Módulos principales">
          ${["Análisis", "Decisión"].map((group) => `
            <section class="nav-section" aria-labelledby="nav-${escapeAttr(normalizeSearch(group))}">
              <p class="nav-section-label" id="nav-${escapeAttr(normalizeSearch(group))}">${escapeHtml(group)}</p>
              ${views.filter((view) => view.group === group).map((view) => `
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
          `).join("")}
        </nav>
        <div class="sidebar-footer">
          <span>Datos actualizados</span>
          <strong>${escapeHtml(formatDate(metadataDate()))}</strong>
          <small>${formatNumber(getProjects().length)} proyectos observados</small>
        </div>
      </aside>
      <div class="workspace">
        ${renderTopbar()}
        <main class="content" id="main-content" tabindex="-1">
          ${renderSectionGuide(state.view)}
          ${content}
        </main>
      </div>
    </div>
  `;

  bindEvents(render);
  restoreActiveInput();
}

function renderTopbar() {
  return `
    <header class="topbar">
      <div class="topbar-heading">
        <button
          class="icon-button menu-toggle"
          id="menu-toggle"
          type="button"
          aria-controls="primary-sidebar"
          aria-expanded="${state.mobileNavOpen ? "true" : "false"}"
          aria-label="Abrir menú principal"
        >
          ${interfaceIcon("menu")}
        </button>
        <div>
          <p class="eyebrow">Viva Inteligencia / ${escapeHtml(activeView().group)}</p>
          <div class="title-row">
            <h1>${escapeHtml(activeView().label)}</h1>
            <span class="view-context">${escapeHtml(activeView().hint)}</span>
          </div>
        </div>
      </div>
      <div class="topbar-actions">
        <label class="field-control compact-control" for="top-district">
          <span>Distrito objetivo</span>
          <select id="top-district">${optionList(getDistricts(), state.strategy.district)}</select>
        </label>
        <button class="ghost-button" id="reset-scenario" type="button">Reiniciar escenario</button>
      </div>
    </header>
  `;
}
