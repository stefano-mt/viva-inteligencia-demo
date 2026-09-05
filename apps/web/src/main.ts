import "./styles.css";
import { ApiClientError, ApiDataProvider, type DataProvider } from "./api.js";
import { JOURNEY_STAGES, parseRoute, routeHash } from "./routes.js";
import type {
  Bootstrap,
  DistrictGeography,
  JsonObject,
  Meta,
  Page,
  ProjectSummary,
  Route,
  Scenario,
  WorkspaceEvaluation,
} from "./types.js";

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
  projectDetail: JsonObject | null;
  geography: DistrictGeography | null;
  projectPage: number;
  projectScope: "scenario" | "all";
  projectQuery: string;
  projectSort: string;
  mapView: "geographic" | "positioning";
  selectedProjectIds: string[];
  inspectorSlug: string | null;
  navOpen: boolean;
  busyMessage: string | null;
}

const rootElement = document.querySelector<HTMLDivElement>("#root");
if (!rootElement) throw new Error("No se encontró el contenedor de la aplicación.");
const root: HTMLDivElement = rootElement;

const provider: DataProvider = new ApiDataProvider();
const state: AppState = {
  status: "loading",
  error: null,
  route: parseRoute(),
  bootstrap: null,
  meta: null,
  scenario: null,
  workspace: null,
  projects: null,
  history: null,
  inspector: null,
  comparison: null,
  assistant: null,
  projectDetail: null,
  geography: null,
  projectPage: 1,
  projectScope: "scenario",
  projectQuery: "",
  projectSort: "name",
  mapView: "geographic",
  selectedProjectIds: [],
  inspectorSlug: null,
  navOpen: false,
  busyMessage: null,
};

window.addEventListener("hashchange", () => {
  state.route = parseRoute();
  state.navOpen = false;
  void loadRouteData({ focus: true });
});
window.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openDialog("command-dialog", "command-input");
  }
  if (event.key === "Escape" && state.navOpen) {
    state.navOpen = false;
    render();
  }
});
root.addEventListener("click", handleClick);
root.addEventListener("submit", handleSubmit);
root.addEventListener("change", handleChange);

render();
void initialize();

async function initialize(): Promise<void> {
  state.status = "loading";
  state.error = null;
  render();
  try {
    const [meta, bootstrap] = await Promise.all([provider.meta(), provider.bootstrap()]);
    if (meta.contractVersion !== "2.4.0" || bootstrap.contractVersion !== meta.contractVersion) {
      throw new ApiClientError(
        "La API usa un contrato incompatible con esta versión del frontend.",
        "CONTRACT_INCOMPATIBLE",
        409,
        null,
      );
    }
    state.meta = meta;
    state.bootstrap = bootstrap;
    state.scenario = scenarioFromLocation(bootstrap.initialScenario);
    state.inspectorSlug = bootstrap.inspectorCases[0]?.routeSlug ?? null;
    await refreshWorkspace();
    state.status = "ready";
    await loadRouteData();
  } catch (error) {
    fail(error);
  }
}

async function refreshWorkspace(): Promise<void> {
  if (!state.scenario) return;
  state.busyMessage = "Actualizando lectura comercial…";
  render();
  const workspace = await provider.evaluateWorkspace(state.scenario);
  state.scenario = workspace.scenario;
  state.workspace = workspace;
  state.selectedProjectIds = workspace.comparableProjectIds.slice(0, 2);
  state.projectPage = 1;
  state.projectScope = "scenario";
  state.projectQuery = "";
  state.projectSort = "name";
  writeScenarioToLocation(workspace.scenario);
  const [projects, history] = await Promise.all([
    provider.projects({
      district: workspace.scenario.district_id,
      page: 1,
      pageSize: 18,
      typology: workspace.scenario.typology,
      bedrooms: workspace.scenario.bedrooms,
    }),
    provider.history({ district: workspace.scenario.district_id, page: 1, pageSize: 20 }),
  ]);
  state.projects = projects;
  state.history = history;
  state.inspector = null;
  state.comparison = null;
  state.assistant = null;
  state.projectDetail = null;
  state.busyMessage = null;
}

async function loadRouteData(options: { focus?: boolean } = {}): Promise<void> {
  if (state.status !== "ready" || !state.scenario || !state.bootstrap) {
    render();
    return;
  }
  try {
    state.busyMessage = routeLoadingLabel(state.route);
    render();
    if (state.route.id === "projects") {
      state.projects = await provider.projects(projectParameters(18));
    }
    if (state.route.id === "dashboard" || state.route.id === "geography") {
      [state.projects, state.geography] = await Promise.all([
        provider.projects({
          district: state.scenario.district_id,
          page: 1,
          pageSize: 100,
          typology: state.scenario.typology,
          bedrooms: state.scenario.bedrooms,
        }),
        provider.districtGeography(state.scenario.district_id),
      ]);
    }
    if (state.route.id === "activity" || state.route.id === "movement") {
      state.history = await provider.history({
        district: state.scenario.district_id,
        page: 1,
        pageSize: 20,
      });
    }
    if (state.route.id === "inspector" || state.route.id === "quality") {
      const slug = state.route.id === "quality"
        ? (state.bootstrap.inspectorCases.find(({ routeSlug }) => routeSlug === "f3-ct-g-pardo")?.routeSlug ?? state.inspectorSlug)
        : state.inspectorSlug;
      if (slug) state.inspector = await provider.inspector(slug);
    }
    if ((state.route.id === "compare" || state.route.id === "depth") && state.selectedProjectIds.length >= 2) {
      state.comparison = await provider.comparison(state.scenario, state.selectedProjectIds);
    }
    state.busyMessage = null;
    render();
    if (options.focus) requestAnimationFrame(() => document.querySelector<HTMLElement>("#main-content")?.focus());
  } catch (error) {
    state.busyMessage = null;
    fail(error);
  }
}

function fail(error: unknown): void {
  state.status = "error";
  state.error = error instanceof ApiClientError
    ? error
    : new ApiClientError("No se pudo iniciar el espacio comercial.", "APP_ERROR", 500, null);
  state.busyMessage = null;
  render();
}

function render(): void {
  if (state.status === "loading" || !state.bootstrap || !state.meta || !state.scenario || !state.workspace) {
    root.innerHTML = state.status === "error" ? renderFatalError() : renderLoading();
    return;
  }
  const district = districtName();
  root.innerHTML = `
    <a class="skip-link" href="#main-content">Ir al contenido principal</a>
    <div class="product-shell ${state.navOpen ? "nav-open" : ""}">
      <button class="nav-scrim" type="button" data-action="close-nav" aria-label="Cerrar navegación"></button>
      <aside class="product-sidebar" id="product-sidebar" aria-label="Navegación principal">
        <header class="brand">
          <img src="/assets/viva-negocio-inmobiliario-logo.jpg" alt="VIVA" width="56" height="56" />
          <span><strong>Inteligencia comercial</strong><small>Viva Inmobiliaria</small></span>
          <button class="icon-button mobile-only" type="button" data-action="close-nav" aria-label="Cerrar menú">${closeIcon()}</button>
        </header>
        <button class="command-trigger" type="button" data-action="command">
          <span>Ir a…</span><kbd>Ctrl K</kbd>
        </button>
        ${renderNavigation()}
        <footer class="dataset-note">
          <span>Datos al ${formatDate(state.meta.cutoffAt)}</span>
          <strong>${formatNumber(state.meta.coverage.projects)} proyectos</strong>
          <small>Contrato ${escapeHtml(state.meta.contractVersion)}</small>
        </footer>
      </aside>
      <div class="product-workspace">
        <header class="scenario-ribbon">
          <button class="icon-button menu-button" type="button" data-action="open-nav" aria-label="Abrir menú">☰</button>
          <div class="scenario-ribbon__context">
            <span>Escenario activo</span>
            <strong>${escapeHtml(district)} · ${escapeHtml(scopeLabel())}</strong>
          </div>
          <div class="scenario-ribbon__metrics" aria-label="Resumen del escenario">
            <span><b>${formatNumber(state.workspace.marketReading.comparableProjectCount)}</b> comparables</span>
            <span><b>${formatNumber(state.workspace.marketReading.priceReferenceCount)}</b> precios utilizables</span>
          </div>
          <button class="button button--quiet" type="button" data-action="scenario">Editar escenario</button>
        </header>
        <main class="product-content" id="main-content" tabindex="-1">
          ${state.workspace.corrections.length ? renderCorrections() : ""}
          ${renderCurrentRoute()}
        </main>
      </div>
      ${renderScenarioDialog()}
      ${renderCommandDialog()}
      ${state.busyMessage ? `<div class="busy" role="status"><span></span>${escapeHtml(state.busyMessage)}</div>` : ""}
    </div>`;
}

function renderLoading(): string {
  return `<main class="startup-state" aria-busy="true"><img src="/assets/viva-negocio-inmobiliario-logo.jpg" alt="VIVA" width="92" height="92" /><span class="loader"></span><h1>Preparando la lectura comercial</h1><p>Cargando catálogos y escenario inicial desde la API.</p></main>`;
}

function renderFatalError(): string {
  const error = state.error;
  return `<main class="startup-state startup-state--error"><span class="error-mark">!</span><h1>No se pudo abrir el espacio comercial</h1><p>${escapeHtml(error?.message ?? "La API no respondió.")}</p><p class="technical">Código: ${escapeHtml(error?.code ?? "APP_ERROR")}${error?.requestId ? ` · Solicitud ${escapeHtml(error.requestId)}` : ""}</p><button class="button button--primary" type="button" data-action="retry">Reintentar</button></main>`;
}

function renderNavigation(): string {
  const primary = [
    { id: "journey/scale", label: "Recorrido", hint: "Tesis en seis pasos", kind: "journey" },
    { id: "dashboard", label: "Panorama", hint: "Zona y posición", kind: "module" },
    { id: "projects", label: "Proyectos", hint: "Oferta comparable", kind: "module" },
    { id: "assistant", label: "Decidir", hint: "Respuesta trazable", kind: "module" },
    { id: "activity", label: "Seguimiento", hint: "Cambios publicados", kind: "module" },
  ];
  const expert = [
    { id: "inspector", label: "Inspector" },
    { id: "market", label: "Benchmark" },
    { id: "compare", label: "Comparador" },
    { id: "trust", label: "Checklist" },
  ];
  return `<nav class="product-nav">
    <p class="nav-label">Trabajo comercial</p>
    ${primary.map((item, index) => navButton(item.id, item.label, item.hint, String(index + 1).padStart(2, "0"), item.kind)).join("")}
    <details class="expert-nav" ${state.route.kind === "module" && expert.some(({ id }) => id === state.route.id) ? "open" : ""}>
      <summary><span>Profundizar</span><small>4 herramientas</small></summary>
      ${expert.map((item) => navButton(item.id, item.label, "", "·", "module")).join("")}
    </details>
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
    inspector: renderInspector,
    market: renderBenchmark,
    compare: renderComparison,
    trust: renderChecklist,
    assistant: renderAssistant,
    activity: renderHistory,
  };
  return (views[state.route.id] ?? renderDashboard)();
}

function renderPageHeader(eyebrow: string, title: string, description: string, action = ""): string {
  return `<header class="page-header"><div><span class="eyebrow">${escapeHtml(eyebrow)}</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div>${action}</header>`;
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
  return `<section class="decision-strip"><span>Lectura principal</span><strong>${formatNumber(state.workspace!.marketReading.comparableProjectCount)} proyectos comparables sostienen el escenario de ${escapeHtml(districtName())}.</strong><p>La cobertura geográfica utilizable es ${formatPercent(state.workspace!.coverage.geographyCoveragePct)}. La mediana usa únicamente referencias permitidas por el contrato.</p></section>
    <section class="metric-row" aria-label="Escala observable">
      ${metric("Proyectos observados", state.meta!.coverage.projects, "Cobertura total del snapshot")}
      ${metric("Inmobiliarias seleccionadas", state.meta!.coverage.selectedAgencies, "Scope mínimo de la demo")}
      ${metric("Distritos", state.meta!.coverage.districts, "Ámbito geográfico publicado")}
    </section>`;
}

function renderQualityStage(): string {
  if (!state.inspector) return emptyState("El expediente de calidad no está disponible.", "Abrir Inspector", "#inspector");
  const dossier = state.inspector.dossier as JsonObject;
  return `<section class="decision-strip"><span>Decisión de calidad</span><strong>${escapeHtml(qualityLabel(dossier.decision?.qualityStatus ?? dossier.decision?.quality_status))}</strong><p>${escapeHtml(dossier.decision?.explanation ?? "La evidencia y sus conflictos determinan la elegibilidad del dato.")}</p></section>${renderFactLedger(dossier)}`;
}

function renderDepthStage(): string {
  return `<section class="decision-strip"><span>Diferenciación</span><strong>${escapeHtml(benchmarkHeadline())}</strong><p>Contrasta primero precio y área; después valida atributos anunciados y documentados.</p></section>${renderBenchmarkSummary()}`;
}

function renderMovementStage(): string {
  const total = state.history?.total ?? 0;
  return `<section class="decision-strip"><span>Movimiento observado</span><strong>${formatNumber(total)} señales históricas cumplen la política del escenario.</strong><p>No se infiere causalidad: cada cambio conserva fechas, valores y evidencia.</p></section>${renderHistoryTable(5)}`;
}

function renderDecisionStage(): string {
  return `<section class="decision-strip"><span>Recomendación comercial</span><strong>Prioriza una hipótesis respaldada y declara el límite de la muestra.</strong><p>La demo orienta la decisión; no predice demanda, cierre ni intención individual.</p></section>
    <div class="two-column"><section class="surface"><h2>Antes de compartir</h2>${checkRows().slice(0, 4).map(renderCheckRow).join("")}</section><section class="surface"><h2>Convertir lectura en acción</h2><p>El asistente responde preguntas cerradas con las referencias utilizadas.</p><a class="button button--primary" href="#assistant">Abrir Decidir</a></section></div>`;
}

function renderDashboard(): string {
  return `${renderPageHeader("Panorama", `${districtName()} bajo lectura comercial`, "La lectura prioriza mercado, precio y ubicación; el detalle queda bajo demanda.")}
    <section class="decision-strip"><span>Lectura principal</span><strong>${formatNumber(state.workspace!.marketReading.comparableProjectCount)} comparables · ${money(state.workspace!.marketReading.medianPricePerM2)} por m² de mediana</strong><p>${pricePositionText()}</p></section>
    <section class="metric-row">${metric("Comparables", state.workspace!.marketReading.comparableProjectCount, "Mismo universo del escenario")}${metric("Precios utilizables", state.workspace!.marketReading.priceReferenceCount, "Con reglas de elegibilidad")}${metric("Cobertura geográfica", formatPercent(state.workspace!.coverage.geographyCoveragePct), "Proyectos con geografía válida")}</section>
    ${renderMapSection(false)}`;
}

function renderMapSection(journey: boolean): string {
  const projects = state.projects?.items ?? [];
  const title = state.mapView === "geographic" ? "Mapa del distrito" : "Posicionamiento por área y precio";
  const description = state.mapView === "geographic"
    ? "Ubica la oferta sobre el contorno distrital disponible."
    : "Contrasta área total y precio publicado sin tratarlos como precio de cierre.";
  return `<section class="surface map-surface"><header class="section-heading"><div><span class="eyebrow">Territorio observado</span><h2>${title}</h2><p>${description}</p></div><span class="status-pill">${formatNumber(projects.length)} visibles</span></header>
    <div class="map-switch" role="group" aria-label="Vista del mapa">
      <button type="button" data-action="map-geographic" aria-pressed="${state.mapView === "geographic"}">Mapa del distrito</button>
      <button type="button" data-action="map-positioning" aria-pressed="${state.mapView === "positioning"}">Área y precio publicado</button>
    </div>
    ${state.mapView === "geographic" ? renderGeographicMap(projects) : renderPositioningMap(projects)}
    ${journey ? '<p class="method-note">La vista territorial no muestra cuadrantes comerciales hasta contar con una fuente autorizada. El precio mostrado es publicado, no de cierre.</p>' : ""}</section>`;
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
  return `<div class="map-frame"><svg class="map-chart map-chart--geographic" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="map-title map-description"><title id="map-title">Proyectos de ${escapeHtml(districtName())}</title><desc id="map-description">Contorno distrital referencial y ${valid.length} proyectos con coordenadas válidas.</desc>
    <path class="district-boundary" d="${escapeAttr(geometryPath(geometry, x, y))}" fill-rule="evenodd"></path>
    ${valid.map((project) => `<a href="#projects" aria-label="Abrir ${escapeAttr(project.name)} en el catálogo"><circle cx="${x(project.longitude!)}" cy="${y(project.latitude!)}" r="6"><title>${escapeHtml(project.name)} · ${escapeHtml(project.agency)} · ${money(project.pricePen)} publicado · ${formatNumber(project.areaM2)} m²</title></circle></a>`).join("")}
  </svg></div><p class="map-provenance"><strong>Límite referencial:</strong> ${escapeHtml(state.geography!.provenance.source)}. La fuente vinculante de límites es ${escapeHtml(state.geography!.provenance.officialBoundaryRegistry)}. No se muestran zonas internas como oficiales.</p>`;
}

function renderPositioningMap(projects: ProjectSummary[]): string {
  const valid = projects.filter((project) => project.areaM2 != null && project.pricePen != null);
  if (!valid.length) return emptyState("No hay pares de área y precio publicado para este escenario.", "Ver proyectos", "#projects");
  const areas = valid.map(({ areaM2 }) => areaM2!);
  const prices = valid.map(({ pricePen }) => pricePen!);
  const minArea = Math.min(...areas); const maxArea = Math.max(...areas);
  const minPrice = Math.min(...prices); const maxPrice = Math.max(...prices);
  const width = 960; const height = 480; const left = 86; const right = 24; const top = 28; const bottom = 58;
  const x = (value: number) => left + ((value - minArea) / Math.max(maxArea - minArea, 1)) * (width - left - right);
  const y = (value: number) => top + ((maxPrice - value) / Math.max(maxPrice - minPrice, 1)) * (height - top - bottom);
  return `<div class="map-frame"><svg class="map-chart" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="position-title position-description"><title id="position-title">Área y precio publicado en ${escapeHtml(districtName())}</title><desc id="position-description">${valid.length} proyectos. Eje horizontal área total publicada; eje vertical precio publicado.</desc>
    <line x1="${left}" y1="${height - bottom}" x2="${width - right}" y2="${height - bottom}" />
    <line x1="${left}" y1="${top}" x2="${left}" y2="${height - bottom}" />
    <text x="${left}" y="${height - 20}">${formatNumber(minArea)} m²</text><text x="${width - right}" y="${height - 20}" text-anchor="end">${formatNumber(maxArea)} m² de área total</text>
    <text x="${left - 12}" y="${height - bottom}" text-anchor="end">${money(minPrice)}</text><text x="${left - 12}" y="${top + 4}" text-anchor="end">${money(maxPrice)}</text>
    ${valid.map((project) => `<a href="#projects" aria-label="Abrir ${escapeAttr(project.name)} en el catálogo"><circle cx="${x(project.areaM2!)}" cy="${y(project.pricePen!)}" r="6"><title>${escapeHtml(project.name)} · ${money(project.pricePen)} publicado · ${formatNumber(project.areaM2)} m²</title></circle></a>`).join("")}
  </svg></div><p class="map-provenance">Cada punto usa área total y precio publicados. No representa precio real de cierre ni una tasación.</p>`;
}

function renderProjects(): string {
  const page = state.projects;
  const items = page?.items ?? [];
  const title = state.projectScope === "all" ? "Todos los proyectos" : "Comparables del escenario";
  const description = state.projectScope === "all"
    ? "Explora el catálogo completo cargado; la ficha distingue fuentes y fecha de captura."
    : "Revisa la oferta compatible con los filtros del escenario activo.";
  return `${renderPageHeader("Proyectos", title, description, `<span class="status-pill">${formatNumber(page?.total)} resultados</span>`)}
    <section class="surface"><form class="filters project-filters" id="project-filter-form"><label>Vista<select name="project_scope"><option value="scenario" ${state.projectScope === "scenario" ? "selected" : ""}>Comparables del escenario</option><option value="all" ${state.projectScope === "all" ? "selected" : ""}>Todo el catálogo (${formatNumber(state.meta!.coverage.projects)})</option></select></label><label>Buscar<input name="query" type="search" value="${escapeAttr(state.projectQuery)}" placeholder="Proyecto, inmobiliaria o dirección" /></label><label>Orden<select name="sort"><option value="name" ${state.projectSort === "name" ? "selected" : ""}>Nombre</option><option value="price-asc" ${state.projectSort === "price-asc" ? "selected" : ""}>Menor precio publicado</option><option value="price-desc" ${state.projectSort === "price-desc" ? "selected" : ""}>Mayor precio publicado</option><option value="area-asc" ${state.projectSort === "area-asc" ? "selected" : ""}>Menor área</option><option value="area-desc" ${state.projectSort === "area-desc" ? "selected" : ""}>Mayor área</option></select></label><button class="button button--quiet" type="submit">Aplicar filtros</button></form>
      <p class="catalog-note">${state.projectScope === "all" ? "Catálogo completo. Cambia a comparables para aplicar distrito, tipología y dormitorios." : `Escenario: ${escapeHtml(districtName())} · ${escapeHtml(scopeLabel())}.`}</p>
      <div class="table-scroll"><table class="project-table"><thead><tr><th scope="col">Comparar</th><th scope="col">Proyecto</th><th scope="col">Producto</th><th scope="col">Precio publicado</th><th scope="col">Área</th><th scope="col">Entrega</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody>${items.map(renderProjectRow).join("")}</tbody></table></div>
      ${items.length ? renderPagination(page!) : emptyState("No hay proyectos para los filtros activos.", "Editar escenario", "#projects")}
    </section>
    ${state.projectDetail ? renderProjectDetail() : ""}`;
}

function renderProjectRow(project: ProjectSummary): string {
  const canonicalId = canonicalProjectId(project.id);
  const checked = state.selectedProjectIds.includes(canonicalId);
  return `<tr><td class="project-select-cell" data-label="Comparar"><input class="project-select-checkbox" type="checkbox" data-compare-id="${escapeAttr(canonicalId)}" ${checked ? "checked" : ""} aria-label="Comparar ${escapeAttr(project.name)}" /></td><td data-label="Proyecto"><strong>${escapeHtml(project.name)}</strong><small>${escapeHtml(project.agency)} · ${escapeHtml(project.district)}</small></td><td data-label="Producto">${escapeHtml(project.typology ?? "Sin tipología")}<small>${escapeHtml(project.bedrooms ?? "—")} dorm.</small></td><td data-label="Precio publicado"><strong>${money(project.pricePen)}</strong><small>${money(project.pricePerM2)} / m² orientativo</small></td><td data-label="Área">${project.areaM2 == null ? "—" : `${formatNumber(project.areaM2)} m²`}</td><td data-label="Entrega">${escapeHtml(project.phase ?? "Sin dato")}</td><td data-label="Ficha"><button class="link-button" type="button" data-project-detail="${escapeAttr(project.id)}">Abrir ficha</button></td></tr>`;
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
  return `<section class="surface detail-surface" aria-labelledby="project-detail-title"><header class="project-detail-header"><div><span class="eyebrow">Ficha comercial multifuente</span><h2 id="project-detail-title" tabindex="-1">${escapeHtml(project.name ?? project.canonicalName)}</h2><p>${escapeHtml(project.agency?.name ?? project.agency ?? "")} · ${escapeHtml(project.district ?? "")}</p></div><button class="icon-button" type="button" data-action="close-detail" aria-label="Cerrar ficha">${closeIcon()}</button></header>
    <section class="detail-block detail-block--first" aria-labelledby="project-summary-title"><h3 id="project-summary-title">${detailIcon("summary")}<span>Resumen comercial</span></h3><dl class="project-detail-summary"><div class="detail-stat detail-stat--primary"><dt>${detailIcon("price")}<span>Precio publicado desde</span></dt><dd>${money(project.pricePen)}</dd></div><div class="detail-stat"><dt>${detailIcon("area")}<span>Área total publicada</span></dt><dd>${project.areaM2 == null ? "—" : `${formatNumber(project.areaM2)} m²`}</dd></div><div class="detail-stat"><dt>${detailIcon("ratio")}<span>Cociente publicado</span></dt><dd>${money(project.pricePerM2)} / m²</dd></div><div class="detail-stat"><dt>${detailIcon("calendar")}<span>Estado o entrega</span></dt><dd>${escapeHtml(project.phase ?? project.deliveryDate ?? "Sin dato")}</dd></div></dl>
      <p class="source-warning"><strong>Importante:</strong> son precios publicados, no precios reales de cierre. Cada diferencia entre fuentes se conserva para revisión.</p>
    </section>
    <div class="project-detail-layout">
      <section class="detail-card" aria-labelledby="project-product-title"><h3 id="project-product-title">${detailIcon("building")}<span>Producto y ubicación</span></h3><dl class="detail-list"><div><dt>Tipo de inmueble</dt><dd>${escapeHtml(project.typology ?? "Sin dato")}</dd></div><div><dt>Dormitorios</dt><dd>${escapeHtml(project.bedrooms ?? "Sin dato")}</dd></div><div><dt>Unidades declaradas</dt><dd>${project.unitCount == null ? "—" : formatNumber(project.unitCount)}</dd></div><div><dt>Dirección publicada</dt><dd>${escapeHtml(project.address ?? "Sin dato")}</dd></div><div><dt>Última actualización observada</dt><dd>${formatDate(trace.lastSeenAt)}</dd></div></dl></section>
      ${project.description ? `<section class="detail-card detail-card--description" aria-labelledby="project-description-title"><h3 id="project-description-title">${detailIcon("document")}<span>Descripción publicada</span></h3><p>${escapeHtml(project.description)}</p></section>` : ""}
    </div>
    <section class="detail-block" aria-labelledby="project-features-title"><h3 id="project-features-title">${detailIcon("features")}<span>Información anunciada</span></h3><div class="detail-columns">
      <div><h4>${detailIcon("amenities")}<span>Áreas comunes</span></h4>${amenities.length ? `<ul class="tag-list">${amenities.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "<p>Sin datos observados.</p>"}</div>
      <div><h4>${detailIcon("bank")}<span>Financiamiento</span></h4>${banks.length ? `<ul class="tag-list">${banks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "<p>Sin datos observados.</p>"}</div>
    </div></section>
    <section class="detail-block" aria-labelledby="project-sources-title"><header class="section-heading"><div><h3 id="project-sources-title">${detailIcon("sources")}<span>Fuentes y actualizaciones</span></h3><p>${formatNumber(trace.sourceCount)} fuente(s) · ${formatNumber(trace.factIds?.length)} hechos trazables</p></div></header>
      <div class="source-list">${sources.map((source) => `<article><div><strong>${escapeHtml(source.name)}</strong><small>${formatDate(source.capturedAt)} · ${escapeHtml(source.evidenceStatus ?? "sin evidencia publicable")}</small></div><span class="status-pill">${source.legalStatus === "cleared_for_demo" ? "Autorizada" : "Revisión pendiente"}</span>${source.sourceUrl ? `<a href="${escapeAttr(source.sourceUrl)}" target="_blank" rel="noreferrer">Abrir fuente pública</a>` : ""}</article>`).join("") || "<p>No hay capturas vinculadas.</p>"}</div>
    </section>
  </section>`;
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
  };
  return `<span class="detail-symbol" aria-hidden="true"><svg viewBox="0 0 24 24">${paths[name] ?? paths.summary}</svg></span>`;
}

function renderInspector(): string {
  const dossier = state.inspector?.dossier as JsonObject | undefined;
  return `${renderPageHeader("Inspector", "Evidencia y elegibilidad", "Compara lo publicado, identifica conflictos y decide qué dato puede utilizarse.")}
    <section class="surface"><label class="standalone-field">Expediente<select id="inspector-case">${state.bootstrap!.inspectorCases.map((item) => `<option value="${escapeAttr(item.routeSlug)}" ${item.routeSlug === state.inspectorSlug ? "selected" : ""}>${escapeHtml(caseLabel(item.routeSlug))} · ${escapeHtml(qualityLabel(item.qualityStatus))}</option>`).join("")}</select></label></section>
    ${dossier ? renderDossier(dossier) : emptyState("Selecciona un expediente para revisar la evidencia.", "Reintentar", "#inspector")}`;
}

function renderDossier(dossier: JsonObject): string {
  const documents = (dossier.documents ?? []) as JsonObject[];
  return `<section class="decision-strip"><span>Resultado</span><strong>${escapeHtml(qualityLabel(dossier.decision?.qualityStatus ?? dossier.decision?.quality_status ?? dossier.selectedTypology?.quality_status))}</strong><p>${dossier.decision?.benchmarkEligible === false || dossier.decision?.benchmark_eligible === false ? "No usar este dato como referencia cuantitativa." : "El expediente conserva evidencia compatible con su uso declarado."}</p></section>
    ${renderFactLedger(dossier)}
    <section class="surface"><header class="section-heading"><div><h2>Evidencia autorizada</h2><p>Activos controlados; no sustituyen el documento fuente.</p></div></header><div class="evidence-grid">${documents.filter((document) => document.public_asset_path).map((document) => `<figure><img src="/${escapeAttr(document.public_asset_path)}" alt="${escapeAttr(document.title)}" loading="lazy" /><figcaption><strong>${escapeHtml(document.title)}</strong><small>${formatDate(document.captured_at)}</small></figcaption></figure>`).join("") || "<p>Este expediente no publica un activo visual.</p>"}</div></section>`;
}

function renderFactLedger(dossier: JsonObject): string {
  const facts = (dossier.facts ?? []) as JsonObject[];
  return `<section class="surface"><header class="section-heading"><div><h2>Hechos evaluados</h2><p>Valor, calidad y regla de uso en una sola fila.</p></div></header><div class="table-scroll"><table><thead><tr><th>Campo</th><th>Valor</th><th>Calidad</th><th>Benchmark</th></tr></thead><tbody>${facts.map((fact) => `<tr><td>${escapeHtml(fact.field_name)}</td><td>${escapeHtml(fact.original_value ?? fact.normalized_value ?? "—")}</td><td>${escapeHtml(qualityLabel(fact.quality_status))}</td><td>${fact.benchmark_eligible ? '<span class="positive">Utilizable</span>' : `<span class="caution">Excluido</span><small>${escapeHtml(fact.exclusion_reason ?? "Sin evidencia suficiente")}</small>`}</td></tr>`).join("") || '<tr><td colspan="4">No hay hechos disponibles.</td></tr>'}</tbody></table></div></section>`;
}

function renderBenchmark(): string {
  return `${renderPageHeader("Benchmark", "Referencias explicables", "Distingue métricas utilizables de orientaciones no comparables.")}${renderBenchmarkSummary()}`;
}

function renderBenchmarkSummary(): string {
  const benchmark = state.workspace!.benchmark;
  const quantitative = benchmark.quantitative ?? {};
  const orientative = quantitative.orientative ?? {};
  const attributes = (benchmark.qualitative?.attributes ?? []) as JsonObject[];
  return `<section class="metric-row">${metric("Muestra certificada", quantitative.n ?? 0, quantitative.status === "ready" ? "Benchmark cuantitativo" : "Muestra insuficiente")}${metric("Orientaciones", orientative.n ?? 0, "No comparables por pairing")}${metric("Mediana orientativa", money(orientative.median), "PEN por m² total")}</section>
    <section class="surface"><header class="section-heading"><div><h2>Atributos anunciados</h2><p>Frecuencia declarada; “documentado” exige evidencia autorizada.</p></div></header><div class="attribute-list">${attributes.sort((a, b) => Number(b.announcedCount) - Number(a.announcedCount)).slice(0, 12).map((attribute) => `<div><strong>${escapeHtml(attribute.label)}</strong><span>${formatNumber(attribute.announcedCount)} anunciados</span><span>${formatNumber(attribute.documentedCount)} documentados</span></div>`).join("")}</div><details class="methodology"><summary>Ver metodología</summary><p>Cuantiles ${escapeHtml(benchmark.methodology?.quantile_method ?? "R7")}; mínimo ${formatNumber(benchmark.methodology?.minimum_quantitative_sample)} proyectos; política ${escapeHtml(benchmark.methodology?.pairing_policy ?? "source_paired_only")}.</p></details></section>`;
}

function renderComparison(): string {
  const comparison = state.comparison?.comparison as JsonObject | undefined;
  return `${renderPageHeader("Comparador", "Diferencias que cambian la decisión", "Selecciona de dos a tres proyectos; se priorizan precio, área y producto.", `<a class="button button--quiet" href="#projects">Cambiar selección</a>`)}${comparison ? renderComparisonModel(comparison) : emptyState("Selecciona al menos dos proyectos comparables.", "Ir a proyectos", "#projects")}`;
}

function renderComparisonModel(comparison: JsonObject): string {
  const selected = (comparison.selected ?? []) as JsonObject[];
  const rows = ((comparison.groups ?? []) as JsonObject[]).flatMap((group) => (group.rows ?? []) as JsonObject[]);
  const priority = new Set((comparison.priorityRows ?? []) as string[]);
  const visible = rows.filter((row) => priority.has(row.id)).slice(0, 6);
  return `<section class="decision-strip"><span>Conclusión ejecutiva</span><strong>${escapeHtml(comparison.conclusion?.headline ?? comparison.conclusion?.title ?? "La comparación está lista.")}</strong><p>${escapeHtml(comparison.conclusion?.detail ?? comparison.conclusion?.summary ?? "Revisa las diferencias prioritarias antes de decidir.")}</p></section><section class="surface"><div class="table-scroll"><table class="comparison-table"><thead><tr><th>Criterio</th>${selected.map((project) => `<th>${escapeHtml(project.name)}<small>${escapeHtml(project.agencyName)}</small></th>`).join("")}</tr></thead><tbody>${visible.map((row) => `<tr><th>${escapeHtml(row.label)}</th>${((row.values ?? []) as JsonObject[]).map((value) => `<td class="${value.state === "excluded" ? "is-excluded" : ""}">${formatComparisonValue(value)}<small>${escapeHtml(value.state)}</small></td>`).join("")}</tr>`).join("")}</tbody></table></div><details class="methodology"><summary>Ver límites de la comparación</summary><ul>${((comparison.limitations ?? []) as unknown[]).map((item) => `<li>${escapeHtml(typeof item === "string" ? item : JSON.stringify(item))}</li>`).join("")}</ul></details></section>`;
}

function renderChecklist(): string {
  return `${renderPageHeader("Checklist", "Preparación comercial", "Confirma en minutos qué puede afirmarse y qué necesita validación.")}
    <section class="surface checklist">${checkRows().map(renderCheckRow).join("")}</section>`;
}

function checkRows(): Array<{ status: string; title: string; detail: string }> {
  const workspace = state.workspace!;
  return [
    { status: workspace.scenarioStatus === "valid" ? "ok" : "warn", title: "Escenario válido", detail: "Distrito, alcance y filtros fueron normalizados por la API." },
    { status: Number(workspace.coverage.geographyCoveragePct) >= 80 ? "ok" : "warn", title: "Cobertura geográfica", detail: `${formatPercent(workspace.coverage.geographyCoveragePct)} de los proyectos del alcance.` },
    { status: Number(workspace.marketReading.priceReferenceCount) >= 3 ? "ok" : "warn", title: "Precio de referencia", detail: `${formatNumber(workspace.marketReading.priceReferenceCount)} registros cumplen las reglas vigentes.` },
    { status: "warn", title: "Atributos cualitativos", detail: "Un atributo anunciado no equivale a un atributo documentado." },
    { status: "ok", title: "Privacidad", detail: "El snapshot público no contiene PII de contacto ni payloads fuente." },
    { status: "warn", title: "Límite de interpretación", detail: "No afirmar causalidad, demanda futura ni intención individual." },
  ];
}

function renderCheckRow(item: { status: string; title: string; detail: string }): string {
  return `<article class="check-row"><span class="check-icon ${item.status}">${item.status === "ok" ? "✓" : "!"}</span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.detail)}</p></div></article>`;
}

function renderAssistant(): string {
  const answer = state.assistant?.answer as JsonObject | undefined;
  return `${renderPageHeader("Decidir", "Asistente de estrategia", "Elige una pregunta compatible y recibe una respuesta determinista con referencias.")}
    <section class="assistant-layout"><div class="surface"><h2>Pregunta comercial</h2><div class="prompt-list">${state.bootstrap!.assistantIntents.map((intent) => `<button type="button" data-assistant-intent="${escapeAttr(intent.id)}" data-assistant-question="${escapeAttr(intent.question)}"><strong>${escapeHtml(intent.label)}</strong><span>${escapeHtml(intent.question)}</span></button>`).join("")}</div><form id="assistant-form" class="assistant-form"><label for="assistant-input">Pregunta</label><textarea id="assistant-input" name="input" rows="3" maxlength="1000" placeholder="Selecciona una pregunta o escríbela aquí."></textarea><input type="hidden" name="intentId" id="assistant-intent" /><button class="button button--primary" type="submit">Generar respuesta</button></form></div>${answer ? renderAnswer(answer) : '<section class="surface assistant-empty"><span>→</span><h2>Una respuesta breve, verificable y accionable</h2><p>Los datos usados y los límites aparecen junto a la lectura.</p></section>'}</section>`;
}

function renderAnswer(answer: JsonObject): string {
  const blocks = (answer.blocks ?? []) as JsonObject[];
  return `<section class="surface answer" aria-live="polite"><span class="status-pill">${escapeHtml(answer.status ?? "ready")}</span><h2>Respuesta</h2>${blocks.filter((block) => ["answer", "interpretation", "limitations", "next_step"].includes(block.type)).map((block) => `<section><h3>${escapeHtml(block.title)}</h3>${((block.items ?? []) as JsonObject[]).map((item) => `<p>${escapeHtml(item.text ?? item.label ?? item.detail ?? "")}</p>`).join("")}</section>`).join("")}<details class="methodology"><summary>Ver ${formatNumber(answer.references?.length)} referencias</summary><ul>${((answer.references ?? []) as JsonObject[]).map((reference) => `<li>${escapeHtml(reference.label ?? reference.id)}</li>`).join("")}</ul></details></section>`;
}

function renderHistory(): string {
  return `${renderPageHeader("Seguimiento", "Señales del mercado", "Cambios publicados ordenados por fecha, sin inferir causas.", `<span class="status-pill">${formatNumber(state.history?.total)} señales</span>`)}${renderHistoryTable(20)}`;
}

function renderHistoryTable(limit: number): string {
  const events = (state.history?.items ?? []).slice(0, limit);
  if (!events.length) return emptyState("No hay señales históricas para el escenario activo.", "Editar escenario", "#activity");
  return `<section class="surface"><div class="table-scroll"><table><thead><tr><th>Fecha</th><th>Proyecto</th><th>Cambio</th><th>Estado</th><th>Evidencia</th></tr></thead><tbody>${events.map((event) => `<tr><td>${formatDate(event.detected_at)}</td><td><strong>${escapeHtml(event.project_id)}</strong><small>${escapeHtml(event.district_id)}</small></td><td>${escapeHtml(event.field)}<small>${formatNumber(event.previous_value)} → ${formatNumber(event.current_value)} ${escapeHtml(event.unit ?? "")}</small></td><td>${escapeHtml(event.status)}<small>${escapeHtml(event.cause ?? "Causa no inferida")}</small></td><td>${formatNumber(event.evidence_ids?.length)} refs.</td></tr>`).join("")}</tbody></table></div></section>`;
}

function renderCorrections(): string {
  return `<aside class="correction-banner" role="status"><strong>Escenario corregido</strong><span>${state.workspace!.corrections.map(({ field }) => field).join(", ")}. Se aplicaron valores seguros.</span></aside>`;
}

function renderScenarioDialog(): string {
  const scenario = state.scenario!;
  const district = state.bootstrap!.districts.find(({ id }) => id === scenario.district_id);
  return `<dialog id="scenario-dialog" class="product-dialog">
    <form method="dialog" class="dialog-header"><div><span class="eyebrow">Escenario</span><h2>Editar alcance comercial</h2><p>Los cambios recalculan la lectura sin guardar información.</p></div><button class="icon-button" value="cancel" aria-label="Cerrar">${closeIcon()}</button></form>
    <form id="scenario-form" class="scenario-form">
      <label>Distrito<select name="district_id">${state.bootstrap!.districts.map((item) => `<option value="${escapeAttr(item.id)}" ${item.id === scenario.district_id ? "selected" : ""}>${escapeHtml(item.name)} · ${formatNumber(item.projectCount)}</option>`).join("")}</select></label>
      <label>Alcance<select name="scope_mode"><option value="district" ${scenario.scope_mode === "district" ? "selected" : ""}>Distrito completo</option><option value="quadrant" ${scenario.scope_mode === "quadrant" ? "selected" : ""} ${!district?.quadrants.length ? "disabled" : ""}>Cuadrante analítico</option><option value="radius" ${scenario.scope_mode === "radius" ? "selected" : ""}>Radio desde el centro distrital</option></select></label>
      <label data-scope-field="quadrant">Cuadrante<select name="quadrant_id" ${scenario.scope_mode !== "quadrant" ? "disabled" : ""}>${district?.quadrants.map((item) => `<option value="${item.id}" ${item.id === scenario.quadrant_id ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></label>
      <label data-scope-field="radius">Radio<select name="radius_meters" ${scenario.scope_mode !== "radius" ? "disabled" : ""}>${optionValues(state.bootstrap!.scenarioCatalogs.radius_meters, scenario.radius_meters ?? 1000)}</select></label>
      <label>Tipología<select name="typology">${optionValues(state.bootstrap!.scenarioCatalogs.typologies, scenario.typology)}</select></label>
      <label>Dormitorios<select name="bedrooms">${optionValues(state.bootstrap!.scenarioCatalogs.bedrooms, scenario.bedrooms)}</select></label>
      <label>Entrega<select name="delivery_year">${optionValues(state.bootstrap!.scenarioCatalogs.delivery_years, scenario.delivery_year)}</select></label>
      <label>Área objetivo (m²)<input name="target_area_m2" type="number" min="1" step="0.01" value="${scenario.target_area_m2 ?? ""}" /></label>
      <label>Precio objetivo (S/)<input name="target_price_pen" type="number" min="1" step="1" value="${scenario.target_price_pen ?? ""}" /></label>
      <div class="dialog-actions"><button class="button button--quiet" type="button" data-action="reset">Reiniciar</button><button class="button button--primary" type="submit">Aplicar escenario</button></div>
    </form>
  </dialog>`;
}

function renderCommandDialog(): string {
  const destinations = [
    ...JOURNEY_STAGES.map((item) => ({ hash: `#journey/${item.id}`, label: `${item.position}. ${item.label}`, hint: item.question })),
    { hash: "#dashboard", label: "Panorama", hint: "Zona y posición" },
    { hash: "#projects", label: "Proyectos", hint: "Oferta comparable" },
    { hash: "#inspector", label: "Inspector", hint: "Evidencia y calidad" },
    { hash: "#market", label: "Benchmark", hint: "Referencias" },
    { hash: "#compare", label: "Comparador", hint: "Diferencias" },
    { hash: "#trust", label: "Checklist", hint: "Preparación" },
    { hash: "#assistant", label: "Decidir", hint: "Respuesta trazable" },
    { hash: "#activity", label: "Seguimiento", hint: "Cambios" },
  ];
  return `<dialog id="command-dialog" class="command-dialog"><form method="dialog"><label for="command-input" class="sr-only">Buscar destino</label><input id="command-input" type="search" placeholder="Ir a una etapa o herramienta…" autocomplete="off" /><button class="icon-button" value="cancel" aria-label="Cerrar">${closeIcon()}</button></form><nav>${destinations.map((item) => `<a href="${item.hash}" data-command-option><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.hint)}</span></a>`).join("")}</nav></dialog>`;
}

async function handleClick(event: MouseEvent): Promise<void> {
  const target = event.target as HTMLElement;
  const action = target.closest<HTMLElement>("[data-action]")?.dataset.action;
  if (action === "retry") return void initialize();
  if (action === "open-nav") { state.navOpen = true; render(); return; }
  if (action === "close-nav") { state.navOpen = false; render(); return; }
  if (action === "scenario") return openDialog("scenario-dialog", "scenario-form");
  if (action === "command") return openDialog("command-dialog", "command-input");
  if (action === "map-geographic") { state.mapView = "geographic"; render(); return; }
  if (action === "map-positioning") { state.mapView = "positioning"; render(); return; }
  if (action === "reset" && state.bootstrap) {
    closeDialogs();
    state.scenario = structuredClone(state.bootstrap.initialScenario);
    state.route = { kind: "journey", id: "scale" };
    window.location.hash = routeHash(state.route);
    await refreshWorkspace();
    state.status = "ready";
    render();
    return;
  }
  if (action === "close-detail") { state.projectDetail = null; render(); return; }
  const page = target.closest<HTMLElement>("[data-project-page]")?.dataset.projectPage;
  if (page) {
    state.projectPage = Number(page);
    await loadProjectsFromForm();
    return;
  }
  const projectId = target.closest<HTMLElement>("[data-project-detail]")?.dataset.projectDetail;
  if (projectId) {
    state.busyMessage = "Cargando ficha…"; render();
    try {
      state.projectDetail = await provider.project(projectId); state.busyMessage = null; render();
      requestAnimationFrame(() => document.querySelector<HTMLElement>("#project-detail-title")?.focus());
    }
    catch (error) { fail(error); }
    return;
  }
  const assistantButton = target.closest<HTMLElement>("[data-assistant-intent]");
  if (assistantButton) {
    const input = document.querySelector<HTMLTextAreaElement>("#assistant-input");
    const intent = document.querySelector<HTMLInputElement>("#assistant-intent");
    if (input) input.value = assistantButton.dataset.assistantQuestion ?? "";
    if (intent) intent.value = assistantButton.dataset.assistantIntent ?? "";
    input?.focus();
  }
}

async function handleSubmit(event: SubmitEvent): Promise<void> {
  const form = event.target as HTMLFormElement;
  if (form.id === "scenario-form") {
    event.preventDefault();
    if (!state.scenario) return;
    const data = new FormData(form);
    const scopeMode = String(data.get("scope_mode")) as Scenario["scope_mode"];
    const district = state.bootstrap?.districts.find(({ id }) => id === String(data.get("district_id")));
    state.scenario = {
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
    closeDialogs();
    try { await refreshWorkspace(); state.status = "ready"; await loadRouteData(); }
    catch (error) { fail(error); }
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
    state.busyMessage = "Preparando respuesta trazable…"; render();
    try {
      state.assistant = await provider.assistant({
        scenario: state.scenario,
        input,
        intentId: String(data.get("intentId") || "") || null,
        projectIds: state.selectedProjectIds,
        inspectorRouteSlug: state.inspectorSlug,
      });
      state.busyMessage = null; render();
    } catch (error) { fail(error); }
  }
}

async function handleChange(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement | HTMLSelectElement;
  if (target.id === "inspector-case") {
    state.inspectorSlug = target.value;
    state.busyMessage = "Cargando expediente…"; render();
    try { state.inspector = await provider.inspector(target.value); state.busyMessage = null; render(); }
    catch (error) { fail(error); }
    return;
  }
  if (target.matches("[data-compare-id]")) {
    const id = target.dataset.compareId!;
    if ((target as HTMLInputElement).checked) {
      if (!state.selectedProjectIds.includes(id) && state.selectedProjectIds.length < 3) state.selectedProjectIds.push(id);
    } else state.selectedProjectIds = state.selectedProjectIds.filter((item) => item !== id);
    return;
  }
  if (target.name === "project_scope" && target.form?.id === "project-filter-form") {
    state.projectScope = target.value === "all" ? "all" : "scenario";
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
  state.projectScope = String(data.get("project_scope") ?? state.projectScope) === "all" ? "all" : "scenario";
  state.projectQuery = String(data.get("query") ?? state.projectQuery);
  state.projectSort = String(data.get("sort") ?? state.projectSort);
  state.busyMessage = "Actualizando proyectos…"; render();
  try {
    state.projects = await provider.projects(projectParameters(18));
    state.busyMessage = null; render();
  } catch (error) { fail(error); }
}

function projectParameters(pageSize: number): Record<string, string | number | undefined> {
  const scenario = state.scenario!;
  return {
    ...(state.projectScope === "scenario" ? {
      district: scenario.district_id,
      typology: scenario.typology,
      bedrooms: scenario.bedrooms,
    } : {}),
    page: state.projectPage,
    pageSize,
    query: state.projectQuery,
    sort: state.projectSort,
  };
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
  dialog.showModal();
  document.querySelector<HTMLElement>(`#${focusId}`)?.focus();
}

function closeDialogs(): void {
  document.querySelectorAll<HTMLDialogElement>("dialog[open]").forEach((dialog) => dialog.close());
}

function routeLoadingLabel(route: Route): string {
  if (["inspector", "quality"].includes(route.id)) return "Cargando evidencia…";
  if (["compare", "depth"].includes(route.id)) return "Calculando comparación…";
  if (["activity", "movement"].includes(route.id)) return "Cargando señales…";
  return "Actualizando vista…";
}

function districtName(): string {
  return state.bootstrap?.districts.find(({ id }) => id === state.scenario?.district_id)?.name ?? state.scenario?.district_id ?? "Distrito";
}

function scopeLabel(): string {
  if (state.scenario?.scope_mode === "quadrant") return `Cuadrante ${state.scenario.quadrant_id}`;
  if (state.scenario?.scope_mode === "radius") return `Radio ${formatNumber(state.scenario.radius_meters)} m`;
  return "Distrito completo";
}

function benchmarkHeadline(): string {
  const value = state.workspace!.benchmark.quantitative?.orientative?.median;
  return value == null ? "La muestra cuantitativa es insuficiente." : `La mediana orientativa es ${money(value)} por m² total.`;
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

function caseLabel(slug: string): string {
  return slug.replace(/^f3-/u, "").replaceAll("-", " ").replace(/^./u, (letter) => letter.toUpperCase());
}

function qualityLabel(value: unknown): string {
  const labels: Record<string, string> = {
    certified: "Certificado",
    reviewable: "Revisable",
    inconsistent: "Inconsistente",
    illegible: "Ilegible",
    insufficient: "Insuficiente",
  };
  return labels[String(value)] ?? String(value ?? "Sin evaluación");
}

function formatComparisonValue(value: JsonObject): string {
  const raw = value.normalizedValue;
  if (Array.isArray(raw)) return escapeHtml(raw.length ? `${raw.length} atributos` : "Sin dato");
  if (value.currency === "PEN") return money(raw);
  if (value.unit === "PEN/m2") return `${money(raw)} / m²`;
  if (value.unit === "m2") return `${formatNumber(raw)} m²`;
  return escapeHtml(raw ?? "—");
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
