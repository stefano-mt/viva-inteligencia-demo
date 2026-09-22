import "./styles.css";
import { ApiClientError, ApiDataProvider, type DataProvider } from "./api.js";
import { JOURNEY_STAGES, parseRoute, routeHash } from "./routes.js";
import { createRequestSequencer, filterCommandDestinations, captureInteractionSnapshot, restoreInteractionSnapshot } from "./interaction-state.js";
import {
  compactCommercialSourceValue,
  commercialSourceLabel,
  commercialSourceMessage,
  commercialSourceStatus,
  hasDisplayValue,
  readSourceComparisonRows,
  summarizeCommercialSources,
  type CommercialSourceRow,
} from "./source-comparison-view.js";
import type {
  Bootstrap,
  DataRefreshStatus,
  DistrictGeography,
  JsonObject,
  Meta,
  Page,
  ProjectSummary,
  Route,
  Scenario,
  SourceCoverage,
  WorkspaceEvaluation,
} from "./types.js";

type AssistantCategoryId = "market" | "competition" | "movement" | "argument";

interface AssistantQuestion {
  id: string;
  category: AssistantCategoryId;
  intentId: string;
  title: string;
  question: string;
  description: string;
  requiresSelection?: boolean;
}

interface AppState {
  status: "loading" | "ready" | "error";
  error: ApiClientError | null;
  route: Route;
  bootstrap: Bootstrap | null;
  meta: Meta | null;
  scenario: Scenario | null;
  workspace: WorkspaceEvaluation | null;
  projects: Page<ProjectSummary> | null;
  history: Page<JsonObject> | null;
  inspector: JsonObject | null;
  comparison: JsonObject | null;
  assistant: JsonObject | null;
  assistantCategory: AssistantCategoryId;
  assistantDraft: string;
  assistantIntentId: string | null;
  assistantQuestionTitle: string | null;
  assistantError: string | null;
  projectDetail: JsonObject | null;
  mapProjectId: string | null;
  mapProjectDetail: JsonObject | null;
  mapProjectStatus: "idle" | "loading" | "ready" | "error";
  geography: DistrictGeography | null;
  sourceCoverage: SourceCoverage | null;
  refreshStatus: DataRefreshStatus | null;
  refreshNotice: { tone: "success" | "warning" | "error"; message: string } | null;
  projectPage: number;
  projectScope: "scenario" | "district" | "all";
  projectQuery: string;
  projectSort: string;
  historyDirection: "all" | "increase" | "decrease" | "unchanged";
  historyValidity: "all" | "current" | "aging" | "historical" | "unknown";
  mapView: "geographic" | "positioning";
  selectedProjectIds: string[];
  selectedProjects: Record<string, ProjectSummary>;
  selectionMessage: string;
  inspectorSlug: string | null;
  navOpen: boolean;
  busyMessage: string | null;
  routeError: ApiClientError | null;
  scenarioError: string | null;
  comparisonOnlyDifferences: boolean;
}

const rootElement = document.querySelector<HTMLDivElement>("#root");
if (!rootElement) throw new Error("No se encontró el contenedor de la aplicación.");
const root: HTMLDivElement = rootElement;

const provider: DataProvider = new ApiDataProvider();
const requests = createRequestSequencer<"route" | "workspace" | "detail" | "map" | "assistant" | "inspector" | "refresh">();
let activeBusy: ReturnType<typeof requests.begin> | null = null;
let detailOrigin: { selector: string; scroll: number } | null = null;
const routePositions = new Map<string, number>();
let dialogOrigin: HTMLElement | null = null;
let commandQuery = "";
let commandIndex = 0;
let lastRenderContext = "";
let scenarioAttempt = 0;
let detailRetryId: string | null = null;
const state: AppState = {
  status: "loading",
  error: null,
  route: routeFromLocation(),
  bootstrap: null,
  meta: null,
  scenario: null,
  workspace: null,
  projects: null,
  history: null,
  inspector: null,
  comparison: null,
  assistant: null,
  assistantCategory: "market",
  assistantDraft: "",
  assistantIntentId: null,
  assistantQuestionTitle: null,
  assistantError: null,
  projectDetail: null,
  mapProjectId: null,
  mapProjectDetail: null,
  mapProjectStatus: "idle",
  geography: null,
  sourceCoverage: null,
  refreshStatus: null,
  refreshNotice: null,
  projectPage: 1,
  projectScope: "scenario",
  projectQuery: "",
  projectSort: "name",
  historyDirection: "all",
  historyValidity: "all",
  mapView: "geographic",
  selectedProjectIds: [],
  selectedProjects: {},
  selectionMessage: "Selecciona entre dos y tres proyectos para compararlos.",
  inspectorSlug: null,
  navOpen: false,
  busyMessage: null,
  routeError: null,
  scenarioError: null,
  comparisonOnlyDifferences: false,
};

window.addEventListener("hashchange", () => {
  // Initial data belongs to the application, not to the route being opened.
  if (state.status === "loading") { state.route = routeFromLocation(); return; }
  scenarioAttempt++;
  routePositions.set(routeHash(state.route), window.scrollY);
  requests.invalidateAll();
  activeBusy = null;
  state.busyMessage = null;
  state.routeError = null;
  detailRetryId = null;
  closeDialogs();
  state.route = routeFromLocation();
  state.navOpen = false;
  state.projectDetail = null;
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  void loadRouteData({ focus: true });
});
window.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "k" && !event.isComposing) {
    event.preventDefault();
    openDialog("command-dialog", "command-input");
  }
  const command = document.querySelector<HTMLDialogElement>("#command-dialog[open]");
  if (command && ["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) {
    const options = [...command.querySelectorAll<HTMLAnchorElement>("[data-command-option]:not([hidden])")];
    if (event.key === "Enter") {
      if ((event.target as HTMLElement).closest("button")) return;
      event.preventDefault(); options[commandIndex]?.click();
    } else {
      event.preventDefault();
      commandIndex = options.length ? (commandIndex + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length : 0;
      updateCommandResults();
      options[commandIndex]?.focus();
    }
  }
  if (event.key === "Escape" && state.navOpen) {
    state.navOpen = false;
    render();
  }
});
root.addEventListener("click", handleClick);
root.addEventListener("submit", handleSubmit);
root.addEventListener("change", handleChange);
root.addEventListener("input", handleInput);
root.addEventListener("cancel", (event) => {
  if ((event.target as HTMLElement).id === "scenario-dialog") cancelScenarioEdit();
}, true);
root.addEventListener("close", (event) => {
  if (!(event.target as HTMLElement).isConnected) return;
  if ((event.target as HTMLElement).id === "scenario-dialog") { cancelScenarioEdit(); render(); }
  const action = dialogOrigin?.dataset.action;
  const origin = dialogOrigin?.isConnected ? dialogOrigin : action ? root.querySelector<HTMLElement>(`[data-action="${CSS.escape(action)}"]`) : null;
  origin?.focus({ preventScroll: true });
}, true);

render();
void initialize();

function routeFromLocation(): Route {
  const route = parseRoute();
  const requested = window.location.hash.replace(/^#/u, "");
  if (["inspector", "market", "trust"].includes(requested)) {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${routeHash(route)}`);
  }
  return route;
}

function beginTask(channel: Parameters<typeof requests.begin>[0], message: string) {
  const ticket = requests.begin(channel);
  activeBusy = ticket;
  state.busyMessage = message;
  return ticket;
}

function finishTask(ticket: ReturnType<typeof requests.begin>): boolean {
  if (!requests.isCurrent(ticket)) return false;
  if (activeBusy === ticket) { activeBusy = null; state.busyMessage = null; }
  return true;
}

function cancelAssistantRequest(): void {
  requests.invalidate("assistant");
  if (activeBusy?.channel === "assistant") { activeBusy = null; state.busyMessage = null; }
}

function invalidateSelectionResults(): void {
  cancelAssistantRequest();
  const comparisonRoute = state.route.id === "compare" || state.route.id === "depth";
  if (comparisonRoute) requests.invalidate("route");
  state.comparison = null; state.assistant = null; state.assistantError = null;
  if (comparisonRoute && activeBusy?.channel === "route") { activeBusy = null; state.busyMessage = null; }
}

function cancelScenarioEdit(): void {
  scenarioAttempt++;
  requests.invalidate("workspace");
  if (activeBusy?.channel === "workspace") { activeBusy = null; state.busyMessage = null; }
  state.scenarioError = null;
}

async function applyScenario(candidate: Scenario, restart = false): Promise<void> {
  const comparable = ({ source: _source, ...values }: Scenario) => JSON.stringify(values);
  if (!restart && state.scenario && comparable(candidate) === comparable(state.scenario)) { closeDialogs(); return; }
  const attempt = ++scenarioAttempt;
  try {
    if (!await refreshWorkspace(candidate) || attempt !== scenarioAttempt) return;
    closeDialogs();
    lastRenderContext = "";
    state.status = "ready";
    if (restart) {
      state.route = { kind: "journey", id: "scale" };
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${routeHash(state.route)}`);
      routePositions.clear();
    }
    await loadRouteData({ focus: true });
  } catch (error) {
    if (attempt !== scenarioAttempt) return;
    activeBusy = null; state.busyMessage = null;
    state.scenarioError = error instanceof ApiClientError ? error.message : "No se pudo aplicar el escenario. Tu selección anterior se conserva.";
    render();
  }
}

async function selectMapProject(id: string): Promise<void> {
  const ticket = requests.begin("map");
  state.mapProjectId = canonicalProjectId(id); state.mapProjectDetail = null; state.mapProjectStatus = "loading"; render();
  try {
    const detail = await provider.project(id);
    if (!requests.isCurrent(ticket)) return;
    state.mapProjectDetail = detail; state.mapProjectStatus = "ready"; render();
  } catch {
    if (!requests.isCurrent(ticket)) return;
    state.mapProjectStatus = "error"; render();
  }
}

function closeProjectDetail(): void {
  requests.invalidate("detail");
  state.projectDetail = null;
  render();
  requestAnimationFrame(() => {
    window.scrollTo({ top: detailOrigin?.scroll ?? 0, behavior: "instant" });
    if (detailOrigin) document.querySelector<HTMLElement>(detailOrigin.selector)?.focus({ preventScroll: true });
  });
}

async function openProjectDetail(id: string): Promise<void> {
  const ticket = beginTask("detail", "Cargando ficha…");
  state.projectDetail = null; state.routeError = null; detailRetryId = null; render();
  try {
    const detail = await provider.project(id);
    if (!finishTask(ticket)) return;
    state.projectDetail = detail; render();
    requestAnimationFrame(focusProjectDetail);
  } catch (error) {
    if (!finishTask(ticket)) return;
    detailRetryId = id; fail(error);
  }
}

function focusProjectDetail(): void {
  const heading = document.querySelector<HTMLElement>("#project-detail-title");
  heading?.focus({ preventScroll: true });
  heading?.scrollIntoView({ block: "start", behavior: "instant" });
}

async function initialize(): Promise<void> {
  requests.invalidateAll();
  state.status = "loading";
  state.error = null;
  render();
  try {
    const [meta, bootstrap] = await Promise.all([provider.meta(), provider.bootstrap()]);
    if (meta.datasetVersion !== bootstrap.datasetVersion) {
      throw new ApiClientError("Los datos cambiaron mientras se abría la aplicación. Reintenta para cargar una sola versión.", "DATASET_CHANGED", 409, null);
    }
    if (meta.contractVersion !== "2.4.0" || bootstrap.contractVersion !== meta.contractVersion) {
      throw new ApiClientError(
        "La aplicación y el servicio de datos no son compatibles. Actualiza la página o solicita soporte.",
        "CONTRACT_INCOMPATIBLE",
        409,
        null,
      );
    }
    state.meta = meta;
    state.bootstrap = bootstrap;
    state.scenario = scenarioFromLocation(bootstrap.initialScenario);
    state.inspectorSlug = bootstrap.inspectorCases.find(({ routeSlug }) => routeSlug === "f3-ct-g-pardo")?.routeSlug
      ?? bootstrap.inspectorCases[0]?.routeSlug
      ?? null;
    await refreshWorkspace();
    state.status = "ready";
    await loadRouteData();
  } catch (error) {
    fail(error);
  }
}

async function refreshWorkspace(candidate = state.scenario, reset = true): Promise<boolean> {
  if (!candidate) return false;
  requests.invalidateAll();
  const ticket = beginTask("workspace", "Actualizando lectura comercial…");
  state.scenarioError = null;
  render();
  const workspace = await provider.evaluateWorkspace(candidate);
  if (!requests.isCurrent(ticket)) return false;
  const [projects, history, sourceCoverage, refreshStatus] = await Promise.all([
    provider.scenarioProjects(workspace.scenario, { page: 1, pageSize: 18, sort: "name" }),
    provider.scenarioHistory(workspace.scenario, { page: 1, pageSize: 100 }),
    provider.sourceCoverage(workspace.scenario.district_id).catch(() => null),
    provider.dataRefreshStatus().catch(() => null),
  ]);
  if (!finishTask(ticket)) return false;
  state.scenario = workspace.scenario;
  state.workspace = workspace;
  state.routeError = null;
  if (reset) {
  state.selectedProjectIds = [];
  state.selectedProjects = {};
  state.selectionMessage = "Selecciona entre dos y tres proyectos para compararlos.";
  state.projectPage = 1;
  state.projectScope = "scenario";
  state.projectQuery = "";
  state.projectSort = "name";
  state.historyDirection = "all";
  state.historyValidity = "all";
  }
  writeScenarioToLocation(workspace.scenario);
  state.projects = projects;
  state.history = history;
  state.sourceCoverage = sourceCoverage;
  state.refreshStatus = refreshStatus;
  state.inspector = null;
  state.comparison = null;
  state.assistant = null;
  state.assistantDraft = "";
  state.assistantIntentId = null;
  state.assistantQuestionTitle = null;
  state.assistantError = null;
  state.projectDetail = null;
  state.mapProjectId = null;
  state.mapProjectDetail = null;
  state.mapProjectStatus = "idle";
  state.busyMessage = null;
  return true;
}

async function loadRouteData(options: { focus?: boolean } = {}): Promise<void> {
  if (state.status !== "ready" || !state.scenario || !state.bootstrap) {
    render();
    return;
  }
  const ticket = beginTask("route", routeLoadingLabel(state.route));
  const scenario = structuredClone(state.scenario);
  const route = { ...state.route };
  state.routeError = null;
  try {
    if (route.id === "projects" || route.id === "dashboard" || route.id === "geography") state.projects = null;
    if (route.id === "activity" || route.id === "movement") state.history = null;
    render();
    if (route.id === "projects") {
      const projects = await queryProjects();
      if (!requests.isCurrent(ticket)) return;
      state.projects = projects;
    }
    if (route.id === "dashboard" || route.id === "geography") {
      const [projects, geography, sourceCoverage, refreshStatus] = await Promise.all([
        allScenarioProjects(scenario),
        provider.districtGeography(scenario.district_id),
        provider.sourceCoverage(scenario.district_id).catch(() => null),
        provider.dataRefreshStatus().catch(() => null),
      ]);
      if (!requests.isCurrent(ticket)) return;
      state.projects = projects;
      state.geography = geography;
      state.sourceCoverage = sourceCoverage ?? state.sourceCoverage;
      state.refreshStatus = refreshStatus ?? state.refreshStatus;
    }
    if (route.id === "activity" || route.id === "movement") {
      const history = await allScenarioHistory(scenario);
      if (!requests.isCurrent(ticket)) return;
      state.history = history;
    }
    if (state.route.id === "quality") {
      const slug = state.inspectorSlug ?? state.bootstrap.inspectorCases[0]?.routeSlug;
      if (slug) {
        const inspector = await provider.inspector(slug);
        if (!requests.isCurrent(ticket)) return;
        state.inspector = inspector;
      }
    }
    if (state.route.id === "compare" || state.route.id === "depth") {
      const comparison = state.selectedProjectIds.length >= 2
        ? await provider.comparison(scenario, [...state.selectedProjectIds])
        : null;
      if (!requests.isCurrent(ticket)) return;
      state.comparison = comparison;
    }
    if (!finishTask(ticket)) return;
    render();
    if (options.focus) requestAnimationFrame(() => {
      window.scrollTo({ top: routePositions.get(routeHash(route)) ?? 0, left: 0, behavior: "auto" });
      document.querySelector<HTMLElement>(".page-header h1")?.focus({ preventScroll: true });
    });
  } catch (error) {
    if (!finishTask(ticket)) return;
    fail(error);
  }
}

function fail(error: unknown): void {
  const problem = error instanceof ApiClientError
    ? error
    : new ApiClientError("No se pudo completar la consulta. Inténtalo nuevamente.", "APP_ERROR", 500, null);
  if (state.status === "loading" || !state.workspace || ["CONTRACT_INCOMPATIBLE", "DATASET_CHANGED"].includes(problem.code)) {
    state.status = "error"; state.error = problem;
  } else { state.status = "ready"; state.routeError = problem; }
  state.busyMessage = null;
  render();
}

function render(): void {
  if (state.status !== "ready" || !state.bootstrap || !state.meta || !state.scenario || !state.workspace) {
    root.innerHTML = state.status === "error" ? renderFatalError() : renderLoading();
    return;
  }
  const context = `${routeHash(state.route)}:${JSON.stringify(state.scenario)}`;
  const interaction = lastRenderContext === context ? captureInteractionSnapshot(root, {
    draftSelector: '#project-filter-form [name], #scenario-form [name], #command-input',
    scrollSelector: '.table-scroll[id], .project-detail[id]',
  }) : null;
  lastRenderContext = context;
  const district = districtName();
  root.innerHTML = `
    <a class="skip-link" href="#main-content">Ir al contenido principal</a>
    <div class="product-shell ${state.navOpen ? "nav-open" : ""}">
      <button class="nav-scrim" type="button" data-action="close-nav" aria-label="Cerrar navegación"></button>
      <aside class="product-sidebar" id="product-sidebar" aria-label="Navegación principal">
        <header class="brand">
          <span class="brand-lockup"><img src="/assets/viva-negocio-inmobiliario-logo.png" alt="Viva Negocio Inmobiliario S.A." width="181" height="67" /><strong>Inteligencia comercial</strong></span>
          <button class="icon-button mobile-only" type="button" data-action="close-nav" aria-label="Cerrar menú">${closeIcon()}</button>
        </header>
        <button class="command-trigger" type="button" data-action="command">
          <span>Ir a…</span><kbd>Ctrl K</kbd>
        </button>
        ${renderNavigation()}
        <footer class="dataset-note">
          <span>Datos al ${formatDate(state.meta.cutoffAt)}</span>
          <strong>${formatNumber(state.meta.coverage.projects)} proyectos</strong>
        </footer>
      </aside>
      <div class="product-workspace">
        <header class="scenario-ribbon">
          <button class="icon-button menu-button" type="button" data-action="open-nav" aria-label="Abrir menú">☰</button>
          <div class="scenario-ribbon__context">
            <span>Escenario activo</span>
            <strong>${escapeHtml(district)} · ${escapeHtml(scopeLabel())}</strong>
            <small class="context-filters">${escapeHtml(scenarioProductLabel())}</small>
          </div>
          <div class="scenario-ribbon__metrics" aria-label="Resumen del escenario">
            <span><b>${formatNumber(state.workspace.marketReading.comparableProjectCount)}</b> comparables</span>
            <span><b>${formatNumber(state.workspace.marketReading.priceReferenceCount)}</b> con precio y área</span>
          </div>
          <button class="button button--quiet" type="button" data-action="scenario">Editar escenario</button>
        </header>
        <main class="product-content" id="main-content" tabindex="-1">
          ${state.workspace.corrections.length ? renderCorrections() : ""}
          ${state.routeError ? `<section class="route-error surface" role="alert"><h2>No se pudo completar la consulta</h2><p>${escapeHtml(state.routeError.message)}</p><button class="button button--primary" type="button" data-action="retry-route">Reintentar consulta</button></section>` : ""}
          ${renderCurrentRoute()}
        </main>
      </div>
      ${renderScenarioDialog()}
      ${renderCommandDialog()}
      ${renderDataRefreshDialog()}
      ${state.busyMessage ? `<div class="busy" role="status"><span></span>${escapeHtml(state.busyMessage)}</div>` : ""}
    </div>`;
  root.querySelectorAll<HTMLDetailsElement>("details").forEach((details) => {
    if (!details.id && !details.dataset.continuityKey) {
      const projectId = state.projectDetail?.project?.id ?? "";
      details.dataset.continuityKey = `${routeHash(state.route)}:${projectId}:${details.querySelector("summary")?.textContent ?? ""}`;
    }
  });
  if (interaction) restoreInteractionSnapshot(root, interaction);
  updateCommandResults();
}

function renderLoading(): string {
  return `<main class="startup-state" aria-busy="true"><img class="startup-logo" src="/assets/viva-negocio-inmobiliario-logo.png" alt="Viva Negocio Inmobiliario S.A." width="260" height="96" /><span class="loader"></span><h1>Preparando la lectura comercial</h1><p>Organizando la información del mercado.</p></main>`;
}

function renderFatalError(): string {
  const error = state.error;
  return `<main class="startup-state startup-state--error"><span class="error-mark">!</span><h1>No se pudo abrir el espacio comercial</h1><p>${escapeHtml(error?.message ?? "El servicio no respondió.")}</p><details class="technical"><summary>Información para soporte</summary><p>Código: ${escapeHtml(error?.code ?? "APP_ERROR")}${error?.requestId ? ` · Solicitud ${escapeHtml(error.requestId)}` : ""}</p></details><button class="button button--primary" type="button" data-action="retry">Reintentar</button></main>`;
}

function renderNavigation(): string {
  const primary = [
    { id: "dashboard", label: "Panorama", hint: "Zona, precios y oferta", kind: "module" },
    { id: "projects", label: "Proyectos", hint: "Catálogo y fichas", kind: "module" },
    { id: "compare", label: "Comparar", hint: "Proyectos lado a lado", kind: "module" },
    { id: "activity", label: "Seguimiento", hint: "Cambios publicados", kind: "module" },
    { id: "assistant", label: "Decidir", hint: "Argumento comercial", kind: "module" },
  ];
  return `<nav class="product-nav">
    <p class="nav-label">Trabajo comercial</p>
    ${primary.map((item, index) => navButton(item.id, item.label, item.hint, String(index + 1).padStart(2, "0"), item.kind)).join("")}
    <p class="nav-label nav-label--secondary">Guía opcional</p>
    ${navButton("journey/scale", "Recorrido", "Lectura en seis pasos", "→", "journey")}
  </nav>`;
}

function navButton(id: string, label: string, hint: string, marker: string, kind: string): string {
  const hash = id.includes("/") ? `#${id}` : `#${id}`;
  const active = kind === "journey"
    ? state.route.kind === "journey"
    : state.route.kind === "module" && state.route.id === id;
  return `<a class="nav-link ${active ? "active" : ""}" href="${hash}" ${active ? 'aria-current="page"' : ""}><span>${marker}</span><span><strong>${escapeHtml(label)}</strong>${hint ? `<small>${escapeHtml(hint)}</small>` : ""}</span></a>`;
}

function renderCurrentRoute(): string {
  if (state.route.kind === "journey") return renderJourney(state.route.id);
  const views: Record<string, () => string> = {
    dashboard: renderDashboard,
    projects: renderProjects,
    compare: renderComparison,
    assistant: renderAssistant,
    activity: renderHistory,
  };
  return (views[state.route.id] ?? renderDashboard)();
}

function renderPageHeader(eyebrow: string, title: string, description: string, action = ""): string {
  return `<header class="page-header"><div><span class="eyebrow">${escapeHtml(eyebrow)}</span><h1 tabindex="-1">${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div>${action}</header>`;
}

function renderJourney(stageId: string): string {
  const index = JOURNEY_STAGES.findIndex(({ id }) => id === stageId);
  const stage = JOURNEY_STAGES[Math.max(index, 0)]!;
  const previous = JOURNEY_STAGES[index - 1];
  const next = JOURNEY_STAGES[index + 1];
  const body = ({
    scale: renderScaleStage,
    geography: () => renderMapSection(true),
    quality: renderQualityStage,
    depth: renderDepthStage,
    movement: renderMovementStage,
    decision: renderDecisionStage,
  } as Record<string, () => string>)[stage.id]?.() ?? "";
  return `${renderPageHeader(`Etapa ${stage.position} de 6`, stage.label, stage.question)}
    <ol class="journey-progress" aria-label="Progreso del recorrido">${JOURNEY_STAGES.map((item) => `<li class="${item.id === stage.id ? "current" : item.position < stage.position ? "done" : ""}"><a href="#journey/${item.id}"><span>${item.position}</span>${escapeHtml(item.label)}</a></li>`).join("")}</ol>
    ${body}
    <nav class="journey-actions" aria-label="Navegación del recorrido">
      ${previous ? `<a class="button button--quiet" href="#journey/${previous.id}">← ${escapeHtml(previous.label)}</a>` : '<span></span>'}
      ${next ? `<a class="button button--primary" href="#journey/${next.id}">${escapeHtml(next.label)} →</a>` : '<button class="button button--primary" type="button" data-action="reset">Reiniciar recorrido</button>'}
    </nav>`;
}

function renderScaleStage(): string {
  return `<section class="decision-strip"><span>Lectura principal</span><strong>${formatNumber(state.workspace!.marketReading.comparableProjectCount)} proyectos comparables sostienen el escenario de ${escapeHtml(districtName())}.</strong><p>Podemos ubicar ${formatPercent(state.workspace!.coverage.geographyCoveragePct)} de la oferta. La mediana considera solo proyectos con precio y área suficientes para comparar.</p></section>
    <section class="metric-row" aria-label="Escala observable">
      ${metric("Proyectos observados", state.meta!.coverage.projects, "Base total disponible")}
      ${metric("Inmobiliarias seleccionadas", state.meta!.coverage.selectedAgencies, "Incluidas en esta lectura")}
      ${metric("Distritos", state.meta!.coverage.districts, "Ámbito geográfico publicado")}
    </section>`;
}

function renderQualityStage(): string {
  if (!state.inspector) return emptyState("La verificación de este ejemplo no está disponible.", "Revisar proyectos", "#projects");
  const dossier = state.inspector.dossier as JsonObject;
  return `<section class="decision-strip"><span>Verificación del dato</span><strong>${escapeHtml(qualityLabel(dossier.decision?.qualityStatus ?? dossier.decision?.quality_status))}</strong><p>Revisa qué información coincide y cuál necesita confirmación antes de utilizarla.</p></section>${renderQualityInspectorAccess()}`;
}

function renderDepthStage(): string {
  return `<section class="decision-strip"><span>Diferenciación</span><strong>${escapeHtml(benchmarkHeadline())}</strong><p>Contrasta primero precio y área; después revisa las características que más se anuncian.</p></section>${renderZoneOfferPanel()}`;
}

function renderMovementStage(): string {
  const total = state.history?.total ?? 0;
  return `<section class="decision-strip"><span>Movimiento observado</span><strong>${formatNumber(total)} cambios publicados requieren seguimiento.</strong><p>La plataforma muestra qué cambió y cuándo; la causa debe confirmarse con la inmobiliaria.</p></section>${renderHistorySignals(historyEvents().slice(0, 5), true)}`;
}

function renderDecisionStage(): string {
  return `<section class="decision-strip"><span>Recomendación comercial</span><strong>Prioriza una conclusión respaldada por los datos y explica el alcance del análisis.</strong><p>Esta lectura orienta la decisión; no predice demanda, cierres ni intención de compra.</p></section>
    <div class="two-column">${renderDecisionReadiness()}<section class="surface"><h2>Convertir lectura en acción</h2><p>Formula una pregunta y prepara un argumento claro para la conversación comercial.</p><a class="button button--primary" href="#assistant">Abrir Decidir</a></section></div>`;
}

function renderDashboard(): string {
  return `${renderPageHeader("Panorama", `${districtName()}: panorama comercial`, "Revisa zonas, precios, oferta y cambios que requieren una decisión.", '<a class="button button--primary" href="#projects">Explorar proyectos</a>')}
    ${state.refreshNotice ? `<aside class="refresh-notice refresh-notice--${state.refreshNotice.tone}" role="status"><strong>${state.refreshNotice.tone === "success" ? "Solicitud recibida" : state.refreshNotice.tone === "warning" ? "Actualización pendiente" : "No se pudo actualizar"}</strong><span>${escapeHtml(state.refreshNotice.message)}</span></aside>` : ""}
    ${renderDataPulse()}
    <section class="decision-strip"><span>Lectura principal</span><strong>${formatNumber(state.workspace!.marketReading.comparableProjectCount)} proyectos cumplen los filtros de ${escapeHtml(districtName())}.</strong><p>${pricePositionText()}</p></section>
    <section class="metric-row">${metric("Proyectos del escenario", state.workspace!.marketReading.comparableProjectCount, "Cumplen los filtros elegidos")}${metric("Con precio y área", state.workspace!.marketReading.priceReferenceCount, "Permiten ubicar el rango publicado")}${metric("Ubicados en el mapa", formatPercent(state.workspace!.coverage.geographyCoveragePct), "Proyectos con ubicación disponible")}</section>
    ${renderZoneOfferPanel()}
    ${renderMapSection(false)}
    ${renderSourceDashboard()}`;
}

function renderDataPulse(): string {
  const refresh = state.refreshStatus;
  const run = refresh?.run;
  const runState = String(run?.state ?? "idle");
  const runLabel = ({
    idle: "Sin actualización en curso",
    queued: "Actualización programada",
    running: "Actualizando información",
    succeeded: "Recopilación terminada",
    blocked: "Actualización pendiente",
    failed: "No se pudo actualizar",
  } as Record<string, string>)[String(run?.state ?? "idle")] ?? "Estado por revisar";
  return `<section class="data-pulse" aria-label="Estado de actualización de datos">
    <div class="data-pulse__signal"><span class="pulse-dot ${run?.state === "running" || run?.state === "queued" ? "is-active" : ""}" aria-hidden="true"></span><div><span class="eyebrow">Datos con corte al</span><strong>${formatDate(state.meta!.cutoffAt)}</strong><small>Fecha de referencia de esta versión.</small></div></div>
    <div class="data-pulse__run"><span>${escapeHtml(runLabel)}</span><strong>${escapeHtml(refreshRunCopy(runState))}</strong>${run?.requestedAt ? `<small>Solicitado ${formatDateTime(run.requestedAt)}</small>` : ""}</div>
    <div class="data-pulse__actions"><button class="button button--quiet" type="button" data-action="data-refresh">Actualizar datos</button><button class="link-button" type="button" data-action="refresh-status">Revisar estado</button><small>${refresh?.enabled ? "Requiere clave de operador" : "No habilitado en este entorno"}</small><details class="methodology"><summary>Consultar fechas</summary><p>Datos con corte al ${formatDateTime(state.meta!.cutoffAt)}. Versión preparada el ${formatDateTime(state.meta!.generatedAt)}. La fecha de publicación no está registrada.</p><p>Las fechas de captura de cada fuente están en la ficha del proyecto.</p></details></div>
  </section>`;
}

function refreshRunCopy(runState: unknown): string {
  return ({
    idle: "No hay una actualización en curso.",
    queued: "La actualización comenzará en breve.",
    running: "Estamos revisando la información de los proyectos.",
    succeeded: "La recopilación terminó. No confirma que los datos visibles hayan cambiado.",
    blocked: "La actualización necesita una revisión del equipo.",
    failed: "Inténtalo nuevamente o solicita soporte.",
  } as Record<string, string>)[String(runState)] ?? "Revisa el estado antes de continuar.";
}

function renderSourceDashboard(): string {
  const coverage = state.sourceCoverage;
  if (!coverage) return "";
  const channels = coverage.channels;
  const history = state.history?.items ?? [];
  const priceChanges = history.filter((event) => String(event.field_name ?? event.change_type ?? "").includes("price") || event.previous_value != null).length;
  return `<section class="intelligence-board" aria-labelledby="source-dashboard-title">
    <header class="section-heading intelligence-board__heading"><div><span class="eyebrow">Información disponible</span><h2 id="source-dashboard-title">Qué sabemos del distrito</h2><p>${formatNumber(coverage.totals.projects)} proyectos de ${formatNumber(coverage.totals.agencies)} inmobiliarias en ${escapeHtml(coverage.scope.districtName ?? districtName())}.</p></div><span class="status-pill">${formatNumber(channels.officialWebObserved.projectCount)} con datos de web oficial</span></header>
    <div class="intelligence-board__grid">
      <article class="chart-card source-channel-chart"><header><div><span class="eyebrow">Cobertura</span><h3>Información disponible</h3></div><span class="chart-badge">Distrito activo</span></header>
        ${sourceCoverageBar("Nexo Inmobiliario", channels.nexo, "Base principal")}
        ${sourceCoverageBar("Web oficial con datos", channels.officialWebObserved, `${formatNumber(channels.officialWebLinked.projectCount)} proyectos tienen una página oficial identificada`)}
        ${sourceCoverageBar("Redes oficiales", channels.social, channels.social.projectCount ? "Información disponible" : "Pendiente de incorporación")}
        <p class="chart-note">Una página vinculada cuenta solo cuando aporta información del proyecto.</p>
      </article>
      ${renderPriceBand(coverage)}
      <article class="chart-card signal-mix"><header><div><span class="eyebrow">Seguimiento</span><h3>Señales disponibles</h3></div><a href="#activity">Abrir panel</a></header>
        ${signalBar("Cambios de precio", priceChanges, Math.max(history.length, 1), "Con historial publicado", "price")}
        ${signalBar("Nuevas unidades", null, 1, "Aún no monitoreado", "unit")}
        ${signalBar("Descuentos anunciados", null, 1, "Aún no monitoreado", "discount")}
        <p class="chart-note">“—” indica que no se monitorea; no significa ausencia de cambios.</p>
      </article>
    </div>
    ${renderAgencyCoverage(coverage)}
  </section>`;
}

function renderAgencyCoverage(coverage: SourceCoverage): string {
  const rows = coverage.agencies;
  return `<details class="agency-coverage"><summary><span>Revisar cobertura de las ${formatNumber(rows.length)} inmobiliarias del distrito</span></summary><div class="agency-coverage__body"><div class="table-scroll"><table><thead><tr><th scope="col">Inmobiliaria</th><th scope="col">Proyectos Nexo</th><th scope="col">Web oficial vinculada</th><th scope="col">Con datos observados</th><th scope="col">Red oficial</th><th scope="col">Estado</th></tr></thead><tbody>${rows.map((agency) => `<tr><td><strong>${escapeHtml(agency.name)}</strong></td><td>${formatNumber(agency.projectCount)}</td><td>${formatNumber(agency.officialWebLinkedProjects)}</td><td>${formatNumber(agency.officialWebObservedProjects)}</td><td>${formatNumber(agency.socialProjects)}</td><td><span class="agency-source-status agency-source-status--${agency.coverageStatus}">${agency.coverageStatus === "observed" ? "Datos oficiales observados" : agency.coverageStatus === "linked" ? "Página por completar" : "Solo Nexo"}</span></td></tr>`).join("")}</tbody></table></div><p class="chart-note">Incluye todas las inmobiliarias con proyectos en el distrito.</p></div></details>`;
}

function sourceCoverageBar(label: string, channel: SourceCoverage["channels"]["nexo"], note: string): string {
  return `<div class="coverage-row"><div><strong>${escapeHtml(label)}</strong><span>${formatNumber(channel.projectCount)} proyectos · ${formatPercent(channel.coveragePct)}</span></div><div class="coverage-track" role="meter" aria-label="${escapeAttr(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${channel.coveragePct}"><span style="--coverage:${Math.max(0, Math.min(100, channel.coveragePct))}%"></span></div><small>${escapeHtml(note)}${channel.lastCapturedAt ? ` · ${formatDate(channel.lastCapturedAt)}` : ""}</small></div>`;
}

function renderPriceBand(coverage: SourceCoverage): string {
  const distribution = coverage.priceDistribution;
  if (distribution.min == null || distribution.max == null || distribution.median == null) {
    return `<article class="chart-card"><h3>Rango de precios publicados</h3><p>No hay suficientes precios para representar el rango.</p></article>`;
  }
  const span = Math.max(distribution.max - distribution.min, 1);
  const position = (value: number | null) => value == null ? 0 : ((value - distribution.min!) / span) * 100;
  const q1 = position(distribution.q1);
  const q3 = position(distribution.q3);
  const medianPosition = position(distribution.median);
  return `<article class="chart-card price-band-card"><header><div><span class="eyebrow">Precio publicado</span><h3>Rango del distrito</h3></div><span class="chart-badge">${formatNumber(distribution.count)} precios</span></header>
    <div class="price-band" role="img" aria-label="Precio mínimo ${money(distribution.min)}, mediana ${money(distribution.median)} y máximo ${money(distribution.max)}"><span class="price-band__line"></span><span class="price-band__quartile" style="left:${q1}%;width:${Math.max(q3 - q1, 1)}%"></span><span class="price-band__median" style="left:${medianPosition}%"><b>Mediana</b><strong>${money(distribution.median)}</strong></span></div>
    <div class="price-band__labels"><span><small>Mínimo</small>${money(distribution.min)}</span><span><small>P25</small>${money(distribution.q1)}</span><span><small>P75</small>${money(distribution.q3)}</span><span><small>Máximo</small>${money(distribution.max)}</span></div>
    <p class="chart-note">Distribución de precios publicados; no representa precios reales de cierre.</p>
  </article>`;
}

function signalBar(label: string, value: number | null, total: number, note: string, icon: "price" | "unit" | "discount"): string {
  const percentage = Math.max(0, Math.min(100, ((value ?? 0) / Math.max(total, 1)) * 100));
  return `<div class="signal-row">${monitoringIcon(icon)}<div><span><strong>${escapeHtml(label)}</strong><b>${value == null ? "—" : formatNumber(value)}</b></span>${value == null ? "" : `<div class="signal-track"><i style="--signal:${percentage}%"></i></div>`}<small>${escapeHtml(note)}</small></div></div>`;
}

function renderMapSection(journey: boolean): string {
  const projects = state.projects?.items ?? [];
  if (!state.projects) return `<section class="surface" role="status">${state.routeError ? "El mapa estará disponible cuando se recupere la consulta." : "Cargando proyectos del escenario…"}</section>`;
  const visible = state.mapView === "geographic"
    ? projects.filter((project) => project.latitude != null && project.longitude != null)
    : projects.filter((project) => Number.isFinite(project.areaM2) && Number.isFinite(project.pricePen) && project.areaM2! > 0 && project.pricePen! > 0);
  const title = state.mapView === "geographic" ? "Mapa del distrito" : "Posicionamiento por área y precio";
  const description = state.mapView === "geographic"
    ? "Explora la oferta por cuatro zonas de comparación y abre cada proyecto desde el mapa."
    : "Contrasta área total y precio publicado frente a la mediana visible.";
  return `<section class="surface map-surface"><header class="section-heading"><div><span class="eyebrow">Territorio observado</span><h2>${title}</h2><p>${description}</p></div><span class="status-pill">${formatNumber(visible.length)} visibles</span></header>
    <div class="map-switch" role="group" aria-label="Vista del mapa">
      <button type="button" data-action="map-geographic" aria-pressed="${state.mapView === "geographic"}">Mapa del distrito</button>
      <button type="button" data-action="map-positioning" aria-pressed="${state.mapView === "positioning"}">Área y precio publicado</button>
    </div>
    ${state.mapView === "geographic" ? renderGeographicMap(projects) : renderPositioningMap(projects)}
    <label class="map-project-picker" for="map-project-picker">Seleccionar proyecto del gráfico<select id="map-project-picker"><option value="">Elige un proyecto</option>${visible.map((project) => `<option value="${escapeAttr(project.id)}" ${canonicalProjectId(project.id) === state.mapProjectId ? "selected" : ""}>${escapeHtml(project.name)} · ${escapeHtml(project.agency)}</option>`).join("")}</select></label>
    ${journey ? '<p class="method-note"><strong>Cómo leerlo:</strong> las cuatro zonas ayudan a comparar la oferta; no representan límites oficiales. El precio mostrado es publicado, no de cierre.</p>' : ""}</section>
    ${state.projectDetail ? renderProjectDetail() : ""}`;
}

function renderGeographicMap(projects: ProjectSummary[]): string {
  const valid = projects.filter((project) => project.latitude != null && project.longitude != null);
  const feature = state.geography?.geometry;
  const geometry = feature?.geometry as JsonObject | undefined;
  if (!valid.length || !geometry) return emptyState("No hay geometría y coordenadas válidas para este escenario.", "Editar escenario", "#dashboard");
  const boundary = geometryCoordinates(geometry);
  if (!boundary.length) return emptyState("El límite distrital no pudo representarse.", "Editar escenario", "#dashboard");
  const allCoordinates = [...boundary, ...valid.map((project) => [project.longitude!, project.latitude!] as [number, number])];
  const lats = allCoordinates.map(([, latitude]) => latitude);
  const lons = allCoordinates.map(([longitude]) => longitude);
  const minLat = Math.min(...lats); const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons); const maxLon = Math.max(...lons);
  const width = 960; const height = 520; const padding = 34;
  const x = (value: number) => padding + ((value - minLon) / Math.max(maxLon - minLon, 0.000001)) * (width - padding * 2);
  const y = (value: number) => padding + ((maxLat - value) / Math.max(maxLat - minLat, 0.000001)) * (height - padding * 2);
  const zones = state.geography!.analysisZones;
  const medianX = x(zones.medianLongitude);
  const medianY = y(zones.medianLatitude);
  const boundaryPath = geometryPath(geometry, x, y);
  const zoneRects = [
    { id: "NW", x: padding, y: padding, width: medianX - padding, height: medianY - padding, labelX: padding + 18, labelY: padding + 28 },
    { id: "NE", x: medianX, y: padding, width: width - padding - medianX, height: medianY - padding, labelX: width - padding - 18, labelY: padding + 28 },
    { id: "SW", x: padding, y: medianY, width: medianX - padding, height: height - padding - medianY, labelX: padding + 18, labelY: height - padding - 40 },
    { id: "SE", x: medianX, y: medianY, width: width - padding - medianX, height: height - padding - medianY, labelX: width - padding - 18, labelY: height - padding - 40 },
  ];
  const visibleZoneCounts = Object.fromEntries(["NW", "NE", "SW", "SE"].map((id) => [
    id,
    valid.filter((project) => analyticZoneForProject(project) === id).length,
  ]));
  return `<div class="map-visual-layout"><div><div class="map-frame"><svg class="map-chart map-chart--geographic" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="map-title map-description"><title id="map-title">Proyectos por zona en ${escapeHtml(districtName())}</title><desc id="map-description">Contorno distrital referencial dividido en cuatro zonas de comparación y ${valid.length} proyectos seleccionables.</desc>
    <defs><clipPath id="district-zone-clip"><path d="${escapeAttr(boundaryPath)}" fill-rule="evenodd"></path></clipPath></defs>
    <g clip-path="url(#district-zone-clip)" aria-hidden="true">${zoneRects.map((zone) => `<rect class="map-zone map-zone--${zone.id.toLowerCase()} ${state.scenario?.scope_mode === "quadrant" && state.scenario.quadrant_id === zone.id ? "is-active" : ""}" x="${zone.x}" y="${zone.y}" width="${Math.max(zone.width, 0)}" height="${Math.max(zone.height, 0)}"></rect>`).join("")}</g>
    <path class="district-boundary" d="${escapeAttr(boundaryPath)}" fill-rule="evenodd"></path>
    <line class="zone-divider" clip-path="url(#district-zone-clip)" x1="${medianX}" y1="${padding}" x2="${medianX}" y2="${height - padding}"></line>
    <line class="zone-divider" clip-path="url(#district-zone-clip)" x1="${padding}" y1="${medianY}" x2="${width - padding}" y2="${medianY}"></line>
    ${zoneRects.map((zone) => `<g class="zone-label" aria-hidden="true"><text x="${zone.labelX}" y="${zone.labelY}" text-anchor="${zone.id.endsWith("E") ? "end" : "start"}">${zone.id}</text><text class="zone-label__caption" x="${zone.labelX}" y="${zone.labelY + 18}" text-anchor="${zone.id.endsWith("E") ? "end" : "start"}">Zona de comparación</text></g>`).join("")}
    ${valid.map((project) => renderMapPoint(project, x(project.longitude!), y(project.latitude!), `${project.name} · ${analyticZoneLabel(analyticZoneForProject(project))} · ${money(project.pricePen)} publicado · ${formatNumber(project.areaM2)} m²`)).join("")}
  </svg></div>
  <ul class="zone-legend" aria-label="Proyectos visibles por zona de comparación">${zones.zones.map((zone) => `<li class="${state.scenario?.scope_mode === "quadrant" && state.scenario.quadrant_id === zone.id ? "is-active" : ""}"><span>${escapeHtml(zone.id)}</span><strong>${escapeHtml(zone.label)}</strong><small>${formatNumber(visibleZoneCounts[zone.id] ?? 0)} visibles</small></li>`).join("")}</ul></div>${renderMapProjectPanel(valid)}</div>
  <p class="map-provenance">Las zonas agrupan proyectos para facilitar la comparación; no representan límites urbanos oficiales. El contorno distrital es referencial.</p>`;
}

function renderPositioningMap(projects: ProjectSummary[]): string {
  const valid = projects.filter((project) => Number.isFinite(project.areaM2) && Number.isFinite(project.pricePen) && project.areaM2! > 0 && project.pricePen! > 0);
  if (!valid.length) return emptyState("No hay pares de área y precio publicado para este escenario.", "Ver proyectos", "#projects");
  const areas = valid.map(({ areaM2 }) => areaM2!);
  const prices = valid.map(({ pricePen }) => pricePen!);
  const minArea = Math.min(...areas); const maxArea = Math.max(...areas);
  const minPrice = Math.min(...prices); const maxPrice = Math.max(...prices);
  const medianPrice = state.projects?.positioningStats?.medianPublishedPricePen as number | null | undefined;
  if (medianPrice == null) return emptyState("No hay una referencia de precio disponible para estos proyectos.", "Ver proyectos", "#projects");
  const width = 960; const height = 480; const left = 86; const right = 24; const top = 28; const bottom = 58;
  const x = (value: number) => left + ((value - minArea) / Math.max(maxArea - minArea, 1)) * (width - left - right);
  const y = (value: number) => top + ((maxPrice - value) / Math.max(maxPrice - minPrice, 1)) * (height - top - bottom);
  const medianY = y(medianPrice);
  return `<div class="map-visual-layout"><div class="map-frame"><svg class="map-chart" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="position-title position-description"><title id="position-title">Área y precio publicado en ${escapeHtml(districtName())}</title><desc id="position-description">${valid.length} proyectos. Eje horizontal área total publicada; eje vertical precio publicado. Una línea horizontal señala la mediana de ${money(medianPrice)}.</desc>
    <line x1="${left}" y1="${height - bottom}" x2="${width - right}" y2="${height - bottom}" />
    <line x1="${left}" y1="${top}" x2="${left}" y2="${height - bottom}" />
    <text x="${left}" y="${height - 20}">${formatNumber(minArea)} m²</text><text x="${width - right}" y="${height - 20}" text-anchor="end">${formatNumber(maxArea)} m² de área total</text>
    <text x="${left - 12}" y="${height - bottom}" text-anchor="end">${money(minPrice)}</text><text x="${left - 12}" y="${top + 4}" text-anchor="end">${money(maxPrice)}</text>
    <line class="price-median-line" x1="${left}" y1="${medianY}" x2="${width - right}" y2="${medianY}"></line>
    <rect class="price-median-label-bg" x="${left + 10}" y="${Math.max(top + 3, medianY - 24)}" width="220" height="22" rx="5"></rect>
    <text class="price-median-label" x="${left + 20}" y="${Math.max(top + 18, medianY - 9)}">Mediana publicada ${money(medianPrice)}</text>
    ${valid.map((project) => renderMapPoint(project, x(project.areaM2!), y(project.pricePen!), `${project.name} · ${money(project.pricePen)} publicado · ${formatNumber(project.areaM2)} m²`)).join("")}
  </svg></div>${renderMapProjectPanel(valid)}</div><p class="map-provenance"><strong>Mediana visible:</strong> ${money(medianPrice)} entre ${formatNumber(valid.length)} precios publicados. Cada punto usa área total y precio publicados; no representa precio real de cierre ni una tasación.</p>`;
}

function renderMapPoint(project: ProjectSummary, x: number, y: number, description: string): string {
  const selected = state.mapProjectId === canonicalProjectId(project.id);
  const inScenario = state.workspace!.comparableProjectIds.includes(canonicalProjectId(project.id));
  return `<a class="map-point ${selected ? "is-selected" : ""} ${inScenario ? "is-in-scenario" : "is-context-only"}" href="#projects" data-map-project="${escapeAttr(project.id)}" aria-label="Seleccionar ${escapeAttr(project.name)}"><circle cx="${x}" cy="${y}" r="7"><title>${escapeHtml(description)} · ${inScenario ? "Dentro del escenario comparable" : "Contexto distrital fuera del escenario"}</title></circle></a>`;
}

function renderMapProjectPanel(projects: ProjectSummary[]): string {
  const project = projects.find((item) => canonicalProjectId(item.id) === state.mapProjectId);
  if (!project) return `<aside class="map-project-panel" aria-live="polite"><span class="map-project-panel__marker" aria-hidden="true">●</span><span class="eyebrow">Detalle del mapa</span><h3>Selecciona un proyecto</h3><p>Toca un punto para ver el resumen del proyecto.</p></aside>`;
  const trace = state.mapProjectDetail?.traceability as JsonObject | undefined;
  const inScenario = state.workspace!.comparableProjectIds.includes(canonicalProjectId(project.id));
  const officialObserved = trace ? projectSourceComparison(trace, (trace.sources ?? []) as JsonObject[]).officialState === "observed" : false;
  const sourceSummary = officialObserved
    ? '<span class="source-chip source-chip--web">Nexo + web propia</span>'
    : `<span class="source-chip">Nexo${trace?.hasOwnWebsite ? " · web enlazada, sin datos capturados" : ""}</span>`;
  const pendingSource = state.mapProjectStatus === "error"
    ? '<span class="source-chip source-chip--error">Detalle no disponible</span>'
    : '<span class="source-chip">Consultando…</span>';
  return `<aside class="map-project-panel map-project-panel--selected" aria-live="polite"><span class="eyebrow">Proyecto seleccionado</span><h3>${escapeHtml(project.name)}</h3><p class="map-project-panel__agency">${escapeHtml(project.agency)}</p><dl><div><dt>Lectura</dt><dd><span class="map-scope-status ${inScenario ? "is-in" : "is-context"}">${inScenario ? "Dentro del escenario" : "Contexto del distrito"}</span></dd></div><div><dt>Zona</dt><dd>${escapeHtml(analyticZoneLabel(analyticZoneForProject(project)))}</dd></div><div><dt>Precio publicado</dt><dd>${money(project.pricePen)}</dd></div><div><dt>Área total</dt><dd>${project.areaM2 == null ? "Sin dato" : `${formatNumber(project.areaM2)} m²`}</dd></div><div><dt>Dirección</dt><dd>${escapeHtml(project.address ?? "Sin dato")}</dd></div></dl><div class="map-project-panel__sources"><span>Fuentes</span>${state.mapProjectDetail ? sourceSummary : pendingSource}${trace?.hasSocialSource ? '<span class="source-chip source-chip--social">Red social</span>' : ""}</div><button class="button button--primary" type="button" data-action="map-open-detail" ${state.mapProjectDetail ? "" : "disabled"}>Abrir ficha completa</button></aside>`;
}

function analyticZoneForProject(project: ProjectSummary): string | null {
  const zones = state.geography?.analysisZones;
  if (!zones || project.latitude == null || project.longitude == null) return null;
  const north = project.latitude >= zones.medianLatitude;
  const east = project.longitude >= zones.medianLongitude;
  return `${north ? "N" : "S"}${east ? "E" : "W"}`;
}

function analyticZoneLabel(zoneId: string | null): string {
  if (!zoneId) return "Sin zona asignada";
  const label = state.geography?.analysisZones.zones.find((zone) => zone.id === zoneId)?.label;
  return label ? `Zona de comparación ${label}` : "Zona de comparación";
}

function renderProjects(): string {
  const page = state.projects;
  const items = page?.items ?? [];
  const title = state.projectScope === "all" ? "Todos los proyectos" : state.projectScope === "district" ? "Oferta del distrito" : "Comparables del escenario";
  const description = state.projectScope === "all"
    ? "Explora el catálogo completo y abre la ficha de cada proyecto."
    : state.projectScope === "district" ? "Explora toda la oferta del distrito, incluso fuera de los filtros del escenario." : "Revisa la oferta compatible con los filtros del escenario activo.";
  return `${renderPageHeader("Proyectos", title, description, `<span class="status-pill">${page ? `${formatNumber(page.total)} resultados` : state.routeError ? "Consulta pendiente" : "Consultando…"}</span>`)}
    ${renderComparisonSelection(items)}
    <div class="project-workspace ${state.projectDetail ? "has-detail" : ""}"><section class="surface project-list-pane"><form class="filters project-filters" id="project-filter-form"><label>Vista<select name="project_scope"><option value="scenario" ${state.projectScope === "scenario" ? "selected" : ""}>Comparables del escenario</option><option value="district" ${state.projectScope === "district" ? "selected" : ""}>Todo ${escapeHtml(districtName())}</option><option value="all" ${state.projectScope === "all" ? "selected" : ""}>Todo el catálogo (${formatNumber(state.meta!.coverage.projects)})</option></select></label><label>Buscar<input name="query" type="search" value="${escapeAttr(state.projectQuery)}" placeholder="Proyecto, inmobiliaria o dirección" /></label><label>Orden<select name="sort"><option value="name" ${state.projectSort === "name" ? "selected" : ""}>Nombre</option><option value="price-asc" ${state.projectSort === "price-asc" ? "selected" : ""}>Menor precio publicado</option><option value="price-desc" ${state.projectSort === "price-desc" ? "selected" : ""}>Mayor precio publicado</option><option value="area-asc" ${state.projectSort === "area-asc" ? "selected" : ""}>Menor área</option><option value="area-desc" ${state.projectSort === "area-desc" ? "selected" : ""}>Mayor área</option></select></label><button class="button button--quiet" type="submit">Aplicar filtros</button></form>
      <p class="catalog-note">${state.projectScope === "all" ? "Catálogo completo. Cambia a comparables para aplicar todos los filtros del escenario." : state.projectScope === "district" ? `Distrito completo: ${escapeHtml(districtName())}. Solo los proyectos que cumplen el escenario pueden añadirse a la comparación.` : `Escenario: ${escapeHtml(districtName())} · ${escapeHtml(scopeLabel())} · ${escapeHtml(scenarioProductLabel())}.`}</p>
      <div class="table-scroll" id="project-table-scroll"><table class="project-table"><thead><tr><th scope="col">Comparar</th><th scope="col">Proyecto</th><th scope="col">Producto</th><th scope="col">Precio publicado</th><th scope="col">Área</th><th scope="col">Entrega</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody>${items.map(renderProjectRow).join("")}</tbody></table></div>
      ${items.length ? renderPagination(page!) : page ? '<p class="empty-state" role="status">No hay proyectos para estos filtros. Prueba otra búsqueda o cambia la vista.</p>' : `<p role="status">${state.routeError ? "Los resultados aparecerán al reintentar la consulta." : "Cargando proyectos…"}</p>`}
    </section>
    ${state.projectDetail ? renderProjectDetail() : ""}</div>`;
}

function renderProjectRow(project: ProjectSummary): string {
  const canonicalId = canonicalProjectId(project.id);
  const checked = state.selectedProjectIds.includes(canonicalId);
  const eligible = state.workspace!.comparableProjectIds.includes(canonicalId);
  const selectionFull = state.selectedProjectIds.length >= 3 && !checked;
  const selectionLabel = eligible
    ? `${checked ? "Quitar" : "Seleccionar"} ${project.name} para comparar`
    : `${project.name} no pertenece al conjunto comparable del escenario`;
  return `<tr class="${checked ? "is-selected" : ""} ${canonicalProjectId(String(state.projectDetail?.project?.id ?? "")) === canonicalId ? "is-detail-open" : ""}"><td class="project-select-cell" data-label="Comparar"><label class="project-select-target"><input class="project-select-checkbox" type="checkbox" data-compare-id="${escapeAttr(canonicalId)}" ${checked ? "checked" : ""} ${!eligible || selectionFull ? "disabled" : ""} aria-label="${escapeAttr(selectionLabel)}" title="${escapeAttr(!eligible ? "No cumple los filtros del escenario activo" : selectionFull ? "Ya seleccionaste el máximo de tres proyectos" : "Añadir a la comparación")}" /></label></td><td data-label="Proyecto"><span class="project-cell-value"><strong>${escapeHtml(project.name)}</strong><small>${escapeHtml(project.agency)} · ${escapeHtml(project.district)}</small></span></td><td data-label="Producto"><span class="project-cell-value"><span>${escapeHtml(project.typology ?? "Sin tipología")}</span><small>${escapeHtml(project.bedrooms ?? "—")} dorm.</small></span></td><td data-label="Precio publicado"><span class="project-cell-value"><strong>${money(project.pricePen)}</strong><small>Desde, según publicación</small></span></td><td data-label="Área"><span class="project-cell-value">${project.areaM2 == null ? "—" : `${formatNumber(project.areaM2)} m²`}</span></td><td data-label="Entrega"><span class="project-cell-value">${escapeHtml(project.phase ?? "Sin dato")}</span></td><td data-label="Ficha"><button class="link-button" type="button" data-project-detail="${escapeAttr(project.id)}">Abrir ficha</button></td></tr>`;
}

function renderComparisonSelection(items: ProjectSummary[]): string {
  const selected = state.selectedProjectIds.map((id) => {
    const visible = items.find((project) => canonicalProjectId(project.id) === id);
    if (visible) state.selectedProjects[id] = visible;
    return state.selectedProjects[id] ?? null;
  });
  const count = state.selectedProjectIds.length;
  const slotCount = count === 0 ? 1 : Math.min(3, count + 1);
  const guidance = count === 0
    ? "Elige el primer proyecto que quieres contrastar."
    : count === 1
      ? "Elige un proyecto más para activar el comparador."
      : count === 2
        ? "La comparación está lista. Puedes añadir un tercer proyecto."
        : "Selección completa: compara estos tres proyectos.";
  return `<section class="comparison-selection surface" aria-labelledby="comparison-selection-title">
    <div class="comparison-selection__intro"><span class="selection-step">1</span><div><span class="eyebrow">Arma tu comparación</span><h2 id="comparison-selection-title">Proyectos seleccionados <span>${count}/3</span></h2><p id="comparison-selection-status" aria-live="polite">${escapeHtml(state.selectionMessage || guidance)}</p></div></div>
    <div class="comparison-selection__projects" aria-label="Selección actual">
      ${Array.from({ length: slotCount }, (_, index) => {
        const project = selected[index];
        return project
          ? `<article class="selection-chip"><span>${index + 1}</span><div><strong>${escapeHtml(project.name)}</strong><small>${escapeHtml(project.agency)}</small></div><button class="icon-button icon-button--small" type="button" data-project-remove="${escapeAttr(state.selectedProjectIds[index])}" aria-label="Quitar ${escapeAttr(project.name)} de la comparación">${closeIcon()}</button></article>`
          : `<div class="selection-slot"><span>${index + 1}</span><small>${index === 0 ? "Selecciona el primer proyecto" : index === 1 ? "Selecciona uno más" : "Tercer proyecto opcional"}</small></div>`;
      }).join("")}
    </div>
    <div class="comparison-selection__actions"><button class="button button--quiet" type="button" data-action="clear-comparison" ${count ? "" : "disabled"}>Limpiar selección</button><button class="button button--primary" type="button" data-action="open-comparison" ${count >= 2 ? "" : "disabled"}><span class="selection-step selection-step--button">2</span>Comparar ${count >= 2 ? `${count} proyectos` : "proyectos"}</button></div>
  </section>`;
}

function renderPagination(page: Page<ProjectSummary>): string {
  return `<nav class="pagination" aria-label="Páginas de proyectos"><button class="button button--quiet" type="button" data-project-page="${page.page - 1}" ${page.page <= 1 ? "disabled" : ""}>Anterior</button><span>Página ${page.page} de ${Math.max(page.totalPages, 1)}</span><button class="button button--quiet" type="button" data-project-page="${page.page + 1}" ${page.page >= page.totalPages ? "disabled" : ""}>Siguiente</button></nav>`;
}

function renderProjectDetail(): string {
  const detail = state.projectDetail!;
  const project = detail.project as JsonObject;
  const trace = detail.traceability as JsonObject;
  const sources = (trace.sources ?? []) as JsonObject[];
  const amenities = (project.amenities ?? []) as unknown[];
  const banks = (project.financingBanks ?? []) as unknown[];
  const canonicalId = canonicalProjectId(String(project.canonicalId ?? project.id));
  const selected = state.selectedProjectIds.includes(canonicalId);
  const eligible = state.workspace!.comparableProjectIds.includes(canonicalId);
  const cannotAdd = !selected && (state.selectedProjectIds.length >= 3 || !eligible);
  const selectionLabel = selected ? "Quitar de comparación" : eligible ? "Añadir a comparación" : "Fuera del escenario comparable";
  const hasOwnWebsite = trace.hasOwnWebsite === true;
  const sourceComparison = projectSourceComparison(trace, sources);
  const sourceSummary = summarizeCommercialSources(sourceComparison.rows);
  const sourceStatus = sourceSummary.review
    ? `${formatNumber(sourceSummary.review)} ${sourceSummary.review === 1 ? "dato por revisar" : "datos por revisar"}`
    : sourceComparison.officialState === "observed"
      ? "Comparación disponible"
      : sourceComparison.officialState === "linked"
        ? "Web enlazada"
        : "Solo Nexo";
  return `<section class="surface detail-surface project-detail" id="project-detail" aria-labelledby="project-detail-title"><header class="project-detail-header"><div><span class="eyebrow">Ficha comercial</span><h2 id="project-detail-title" tabindex="-1">${escapeHtml(project.name ?? project.canonicalName)}</h2><p>${escapeHtml(project.agency?.name ?? project.agency ?? "")} · ${escapeHtml(project.district ?? "")}</p></div><div class="project-detail-actions"><button class="button ${selected ? "button--quiet" : "button--primary"}" type="button" data-action="toggle-detail-comparison" ${cannotAdd ? "disabled" : ""}>${selectionLabel}</button><button class="icon-button" type="button" data-action="close-detail" aria-label="Cerrar ficha">${closeIcon()}</button></div></header>
    <section class="detail-block detail-block--first" aria-labelledby="project-summary-title"><h3 id="project-summary-title">${detailIcon("summary")}<span>Resumen comercial</span></h3><dl class="project-detail-summary"><div class="detail-stat detail-stat--primary"><dt>${detailIcon("price")}<span>Precio publicado desde</span></dt><dd>${money(project.pricePen)}</dd></div><div class="detail-stat"><dt>${detailIcon("area")}<span>Área total publicada</span></dt><dd>${project.areaM2 == null ? "—" : `${formatNumber(project.areaM2)} m²`}</dd></div><div class="detail-stat"><dt>${detailIcon("calendar")}<span>Estado o entrega</span></dt><dd>${escapeHtml(project.phase ?? project.deliveryDate ?? "Sin dato")}</dd></div></dl>
      <details class="methodology"><summary>Referencia orientativa por m²</summary><p>${money(project.pricePerM2)} / m². Es una división de valores publicados: no demuestra que precio y área correspondan al mismo departamento y no representa un precio de cierre.</p></details>
    </section>
    <div class="project-detail-layout">
      <section class="detail-card" aria-labelledby="project-product-title"><h3 id="project-product-title">${detailIcon("building")}<span>Producto y ubicación</span></h3><dl class="detail-list"><div><dt>Tipo de inmueble</dt><dd>${escapeHtml(project.typology ?? "Sin dato")}</dd></div><div><dt>Dormitorios</dt><dd>${escapeHtml(project.bedrooms ?? "Sin dato")}</dd></div><div><dt>Unidades anunciadas</dt><dd>${project.unitCount == null ? "—" : formatNumber(project.unitCount)}</dd></div><div><dt>Dirección publicada</dt><dd>${escapeHtml(project.address ?? "Sin dato")}</dd></div><div><dt>Última actualización</dt><dd>${formatDate(trace.lastSeenAt)}</dd></div></dl></section>
      ${project.description ? `<details class="detail-card detail-card--description"><summary>Descripción publicada</summary><p>${escapeHtml(project.description)}</p></details>` : ""}
    </div>
    <details class="detail-block"><summary>Áreas comunes y financiamiento</summary><div class="detail-columns">
      <div><h4>${detailIcon("amenities")}<span>Áreas comunes</span></h4>${amenities.length ? `<ul class="tag-list">${amenities.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "<p>Sin datos observados.</p>"}</div>
      <div><h4>${detailIcon("bank")}<span>Financiamiento</span></h4>${banks.length ? `<ul class="tag-list">${banks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "<p>Sin datos observados.</p>"}</div>
    </div></details>
    <section class="detail-block source-ledger" aria-labelledby="project-sources-title"><header class="section-heading"><div><span class="eyebrow">Datos del proyecto</span><h3 id="project-sources-title">${detailIcon("verified")}<span>Nexo vs web oficial</span></h3><p>Revisa qué publica cada canal. Los datos se mantienen separados para que puedas decidir cuál usar.</p></div><span class="status-pill">${escapeHtml(sourceStatus)}</span></header>
      ${renderSourceAvailability(sourceComparison, hasOwnWebsite)}
      ${sourceComparison.officialState === "observed" ? renderSourceComparisonMatrix(sourceComparison) : renderSourceComparisonEmpty(sourceComparison)}
      ${sourceComparison.officialState === "observed" ? renderSourceComparisonSummary(sourceSummary) : ""}
      <details class="source-detail-disclosure"><summary>Consultar origen y fecha de los datos</summary><div class="source-list">${sources.map(renderSourceCard).join("") || "<p>No hay fuentes vinculadas.</p>"}</div></details>
    </section>
  </section>`;
}

function renderQualityInspectorAccess(): string {
  const cases = state.bootstrap?.inspectorCases ?? [];
  const dossier = state.inspector?.dossier as JsonObject | undefined;
  if (!cases.length) return "";
  return `<section class="surface quality-browser" aria-labelledby="quality-browser-title">
    <header class="section-heading"><div><span class="eyebrow">Guía de calidad</span><h2 id="quality-browser-title">Ejemplos de revisión</h2><p>Este paso opcional explica cómo se tratan datos coincidentes, incompletos o distintos.</p></div></header>
    <label class="standalone-field" for="quality-verification-case">Caso para revisar
      <select id="quality-verification-case">
        ${cases.map((item, index) => `<option value="${escapeAttr(item.routeSlug)}" ${item.routeSlug === state.inspectorSlug ? "selected" : ""}>Revisión ${index + 1} · ${escapeHtml(qualityLabel(item.qualityStatus))}</option>`).join("")}
      </select>
    </label>
    <div class="quality-verification-result">${dossier ? renderInspectorResult(dossier) : '<p class="source-empty">Elige una revisión para consultar sus datos y documentos.</p>'}</div>
  </section>`;
}

function renderInspectorResult(dossier: JsonObject): string {
  const project = dossier.project as JsonObject | undefined;
  const decision = dossier.decision as JsonObject | undefined;
  const facts = (dossier.facts ?? []) as JsonObject[];
  const documents = (dossier.documents ?? []) as JsonObject[];
  const canUse = decision?.benchmarkEligible === true || decision?.benchmark_eligible === true;
  const projectName = String(project?.name ?? project?.canonical_name ?? "Proyecto revisado");
  const displayProjectName = /controlad|fixture|ct-[a-z]/iu.test(projectName) ? "Ejemplo de proyecto" : projectName;
  return `<section class="source-observed verification-result" tabindex="-1" aria-live="polite">
    <span>Resultado de la verificación</span>
    <h4>${escapeHtml(displayProjectName)}</h4>
    <p><strong>${escapeHtml(qualityLabel(decision?.qualityStatus ?? decision?.quality_status))}.</strong> ${canUse ? "Los datos indicados como utilizables cuentan con respaldo compatible." : "Revisa las diferencias antes de usar estos datos en una comparación o propuesta."}</p>
    <div class="table-scroll"><table><thead><tr><th>Dato</th><th>Valor observado</th><th>Estado</th><th>Uso recomendado</th></tr></thead><tbody>${facts.map((fact) => `<tr><td>${escapeHtml(commercialFactLabel(fact.field_name))}</td><td>${escapeHtml(fact.original_value ?? fact.normalized_value ?? "Sin dato")}</td><td>${escapeHtml(qualityLabel(fact.quality_status))}</td><td>${fact.benchmark_eligible ? '<span class="positive">Puede utilizarse</span>' : `<span class="caution">Revisar antes de usar</span><small>${escapeHtml(commercialReviewReason(fact.quality_status))}</small>`}</td></tr>`).join("") || '<tr><td colspan="4">No hay datos revisados para este ejemplo.</td></tr>'}</tbody></table></div>
    <div><strong>Documentos disponibles</strong><div class="evidence-grid">${documents.map(renderProjectInspectorDocument).join("") || "<p>No hay documentos disponibles para mostrar.</p>"}</div></div>
  </section>`;
}

function renderProjectInspectorDocument(document: JsonObject): string {
  const title = document.title ?? "Documento de respaldo";
  const capturedAt = document.captured_at ?? document.capturedAt;
  return `<figure>${document.public_asset_path ? `<img src="/${escapeAttr(document.public_asset_path)}" alt="${escapeAttr(title)}" loading="lazy" />` : '<p class="source-empty">Sin vista previa pública</p>'}<figcaption><strong>${escapeHtml(title)}</strong><small>${capturedAt ? formatDate(capturedAt) : "Fecha no informada"}</small></figcaption></figure>`;
}

function commercialFactLabel(value: unknown): string {
  const labels: Record<string, string> = {
    built_area: "Área construida",
    free_area: "Área libre",
    total_area: "Área total",
    price: "Precio publicado",
    bathrooms: "Baños",
    bedrooms: "Dormitorios",
    floor: "Piso",
  };
  const key = String(value ?? "").toLowerCase();
  const readable = key.replaceAll("_", " ").replace(/^./u, (letter) => letter.toUpperCase());
  return (labels[key] ?? readable) || "Dato revisado";
}

function commercialReviewReason(status: unknown): string {
  const reasons: Record<string, string> = {
    inconsistent: "Las fuentes muestran valores distintos.",
    illegible: "El documento no permite confirmar este dato.",
    insufficient: "Falta información para completar la revisión.",
    reviewable: "Conviene confirmar este dato antes de utilizarlo.",
  };
  return reasons[String(status)] ?? "Confirma este dato antes de utilizarlo.";
}

interface ProjectSourceComparison {
  officialState: "observed" | "linked" | "missing";
  rows: CommercialSourceRow[];
  nexoCapturedAt: unknown;
  officialCapturedAt: unknown;
  officialName: string;
}

const sourceComparisonFields: Array<{ key: string; label: string }> = [
  { key: "address", label: "Dirección" },
  { key: "listPrice", label: "Precio publicado" },
  { key: "totalArea", label: "Área total" },
  { key: "bedrooms", label: "Dormitorios" },
  { key: "unitStatus", label: "Estado" },
  { key: "deliveryDate", label: "Entrega" },
  { key: "amenities", label: "Áreas comunes" },
  { key: "financingBanks", label: "Financiamiento" },
];

function projectSourceComparison(trace: JsonObject, sources: JsonObject[]): ProjectSourceComparison {
  const nexo = sources.find((source) => source.id === "source:nexo" || source.type === "portal");
  const official = sources.find((source) => source.type === "agency_website");
  const contractRows = readSourceComparisonRows(trace.sourceComparison);
  const rows = contractRows.length ? contractRows : sourceComparisonFields.map(({ key }) => {
    const nexoValue = sourceFieldValue(nexo?.observedData as JsonObject | undefined, key);
    const officialValue = sourceFieldValue(official?.observedData as JsonObject | undefined, key);
    return {
      field: key,
      status: commercialSourceStatus(undefined, nexoValue, officialValue),
      nexoValue,
      officialValue,
    };
  });
  const hasOfficialData = rows.some((row) => hasDisplayValue(row.officialValue))
    || hasObservedSourceData(official?.observedData);
  const hasOfficialLink = Boolean(official || trace.hasOwnWebsite === true);
  return {
    officialState: hasOfficialData ? "observed" : hasOfficialLink ? "linked" : "missing",
    rows,
    nexoCapturedAt: nexo?.capturedAt,
    officialCapturedAt: official?.capturedAt,
    officialName: String(official?.name ?? "Web oficial de la inmobiliaria"),
  };
}

function hasObservedSourceData(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).length > 0;
}

function renderSourceAvailability(comparison: ProjectSourceComparison, hasOwnWebsite: boolean): string {
  const officialStatus = comparison.officialState === "observed"
    ? "Datos disponibles"
    : comparison.officialState === "linked" || hasOwnWebsite
      ? "Página enlazada"
      : "Fuente por identificar";
  return `<div class="source-channel-pair" aria-label="Canales disponibles">
    <article class="source-channel source-channel--nexo"><span class="source-channel__mark" aria-hidden="true">N</span><div><strong>Nexo Inmobiliario</strong><small>Base de mercado · ${formatDate(comparison.nexoCapturedAt)}</small></div><span class="source-channel__state">Datos disponibles</span></article>
    <span class="source-channel-pair__connector" aria-hidden="true">↔</span>
    <article class="source-channel source-channel--official ${comparison.officialState === "observed" ? "is-observed" : "is-pending"}"><span class="source-channel__mark" aria-hidden="true">W</span><div><strong>Web oficial</strong><small>${escapeHtml(comparison.officialName)}${comparison.officialState === "observed" ? ` · ${formatDate(comparison.officialCapturedAt)}` : ""}</small></div><span class="source-channel__state">${escapeHtml(officialStatus)}</span></article>
  </div>`;
}

function renderSourceComparisonEmpty(comparison: ProjectSourceComparison): string {
  const linked = comparison.officialState === "linked";
  return `<div class="source-comparison-empty source-comparison-empty--${comparison.officialState}" role="status">
    ${detailIcon(linked ? "document" : "sources")}
    <div><strong>${linked ? "Web oficial enlazada; datos aún no publicados" : "Sin fuente oficial vinculada"}</strong><p>${linked ? "La página oficial está identificada, pero sus datos todavía no forman parte de esta versión." : "La ficha muestra Nexo mientras se identifica la página oficial de este proyecto."}</p></div>
  </div>`;
}

function renderSourceComparisonSummary(summary: ReturnType<typeof summarizeCommercialSources>): string {
  const items = [
    { key: "same", value: summary.same, label: "Coinciden" },
    { key: "additional", value: summary.additional, label: "Aportan información" },
    { key: "review", value: summary.review, label: "Por revisar" },
  ];
  return `<ul class="source-comparison-summary" aria-label="Resumen de la comparación">${items.map((item) => `<li class="source-comparison-summary--${item.key}"><strong>${formatNumber(item.value)}</strong><span>${escapeHtml(item.label)}</span></li>`).join("")}</ul>`;
}

function renderSourceComparisonMatrix(comparison: ProjectSourceComparison): string {
  return `<div class="source-matrix-wrap"><table class="source-matrix"><caption class="sr-only">Comparación de datos publicados en Nexo y en la web oficial</caption><thead><tr><th scope="col">Dato</th><th scope="col"><span class="source-matrix__heading"><b aria-hidden="true">N</b><span>Nexo Inmobiliario<small>Base de mercado</small></span></span></th><th scope="col"><span class="source-matrix__heading"><b aria-hidden="true">W</b><span>Web oficial<small>Canal de la inmobiliaria</small></span></span></th></tr></thead><tbody>${comparison.rows.map((row) => {
    const nexoValue = formatComparisonReadModelValue(row.field, row.nexoValue);
    const officialValue = formatComparisonReadModelValue(row.field, row.officialValue);
    const statusLabel = commercialSourceLabel(row.status);
    return `<tr class="source-matrix__row source-matrix__row--${row.status}"><th scope="row"><span>${escapeHtml(row.label ?? sourceComparisonFieldLabel(row.field))}</span><span class="source-result source-result--${row.status}">${escapeHtml(statusLabel)}</span><small>${escapeHtml(commercialSourceMessage(row))}</small></th><td data-source="Nexo Inmobiliario">${renderCompactSourceValue(nexoValue, "Sin dato en Nexo")}</td><td data-source="Web oficial">${renderCompactSourceValue(officialValue, "Sin dato en la web oficial")}</td></tr>`;
  }).join("")}</tbody></table></div>`;
}

function renderCompactSourceValue(value: string | null, emptyCopy: string): string {
  if (value == null) return `<span class="source-empty">${escapeHtml(emptyCopy)}</span>`;
  const compact = compactCommercialSourceValue(value);
  if (compact === value) return escapeHtml(value);
  return `<span class="source-value-clipped" title="${escapeAttr(value)}" aria-label="${escapeAttr(value)}">${escapeHtml(compact)}</span>`;
}

function sourceComparisonFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    projectName: "Proyecto",
    address: "Dirección",
    district: "Distrito",
    typology: "Tipo de inmueble",
    bedrooms: "Dormitorios",
    totalArea: "Área total",
    unitStatus: "Estado",
    unitCount: "Unidades anunciadas",
    listPrice: "Precio publicado",
    deliveryDate: "Entrega",
    amenities: "Áreas comunes",
    financingBanks: "Financiamiento",
  };
  return labels[field] ?? field.replaceAll("_", " ").replace(/^./u, (letter) => letter.toUpperCase());
}

function formatComparisonReadModelValue(field: string, value: unknown): string | null {
  if (!hasDisplayValue(value)) return null;
  if (Array.isArray(value)) return value.map(String).join(" · ");
  if (typeof value === "object" && value !== null) {
    const record = value as JsonObject;
    const minimum = record.min ?? record.minimum;
    const maximum = record.max ?? record.maximum;
    if (hasDisplayValue(minimum) || hasDisplayValue(maximum)) {
      return formatComparisonRange(field, minimum, maximum, record.unit);
    }
    const displayValue = record.displayValue ?? record.display_value ?? record.originalValue ?? record.original_value ?? record.value;
    if (hasDisplayValue(displayValue)) return formatComparisonScalar(field, displayValue, record.unit);
    return null;
  }
  if (["listPrice", "totalArea", "bedrooms", "unitCount"].includes(field)) return formatComparisonScalar(field, value);
  if (field === "deliveryDate" && /^\d{4}-\d{2}(?:-\d{2})?$/u.test(String(value))) return formatDate(value);
  return String(value);
}

function formatComparisonRange(field: string, minimum: unknown, maximum: unknown, explicitUnit?: unknown): string {
  const values = [minimum, maximum].filter(hasDisplayValue);
  const distinct = values.filter((value, index) => values.findIndex((candidate) => String(candidate) === String(value)) === index);
  if (field === "listPrice") return distinct.map((value) => Number.isFinite(Number(value)) ? money(value) : String(value)).join(" – ");
  const normalized = distinct.map((value) => comparisonRangeNumber(value));
  const range = normalized.map((value, index) => value == null ? String(distinct[index]) : formatNumber(value)).join("–");
  const alreadyIncludesUnit = distinct.some((value) => comparisonValueIncludesUnit(field, value));
  return `${range}${alreadyIncludesUnit && normalized.some((value) => value == null) ? "" : comparisonUnit(field, explicitUnit)}`;
}

function formatComparisonScalar(field: string, value: unknown, explicitUnit?: unknown): string {
  if (field === "listPrice") return Number.isFinite(Number(value)) ? money(value) : String(value);
  if (["totalArea", "bedrooms", "unitCount"].includes(field)) {
    return Number.isFinite(Number(value)) ? `${formatNumber(value)}${comparisonUnit(field, explicitUnit)}` : String(value);
  }
  if (field === "deliveryDate" && /^\d{4}-\d{2}/u.test(String(value))) return formatDate(value);
  return String(value);
}

function comparisonRangeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const match = String(value ?? "").trim().match(/^(-?\d+(?:[.,]\d+)?)\s*(?:m(?:2|²)|dorm(?:itorios?)?|unidades?)?$/iu);
  if (!match) return null;
  const parsed = Number(match[1]!.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function comparisonValueIncludesUnit(field: string, value: unknown): boolean {
  const text = String(value ?? "");
  if (field === "totalArea") return /m(?:2|²)/iu.test(text);
  if (field === "bedrooms") return /dorm/iu.test(text);
  if (field === "unitCount") return /unidad/iu.test(text);
  return false;
}

function comparisonUnit(field: string, explicitUnit?: unknown): string {
  if (field === "totalArea") return " m²";
  if (field === "bedrooms") return " dorm.";
  if (field === "unitCount") return " unidades";
  return hasDisplayValue(explicitUnit) ? ` ${String(explicitUnit)}` : "";
}

function sourceFieldValue(data: JsonObject | undefined, key: string): string | null {
  if (!data) return null;
  const value = data[key];
  if (value === null || value === undefined || String(value).trim() === "") return null;
  if (Array.isArray(value)) return value.length ? value.map(String).join(" · ") : null;
  if (key === "listPrice") return money(value);
  if (key === "totalArea") return formatSourceArea(value);
  if (key === "deliveryDate") return formatDate(value);
  return String(value);
}

function renderSourceCard(source: JsonObject): string {
  const type = sourceTypeLabel(source.type);
  const status = sourceStatusLabel(source.legalStatus);
  const evidence = source.evidenceStatus === "versioned_reference"
    ? "Página del proyecto revisada."
    : source.evidenceStatus === "unavailable"
      ? "Sin vista previa en esta versión."
      : "Detalle disponible.";
  return `<article><div class="source-list__identity"><span class="source-type source-type--${escapeAttr(String(source.type ?? "other"))}">${escapeHtml(type)}</span><strong>${escapeHtml(source.name)}</strong><small>${formatDate(source.capturedAt)} · ${escapeHtml(evidence)}</small></div><span class="status-pill">${escapeHtml(status)}</span>${source.sourceUrl ? `<a class="button button--quiet" href="${escapeAttr(source.sourceUrl)}" target="_blank" rel="noreferrer">Abrir fuente</a>` : ""}${renderSourceObservedData(source)}</article>`;
}

function renderSourceObservedData(source: JsonObject): string {
  const data = source.observedData as JsonObject | null | undefined;
  if (!data) return "";
  const fields = [
    ["Proyecto en la fuente", data.projectName],
    ["Distrito", data.district],
    ["Dirección", data.address],
    ["Tipo de inmueble", data.typology],
    ["Dormitorios", data.bedrooms],
    ["Área publicada", formatSourceArea(data.totalArea)],
    ["Estado publicado", data.unitStatus],
    ["Unidades declaradas", data.unitCount == null ? null : formatNumber(data.unitCount)],
    ["Precio publicado", data.listPrice == null ? null : money(data.listPrice)],
    ["Entrega", data.deliveryDate == null ? null : formatDate(data.deliveryDate)],
  ].filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "" && value !== "—");
  const amenities = Array.isArray(data.amenities) ? data.amenities : [];
  const banks = Array.isArray(data.financingBanks) ? data.financingBanks : [];
  if (!fields.length && !amenities.length && !banks.length && !data.description) return "";
  return `<div class="source-observed"><span>Datos recopilados de esta fuente</span>${fields.length ? `<dl>${fields.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>` : ""}${amenities.length ? `<div class="source-observed__list"><strong>Áreas comunes anunciadas</strong><p>${amenities.map(escapeHtml).join(" · ")}</p></div>` : ""}${banks.length ? `<div class="source-observed__list"><strong>Financiamiento anunciado</strong><p>${banks.map(escapeHtml).join(" · ")}</p></div>` : ""}${data.description ? `<details><summary>Ver descripción publicada en esta fuente</summary><p>${escapeHtml(data.description)}</p></details>` : ""}</div>`;
}

function formatSourceArea(value: unknown): string | null {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  return typeof value === "number" ? `${formatNumber(value)} m²` : String(value);
}

function sourceTypeLabel(value: unknown): string {
  const labels: Record<string, string> = {
    agency_website: "Web propia",
    social_network: "Red social",
    portal: "Portal inmobiliario",
    user_provided: "Documento aportado",
  };
  return labels[String(value)] ?? "Fuente de datos";
}

function sourceStatusLabel(value: unknown): string {
  const labels: Record<string, string> = {
    cleared_for_demo: "Disponible",
    referenced_for_demo: "Página oficial revisada",
    pending_review: "Por revisar",
    pending: "Por revisar",
  };
  return labels[String(value)] ?? "Estado por revisar";
}

function closeIcon(): string {
  return '<span class="control-icon-frame" aria-hidden="true"><svg class="control-icon" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg></span>';
}

function detailIcon(name: string): string {
  const paths: Record<string, string> = {
    summary: '<path d="M5 5h14v14H5zM8 9h8M8 13h5" />',
    price: '<circle cx="12" cy="12" r="8" /><path d="M14.5 9.5c-.5-.7-1.3-1-2.5-1-1.4 0-2.5.7-2.5 1.8 0 1.2 1 1.6 2.7 2 1.5.3 2.3.8 2.3 1.8 0 1.1-1 1.9-2.6 1.9-1.2 0-2.2-.4-2.9-1.2M12 6.8v10.4" />',
    area: '<path d="M5 5h14v14H5zM8 8h3M8 8v3M16 16h-3M16 16v-3" />',
    ratio: '<path d="M5 17 17 5l2 2L7 19zM10 12l2 2M13 9l2 2M7 15l2 2" />',
    calendar: '<rect x="4" y="6" width="16" height="14" rx="2" /><path d="M8 4v4M16 4v4M4 10h16M8 14h3" />',
    building: '<path d="M5 21V4h10v17M15 9h4v12M8 8h2M8 12h2M8 16h2M17 13h1M3 21h18" />',
    document: '<path d="M6 3h8l4 4v14H6zM14 3v5h5M9 12h6M9 16h6" />',
    features: '<path d="M12 3l1.2 4.3L17 9l-3.8 1.7L12 15l-1.2-4.3L7 9l3.8-1.7zM5 15l.7 2.3L8 18l-2.3.7L5 21l-.7-2.3L2 18l2.3-.7z" />',
    amenities: '<path d="M4 19h16M6 19v-7h12v7M8 12V8h8v4M10 8V5h4v3" />',
    bank: '<path d="M3 9h18L12 4zM5 10v7M9 10v7M15 10v7M19 10v7M3 20h18" />',
    sources: '<path d="M9 15l6-6M7.5 17.5l-1 1a3.5 3.5 0 0 1-5-5l4-4a3.5 3.5 0 0 1 5 0M16.5 6.5l1-1a3.5 3.5 0 0 1 5 5l-4 4a3.5 3.5 0 0 1-5 0" />',
    verified: '<path d="M12 3l7 3v5c0 4.7-3 8.2-7 10-4-1.8-7-5.3-7-10V6zM8.5 12l2.2 2.2 4.8-5" />',
  };
  return `<span class="detail-symbol" aria-hidden="true"><svg viewBox="0 0 24 24">${paths[name] ?? paths.summary}</svg></span>`;
}

function renderZoneOfferPanel(): string {
  const benchmark = state.workspace!.benchmark;
  const orientative = benchmark.quantitative?.orientative ?? {};
  const attributes = (benchmark.qualitative?.attributes ?? []) as JsonObject[];
  const topAttributes = attributes
    .sort((a, b) => Number(b.announcedCount) - Number(a.announcedCount))
    .slice(0, 8);
  return `<section class="surface zone-offer" aria-labelledby="zone-offer-title">
    <header class="section-heading"><div><span class="eyebrow">Competencia del escenario</span><h2 id="zone-offer-title">Precios y oferta de la zona</h2><p>Ubica el rango de precio por m² y las características que más anuncian los proyectos del escenario.</p></div><a class="button button--quiet" href="#projects">Explorar proyectos</a></header>
    <div class="zone-offer__metrics">
      ${metric("Oferta comparable", state.workspace!.marketReading.comparableProjectCount, "Proyectos que cumplen tus filtros")}
      ${metric("Con precio y área", orientative.n ?? 0, "Permiten ubicar el rango publicado")}
      ${metric("Índice publicado", money(orientative.median), "Referencia orientativa por m²")}
    </div>
    <div class="zone-offer__body"><div><h3>Características más anunciadas</h3><p>Úsalas para reconocer patrones y abrir preguntas comerciales.</p><div class="attribute-list">${topAttributes.map((attribute) => `<div><strong>${escapeHtml(attribute.label)}</strong><span>${formatNumber(attribute.announcedCount)} proyectos</span></div>`).join("") || "<p>No hay características informadas para este escenario.</p>"}</div></div><aside class="zone-offer__tip"><strong>Cómo usar esta lectura</strong><p>El índice ubica precios publicados frente a la zona. No compara departamentos ni representa un precio de cierre.</p><a href="#compare">Comparar proyectos</a></aside></div>
    <details class="methodology"><summary>Qué se incluyó</summary><p>Se consideran proyectos del escenario con precio y área total publicados. Los registros incompletos quedan fuera de este cálculo.</p></details>
  </section>`;
}

function renderComparison(): string {
  const comparison = state.comparison?.comparison as JsonObject | undefined;
  const content = comparison?.status === "ready"
    ? renderComparisonModel(comparison)
    : emptyState("Selecciona al menos dos proyectos comparables para ver sus diferencias.", "Elegir proyectos", "#projects");
  return `${renderPageHeader("Comparar", "Proyectos lado a lado", "Contrasta precio, área, producto, entrega y características en el mismo orden.", `<a class="button button--quiet" href="#projects">Cambiar selección</a>`)}${content}${state.projectDetail ? renderProjectDetail() : ""}`;
}

function renderComparisonModel(comparison: JsonObject): string {
  const selected = (comparison.selected ?? []) as JsonObject[];
  const groups = (comparison.groups ?? []) as JsonObject[];
  const findings = Array.isArray(comparison.conclusion) ? comparison.conclusion as JsonObject[] : [];
  const comparisonWarnings = findings.filter((finding) => finding.id === "finding:price-insufficient");
  const projectDifferences = findings.filter((finding) => finding.id !== "finding:price-insufficient");
  const differenceCount = groups.flatMap((group) => (group.rows ?? []) as JsonObject[]).filter((row) => row.hasDifference && !row.hasExcluded).length;
  return `<section class="comparison-workspace" aria-label="Comparación de proyectos">
    <header class="comparison-workspace__header"><div><span class="eyebrow">Selección confirmada</span><h2>${selected.length} proyectos en paralelo</h2><p>Las columnas conservan el mismo orden en toda la pantalla.</p></div><span class="comparison-count">${formatNumber(differenceCount)} diferencias para revisar</span></header>
    <div class="comparison-projects comparison-projects--${selected.length}">${selected.map((project, index) => renderComparisonProject(project, index, groups)).join("")}</div>
  </section>
  ${renderComparisonWarnings(comparisonWarnings)}
  ${renderProjectDifferences(projectDifferences, groups, selected)}
  <section class="surface comparison-matrix" aria-labelledby="comparison-matrix-title"><header class="section-heading"><div><span class="eyebrow">Comparación completa</span><h2 id="comparison-matrix-title">Datos publicados lado a lado</h2><p>“Diferencia” señala que los valores no coinciden; no determina por sí sola cuál proyecto es mejor.</p></div><div class="map-switch" role="group" aria-label="Filtrar comparación"><button data-action="comparison-all" aria-pressed="${!state.comparisonOnlyDifferences}">Todos los datos</button><button data-action="comparison-differences" aria-pressed="${state.comparisonOnlyDifferences}">Diferencias y pendientes</button></div></header>${groups.map((group) => renderComparisonGroup(group, selected)).join("")}<details class="methodology"><summary>Ver límites de la comparación</summary><ul>${comparisonLimitations(comparison).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></details></section>`;
}

function renderComparisonWarnings(findings: JsonObject[]): string {
  if (!findings.length) return "";
  return `<aside class="comparison-guidance" aria-labelledby="comparison-guidance-title">
    <span class="comparison-guidance__icon" aria-hidden="true">!</span>
    <div><span class="eyebrow">Antes de comparar precios</span><h2 id="comparison-guidance-title">El precio por m² todavía no es comparable</h2><p>Hay precios y áreas publicados, pero no está demostrado que pertenezcan al mismo departamento o tipología. Dividirlos podría producir un valor engañoso.</p><dl><div><dt>Qué puedes usar</dt><dd>El precio y el área como referencias publicadas independientes.</dd></div><div><dt>Qué falta validar</dt><dd>Confirma que el precio y el área correspondan al mismo departamento o tipología.</dd></div></dl></div>
  </aside>`;
}

function renderProjectDifferences(findings: JsonObject[], groups: JsonObject[], selected: JsonObject[]): string {
  return `<section class="surface comparison-findings" aria-labelledby="comparison-findings-title"><header class="section-heading"><div><span class="eyebrow">Diferencias observadas</span><h2 id="comparison-findings-title">Qué cambia entre los proyectos</h2><p>Estos valores sí cambian en la selección actual. Una diferencia no determina por sí sola cuál proyecto es mejor.</p></div></header><div class="comparison-findings__grid">${findings.map((finding) => renderProjectDifference(finding, groups, selected)).join("") || '<p class="comparison-findings__empty">No se encontraron diferencias prioritarias en los datos disponibles.</p>'}</div></section>`;
}

function renderProjectDifference(finding: JsonObject, groups: JsonObject[], selected: JsonObject[]): string {
  const rowId = String(finding.rowId ?? "");
  const title = rowId === "areas.total"
    ? "Tienen áreas publicadas diferentes"
    : rowId === "common_areas.announced"
      ? "Anuncian características distintas"
      : String(finding.finding ?? "Diferencia observada");
  const explanation = rowId === "areas.total"
    ? "Compara el precio junto con el área total de cada proyecto; un precio mayor puede corresponder a un inmueble más amplio."
    : rowId === "common_areas.announced"
      ? "La información publicada cambia entre proyectos. “No informado” no significa que la característica no exista."
      : "Los valores publicados necesitan una revisión conjunta antes de elegir.";
  const nextAction = rowId === "areas.total"
    ? "Confirma que el precio y el área correspondan a la misma oferta."
    : rowId === "common_areas.announced"
      ? "Abre las fuentes de cada proyecto y confirma las características prioritarias."
      : "Revisa los datos disponibles antes de elegir.";
  return `<article class="comparison-difference-card" data-comparison-finding="${escapeAttr(finding.id ?? rowId)}"><div><span class="difference-badge">Diferencia observada</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(explanation)}</p></div><dl class="comparison-finding-values comparison-finding-values--${selected.length}">${selected.map((project) => {
    const value = comparisonValueFor(groups, rowId, project.projectId);
    return `<div><dt>${escapeHtml(project.name ?? "Proyecto")}</dt><dd>${formatComparisonValue(value)}</dd><small>${escapeHtml(comparisonStateLabel(value.state))}</small></div>`;
  }).join("")}</dl><footer><strong>Antes de usarlo</strong><p>${escapeHtml(nextAction)}</p></footer></article>`;
}

function renderComparisonProject(project: JsonObject, index: number, groups: JsonObject[]): string {
  const price = comparisonValueFor(groups, "price.published_from", project.projectId);
  const area = comparisonValueFor(groups, "areas.total", project.projectId);
  const delivery = comparisonValueFor(groups, "delivery.status", project.projectId);
  return `<article class="comparison-project-card"><header><span class="comparison-project-card__index">${index + 1}</span><div><h3>${escapeHtml(project.name)}</h3><p>${escapeHtml(project.agencyName)}</p></div><button class="icon-button icon-button--small" type="button" data-project-remove="${escapeAttr(project.projectId)}" aria-label="Quitar ${escapeAttr(project.name)} de la comparación">${closeIcon()}</button></header><dl><div><dt>Precio publicado</dt><dd>${formatComparisonValue(price)}</dd></div><div><dt>Área total</dt><dd>${formatComparisonValue(area)}</dd></div><div><dt>Entrega</dt><dd>${formatComparisonValue(delivery)}</dd></div></dl><button class="link-button" type="button" data-project-detail="${escapeAttr(project.projectId)}">Abrir ficha</button></article>`;
}

function renderComparisonGroup(group: JsonObject, selected: JsonObject[]): string {
  const pending = (row: JsonObject) => row.hasExcluded || !Array.isArray(row.values) || row.values.length !== selected.length || row.values.some((value: JsonObject) => !["observed", "announced"].includes(String(value.state)));
  const rows = ((group.rows ?? []) as JsonObject[]).filter((row) => !state.comparisonOnlyDifferences || row.hasDifference || pending(row));
  if (!rows.length) return "";
  const differences = rows.filter((row) => row.hasDifference && !row.hasExcluded).length;
  return `<section class="comparison-group" aria-labelledby="comparison-group-${escapeAttr(group.id)}"><header><h3 id="comparison-group-${escapeAttr(group.id)}">${escapeHtml(group.label)}</h3><span>${differences ? `${formatNumber(differences)} ${differences === 1 ? "diferencia" : "diferencias"}` : rows.some(pending) ? "Datos por completar" : "Sin diferencias observadas"}</span></header><div class="comparison-column-head comparison-data-row--${selected.length}"><strong>Característica</strong>${selected.map((project) => `<strong>${escapeHtml(project.name)}</strong>`).join("")}</div>${rows.map((row) => `<div class="comparison-data-row comparison-data-row--${selected.length} ${row.hasDifference ? "is-different" : ""}"><div class="comparison-criterion"><strong>${escapeHtml(row.label)}</strong>${pending(row) ? '<span class="difference-badge">Por revisar</span>' : row.hasDifference ? '<span class="difference-badge">Diferencia</span>' : '<span class="same-badge">Coincide</span>'}</div>${((row.values ?? []) as JsonObject[]).map((value, index) => `<div class="comparison-value-cell ${comparisonStateClass(value.state)}" data-project="${escapeAttr(selected[index]?.name ?? "Proyecto")}">${formatComparisonValue(value)}<span class="comparison-value-state">${escapeHtml(comparisonStateLabel(value.state))}</span></div>`).join("")}</div>`).join("")}</section>`;
}

function comparisonLimitations(comparison: JsonObject): string[] {
  const raw = (comparison.limitations ?? []) as unknown[];
  const friendly = raw.map((item) => {
    const value = String(item ?? "").toLowerCase();
    if (/precio|área|m²|m2/u.test(value)) return "El precio por m² solo se usa cuando el precio y el área corresponden a la misma oferta.";
    if (/atribut|característ/u.test(value)) return "Una característica no informada no se interpreta como inexistente.";
    return "Los datos incompletos se muestran como pendientes de revisión.";
  });
  return [...new Set(friendly.length ? friendly : ["La comparación usa la información publicada disponible."])];
}

function comparisonValueFor(groups: JsonObject[], rowId: string, projectId: unknown): JsonObject {
  const row = groups.flatMap((group) => (group.rows ?? []) as JsonObject[]).find((item) => item.id === rowId);
  return ((row?.values ?? []) as JsonObject[]).find((value) => value.projectId === projectId) ?? {};
}

function decisionReadinessRows(): Array<{ status: "ok" | "warn"; title: string; detail: string }> {
  const workspace = state.workspace!;
  const pairedPrices = Number(workspace.benchmark.quantitative?.n ?? 0);
  return [
    {
      status: workspace.scenarioStatus === "valid" ? "ok" : "warn",
      title: "Escenario definido",
      detail: `${districtName()} · ${scopeLabel()}.`,
    },
    {
      status: Number(workspace.coverage.geographyCoveragePct) >= 80 ? "ok" : "warn",
      title: "Oferta ubicada",
      detail: `${formatPercent(workspace.coverage.geographyCoveragePct)} de los proyectos puede verse en el mapa.`,
    },
    {
      status: pairedPrices >= 3 ? "ok" : "warn",
      title: "Comparación de precio por m²",
      detail: pairedPrices ? `${formatNumber(pairedPrices)} proyectos tienen precio y área de la misma oferta.` : "Puedes consultar precios publicados. Falta confirmar precio y área de la misma oferta para comparar por m².",
    },
  ];
}

function renderDecisionReadiness(): string {
  const rows = decisionReadinessRows();
  const warnings = rows.filter(({ status }) => status === "warn").length;
  const status = warnings ? `Revisa ${formatNumber(warnings)} ${warnings === 1 ? "punto" : "puntos"}` : "Lista para preparar";
  return `<section class="surface decision-readiness" aria-labelledby="decision-readiness-title">
    <header class="section-heading"><div><span class="eyebrow">Estado del escenario</span><h2 id="decision-readiness-title">Antes de compartir</h2><p>Confirma los datos disponibles y revisa las reglas de comunicación antes de preparar tu argumento.</p></div><span class="status-pill ${warnings ? "status-pill--warning" : ""}">${status}</span></header>
    <div class="readiness-list">${rows.map(renderReadinessRow).join("")}</div>
    <details class="methodology decision-safeguards"><summary>Ver reglas para compartir esta lectura</summary><ul>
      <li><strong>Características:</strong> “anunciada” significa que aparece en la publicación. Usa “confirmada” solo cuando una fuente permita comprobarla.</li>
      <li><strong>Privacidad:</strong> comparte solo información comercial pública; no incluyas datos personales ni archivos de acceso restringido.</li>
      <li><strong>Interpretación:</strong> un cambio publicado no permite afirmar su causa, la demanda futura ni la intención de compra de una persona.</li>
      <li><strong>Precios:</strong> presenta los importes como precios publicados, no como precios reales de cierre.</li>
    </ul></details>
  </section>`;
}

function renderReadinessRow(item: { status: "ok" | "warn"; title: string; detail: string }): string {
  return `<article class="readiness-row"><span class="check-icon ${item.status}">${item.status === "ok" ? "✓" : "!"}</span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.detail)}</p></div></article>`;
}

function renderAssistant(): string {
  const answer = state.assistant?.answer as JsonObject | undefined;
  const categories = assistantCategories();
  const questions = assistantQuestions().filter(({ category }) => category === state.assistantCategory);
  const comparisonNeedsSelection = state.assistantCategory === "competition" && state.selectedProjectIds.length < 2;
  return `${renderPageHeader("Decidir", "Asistente de estrategia", "Prepara respuestas para una conversación comercial usando el distrito, la zona y los proyectos elegidos.")}
    <section class="assistant-layout">
      <div class="surface assistant-question-panel">
        <header class="assistant-question-panel__header"><span class="eyebrow">Consulta guiada</span><h2>¿Qué decisión necesitas preparar?</h2><p>Elige un tema y parte de una pregunta comercial. También puedes escribir una consulta equivalente.</p></header>
        <nav class="assistant-categories" aria-label="Temas de consulta">${categories.map((category) => `<button type="button" class="assistant-category ${state.assistantCategory === category.id ? "is-active" : ""}" data-assistant-category="${category.id}" aria-pressed="${state.assistantCategory === category.id}"><span aria-hidden="true">${category.icon}</span>${escapeHtml(category.label)}</button>`).join("")}</nav>
        ${comparisonNeedsSelection ? `<aside class="assistant-selection-note"><strong>Primero elige los competidores.</strong><span>Selecciona entre dos y tres proyectos para comparar sus diferencias.</span><a href="#projects">Ir a Proyectos</a></aside>` : ""}
        <div class="prompt-list">${questions.map((question) => renderAssistantQuestion(question)).join("")}</div>
        <form id="assistant-form" class="assistant-form">
          <label for="assistant-input">Tu pregunta</label>
          <textarea id="assistant-input" name="input" rows="3" maxlength="500" placeholder="Selecciona una pregunta o escríbela aquí.">${escapeHtml(state.assistantDraft)}</textarea>
          <div class="assistant-input-meta"><small>Esta versión responde sobre el escenario activo y los proyectos seleccionados.</small><small id="assistant-character-count">${formatNumber(state.assistantDraft.length)} / 500</small></div>
          <input type="hidden" name="intentId" id="assistant-intent" value="${escapeAttr(state.assistantIntentId ?? "")}" />
          ${state.assistantError ? `<p class="assistant-error" role="alert">${escapeHtml(state.assistantError)}</p>` : ""}
          <button class="button button--primary" type="submit">Preparar respuesta</button>
        </form>
      </div>
      ${answer ? renderAnswer(answer) : renderAssistantEmpty()}
    </section>
    ${renderDecisionReadiness()}`;
}

function renderAnswer(answer: JsonObject): string {
  const blocks = (answer.blocks ?? []) as JsonObject[];
  const directAnswer = blocks.filter((block) => block.type === "answer");
  const explanation = blocks.filter((block) => ["interpretation", "limitations"].includes(String(block.type)));
  const keyFacts = renderAssistantKeyFacts(blocks);
  const action = assistantAnswerAction(answer, blocks);
  const status = assistantAnswerStatus(answer.status);
  return `<section class="surface answer answer--${status.tone}" aria-live="polite">
    <header class="answer__header"><div><span class="status-pill ${status.tone === "warning" ? "status-pill--warning" : ""}">${escapeHtml(status.label)}</span><h2>${escapeHtml(state.assistantQuestionTitle ?? "Respuesta comercial")}</h2></div><span class="answer__context">${escapeHtml(scopeLabel())}</span></header>
    ${directAnswer.map(renderAssistantAnswerBlock).join("")}
    ${keyFacts}
    ${explanation.map(renderAssistantAnswerBlock).join("")}
    ${action ? `<a class="button button--primary answer__action" href="${escapeAttr(action.hash)}">${escapeHtml(action.label)}</a>` : ""}
    <details class="methodology answer__sources"><summary>Ver fuentes y fecha de la información</summary><ul>${((answer.references ?? []) as JsonObject[]).map((reference) => `<li>${escapeHtml(commercialReferenceLabel(reference))}</li>`).join("") || "<li>No se usaron fuentes adicionales para esta respuesta.</li>"}</ul></details>
  </section>`;
}

function renderAssistantAnswerBlock(block: JsonObject): string {
  const limit = block.type === "limitations" ? 2 : 3;
  return `<section class="answer-block answer-block--${escapeAttr(String(block.type))}"><h3>${escapeHtml(assistantBlockTitle(block.type, block.title))}</h3>${((block.items ?? []) as JsonObject[]).slice(0, limit).map((item) => `<p>${escapeHtml(commercialAssistantText(item))}</p>`).join("")}</section>`;
}

function assistantCategories(): Array<{ id: AssistantCategoryId; label: string; icon: string }> {
  return [
    { id: "market", label: "Mercado y precio", icon: "↗" },
    { id: "competition", label: "Competencia", icon: "◇" },
    { id: "movement", label: "Movimientos", icon: "↕" },
    { id: "argument", label: "Preparar argumento", icon: "✓" },
  ];
}

function assistantQuestions(): AssistantQuestion[] {
  return [
    { id: "market-reading", category: "market", intentId: "intent:scenario-summary", title: "Lectura de la zona", question: "¿Cómo se presenta la oferta comparable en esta zona?", description: "Resume tamaño de la oferta y base de precios publicada." },
    { id: "price-base", category: "market", intentId: "intent:scenario-summary", title: "Base para hablar de precios", question: "¿Cuántos proyectos tienen precio y área para comparar?", description: "Aclara qué parte de la oferta puede sustentar la conversación." },
    { id: "price-confidence", category: "market", intentId: "intent:coverage-quality", title: "Información disponible", question: "¿Qué tan sólida es la información antes de hablar de precios?", description: "Señala qué puede usarse y qué conviene validar." },
    { id: "compare-differences", category: "competition", intentId: "intent:project-comparison", title: "Diferencias entre elegidos", question: "¿Qué diferencias de precio, área y producto hay entre los proyectos que elegí?", description: "Contrasta hasta tres competidores en la misma lectura.", requiresSelection: true },
    { id: "compare-position", category: "competition", intentId: "intent:project-comparison", title: "Diferenciales competitivos", question: "¿Qué diferenciales destacan entre los proyectos que seleccioné?", description: "Destaca diferencias observadas sin declarar un ganador.", requiresSelection: true },
    { id: "competitive-set", category: "competition", intentId: "intent:scenario-summary", title: "Grupo competitivo", question: "¿Cuántos proyectos forman el grupo comparable de esta zona?", description: "Dimensiona el conjunto de proyectos que conviene revisar." },
    { id: "recent-changes", category: "movement", intentId: "intent:market-changes", title: "Cambios desde la última revisión", question: "¿Qué proyectos cambiaron su precio publicado?", description: "Muestra movimientos observados sin inventar su causa." },
    { id: "priority-competitor", category: "movement", intentId: "intent:signal-priority", title: "Competidor para revisar primero", question: "¿Qué competidor debería revisar primero y por qué?", description: "Prioriza el cambio reciente con mejor información disponible." },
    { id: "price-direction", category: "movement", intentId: "intent:market-changes", title: "Subidas y bajadas", question: "¿Qué precios publicados subieron o bajaron en la zona?", description: "Prepara una agenda de seguimiento comercial." },
    { id: "meeting-claim", category: "argument", intentId: "intent:limitations", title: "Qué puedo afirmar", question: "¿Qué puedo afirmar con seguridad en una reunión comercial?", description: "Separa hechos publicados de supuestos que no deben comunicarse." },
    { id: "validation-needed", category: "argument", intentId: "intent:coverage-quality", title: "Qué debo validar", question: "¿Qué debo validar antes de presentar esta lectura?", description: "Identifica vacíos y próximos pasos concretos." },
    { id: "zone-argument", category: "argument", intentId: "intent:scenario-summary", title: "Base para el argumento", question: "¿Qué datos de la zona puedo usar para preparar mi argumento?", description: "Convierte la lectura territorial en un punto de partida prudente." },
  ];
}

function renderAssistantQuestion(question: AssistantQuestion): string {
  const disabled = Boolean(question.requiresSelection && state.selectedProjectIds.length < 2);
  const selected = state.assistantIntentId === question.intentId && state.assistantDraft === question.question;
  return `<button type="button" class="assistant-question ${selected ? "is-selected" : ""}" data-assistant-intent="${escapeAttr(question.intentId)}" data-assistant-question="${escapeAttr(question.question)}" data-assistant-question-title="${escapeAttr(question.title)}" aria-pressed="${selected}" ${disabled ? "disabled" : ""}><span class="assistant-question__marker" aria-hidden="true">${selected ? "✓" : "→"}</span><span><strong>${escapeHtml(question.title)}</strong><span>${escapeHtml(question.question)}</span><small>${escapeHtml(disabled ? "Selecciona al menos dos proyectos para usar esta pregunta." : question.description)}</small></span></button>`;
}

function renderAssistantEmpty(): string {
  return `<section class="surface assistant-empty"><span class="assistant-empty__symbol" aria-hidden="true">↗</span><span class="eyebrow">Respuesta enfocada</span><h2>De la pregunta a la acción</h2><p>Recibirás una lectura directa, hasta tres datos clave y el siguiente paso recomendado.</p><ol><li>Elige una pregunta comercial.</li><li>Revisa la respuesta y sus límites.</li><li>Abre la pantalla sugerida para actuar.</li></ol></section>`;
}

function renderAssistantKeyFacts(blocks: JsonObject[]): string {
  const allData = (blocks.find((block) => block.type === "data")?.items ?? []) as JsonObject[];
  const priceCoverageOrder = ["metric:scenario-comparables", "metric:benchmark-eligible", "metric:qualitative-informed"];
  const data = state.assistantIntentId === "intent:coverage-quality"
    ? priceCoverageOrder.map((id) => allData.find((item) => item.id === id)).filter((item): item is JsonObject => Boolean(item)).slice(0, 3)
    : allData.slice(0, 3);
  if (!data.length) return "";
  return `<section class="answer-facts" aria-label="Datos clave"><h3>Datos clave</h3><div>${data.map((item) => `<article><span>${escapeHtml(assistantFactLabel(item))}</span><strong>${escapeHtml(assistantFactValue(item))}</strong></article>`).join("")}</div></section>`;
}

function assistantFactLabel(item: JsonObject): string {
  const labels: Record<string, string> = {
    "metric:comparable-projects": "Proyectos comparables",
    "metric:price-references": "Publicaciones con precio y área",
    "metric:benchmark-eligible": "Precios por m² comparables",
    "metric:benchmark-orientative": "Cálculos orientativos de precio por m²",
    "metric:scenario-comparables": "Proyectos comparables",
    "metric:history-shown": "Cambios visibles",
    "metric:history-excluded": "Cambios que requieren revisión",
    "metric:qualitative-informed": "Proyectos con características informadas",
  };
  const normalizedLabel = labels[String(item.id ?? "")];
  if (normalizedLabel) return normalizedLabel;
  if (item.kind === "agenda_item") return "Revisión prioritaria";
  if (item.kind === "history_change") return String(item.label ?? "Proyecto observado");
  if (item.kind === "qualitative_fact") return String(item.label ?? "Característica");
  if (item.kind === "comparison_row") return String(item.label ?? "Diferencia observada");
  return String(item.label ?? "Dato del escenario");
}

function assistantFactValue(item: JsonObject): string {
  if (item.kind === "metric") {
    if (item.id === "metric:price-references") return `${formatNumber(item.value)} publicaciones`;
    const unit = item.unit === "projects" ? " proyectos" : item.unit === "events" ? " cambios" : "";
    return `${formatNumber(item.value)}${unit}`;
  }
  if (item.kind === "history_change") return `${money(item.previousValue)} → ${money(item.currentValue)}`;
  if (item.kind === "agenda_item") return String(item.label ?? "Abrir seguimiento");
  if (item.kind === "qualitative_fact") return String(item.value ?? "Por revisar");
  if (item.kind === "comparison_row") return item.hasDifference ? "Diferencia encontrada" : "Sin diferencia visible";
  return String(item.value ?? item.description ?? "Disponible");
}

function assistantAnswerStatus(status: unknown): { label: string; tone: "success" | "warning" } {
  if (status === "ready") return { label: "Respuesta preparada", tone: "success" };
  if (status === "refused") return { label: "No disponible con estos datos", tone: "warning" };
  if (status === "insufficient") return { label: "Información insuficiente", tone: "warning" };
  return { label: "Revisa la pregunta", tone: "warning" };
}

function assistantAnswerAction(answer: JsonObject, blocks: JsonObject[]): { label: string; hash: string } | null {
  const action = ((blocks.find((block) => block.type === "next_step")?.items ?? []) as JsonObject[])[0];
  if (!action) return null;
  const hashes: Record<string, string> = {
    dashboard: "#dashboard",
    benchmark: "#dashboard",
    inspector: "#journey/quality",
    activity: "#activity",
    compare: "#compare",
    assistant: "#assistant",
  };
  const fallbackByIntent: Record<string, { label: string; hash: string }> = {
    "intent:scenario-summary": { label: "Abrir Panorama", hash: "#dashboard" },
    "intent:coverage-quality": { label: "Revisar Panorama", hash: "#dashboard" },
    "intent:market-changes": { label: "Abrir Seguimiento", hash: "#activity" },
    "intent:signal-priority": { label: "Abrir Seguimiento", hash: "#activity" },
    "intent:project-comparison": { label: "Abrir Comparar", hash: "#compare" },
  };
  const fallback = fallbackByIntent[String(answer.intentId ?? "")];
  return {
    label: commercialAssistantText(action),
    hash: hashes[String(action.route ?? "")] ?? fallback?.hash ?? "#assistant",
  };
}

function commercialReferenceLabel(reference: JsonObject): string {
  return String(reference.label ?? "Fuente consultada")
    .replace(/Evidencia temporal/giu, "Registro del cambio")
    .replace(/Hecho de precio publicado/giu, "Precio publicado")
    .replace(/Dato comparado/giu, "Dato del proyecto")
    .replace(/Evidencia de/giu, "Fuente de");
}

function commercialAssistantText(item: JsonObject): string {
  const id = String(item.id ?? "");
  const raw = String(item.text ?? item.label ?? item.detail ?? "");
  const fixed: Record<string, string> = {
    "limitation:orientative-price": "El precio por m² es solo orientativo mientras precio y área no correspondan a la misma oferta.",
    "interpretation:coverage": "Cada indicador responde una pregunta distinta y debe leerse por separado.",
    "answer:qualitative": /No existe|No hay/iu.test(raw)
      ? "No hay características suficientemente confirmadas para este escenario."
      : raw.replace(/El expediente activo contiene/iu, "El proyecto revisado tiene").replace(/certificad[oa]s? con evidencia autorizada/giu, "respaldadas por una fuente disponible"),
    "interpretation:qualitative": /Ausencia|restricción|incompatibilidad/iu.test(raw)
      ? "Si una característica no está confirmada, se muestra como pendiente; no se asume que no exista."
      : "La respuesta describe solo las características confirmadas para el proyecto revisado.",
    "answer:limitations": "La plataforma responde sobre zonas, cambios publicados, características y comparaciones con la información disponible.",
    "interpretation:limitations": "Cuando falta información, la respuesta lo indica en lugar de completar el dato con una suposición.",
    "interpretation:refusal": "La plataforma no convierte precios publicados en precios de cierre, no atribuye causas sin confirmación y no realiza predicciones.",
    "action:open-benchmark": "Revisar precios y oferta de la zona",
    "action:inspect-methodology": "Revisar cómo se preparó la lectura",
    "action:open-inspector": "Revisar datos y fuentes",
    "action:open-history": "Abrir seguimiento",
    "action:review-signal": "Revisar el cambio y su fuente",
    "action:review-history-filters": "Revisar filtros de seguimiento",
  };
  if (fixed[id]) return fixed[id];
  if (id === "answer:scenario") {
    return raw.replace(/^Escenario activo/iu, `${districtName()} · ${scopeLabel()}`);
  }
  if (id === "answer:coverage") {
    return raw
      .replace(/El escenario contiene/iu, "El escenario reúne")
      .replace(/el histórico muestra/iu, "el seguimiento muestra")
      .replace(/el benchmark usa (\d+) pares elegibles/iu, "$1 proyectos tienen precio y área confirmados para calcular el valor por m²");
  }
  if (id === "interpretation:scenario") {
    return /únicamente/iu.test(raw)
      ? "La lectura de precio por m² usa solo proyectos cuyo precio y área corresponden a la misma oferta."
      : "La oferta visible permite revisar el mercado, pero el precio por m² sigue siendo orientativo.";
  }
  if (id === "limitation:orientative-count") {
    const count = raw.match(/\d+/u)?.[0] ?? "Algunos";
    return `${count} cálculos de precio por m² son orientativos y no deben presentarse como una recomendación de precio.`;
  }
  if (id === "answer:market-changes") {
    return raw
      .replace(/El histórico muestra/iu, "El seguimiento muestra")
      .replace(/los de mayor calidad según la política/iu, "los más recientes que cuentan con información suficiente")
      .replace(/en el escenario activo/iu, `en ${districtName()} · ${scopeLabel().toLowerCase()}`);
  }
  if (id === "limitation:no-causality") return "No se atribuyen causas si ninguna fuente disponible las explica.";
  if (id === "answer:comparison") {
    return raw.replace(/La comparación encuentra (\d+) filas? prioritarias? entre (\d+) proyectos seleccionados\./iu, "La comparación muestra $1 diferencias relevantes entre los $2 proyectos seleccionados.");
  }
  if (id === "answer:signal-priority") return raw.replace(/señal elegible/giu, "cambio disponible").replace(/cobertura/giu, "información disponible");
  if (id === "interpretation:signal-priority") return /calidad-primero/iu.test(raw)
    ? "La prioridad combina actualidad y disponibilidad de información; no depende solo del tamaño del cambio."
    : "Que no haya un cambio prioritario no significa que el mercado esté estable.";
  return raw
    .replace(/\bbenchmark\b/giu, "referencia de precios")
    .replace(/\bdataset\b/giu, "información disponible")
    .replace(/\btrazabilidad\b/giu, "origen de los datos")
    .replace(/\bhistórico\b/giu, "seguimiento")
    .replace(/\bexpediente activo\b/giu, "proyecto revisado")
    .replace(/\bevidencia autorizada\b/giu, "fuente disponible")
    .replace(/\bseñal elegible\b/giu, "cambio disponible")
    .replace(/\bpares elegibles\b/giu, "precios y áreas confirmados")
    .replace(/\bcocientes orientativos\b/giu, "cálculos orientativos de precio por m²")
    .replace(/catálogo semántico compatible/giu, "pregunta que esta versión puede responder")
    .replace(/escenario canónico/giu, "escenario activo")
    .replace(/muestra canónica/giu, "grupo de proyectos seleccionado")
    .replace(/tiempo de ejecución/giu, "este momento")
    .replace(/evidencia causal autorizada/giu, "fuente que explique la causa")
    .replace(/contextos disponibles/giu, "información disponible")
    .replace(/pregunta compatible del catálogo/giu, "pregunta que esta versión puede responder")
    .replace(/motor histórico/giu, "seguimiento de cambios");
}

function assistantBlockTitle(type: unknown, fallback: unknown): string {
  const titles: Record<string, string> = {
    answer: "Lectura principal",
    interpretation: "Qué significa",
    limitations: "Ten en cuenta",
    next_step: "Próximo paso",
  };
  return titles[String(type)] ?? String(fallback ?? "");
}

function renderHistory(): string {
  if (!state.history) return `${renderPageHeader("Seguimiento", "Seguimiento comercial", "Cambios del escenario activo.")}<section class="surface" role="status">${state.routeError ? "El historial estará disponible al recuperar la consulta." : "Cargando historial…"}</section>`;
  const allEvents = state.history?.items ?? [];
  const visibleEvents = historyEvents();
  const latest = visibleEvents[0] ?? null;
  const activeFilters = state.historyDirection !== "all" || state.historyValidity !== "all";
  return `${renderPageHeader(
    "Seguimiento",
    "Seguimiento comercial",
    "Detecta cambios publicados en el territorio activo y decide qué revisar primero.",
    `<button class="button button--quiet" type="button" data-action="scenario">Cambiar distrito o zona</button>`,
  )}
    <section class="surface history-scope" aria-label="Territorio de seguimiento">
      <div><span>Distrito</span><strong>${escapeHtml(districtName())}</strong></div>
      <div><span>Alcance seleccionado</span><strong>${escapeHtml(scopeLabel())}</strong></div>
      <div><span>Corte de datos</span><strong>${formatDate(state.meta!.cutoffAt)}</strong></div>
      <p>Las zonas son alcances comerciales del escenario; no se presentan como divisiones oficiales.</p>
    </section>
    <section class="history-coverage" aria-label="Cobertura actual de alertas">
      ${renderHistoryCoverageItem("price", "Cambios de precio", allEvents.length, "Disponible", true)}
      ${renderHistoryCoverageItem("unit", "Nuevas unidades", null, "Aún no monitoreado", false)}
      ${renderHistoryCoverageItem("discount", "Descuentos publicados", null, "Aún no monitoreado", false)}
    </section>
    ${latest ? renderHistoryPriority(latest) : ""}
    <section class="surface history-feed" aria-labelledby="history-feed-title">
      <header class="section-heading history-feed__heading">
        <div><span class="eyebrow">Cambios observados</span><h2 id="history-feed-title">Actividad del mercado</h2><p>${formatNumber(visibleEvents.length)} de ${formatNumber(allEvents.length)} señales visibles.</p></div>
        ${activeFilters ? '<button class="button button--quiet" type="button" data-action="clear-history-filters">Limpiar filtros</button>' : ""}
      </header>
      <div class="history-filters">
        <label for="history-direction-filter">Movimiento<select id="history-direction-filter" name="history_direction"><option value="all" ${state.historyDirection === "all" ? "selected" : ""}>Todos</option><option value="decrease" ${state.historyDirection === "decrease" ? "selected" : ""}>Bajó el precio</option><option value="increase" ${state.historyDirection === "increase" ? "selected" : ""}>Subió el precio</option><option value="unchanged" ${state.historyDirection === "unchanged" ? "selected" : ""}>Sin variación</option></select></label>
        <label for="history-validity-filter">Antigüedad al corte<select id="history-validity-filter" name="history_validity"><option value="all" ${state.historyValidity === "all" ? "selected" : ""}>Todas</option><option value="current" ${state.historyValidity === "current" ? "selected" : ""}>Reciente al corte</option><option value="aging" ${state.historyValidity === "aging" ? "selected" : ""}>En seguimiento</option><option value="historical" ${state.historyValidity === "historical" ? "selected" : ""}>Histórica</option><option value="unknown" ${state.historyValidity === "unknown" ? "selected" : ""}>Fecha por revisar</option></select></label>
      </div>
      ${renderHistorySignals(visibleEvents, false)}
    </section>
    <aside class="history-notice"><strong>Avisos automáticos no disponibles</strong><p>Esta pantalla permite consultar cambios de precio publicados hasta el corte indicado. No envía notificaciones ni monitorea nuevas unidades o descuentos.</p></aside>
    ${state.projectDetail ? renderProjectDetail() : ""}`;
}

function renderHistoryCoverageItem(icon: "price" | "unit" | "discount", label: string, value: number | null, status: string, available: boolean): string {
  return `<article class="history-coverage__item ${available ? "is-available" : "is-pending"}">${monitoringIcon(icon)}<div><span>${escapeHtml(label)}</span><strong>${value == null ? "—" : formatNumber(value)}</strong><small>${escapeHtml(status)}</small></div></article>`;
}

function renderHistoryPriority(event: JsonObject): string {
  const project = historyProject(event);
  const movement = historyEventDirection(event);
  const direction = historyDirectionLabel(movement);
  return `<section class="surface history-priority" aria-labelledby="history-priority-title">
    <div class="history-priority__marker">${monitoringIcon(movement === "increase" ? "increase" : "decrease")}</div>
    <div class="history-priority__copy"><span class="eyebrow">Revisión sugerida</span><h2 id="history-priority-title">${escapeHtml(project?.name ?? "Proyecto observado")} ${escapeHtml(direction)} su precio publicado</h2><p>Es el cambio más reciente. Confírmalo en la ficha antes de usarlo en una conversación comercial.</p><div class="history-priority__meta"><span>${escapeHtml(project?.agency ?? "Inmobiliaria no informada")}</span><span>${escapeHtml(districtName())}</span><span>${formatDate(event.current_observed_at ?? event.detected_at)}</span></div></div>
    <div class="history-priority__value"><span>Anterior</span><strong>${money(event.previous_value)}</strong><span>Nuevo</span><strong>${money(event.current_value)}</strong><b class="history-delta ${historyDeltaClass(event)}">${signedPercent(event.delta_pct)}</b></div>
    <div class="history-priority__actions">${project ? `<button class="button button--primary" type="button" data-project-detail="${escapeAttr(project.id)}">Abrir proyecto</button>` : ""}<a class="button button--quiet" href="#assistant">Preparar decisión</a></div>
  </section>`;
}

function renderHistorySignals(events: JsonObject[], compact: boolean): string {
  if (!events.length) {
    return `<section class="history-empty"><span aria-hidden="true">○</span><h3>No hay cambios con estos filtros</h3><p>Amplía la vigencia o el movimiento. La ausencia de señales no demuestra que el mercado esté estable.</p></section>`;
  }
  return `<ol class="history-signals ${compact ? "history-signals--compact" : ""}">${events.map(renderHistorySignal).join("")}</ol>`;
}

function renderHistorySignal(event: JsonObject): string {
  const project = historyProject(event);
  const movement = historyEventDirection(event);
  const direction = historyDirectionLabel(movement);
  const evidenceCount = Array.isArray(event.evidence_ids) ? event.evidence_ids.length : 0;
  const status = historyStatusLabel(event.status);
  return `<li><article class="history-signal">
    <div class="history-signal__icon ${historyDeltaClass(event)}">${monitoringIcon(movement === "increase" ? "increase" : "decrease")}</div>
    <div class="history-signal__body"><div class="history-signal__heading"><div><span>${escapeHtml(project?.agency ?? "Inmobiliaria no informada")}</span><h3>${escapeHtml(project?.name ?? "Proyecto observado")} ${escapeHtml(direction)} su precio publicado</h3></div><span class="history-status">${escapeHtml(status)}</span></div>
      <div class="history-value-flow"><span><small>Anterior</small><strong>${money(event.previous_value)}</strong></span><span aria-hidden="true">→</span><span><small>Nuevo</small><strong>${money(event.current_value)}</strong></span><b class="history-delta ${historyDeltaClass(event)}">${signedPercent(event.delta_pct)}</b></div>
      <div class="history-signal__meta"><span>${escapeHtml(project?.district ?? districtName())}</span><span>${escapeHtml(scopeLabel())}</span><time datetime="${escapeAttr(event.current_observed_at ?? event.detected_at ?? "")}">${formatDate(event.current_observed_at ?? event.detected_at)}</time><span>${escapeHtml(historyValidityLabel(event.validity))}</span></div>
      <p>No se observó la causa del cambio. El valor corresponde a precio publicado, no a precio de cierre.</p>
      <div class="history-signal__actions">${project ? `<button class="link-button" type="button" data-project-detail="${escapeAttr(project.id)}">Abrir proyecto</button>` : ""}<details class="history-evidence"><summary>Ver respaldo</summary><p>${formatNumber(evidenceCount)} fuentes permiten comprobar los valores anterior y nuevo.</p></details></div>
    </div>
  </article></li>`;
}

function historyEvents(): JsonObject[] {
  return (state.history?.items ?? []).filter((event) =>
    (state.historyDirection === "all" || historyEventDirection(event) === state.historyDirection)
    && (state.historyValidity === "all" || event.validity === state.historyValidity));
}

function historyProject(event: JsonObject): ProjectSummary | null {
  if (event.project) return event.project as ProjectSummary;
  const id = String(event.project_id ?? "").replace(/^project:nexo-/u, "").replace(/^nexo-/u, "");
  return state.projects?.items.find((project) => String(project.id) === id) ?? null;
}

function historyDirectionLabel(value: unknown): string {
  if (value === "increase") return "subió";
  if (value === "decrease") return "bajó";
  return "mantuvo";
}

function historyEventDirection(event: JsonObject): "increase" | "decrease" | "unchanged" {
  if (["increase", "decrease", "unchanged"].includes(String(event.direction))) {
    return event.direction as "increase" | "decrease" | "unchanged";
  }
  const delta = Number(event.delta_absolute);
  if (delta > 0) return "increase";
  if (delta < 0) return "decrease";
  return "unchanged";
}

function historyStatusLabel(value: unknown): string {
  if (value === "certified") return "Confirmado";
  if (value === "reviewable") return "Requiere revisión";
  return "Evidencia insuficiente";
}

function historyValidityLabel(value: unknown): string {
  if (value === "current") return "Reciente";
  if (value === "aging") return "En seguimiento";
  if (value === "historical") return "Histórica";
  return "Fecha por revisar";
}

function historyDeltaClass(event: JsonObject): string {
  const direction = historyEventDirection(event);
  return direction === "increase" ? "is-increase" : direction === "decrease" ? "is-decrease" : "is-flat";
}

function signedPercent(value: unknown): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  const sign = number > 0 ? "+" : number < 0 ? "−" : "";
  return `${sign}${formatNumber(Math.abs(number))}%`;
}

function monitoringIcon(kind: "price" | "unit" | "discount" | "increase" | "decrease"): string {
  const paths = {
    price: '<path d="M4 7h8l4 4-8 8-4-4V7Z"/><circle cx="8" cy="11" r="1"/>',
    unit: '<path d="M5 20V5h10v15M3 20h14M8 9h1M12 9h1M8 13h1M12 13h1"/>',
    discount: '<circle cx="7" cy="7" r="2"/><circle cx="17" cy="17" r="2"/><path d="m6 18 12-12"/>',
    increase: '<path d="M5 16 15 6M8 6h7v7"/>',
    decrease: '<path d="m5 8 10 10M8 18h7v-7"/>',
  };
  return `<span class="monitoring-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${paths[kind]}</svg></span>`;
}

function renderCorrections(): string {
  return `<aside class="correction-banner" role="status"><strong>Escenario ajustado</strong><span>Ajustamos algunos filtros para poder mostrar resultados. Revisa el escenario antes de continuar.</span></aside>`;
}

function renderScenarioDialog(): string {
  const scenario = state.scenario!;
  const district = state.bootstrap!.districts.find(({ id }) => id === scenario.district_id);
  return `<dialog id="scenario-dialog" class="product-dialog" aria-labelledby="scenario-dialog-title">
    <form method="dialog" class="dialog-header"><div><span class="eyebrow">Escenario</span><h2 id="scenario-dialog-title">Editar alcance comercial</h2><p>Edita los filtros y aplícalos cuando estén listos.</p></div><button class="icon-button" value="cancel" aria-label="Cerrar">${closeIcon()}</button></form>
    <form id="scenario-form" class="scenario-form">
      <label>Distrito<select name="district_id">${state.bootstrap!.districts.map((item) => `<option value="${escapeAttr(item.id)}" ${item.id === scenario.district_id ? "selected" : ""}>${escapeHtml(item.name)} · ${formatNumber(item.projectCount)}</option>`).join("")}</select></label>
      <label>Alcance<select name="scope_mode"><option value="district" ${scenario.scope_mode === "district" ? "selected" : ""}>Distrito completo</option><option value="quadrant" ${scenario.scope_mode === "quadrant" ? "selected" : ""} ${!district?.quadrants.length ? "disabled" : ""}>Zona de comparación</option><option value="radius" ${scenario.scope_mode === "radius" ? "selected" : ""}>Radio desde el centro distrital</option></select></label>
      <label data-scope-field="quadrant">Zona<select name="quadrant_id" ${scenario.scope_mode !== "quadrant" ? "disabled" : ""}>${district?.quadrants.map((item) => `<option value="${item.id}" ${item.id === scenario.quadrant_id ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></label>
      <label data-scope-field="radius">Radio<select name="radius_meters" ${scenario.scope_mode !== "radius" ? "disabled" : ""}>${optionValues(state.bootstrap!.scenarioCatalogs.radius_meters, scenario.radius_meters ?? 1000)}</select></label>
      <label>Tipología<select name="typology">${optionValues(state.bootstrap!.scenarioCatalogs.typologies, scenario.typology)}</select></label>
      <label>Dormitorios<select name="bedrooms">${optionValues(state.bootstrap!.scenarioCatalogs.bedrooms, scenario.bedrooms)}</select></label>
      <label>Entrega<select name="delivery_year">${optionValues(state.bootstrap!.scenarioCatalogs.delivery_years, scenario.delivery_year)}</select></label>
      <label>Área objetivo (m²)<input name="target_area_m2" type="number" min="1" step="0.01" value="${scenario.target_area_m2 ?? ""}" /></label>
      <label>Precio objetivo (S/)<input name="target_price_pen" type="number" min="1" step="1" value="${scenario.target_price_pen ?? ""}" /></label>
      <p class="scenario-selection-notice">${state.selectedProjectIds.length ? `Al cambiar el escenario se quitarán los ${state.selectedProjectIds.length} proyectos seleccionados.` : "La selección se conserva mientras no cambies el escenario. Reiniciar vuelve al inicio y limpia la selección."}</p>
      ${state.scenarioError ? `<p class="scenario-error" role="alert">${escapeHtml(state.scenarioError)}</p>` : ""}
      <div class="dialog-actions"><button class="button button--quiet" type="button" data-action="reset">Reiniciar demo</button><button class="button button--quiet" type="button" data-action="cancel-scenario">Cancelar</button><button class="button button--primary" type="submit" ${activeBusy?.channel === "workspace" ? "disabled" : ""}>Aplicar escenario</button></div>
    </form>
  </dialog>`;
}

function renderCommandDialog(): string {
  const destinations = [
    { hash: "#dashboard", label: "Panorama", hint: "Zona, precios y oferta" },
    { hash: "#projects", label: "Proyectos", hint: "Catálogo y fichas" },
    { hash: "#compare", label: "Comparar", hint: "Proyectos lado a lado" },
    { hash: "#activity", label: "Seguimiento", hint: "Cambios publicados" },
    { hash: "#assistant", label: "Decidir", hint: "Argumento comercial" },
    ...JOURNEY_STAGES.map((item) => ({ hash: `#journey/${item.id}`, label: `Recorrido · ${item.position}. ${item.label}`, hint: item.question })),
  ];
  return `<dialog id="command-dialog" class="command-dialog" aria-labelledby="command-title"><h2 id="command-title" class="sr-only">Ir a una sección</h2><form method="dialog"><label for="command-input" class="sr-only">Buscar destino</label><input id="command-input" type="search" placeholder="Ir a una sección…" value="${escapeAttr(commandQuery)}" autocomplete="off" aria-controls="command-results" /><button class="icon-button" value="cancel" aria-label="Cerrar">${closeIcon()}</button></form><nav id="command-results" class="command-results" aria-label="Destinos">${destinations.map((item, index) => `<a id="command-option-${index}" href="${item.hash}" data-command-option data-command-label="${escapeAttr(item.label)}" data-command-hint="${escapeAttr(item.hint)}"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.hint)}</span></a>`).join("")}</nav><p id="command-empty" hidden>No hay secciones con ese nombre. Prueba «Proyectos» o «Seguimiento».</p><p id="command-count" class="sr-only" role="status"></p></dialog>`;
}

function updateCommandResults(): void {
  const options = [...root.querySelectorAll<HTMLAnchorElement>("[data-command-option]")];
  const matches = filterCommandDestinations(options.map((element) => ({ element, label: element.dataset.commandLabel ?? "", hint: element.dataset.commandHint ?? "" })), commandQuery);
  commandIndex = Math.min(commandIndex, Math.max(0, matches.length - 1));
  options.forEach((option) => { option.hidden = !matches.some(({ element }) => element === option); option.classList.remove("is-active"); });
  matches[commandIndex]?.element.classList.add("is-active");
  const empty = root.querySelector<HTMLElement>("#command-empty");
  if (empty) empty.hidden = matches.length > 0;
  const count = root.querySelector<HTMLElement>("#command-count");
  if (count) count.textContent = `${matches.length} ${matches.length === 1 ? "destino" : "destinos"}`;
}

function renderDataRefreshDialog(): string {
  const enabled = state.refreshStatus?.enabled === true;
  const demoProjectCount = state.bootstrap!.districts.reduce((total, district) => total + Number(district.projectCount ?? 0), 0);
  return `<dialog id="data-refresh-dialog" class="product-dialog data-refresh-dialog" aria-labelledby="data-refresh-dialog-title">
    <form method="dialog" class="dialog-header"><div><span class="eyebrow">Información del mercado</span><h2 id="data-refresh-dialog-title">Actualizar datos de proyectos</h2><p>Revisa ${formatNumber(demoProjectCount)} proyectos de ${formatNumber(state.bootstrap!.districts.length)} distritos y mantiene visible la última versión aprobada.</p></div><button class="icon-button" value="cancel" aria-label="Cerrar">${closeIcon()}</button></form>
    ${enabled ? `<form id="data-refresh-form" class="data-refresh-form">
      <fieldset><legend>Alcance</legend><label class="choice-row"><input type="radio" name="refresh_scope" value="active_district" /><span><strong>Solo ${escapeHtml(districtName())}</strong><small>Revisa las inmobiliarias del distrito activo.</small></span></label><label class="choice-row"><input type="radio" name="refresh_scope" value="demo_districts" checked /><span><strong>Todos los distritos de la demo</strong><small>Procesa el universo completo de siete distritos.</small></span></label></fieldset>
      <fieldset><legend>Fuentes a revisar</legend><label class="choice-row choice-row--disabled"><input type="checkbox" name="refresh_channel" value="nexo_authorized_feed" disabled /><span><strong>Base autorizada de Nexo</strong><small>Pendiente de conectar el acceso entregado por Viva/CODIP.</small></span></label><label class="choice-row"><input type="checkbox" name="refresh_channel" value="official_websites" checked /><span><strong>Webs oficiales</strong><small>Solo sitios aprobados para la recopilación.</small></span></label><label class="choice-row choice-row--disabled"><input type="checkbox" name="refresh_channel" value="social_official_apis" disabled /><span><strong>Redes sociales oficiales</strong><small>Pendiente de conectar los accesos oficiales.</small></span></label></fieldset>
      <label>Clave de acceso<input id="data-refresh-key" name="operator_key" type="password" autocomplete="current-password" required placeholder="Clave de este entorno" /></label>
      <p class="method-note">La información nueva se revisa antes de reemplazar la versión visible.</p>
      <div class="dialog-actions"><button class="button button--quiet" type="button" data-action="close-refresh">Cancelar</button><button class="button button--primary" type="submit">Iniciar recopilación</button></div>
    </form>` : `<section class="refresh-locked"><span class="refresh-locked__icon" aria-hidden="true">🔒</span><div><h3>La actualización no está disponible en este entorno</h3><p>Esta función se habilita cuando el equipo cuenta con accesos y permisos para consultar las fuentes.</p><ul><li>La información visible permanece disponible.</li><li>No se recopilan datos desde tu navegador.</li><li>Solo se consultan fuentes autorizadas.</li></ul></div><button class="button button--quiet" type="button" data-action="close-refresh">Entendido</button></section>`}
  </dialog>`;
}

async function handleClick(event: MouseEvent): Promise<void> {
  const target = event.target as HTMLElement;
  if (target.closest('a[href="#main-content"]')) {
    event.preventDefault(); document.querySelector<HTMLElement>("#main-content")?.focus(); return;
  }
  if (target.closest("[data-command-option]")) closeDialogs();
  const mapProjectId = target.closest<HTMLElement>("[data-map-project]")?.dataset.mapProject;
  if (mapProjectId) {
    event.preventDefault();
    await selectMapProject(mapProjectId);
    return;
  }
  const action = target.closest<HTMLElement>("[data-action]")?.dataset.action;
  if (action === "retry") return void initialize();
  if (action === "retry-route") return void (detailRetryId ? openProjectDetail(detailRetryId) : loadRouteData());
  if (action === "cancel-scenario") { cancelScenarioEdit(); closeDialogs(); return; }
  if (action === "comparison-all" || action === "comparison-differences") { state.comparisonOnlyDifferences = action === "comparison-differences"; render(); return; }
  if (action === "open-nav") { state.navOpen = true; render(); return; }
  if (action === "close-nav") { state.navOpen = false; render(); return; }
  if (action === "scenario") return openDialog("scenario-dialog", "scenario-form");
  if (action === "command") return openDialog("command-dialog", "command-input");
  if (action === "data-refresh") return openDialog("data-refresh-dialog", state.refreshStatus?.enabled ? "data-refresh-key" : "data-refresh-dialog");
  if (action === "close-refresh") { closeDialogs(); return; }
  if (action === "refresh-status") {
    const ticket = requests.begin("refresh");
    try {
      const status = await provider.dataRefreshStatus();
      if (!requests.isCurrent(ticket)) return;
      state.refreshStatus = status;
      state.refreshNotice = {
        tone: state.refreshStatus.run.state === "failed" ? "error" : state.refreshStatus.run.state === "blocked" ? "warning" : "success",
        message: refreshRunCopy(state.refreshStatus.run.state),
      };
      render();
    } catch (error) {
      if (!requests.isCurrent(ticket)) return;
      state.refreshNotice = { tone: "error", message: error instanceof ApiClientError ? error.message : "No se pudo consultar el estado." };
      render();
    }
    return;
  }
  if (action === "map-geographic") { state.mapView = "geographic"; render(); return; }
  if (action === "map-positioning") { state.mapView = "positioning"; render(); return; }
  if (action === "map-open-detail" && state.mapProjectDetail) {
    detailOrigin = { selector: '[data-action="map-open-detail"]', scroll: window.scrollY };
    state.projectDetail = state.mapProjectDetail;
    render();
    requestAnimationFrame(focusProjectDetail);
    return;
  }
  if (action === "clear-history-filters") {
    state.historyDirection = "all";
    state.historyValidity = "all";
    render();
    return;
  }
  if (action === "clear-comparison") {
    invalidateSelectionResults();
    state.selectedProjectIds = [];
    state.selectedProjects = {};
    state.comparison = null;
    state.selectionMessage = "Selección limpia. Elige al menos dos proyectos.";
    render();
    return;
  }
  if (action === "open-comparison") {
    if (state.selectedProjectIds.length < 2) {
      state.selectionMessage = "Selecciona al menos dos proyectos para continuar.";
      render();
      return;
    }
    state.comparison = null;
    window.location.hash = "#compare";
    return;
  }
  if (action === "reset" && state.bootstrap) {
    await applyScenario(structuredClone(state.bootstrap.initialScenario), true);
    return;
  }
  if (action === "close-detail") { closeProjectDetail(); return; }
  if (action === "toggle-detail-comparison" && state.projectDetail) {
    const project = state.projectDetail.project as JsonObject;
    const id = canonicalProjectId(String(project.canonicalId ?? project.id));
    if (state.selectedProjectIds.includes(id)) removeProjectSelection(id);
    else if (state.selectedProjectIds.length < 3) addProjectSelection(projectSummaryFromDetail(project));
    if ((state.route.id === "compare" || state.route.id === "depth") && state.selectedProjectIds.length >= 2 && state.scenario) {
      await loadRouteData();
    } else render();
    return;
  }
  const removeId = target.closest<HTMLElement>("[data-project-remove]")?.dataset.projectRemove;
  if (removeId) {
    removeProjectSelection(removeId);
    if ((state.route.id === "compare" || state.route.id === "depth") && state.selectedProjectIds.length >= 2 && state.scenario) {
      await loadRouteData();
    } else render();
    return;
  }
  const page = target.closest<HTMLElement>("[data-project-page]")?.dataset.projectPage;
  if (page) {
    state.projectPage = Number(page);
    await loadProjectsFromForm();
    return;
  }
  const projectId = target.closest<HTMLElement>("[data-project-detail]")?.dataset.projectDetail;
  if (projectId) {
    detailOrigin = { selector: `[data-project-detail="${CSS.escape(projectId)}"]`, scroll: window.scrollY };
    await openProjectDetail(projectId);
    return;
  }
  const assistantButton = target.closest<HTMLElement>("[data-assistant-intent]");
  if (assistantButton) {
    cancelAssistantRequest();
    state.assistantDraft = assistantButton.dataset.assistantQuestion ?? "";
    state.assistantIntentId = assistantButton.dataset.assistantIntent ?? null;
    state.assistantQuestionTitle = assistantButton.dataset.assistantQuestionTitle ?? null;
    state.assistant = null;
    state.assistantError = null;
    render();
    requestAnimationFrame(() => {
      const input = document.querySelector<HTMLTextAreaElement>("#assistant-input");
      input?.focus();
      input?.setSelectionRange(input.value.length, input.value.length);
    });
    return;
  }
  const assistantCategory = target.closest<HTMLElement>("[data-assistant-category]")?.dataset.assistantCategory as AssistantCategoryId | undefined;
  if (assistantCategory) {
    cancelAssistantRequest();
    state.assistantCategory = assistantCategory;
    state.assistant = null;
    state.assistantDraft = "";
    state.assistantIntentId = null;
    state.assistantQuestionTitle = null;
    state.assistantError = null;
    render();
    return;
  }
}

function handleInput(event: Event): void {
  const target = event.target as HTMLTextAreaElement;
  if (target.id === "command-input") { commandQuery = target.value; commandIndex = 0; updateCommandResults(); return; }
  if (target.id !== "assistant-input") return;
  cancelAssistantRequest();
  state.assistant = null;
  state.assistantError = null;
  state.assistantDraft = target.value;
  if (state.assistantIntentId && !assistantQuestions().some(({ intentId, question }) => intentId === state.assistantIntentId && question === target.value)) {
    state.assistantIntentId = null;
    state.assistantQuestionTitle = "Consulta comercial";
    const intent = document.querySelector<HTMLInputElement>("#assistant-intent");
    if (intent) intent.value = "";
  }
  const counter = document.querySelector<HTMLElement>("#assistant-character-count");
  if (counter) counter.textContent = `${formatNumber(target.value.length)} / 500`;
  render();
}

async function handleSubmit(event: SubmitEvent): Promise<void> {
  const form = event.target as HTMLFormElement;
  if (form.id === "data-refresh-form") {
    event.preventDefault();
    const data = new FormData(form);
    const channels = data.getAll("refresh_channel").map(String) as Array<"nexo_authorized_feed" | "official_websites" | "social_official_apis">;
    if (!channels.length) {
      state.refreshNotice = { tone: "warning", message: "Selecciona al menos una fuente para iniciar la actualización." };
      closeDialogs();
      render();
      return;
    }
    const scope = String(data.get("refresh_scope") ?? "demo_districts") as "active_district" | "demo_districts";
    const operatorKey = String(data.get("operator_key") ?? "");
    const ticket = beginTask("refresh", "Enviando solicitud…");
    const keyInput = form.querySelector<HTMLInputElement>("[name=operator_key]");
    if (keyInput) keyInput.value = "";
    render();
    try {
      const response = await provider.requestDataRefresh({
        scope,
        districtIds: scope === "active_district" && state.scenario
          ? [state.scenario.district_id]
          : state.bootstrap!.districts.map((district) => district.id),
        channels,
      }, operatorKey);
      if (!finishTask(ticket)) return;
      state.refreshStatus = { ...state.refreshStatus!, run: response.run };
      state.refreshNotice = { tone: "success", message: refreshRunCopy(response.run.state) };
      state.busyMessage = null;
      closeDialogs();
      render();
    } catch (error) {
      if (!finishTask(ticket)) return;
      state.busyMessage = null;
      state.refreshNotice = {
        tone: error instanceof ApiClientError && [409, 423].includes(error.status) ? "warning" : "error",
        message: error instanceof ApiClientError ? error.message : "No se pudo iniciar la actualización.",
      };
      closeDialogs();
      render();
    }
    return;
  }
  if (form.id === "scenario-form") {
    event.preventDefault();
    if (!state.scenario) return;
    const data = new FormData(form);
    const scopeMode = String(data.get("scope_mode")) as Scenario["scope_mode"];
    const district = state.bootstrap?.districts.find(({ id }) => id === String(data.get("district_id")));
    const candidate: Scenario = {
      ...state.scenario,
      district_id: String(data.get("district_id")),
      scope_mode: scopeMode,
      quadrant_id: scopeMode === "quadrant" ? String(data.get("quadrant_id") || "NW") : null,
      center_latitude: scopeMode === "radius" ? district?.centerLatitude ?? null : null,
      center_longitude: scopeMode === "radius" ? district?.centerLongitude ?? null : null,
      radius_meters: scopeMode === "radius" ? optionalNumber(data.get("radius_meters")) : null,
      typology: String(data.get("typology")),
      bedrooms: scalar(data.get("bedrooms")) as Scenario["bedrooms"],
      delivery_year: scalar(data.get("delivery_year")) as Scenario["delivery_year"],
      target_area_m2: optionalNumber(data.get("target_area_m2")),
      target_price_pen: optionalNumber(data.get("target_price_pen")),
      source: "interaction",
    };
    await applyScenario(candidate);
    return;
  }
  if (form.id === "project-filter-form") {
    event.preventDefault();
    state.projectPage = 1;
    await loadProjectsFromForm(form);
    return;
  }
  if (form.id === "assistant-form") {
    event.preventDefault();
    if (!state.scenario) return;
    const data = new FormData(form);
    const input = String(data.get("input") ?? "").trim();
    if (!input) return;
    state.assistantDraft = input;
    state.assistantError = null;
    const ticket = beginTask("assistant", "Preparando respuesta…");
    state.assistant = null; render();
    try {
      const response = await provider.assistant({
        scenario: structuredClone(state.scenario),
        input,
        intentId: String(data.get("intentId") || "") || null,
        projectIds: [...state.selectedProjectIds],
        inspectorRouteSlug: state.inspectorSlug,
      });
      if (!finishTask(ticket)) return;
      state.assistant = response; render();
    } catch (error) {
      if (!finishTask(ticket)) return;
      state.assistantError = error instanceof ApiClientError ? error.message : "No pudimos preparar la respuesta. Inténtalo nuevamente.";
      render();
    }
  }
}

async function handleChange(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement | HTMLSelectElement;
  if (target.id === "map-project-picker") { if (target.value) await selectMapProject(target.value); return; }
  if (target.id === "quality-verification-case") {
    requests.invalidate("route");
    state.inspectorSlug = target.value || null;
    state.inspector = null;
    if (!state.inspectorSlug) return;
    const ticket = beginTask("inspector", "Abriendo verificación…");
    render();
    try {
      const result = await provider.inspector(state.inspectorSlug);
      if (!finishTask(ticket)) return;
      state.inspector = result;
      render();
      requestAnimationFrame(() => document.querySelector<HTMLElement>(".verification-result")?.focus());
    } catch (error) {
      if (!finishTask(ticket)) return;
      state.inspector = null;
      render();
    }
    return;
  }
  if (target.name === "history_direction") {
    state.historyDirection = target.value as AppState["historyDirection"];
    render();
    return;
  }
  if (target.name === "history_validity") {
    state.historyValidity = target.value as AppState["historyValidity"];
    render();
    return;
  }
  if (target.matches("[data-compare-id]")) {
    const id = target.dataset.compareId!;
    if ((target as HTMLInputElement).checked) {
      const project = state.projects?.items.find((item) => canonicalProjectId(item.id) === id);
      if (project && !state.selectedProjectIds.includes(id) && state.selectedProjectIds.length < 3) addProjectSelection(project);
      else (target as HTMLInputElement).checked = false;
    } else removeProjectSelection(id);
    state.comparison = null;
    render();
    return;
  }
  if (target.name === "project_scope" && target.form?.id === "project-filter-form") {
    state.projectScope = target.value === "all" || target.value === "district" ? target.value : "scenario";
    state.projectPage = 1;
    await loadProjectsFromForm(target.form);
    return;
  }
  if (target.name === "scope_mode" && target.form?.id === "scenario-form") {
    const quadrant = target.form.elements.namedItem("quadrant_id") as HTMLSelectElement | null;
    const radius = target.form.elements.namedItem("radius_meters") as HTMLSelectElement | null;
    if (quadrant) quadrant.disabled = target.value !== "quadrant";
    if (radius) radius.disabled = target.value !== "radius";
  }
}

async function loadProjectsFromForm(form = document.querySelector<HTMLFormElement>("#project-filter-form")): Promise<void> {
  if (!state.scenario) return;
  const data = form ? new FormData(form) : new FormData();
  const scope = String(data.get("project_scope") ?? state.projectScope);
  state.projectScope = scope === "all" || scope === "district" ? scope : "scenario";
  state.projectQuery = String(data.get("query") ?? state.projectQuery);
  state.projectSort = String(data.get("sort") ?? state.projectSort);
  state.projectDetail = null;
  requests.invalidate("detail");
  await loadRouteData();
}

function queryProjects(): Promise<Page<ProjectSummary>> {
  const parameters = { page: state.projectPage, pageSize: 18, query: state.projectQuery, sort: state.projectSort };
  return state.projectScope === "scenario"
    ? provider.scenarioProjects(structuredClone(state.scenario!), parameters)
    : provider.projects({ ...parameters, ...(state.projectScope === "district" ? { district: state.scenario!.district_id } : {}) });
}

async function allScenarioProjects(scenario: Scenario): Promise<Page<ProjectSummary>> {
  const first = await provider.scenarioProjects(scenario, { page: 1, pageSize: 100 });
  const items = [...first.items];
  for (let page = 2; page <= first.totalPages; page++) {
    items.push(...(await provider.scenarioProjects(scenario, { page, pageSize: 100 })).items);
  }
  return { ...first, items };
}

async function allScenarioHistory(scenario: Scenario): Promise<Page<JsonObject>> {
  const first = await provider.scenarioHistory(scenario, { page: 1, pageSize: 100 });
  const items = [...first.items];
  for (let page = 2; page <= first.totalPages; page++) items.push(...(await provider.scenarioHistory(scenario, { page, pageSize: 100 })).items);
  return { ...first, items };
}

function scenarioProductLabel(): string {
  const scenario = state.scenario!;
  return [scenario.typology === "all" ? "Todo tipo de inmueble" : scenario.typology,
    scenario.bedrooms === "all" ? "Todos los dormitorios" : `${scenario.bedrooms} dormitorios`,
    scenario.delivery_year === "all" ? "Todas las entregas" : `Entrega ${scenario.delivery_year}`,
    scenario.target_area_m2 ? `Área objetivo ${formatNumber(scenario.target_area_m2)} m²` : "",
    scenario.target_price_pen ? `Precio objetivo ${money(scenario.target_price_pen)}` : "",
  ].filter(Boolean).join(" · ");
}

function scenarioFromLocation(initial: Scenario): Scenario {
  const query = new URLSearchParams(window.location.search);
  if (!query.has("sv")) return structuredClone(initial);
  const scope = query.get("scope") as Scenario["scope_mode"] | null;
  return {
    ...structuredClone(initial),
    district_id: query.get("district") ?? initial.district_id,
    scope_mode: scope ?? initial.scope_mode,
    quadrant_id: scope === "quadrant" ? query.get("quadrant") : null,
    center_latitude: scope === "radius" ? optionalNumber(query.get("lat")) : null,
    center_longitude: scope === "radius" ? optionalNumber(query.get("lon")) : null,
    radius_meters: scope === "radius" ? optionalNumber(query.get("radius")) : null,
    typology: query.get("typology") ?? initial.typology,
    bedrooms: scalar(query.get("bedrooms") ?? initial.bedrooms) as Scenario["bedrooms"],
    target_area_m2: optionalNumber(query.get("area")),
    target_price_pen: optionalNumber(query.get("price")),
    delivery_year: scalar(query.get("delivery") ?? initial.delivery_year) as Scenario["delivery_year"],
    visualization: query.get("viz") === "positioning" ? "positioning" : initial.visualization,
    source: "url",
  };
}

function writeScenarioToLocation(scenario: Scenario): void {
  const defaults = state.bootstrap!.initialScenario;
  const query = new URLSearchParams();
  const changed = JSON.stringify({ ...scenario, source: undefined }) !== JSON.stringify({ ...defaults, source: undefined });
  if (changed) {
    query.set("sv", "1");
    if (scenario.district_id !== defaults.district_id) query.set("district", scenario.district_id);
    if (scenario.scope_mode !== defaults.scope_mode) query.set("scope", scenario.scope_mode);
    if (scenario.quadrant_id) query.set("quadrant", scenario.quadrant_id);
    if (scenario.center_latitude != null) query.set("lat", String(scenario.center_latitude));
    if (scenario.center_longitude != null) query.set("lon", String(scenario.center_longitude));
    if (scenario.radius_meters != null) query.set("radius", String(scenario.radius_meters));
    if (scenario.typology !== defaults.typology) query.set("typology", scenario.typology);
    if (scenario.bedrooms !== defaults.bedrooms) query.set("bedrooms", String(scenario.bedrooms));
    if (scenario.target_area_m2 != null) query.set("area", String(scenario.target_area_m2));
    if (scenario.target_price_pen != null) query.set("price", String(scenario.target_price_pen));
    if (scenario.delivery_year !== defaults.delivery_year) query.set("delivery", String(scenario.delivery_year));
    if (scenario.visualization !== defaults.visualization) query.set("viz", scenario.visualization);
  }
  const next = `${window.location.pathname}${query.size ? `?${query}` : ""}${window.location.hash}`;
  window.history.replaceState(null, "", next);
}

function openDialog(id: string, focusId: string): void {
  const dialog = document.querySelector<HTMLDialogElement>(`#${id}`);
  if (!dialog) return;
  dialogOrigin = document.activeElement as HTMLElement | null;
  if (id === "command-dialog") {
    commandQuery = ""; commandIndex = 0;
    const input = dialog.querySelector<HTMLInputElement>("#command-input");
    if (input) input.value = "";
    updateCommandResults();
  }
  if (!dialog.open) dialog.showModal();
  document.querySelector<HTMLElement>(`#${focusId}`)?.focus();
}

function closeDialogs(): void {
  document.querySelectorAll<HTMLDialogElement>("dialog[open]").forEach((dialog) => dialog.close());
}

function routeLoadingLabel(route: Route): string {
  if (route.id === "quality") return "Revisando datos…";
  if (["compare", "depth"].includes(route.id)) return "Calculando comparación…";
  if (["activity", "movement"].includes(route.id)) return "Cargando señales…";
  return "Actualizando vista…";
}

function districtName(): string {
  return state.bootstrap?.districts.find(({ id }) => id === state.scenario?.district_id)?.name ?? state.scenario?.district_id ?? "Distrito";
}

function scopeLabel(): string {
  if (state.scenario?.scope_mode === "quadrant") {
    const district = state.bootstrap?.districts.find(({ id }) => id === state.scenario?.district_id);
    const zone = district?.quadrants.find(({ id }) => id === state.scenario?.quadrant_id);
    return `Zona de comparación ${zone?.label ?? "seleccionada"}`;
  }
  if (state.scenario?.scope_mode === "radius") return `Radio ${formatNumber(state.scenario.radius_meters)} m`;
  return "Distrito completo";
}

function benchmarkHeadline(): string {
  const value = state.workspace!.benchmark.quantitative?.orientative?.median;
  return value == null ? "Aún no hay suficientes precios y áreas para calcular la mediana." : `La mediana publicada es ${money(value)} por m² total.`;
}

function pricePositionText(): string {
  const position = String(state.workspace!.marketReading.pricePosition ?? "benchmark");
  if (position.includes("below")) return "El precio objetivo se ubica por debajo de la referencia central.";
  if (position.includes("above")) return "El precio objetivo se ubica por encima de la referencia central.";
  return "Sin precio objetivo: la lectura describe el rango observado del distrito.";
}

function metric(label: string, value: unknown, note: string): string {
  return `<article class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></article>`;
}

function emptyState(message: string, action: string, href: string): string {
  return `<section class="empty-state"><span>○</span><h2>${escapeHtml(message)}</h2><a class="button button--quiet" href="${escapeAttr(href)}">${escapeHtml(action)}</a></section>`;
}

function optionValues(values: unknown[], selected: unknown): string {
  return values.map((value) => `<option value="${escapeAttr(value)}" ${String(value) === String(selected) ? "selected" : ""}>${escapeHtml(value === "all" ? "Todos" : value)}</option>`).join("");
}

function qualityLabel(value: unknown): string {
  const labels: Record<string, string> = {
    certified: "Listo para usar",
    reviewable: "Conviene revisar",
    inconsistent: "No coincide",
    illegible: "No se puede leer",
    insufficient: "Faltan datos",
  };
  return labels[String(value)] ?? "Sin revisar";
}

function formatComparisonValue(value: JsonObject): string {
  if (!value || value.state === "unknown") return "Sin dato observado";
  const original = value.originalValue;
  const raw = value.normalizedValue;
  const listed = Array.isArray(original) && original.length ? original : Array.isArray(raw) ? raw : null;
  if (listed) return listed.length
    ? `<ul class="comparison-tags">${listed.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "Sin dato observado";
  if (value.currency === "PEN") return money(raw);
  if (value.unit === "PEN/m2") return `${money(raw)} / m²`;
  if (value.unit === "m2") return `${formatNumber(raw)} m²`;
  if (value.unit === "count") return `${formatNumber(raw)} ${Number(raw) === 1 ? "unidad reportada" : "unidades reportadas"}`;
  if (original === "source:nexo") return "Nexo Inmobiliario";
  return escapeHtml(original ?? raw ?? "Sin dato observado");
}

function comparisonStateLabel(value: unknown): string {
  const labels: Record<string, string> = {
    observed: "Dato publicado",
    announced: "Anunciado",
    excluded: "Orientativo; no comparable",
    unknown: "Sin dato observado",
  };
  return labels[String(value)] ?? "Dato disponible";
}

function comparisonStateClass(value: unknown): string {
  return ["observed", "announced", "excluded", "unknown"].includes(String(value))
    ? `is-${String(value)}`
    : "";
}

function addProjectSelection(project: ProjectSummary): void {
  const id = canonicalProjectId(project.id);
  if (state.selectedProjectIds.includes(id) || state.selectedProjectIds.length >= 3) return;
  invalidateSelectionResults();
  state.selectedProjectIds = [...state.selectedProjectIds, id];
  state.selectedProjects[id] = project;
  state.selectionMessage = state.selectedProjectIds.length === 1
    ? `${project.name} seleccionado. Elige un proyecto más.`
    : state.selectedProjectIds.length === 2
      ? `${project.name} añadido. Ya puedes comparar.`
      : `${project.name} añadido. Alcanzaste el máximo de tres proyectos.`;
}

function removeProjectSelection(id: string): void {
  invalidateSelectionResults();
  const projectName = state.selectedProjects[id]?.name ?? "Proyecto";
  state.selectedProjectIds = state.selectedProjectIds.filter((item) => item !== id);
  delete state.selectedProjects[id];
  state.comparison = null;
  state.selectionMessage = `${projectName} fue retirado. ${state.selectedProjectIds.length >= 2 ? "La comparación sigue disponible." : "Elige al menos dos proyectos."}`;
}

function projectSummaryFromDetail(project: JsonObject): ProjectSummary {
  return {
    ...project,
    id: String(project.canonicalId ?? project.id),
    name: String(project.name ?? project.canonicalName ?? "Proyecto"),
    agency: String(project.agency?.name ?? project.agency ?? "Sin inmobiliaria"),
    district: String(project.district ?? "Sin distrito"),
    address: project.address == null ? null : String(project.address),
    typology: project.typology == null ? null : String(project.typology),
    bedrooms: project.bedrooms == null ? null : project.bedrooms,
    areaM2: project.areaM2 == null ? null : Number(project.areaM2),
    pricePen: project.pricePen == null ? null : Number(project.pricePen),
    pricePerM2: project.pricePerM2 == null ? null : Number(project.pricePerM2),
    phase: project.phase == null ? null : String(project.phase),
    sourceUrl: project.sourceUrl == null ? null : String(project.sourceUrl),
    latitude: project.latitude == null ? null : Number(project.latitude),
    longitude: project.longitude == null ? null : Number(project.longitude),
  };
}

function canonicalProjectId(value: string): string {
  if (value.startsWith("project:")) return value;
  return `project:nexo-${value.replace(/^observed:nexo-/u, "")}`;
}

function formatDate(value: unknown): string {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.valueOf()) ? String(value) : new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatDateTime(value: unknown): string {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.valueOf())
    ? String(value)
    : new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
}

function formatNumber(value: unknown): string {
  const number = Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 }).format(number) : String(value ?? "—");
}

function formatPercent(value: unknown): string {
  const number = Number(value);
  return Number.isFinite(number) ? `${formatNumber(number)}%` : "—";
}

function money(value: unknown): string {
  const number = Number(value);
  return Number.isFinite(number) ? `S/ ${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 }).format(number)}` : "—";
}

function scalar(value: FormDataEntryValue | string | number | null): string | number {
  if (value === "all") return "all";
  const number = Number(value);
  return Number.isFinite(number) ? number : String(value ?? "all");
}

function optionalNumber(value: FormDataEntryValue | string | null): number | null {
  if (value === null || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function geometryCoordinates(geometry: JsonObject): Array<[number, number]> {
  const coordinates: Array<[number, number]> = [];
  visitCoordinates(geometry.coordinates, (longitude, latitude) => coordinates.push([longitude, latitude]));
  return coordinates;
}

function visitCoordinates(value: unknown, visitor: (longitude: number, latitude: number) => void): void {
  if (Array.isArray(value) && value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1])) {
    visitor(Number(value[0]), Number(value[1]));
    return;
  }
  if (Array.isArray(value)) value.forEach((child) => visitCoordinates(child, visitor));
}

function geometryPath(
  geometry: JsonObject,
  x: (longitude: number) => number,
  y: (latitude: number) => number,
): string {
  const polygons = geometry.type === "Polygon"
    ? [geometry.coordinates]
    : geometry.type === "MultiPolygon"
      ? geometry.coordinates
      : [];
  return (polygons as unknown[]).flatMap((polygon) =>
    (Array.isArray(polygon) ? polygon : []).map((ring) => ringPath(ring, x, y)))
    .filter(Boolean)
    .join(" ");
}

function ringPath(
  ring: unknown,
  x: (longitude: number) => number,
  y: (latitude: number) => number,
): string {
  if (!Array.isArray(ring)) return "";
  const points: Array<[number, number]> = ring
    .filter((coordinate) => Array.isArray(coordinate) && Number.isFinite(coordinate[0]) && Number.isFinite(coordinate[1]))
    .map((coordinate) => [x(Number(coordinate[0])), y(Number(coordinate[1]))] as [number, number]);
  if (points.length < 3) return "";
  return `${points.map(([projectedX, projectedY], index) => `${index ? "L" : "M"} ${projectedX.toFixed(2)} ${projectedY.toFixed(2)}`).join(" ")} Z`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/gu, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

function escapeAttr(value: unknown): string {
  return escapeHtml(value);
}
