const state = {
  data: null,
  view: "dashboard",
  mobileNavOpen: false,
  selectedDistrict: "",
  strategy: {
    district: "",
    typology: "Todos",
    bedrooms: "Todos",
    area: "",
    targetPrice: "",
    deliveryYear: "Todos",
  },
  projectFilters: {
    district: "",
    typology: "Todos",
    phase: "Todos",
    query: "",
    sort: "direct",
  },
  selectedProjectId: null,
  compareProjectIds: [],
  compareQuery: "",
  assistantInput: "",
  assistantResponse: null,
};

const views = [
  { id: "dashboard", label: "Radar comercial", hint: "Decisión del distrito", group: "Análisis" },
  { id: "projects", label: "Proyectos comparables", hint: "Competidores y detalle", group: "Análisis" },
  { id: "market", label: "Benchmark distrital", hint: "Oferta, precios y jugadores", group: "Análisis" },
  { id: "compare", label: "Comparador estratégico", hint: "Posicionamiento lado a lado", group: "Análisis" },
  { id: "trust", label: "Checklist comercial", hint: "Preparación de campaña", group: "Decisión" },
  { id: "assistant", label: "Asistente de estrategia", hint: "Lectura ejecutiva", group: "Decisión" },
  { id: "activity", label: "Señales del mercado", hint: "Cambios y alertas", group: "Decisión" },
];

const legacyRoutes = {
  sources: "market",
  matching: "compare",
  quality: "trust",
  pipeline: "activity",
};

const suggestedQuestions = [
  "¿Cómo posicionar un proyecto de 2 dormitorios en Miraflores?",
  "¿Qué proyectos compiten en Santiago De Surco?",
  "¿Qué distrito tiene mayor presión competitiva?",
  "¿Qué inmobiliarias dominan Jesus Maria?",
  "¿Qué proyectos podrían presionar mi campaña?",
  "¿Qué argumento comercial usar si mi precio está sobre el promedio?",
  "¿Dónde conviene enfocar una campaña de lanzamiento?",
  "¿Qué atributos debería destacar frente a competidores?",
];

const root = document.getElementById("root");
let restoreFocus = null;

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
        <main class="content" id="main-content" tabindex="-1">${content}</main>
      </div>
    </div>
  `;

  bindEvents();
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

function renderDashboard() {
  const districtProjects = getProjectsByDistrict(state.strategy.district);
  const districtBenchmark = buildBenchmark(districtProjects, state.strategy.district);
  const comparableProjects = getScenarioProjects(state.strategy);
  const scenarioBenchmark = buildBenchmark(comparableProjects, state.strategy.district);
  const benchmark = scenarioBenchmark.projects ? scenarioBenchmark : districtBenchmark;
  const targetPriceM2 = getTargetPriceM2(state.strategy);
  const pricePosition = classifyPricePosition(targetPriceM2, benchmark);
  const recommendation = buildCommercialRecommendation(state.strategy, benchmark, comparableProjects);
  const competitors = getCompetitors(state.strategy, 5);
  const signals = buildOpportunitySignals(benchmark, comparableProjects, pricePosition);

  return `
    <section class="dashboard-grid">
      <section class="hero-panel span-12">
        <div class="hero-copy">
          <span class="status-badge ${competitionClass(benchmark)}">${escapeHtml(competitionLevel(benchmark).level)} competencia</span>
          <h2>${escapeHtml(state.strategy.district)} bajo lectura comercial</h2>
          <p>${escapeHtml(districtInsight(benchmark, comparableProjects))}</p>
          <div class="recommendation-strip">
            <strong>Recomendación comercial</strong>
            <span>${escapeHtml(recommendation.action)}</span>
          </div>
        </div>
        <div class="hero-visual">
          ${rangeGauge(benchmark, targetPriceM2)}
          <div class="hero-note">
            <strong>${escapeHtml(pricePosition.label)}</strong>
            <span>${escapeHtml(pricePosition.summary)}</span>
          </div>
        </div>
      </section>

      <div class="kpi-row">
        ${kpiCard("Proyectos comparables", formatNumber(comparableProjects.length), "Oferta visible para el escenario")}
        ${kpiCard("Unidades publicadas", formatNumber(benchmark.units), "Oferta observada en la zona")}
        ${kpiCard("Promedio / m2", priceM2(benchmark.avgPriceM2), "Referencia comercial del distrito")}
        ${kpiCard("Mediana / m2", priceM2(benchmark.medianPriceM2), "Punto medio del mercado")}
        ${kpiCard("Inmobiliarias activas", formatNumber(benchmark.agencies), "Jugadores con presencia visible")}
        ${kpiCard("Rango competitivo", formatRange(benchmark.lowPriceM2, benchmark.highPriceM2), "Banda central de precios")}
      </div>

      <section class="planner-panel span-5">
        ${renderStrategyPlanner(benchmark, comparableProjects)}
      </section>

      <section class="panel span-7">
        <div class="panel-header">
          <div>
            <h2>Oportunidades y riesgos</h2>
            <p>Señales comerciales para preparar la decisión de campaña.</p>
          </div>
        </div>
        <div class="signal-cards">
          ${signals.map((signal) => signalCard(signal)).join("")}
        </div>
      </section>

      <section class="panel span-12">
        <div class="panel-header">
          <div>
            <h2>Competidores a revisar primero</h2>
            <p>Proyectos con mayor cercanía por distrito, precio, metraje o dormitorios.</p>
          </div>
          <button class="text-button" type="button" data-view="projects">Ver comparables</button>
        </div>
        <div class="competitor-grid dashboard-competitors">
          ${competitors.map((project) => competitorCard(project, "compact")).join("") || emptyState("Sin competidores", "Selecciona otro distrito para ampliar la lectura.")}
        </div>
      </section>

      <section class="panel positioning-panel span-12">
        <div class="panel-header positioning-header">
          <div>
            <span class="section-kicker">Lectura competitiva</span>
            <h2>Mapa de posicionamiento</h2>
            <p>Compara área, precio por m² y volumen publicado. Explora cada punto para identificar el proyecto y su posición.</p>
          </div>
          <span class="tag neutral">${formatNumber(comparableProjects.length)} comparables</span>
        </div>
        ${scatterPlot(comparableProjects.slice(0, 90), state.strategy)}
      </section>
    </section>
  `;
}

function renderStrategyPlanner(benchmark, comparableProjects) {
  const targetPriceM2 = getTargetPriceM2(state.strategy);
  const recommendation = buildCommercialRecommendation(state.strategy, benchmark, comparableProjects);
  const competitors = getCompetitors(state.strategy, 4);

  return `
    <div class="panel-header">
      <div>
        <h2>Planificador de estrategia comercial</h2>
        <p>Configura un escenario y contrasta el precio objetivo contra el distrito.</p>
      </div>
    </div>
    <div class="planner-form">
      <label class="field-control" for="strategy-district">
        <span>Distrito objetivo</span>
        <select id="strategy-district" data-strategy-field="district">${optionList(getDistricts(), state.strategy.district)}</select>
      </label>
      <label class="field-control" for="strategy-typology">
        <span>Tipo de inmueble</span>
        <select id="strategy-typology" data-strategy-field="typology">${optionList(["Todos", ...getTypologies()], state.strategy.typology)}</select>
      </label>
      <label class="field-control" for="strategy-bedrooms">
        <span>Dormitorios objetivo</span>
        <select id="strategy-bedrooms" data-strategy-field="bedrooms">${optionList(["Todos", ...getBedroomOptions()], state.strategy.bedrooms)}</select>
      </label>
      <label class="field-control" for="strategy-area">
        <span>Área estimada m2</span>
        <input id="strategy-area" data-strategy-field="area" type="number" min="1" step="1" inputmode="decimal" value="${escapeAttr(state.strategy.area)}" placeholder="Ej. 72" />
      </label>
      <label class="field-control" for="strategy-targetPrice">
        <span>Precio objetivo S/</span>
        <input id="strategy-targetPrice" data-strategy-field="targetPrice" type="number" min="1" step="1000" inputmode="decimal" value="${escapeAttr(state.strategy.targetPrice)}" placeholder="Ej. 520000" />
      </label>
      <label class="field-control" for="strategy-deliveryYear">
        <span>Entrega</span>
        <select id="strategy-deliveryYear" data-strategy-field="deliveryYear">${optionList(["Todos", ...getDeliveryYears()], state.strategy.deliveryYear)}</select>
      </label>
    </div>

    <div class="planner-results">
      ${miniMetric("Precio objetivo / m2", targetPriceM2 ? priceM2(targetPriceM2) : "Sin precio objetivo")}
      ${miniMetric("Promedio distrito / m2", priceM2(benchmark.avgPriceM2))}
      ${miniMetric("Mediana distrito / m2", priceM2(benchmark.medianPriceM2))}
      ${miniMetric("Rango competitivo", formatRange(benchmark.lowPriceM2, benchmark.highPriceM2))}
      ${miniMetric("Comparables", formatNumber(comparableProjects.length))}
      ${miniMetric("Inmobiliarias activas", formatNumber(benchmark.agencies))}
    </div>

    <div class="recommendation-card ${recommendation.tone}">
      <span>Diagnóstico</span>
      <strong>${escapeHtml(recommendation.diagnosis)}</strong>
      <span>Implicancia</span>
      <p>${escapeHtml(recommendation.implication)}</p>
      <span>Acción sugerida</span>
      <p>${escapeHtml(recommendation.action)}</p>
    </div>

    <div class="planner-competitors">
      <strong>Competidores principales</strong>
      <div class="chip-list">
        ${competitors.map((project) => chip(project.project_name)).join("") || chip("Información insuficiente para este cálculo")}
      </div>
    </div>
  `;
}

function renderProjects() {
  const projects = filterCatalogProjects();
  const selected = ensureSelectedProject(projects);

  return `
    <section class="catalog-layout">
      <section class="panel catalog-panel">
        <div class="panel-header">
          <div>
            <h2>Explorador de competidores</h2>
            <p>Revisa proyectos por distrito, precio, metraje, etapa y cercanía al escenario.</p>
          </div>
          <span class="tag neutral">${formatNumber(projects.length)} resultados</span>
        </div>
        <div class="local-controls">
          <label class="field-control" for="project-district">
            <span>Distrito</span>
            <select id="project-district" data-project-filter="district">${optionList(["Todos", ...getDistricts()], state.projectFilters.district || "Todos")}</select>
          </label>
          <label class="field-control" for="project-typology">
            <span>Tipo</span>
            <select id="project-typology" data-project-filter="typology">${optionList(["Todos", ...getTypologies()], state.projectFilters.typology)}</select>
          </label>
          <label class="field-control" for="project-phase">
            <span>Fase</span>
            <select id="project-phase" data-project-filter="phase">${optionList(["Todos", ...getPhases()], state.projectFilters.phase)}</select>
          </label>
          <label class="field-control" for="project-sort">
            <span>Ordenar por</span>
            <select id="project-sort" data-project-filter="sort">
              ${optionList([
                "direct",
                "price_m2",
                "price_total",
                "area",
                "bedrooms",
                "units",
                "delivery",
                "closest_price",
                "competition",
              ], state.projectFilters.sort, sortLabel)}
            </select>
          </label>
          <label class="field-control search-control" for="project-query">
            <span>Buscar</span>
            <input id="project-query" data-project-filter="query" type="search" value="${escapeAttr(state.projectFilters.query)}" placeholder="Proyecto, inmobiliaria o direccion" />
          </label>
        </div>
        <div class="project-card-list">
          ${projects.slice(0, 80).map((project) => projectListCard(project, selected?.id === project.id)).join("") || emptyState("Sin proyectos", "Ajusta filtros o cambia de distrito para revisar comparables.")}
        </div>
      </section>
      <aside class="detail-panel">
        ${selected ? renderProjectDetail(selected) : emptyState("Sin detalle", "Selecciona un proyecto comparable.")}
      </aside>
    </section>
  `;
}

function renderProjectDetail(project) {
  const benchmark = buildBenchmark(getProjectsByDistrict(project.district), project.district);
  const reading = competitiveReading(project, state.strategy, benchmark);
  const contact = firstAvailable([project.project_contact, project.project_phone, project.project_whatsapp, project.project_email]);
  const url = safeUrl(project.source_url);

  return `
    <div class="detail-header">
      <div class="detail-kicker">
        <span class="tag success">${escapeHtml(project.district || "Distrito no disponible")}</span>
        <span class="tag neutral">${escapeHtml(project.project_phase || "Fase no disponible")}</span>
      </div>
      <h2>${escapeHtml(project.project_name || "Proyecto sin nombre")}</h2>
      <p>${escapeHtml(project.agency_name || "Inmobiliaria no registrada")}</p>
    </div>
    <div class="detail-metrics">
      ${miniMetric("Precio", money(project.list_price_avg))}
      ${miniMetric("Precio / m2", priceM2(projectPriceM2(project)))}
      ${miniMetric("Área", areaLabel(projectArea(project)))}
      ${miniMetric("Dormitorios", bedroomsLabel(project))}
    </div>
    <div class="detail-section highlight-section">
      <h3>Lectura competitiva</h3>
      <p>${escapeHtml(reading)}</p>
    </div>
    <div class="detail-section">
      <h3>Resumen ejecutivo</h3>
      <p>${escapeHtml(shortText(project.project_description, 260) || "No disponible en la información visible.")}</p>
    </div>
    <div class="detail-section">
      <h3>Datos comerciales</h3>
      <dl>
        <div><dt>Distrito</dt><dd>${escapeHtml(project.district || "No disponible")}</dd></div>
        <div><dt>Inmobiliaria</dt><dd>${escapeHtml(project.agency_name || "No registrada")}</dd></div>
        <div><dt>Estado</dt><dd>${escapeHtml(project.project_phase || project.unit_status || "No registrado para este proyecto")}</dd></div>
        <div><dt>Entrega</dt><dd>${escapeHtml(deliveryLabel(project))}</dd></div>
        <div><dt>Unidades publicadas</dt><dd>${formatNumber(numberOrZero(project.unit_count))}</dd></div>
        <div><dt>Dirección</dt><dd>${escapeHtml(project.address || "No disponible en la información visible")}</dd></div>
        <div><dt>Contacto</dt><dd>${escapeHtml(contact || "No registrado para este proyecto")}</dd></div>
      </dl>
    </div>
    <div class="detail-section">
      <h3>Atributos y financiamiento</h3>
      <div class="chip-list">${toArray(project.amenities).slice(0, 12).map(chip).join("") || chip("No disponible en la información visible")}</div>
      <div class="chip-list muted-chips">${toArray(project.financing_banks).slice(0, 8).map(chip).join("") || chip("No registrado para este proyecto")}</div>
    </div>
    <div class="detail-section">
      <h3>Publicacion</h3>
      ${url ? `<a class="text-link" href="${escapeAttr(url)}" target="_blank" rel="noreferrer">Abrir fuente visible</a>` : `<p>No disponible en la información visible.</p>`}
    </div>
  `;
}

function renderMarket() {
  const districts = districtBenchmarks();
  const selectedBenchmark = buildBenchmark(getProjectsByDistrict(state.strategy.district), state.strategy.district);
  const representative = getProjectsByDistrict(state.strategy.district)
    .filter((project) => projectPriceM2(project))
    .sort((left, right) => projectPriceM2(right) - projectPriceM2(left))
    .slice(0, 5);
  const phases = countBy(getProjectsByDistrict(state.strategy.district), (project) => project.project_phase || "No registrado");

  return `
    <section class="dashboard-grid">
      <section class="benchmark-hero span-12">
        <div>
          <span class="status-badge ${competitionClass(selectedBenchmark)}">${escapeHtml(competitionLevel(selectedBenchmark).level)} presión competitiva</span>
          <h2>Benchmark de ${escapeHtml(state.strategy.district)}</h2>
          <p>${escapeHtml(districtExecutiveReading(selectedBenchmark))}</p>
        </div>
        <label class="field-control compact-control" for="market-district">
          <span>Distrito</span>
          <select id="market-district">${optionList(getDistricts(), state.strategy.district)}</select>
        </label>
      </section>

      <div class="kpi-row">
        ${kpiCard("Proyectos visibles", formatNumber(selectedBenchmark.projects), "Oferta observable del distrito")}
        ${kpiCard("Unidades publicadas", formatNumber(selectedBenchmark.units), "No representa stock final")}
        ${kpiCard("Promedio / m2", priceM2(selectedBenchmark.avgPriceM2), "Referencia de mercado")}
        ${kpiCard("Mediana / m2", priceM2(selectedBenchmark.medianPriceM2), "Punto medio de comparación")}
        ${kpiCard("Inmobiliarias", formatNumber(selectedBenchmark.agencies), "Presencia competitiva")}
        ${kpiCard("Rango competitivo", formatRange(selectedBenchmark.lowPriceM2, selectedBenchmark.highPriceM2), "Banda central observada")}
      </div>

      <section class="panel span-5">
        <div class="panel-header">
          <div>
            <h2>Ranking de distritos</h2>
            <p>Zonas con mayor oferta visible para benchmark comercial.</p>
          </div>
        </div>
        <div class="bar-list">
          ${districts.slice(0, 12).map((row) => barRow(row.district, row.projects, districts[0]?.projects ?? 1, `${formatNumber(row.projects)} proyectos`, priceM2(row.medianPriceM2), "data-district-chip")).join("")}
        </div>
      </section>

      <section class="panel span-7">
        <div class="panel-header">
          <div>
            <h2>Lectura profunda del distrito</h2>
            <p>Composición de oferta, inmobiliarias activas y proyectos representativos.</p>
          </div>
        </div>
        <div class="district-grid">
          <div class="phase-stack">
            <strong>Oferta por fase</strong>
            ${phases.map((row) => summaryBar(row.name, row.count, selectedBenchmark.projects)).join("")}
          </div>
          <div class="phase-stack">
            <strong>Inmobiliarias con mayor presencia</strong>
            ${selectedBenchmark.topAgencies.slice(0, 5).map((row) => summaryBar(row.name, row.count, selectedBenchmark.projects)).join("")}
          </div>
        </div>
        <div class="representative-row">
          ${representative.map((project) => competitorCard(project, "mini")).join("") || emptyState("Sin proyectos representativos", "No hay precio suficiente para esta lectura.")}
        </div>
      </section>

      <section class="panel span-12">
        <div class="panel-header">
          <div>
            <h2>Mapa conceptual de presión competitiva</h2>
            <p>Cada bloque resume oferta, precio medio y presencia por distrito.</p>
          </div>
        </div>
        <div class="heat-grid">
          ${districts.slice(0, 24).map((row) => districtTile(row, districts[0]?.projects ?? 1)).join("")}
        </div>
      </section>
    </section>
  `;
}

function renderCompare() {
  const candidates = compareCandidates();
  const selected = state.compareProjectIds.map((id) => findProjectById(id)).filter(Boolean);
  const conclusion = comparisonConclusion(selected);

  return `
    <section class="compare-layout">
      <section class="panel compare-picker">
        <div class="panel-header">
          <div>
            <h2>Selecciona 2 o 3 proyectos</h2>
            <p>Prioriza comparables directos para decidir posicionamiento comercial.</p>
          </div>
          <span class="tag neutral">${formatNumber(selected.length)} seleccionados</span>
        </div>
        <div class="local-controls single-row">
          <label class="field-control search-control" for="compare-query">
            <span>Buscar comparable</span>
            <input id="compare-query" type="search" value="${escapeAttr(state.compareQuery)}" placeholder="Proyecto o inmobiliaria" />
          </label>
        </div>
        <div class="compare-candidates">
          ${candidates.slice(0, 18).map((project) => compareCandidate(project, selected.some((item) => item.id === project.id))).join("") || emptyState("Sin candidatos", "Cambia el distrito objetivo para revisar otros proyectos.")}
        </div>
      </section>

      <section class="panel compare-board">
        <div class="panel-header">
          <div>
            <h2>Posicionamiento lado a lado</h2>
            <p>Compara precio, metraje, etapa, entrega y atributos visibles.</p>
          </div>
        </div>
        ${selected.length >= 2 ? `
          <div class="comparison-cards">
            ${selected.map(compareProjectCard).join("")}
          </div>
          <div class="comparison-bars">
            ${comparisonMetric("Precio / m2", selected, projectPriceM2, priceM2, false)}
            ${comparisonMetric("Precio total", selected, (project) => positiveNumber(project.list_price_avg), money, false)}
            ${comparisonMetric("Área", selected, projectArea, areaLabel, true)}
            ${comparisonMetric("Unidades publicadas", selected, (project) => numberOrZero(project.unit_count), formatNumber, true)}
          </div>
          <div class="executive-conclusion">
            <span>Conclusión ejecutiva</span>
            <strong>${escapeHtml(conclusion.title)}</strong>
            <p>${escapeHtml(conclusion.body)}</p>
          </div>
        ` : emptyState("Seleccion insuficiente", "Elige al menos 2 proyectos para generar una conclusion ejecutiva.")}
      </section>
    </section>
  `;
}

function renderChecklist() {
  const comparableProjects = getScenarioProjects(state.strategy);
  const benchmark = buildBenchmark(comparableProjects.length ? comparableProjects : getProjectsByDistrict(state.strategy.district), state.strategy.district);
  const targetPriceM2 = getTargetPriceM2(state.strategy);
  const pricePosition = classifyPricePosition(targetPriceM2, benchmark);
  const recommendation = buildCommercialRecommendation(state.strategy, benchmark, comparableProjects);
  const lowerCompetitors = targetPriceM2
    ? comparableProjects.filter((project) => {
        const ppm = projectPriceM2(project);
        return ppm && ppm < targetPriceM2 * 0.96;
      })
    : [];
  const risks = checklistRisks(benchmark, pricePosition, lowerCompetitors);
  const angles = messageAngles(benchmark, pricePosition, comparableProjects);

  return `
    <section class="dashboard-grid">
      <section class="checklist-hero span-12">
        <div>
          <span class="status-badge ${pricePosition.tone}">${escapeHtml(pricePosition.label)}</span>
          <h2>Checklist previo a campaña en ${escapeHtml(state.strategy.district)}</h2>
          <p>${escapeHtml(recommendation.implication)}</p>
        </div>
        <button class="primary-button" type="button" data-view="compare">Revisar comparador</button>
      </section>

      <section class="check-block span-6">
        <h2>Precio y posicionamiento</h2>
        ${checkItem("¿El precio esta por debajo, cerca o por encima del mercado?", pricePosition.summary, pricePosition.tone)}
        ${checkItem("¿El diferencial se puede justificar?", recommendation.implication, recommendation.tone)}
        ${checkItem("¿Hay competidores más agresivos?", lowerCompetitors.length ? `${formatNumber(lowerCompetitors.length)} proyectos muestran menor precio por m2.` : "No se detecta presión fuerte por menor precio en el escenario.", lowerCompetitors.length ? "warning" : "success")}
      </section>

      <section class="check-block span-6">
        <h2>Competencia directa</h2>
        ${checkItem("¿Cuantos proyectos similares existen?", `${formatNumber(comparableProjects.length)} proyectos comparables en el escenario.`, competitionClass(benchmark))}
        ${checkItem("¿Qué inmobiliarias tienen mayor presencia?", benchmark.topAgencies.slice(0, 3).map((row) => row.name).join(", ") || "Información insuficiente para este cálculo.", "neutral")}
        ${checkItem("¿Que proyectos conviene revisar antes de lanzar?", getCompetitors(state.strategy, 3).map((project) => project.project_name).join(", ") || "Revisar proyectos comparables del distrito.", "neutral")}
      </section>

      <section class="check-block span-4">
        <h2>Mensaje comercial sugerido</h2>
        <div class="chip-list prominent-chips">${angles.map(chip).join("")}</div>
      </section>

      <section class="check-block span-4">
        <h2>Riesgos antes de campaña</h2>
        <div class="risk-list">
          ${risks.map((risk) => signalCard(risk)).join("")}
        </div>
      </section>

      <section class="check-block span-4">
        <h2>Siguiente acción</h2>
        <div class="next-action-card">
          <strong>${escapeHtml(recommendation.action)}</strong>
          <p>Preparar argumento para fuerza de ventas y contrastarlo contra los competidores principales antes de activar la promoción.</p>
        </div>
      </section>
    </section>
  `;
}

function renderAssistant() {
  const response = state.assistantResponse ?? buildAssistantResponse(state.assistantInput);

  return `
    <section class="assistant-layout">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>Preguntas de estrategia</h2>
            <p>Consultas orientadas a precio, distrito, competencia y mensaje de campaña.</p>
          </div>
        </div>
        <div class="suggestion-list">
          ${suggestedQuestions.map((question) => `
            <button class="suggestion-button ${state.assistantInput === question ? "active" : ""}" type="button" data-suggest="${escapeAttr(question)}">${escapeHtml(question)}</button>
          `).join("")}
        </div>
        <form class="assistant-composer" id="assistant-form">
          <label class="field-control" for="assistant-input">
            <span>Pregunta comercial</span>
            <textarea id="assistant-input" placeholder="Ej. Qué estrategia usar si mi precio está sobre el promedio">${escapeHtml(state.assistantInput)}</textarea>
          </label>
          <button class="primary-button" type="submit">Generar lectura</button>
        </form>
      </section>

      <section class="answer-panel">
        <div class="answer-header">
          <span class="status-badge success">Respuesta ejecutiva</span>
          <h2>${escapeHtml(response.title)}</h2>
          <p>${escapeHtml(response.summary)}</p>
        </div>
        <div class="answer-metrics">
          ${response.metrics.map((metric) => miniMetric(metric.label, metric.value)).join("")}
        </div>
        <div class="detail-section">
          <h3>Lectura comercial</h3>
          <p>${escapeHtml(response.reading)}</p>
        </div>
        <div class="detail-section highlight-section">
          <h3>Acción recomendada</h3>
          <p>${escapeHtml(response.action)}</p>
        </div>
        <div class="detail-section">
          <h3>Referencias utiles</h3>
          <div class="chip-list">${response.references.map(chip).join("")}</div>
        </div>
        <div class="detail-section subtle-note">
          <p>${escapeHtml(response.caution)}</p>
        </div>
      </section>
    </section>
  `;
}

function renderActivity() {
  const benchmark = buildBenchmark(getProjectsByDistrict(state.strategy.district), state.strategy.district);
  const events = marketEvents();
  const weekly = weeklyRecommendations(benchmark);

  return `
    <section class="dashboard-grid">
      <section class="activity-hero span-12">
        <div>
          <span class="status-badge neutral">Última lectura: ${escapeHtml(formatDate(metadataDate()))}</span>
          <h2>Señales comerciales para la reunión semanal</h2>
          <p>Movimientos de precio, concentración de oferta y competidores que conviene observar.</p>
        </div>
      </section>

      <section class="panel span-8">
        <div class="panel-header">
          <div>
            <h2>Línea de tiempo comercial</h2>
            <p>Eventos redactados como señales de negocio para seguimiento ejecutivo.</p>
          </div>
        </div>
        <div class="timeline">
          ${events.map((event) => `
            <article class="timeline-step ${event.tone}">
              <div class="timeline-marker"></div>
              <div>
                <span>${escapeHtml(event.date)}</span>
                <h3>${escapeHtml(event.title)}</h3>
                <p>${escapeHtml(event.body)}</p>
                <div class="chip-list">${event.tags.map(chip).join("")}</div>
              </div>
            </article>
          `).join("")}
        </div>
      </section>

      <section class="panel span-4">
        <div class="panel-header">
          <div>
            <h2>Para gerencia</h2>
            <p>Puntos concretos para revisar antes de activar acciones.</p>
          </div>
        </div>
        <div class="weekly-list">
          ${weekly.map((item) => `
            <article class="weekly-card">
              <strong>${escapeHtml(item.title)}</strong>
              <p>${escapeHtml(item.body)}</p>
            </article>
          `).join("")}
        </div>
      </section>
    </section>
  `;
}

function bindEvents() {
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
      rememberFocus(event.target);
      render();
    });
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

function changeDistrict(district) {
  if (!district) return;
  state.selectedDistrict = district;
  state.strategy.district = district;
  if (state.projectFilters.district !== "Todos") state.projectFilters.district = district;
  seedSelectionsForDistrict();
  render();
}

function resetScenario() {
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
  seedSelectionsForDistrict();
  state.assistantInput = suggestedQuestions[0];
  state.assistantResponse = buildAssistantResponse(state.assistantInput);
}

function seedSelectionsForDistrict() {
  const competitors = getCompetitors(state.strategy, 6);
  state.selectedProjectId = competitors[0]?.id ?? getProjectsByDistrict(state.strategy.district)[0]?.id ?? getProjects()[0]?.id ?? null;
  state.compareProjectIds = competitors.slice(0, 3).map((project) => project.id);
}

function getProjects() {
  return toArray(state.data?.projects);
}

function getProjectsByDistrict(district) {
  return getProjects().filter((project) => project.district === district);
}

function getScenarioProjects(strategy) {
  return getProjectsByDistrict(strategy.district).filter((project) => {
    const typologyOk = strategy.typology === "Todos" || project.typology === strategy.typology;
    const bedroomsOk = strategy.bedrooms === "Todos" || projectHasBedroom(project, Number(strategy.bedrooms));
    const deliveryOk = strategy.deliveryYear === "Todos" || String(project.delivery_year || "") === String(strategy.deliveryYear);
    return typologyOk && bedroomsOk && deliveryOk;
  });
}

function filterCatalogProjects() {
  const query = normalizeSearch(state.projectFilters.query);
  const rows = getProjects().filter((project) => {
    const districtOk = !state.projectFilters.district || state.projectFilters.district === "Todos" || project.district === state.projectFilters.district;
    const typologyOk = state.projectFilters.typology === "Todos" || project.typology === state.projectFilters.typology;
    const phaseOk = state.projectFilters.phase === "Todos" || project.project_phase === state.projectFilters.phase;
    const queryOk = !query || [
      project.project_name,
      project.agency_name,
      project.district,
      project.address,
      project.project_phase,
    ].some((value) => normalizeSearch(value).includes(query));
    return districtOk && typologyOk && phaseOk && queryOk;
  });
  return sortProjects(rows, state.projectFilters.sort);
}

function compareCandidates() {
  const query = normalizeSearch(state.compareQuery);
  return getCompetitors(state.strategy, 60).filter((project) => {
    if (!query) return true;
    return [project.project_name, project.agency_name, project.district].some((value) => normalizeSearch(value).includes(query));
  });
}

function sortProjects(projects, sortKey) {
  const rows = [...projects];
  const targetPriceM2 = getTargetPriceM2(state.strategy);
  const targetArea = positiveNumber(state.strategy.area);
  const sorters = {
    direct: (left, right) => comparableScore(right, state.strategy) - comparableScore(left, state.strategy),
    price_m2: (left, right) => sortNumeric(projectPriceM2(left), projectPriceM2(right), "asc"),
    price_total: (left, right) => sortNumeric(positiveNumber(left.list_price_avg), positiveNumber(right.list_price_avg), "asc"),
    area: (left, right) => sortNumeric(projectArea(right), projectArea(left), "desc"),
    bedrooms: (left, right) => sortNumeric(numberOrZero(right.bedrooms_max), numberOrZero(left.bedrooms_max), "desc"),
    units: (left, right) => sortNumeric(numberOrZero(right.unit_count), numberOrZero(left.unit_count), "desc"),
    delivery: (left, right) => sortNumeric(positiveNumber(left.delivery_year), positiveNumber(right.delivery_year), "asc"),
    closest_price: (left, right) => {
      if (!targetPriceM2) return comparableScore(right, state.strategy) - comparableScore(left, state.strategy);
      return Math.abs((projectPriceM2(left) ?? 0) - targetPriceM2) - Math.abs((projectPriceM2(right) ?? 0) - targetPriceM2);
    },
    competition: (left, right) => {
      const leftArea = targetArea && projectArea(left) ? Math.abs(projectArea(left) - targetArea) : 0;
      const rightArea = targetArea && projectArea(right) ? Math.abs(projectArea(right) - targetArea) : 0;
      return comparableScore(right, state.strategy) - comparableScore(left, state.strategy) || leftArea - rightArea;
    },
  };
  return rows.sort(sorters[sortKey] ?? sorters.direct);
}

function buildBenchmark(projects, district) {
  const rows = toArray(projects);
  const priceValues = rows.map(projectPriceM2).filter(isPositive);
  const priceTotals = rows.map((project) => positiveNumber(project.list_price_avg)).filter(isPositive);
  const agencies = unique(rows.map((project) => project.agency_name)).length;
  return {
    district,
    projects: rows.length,
    units: sum(rows, (project) => numberOrZero(project.unit_count)),
    avgPriceM2: average(priceValues),
    medianPriceM2: median(priceValues),
    lowPriceM2: percentile(priceValues, 25),
    highPriceM2: percentile(priceValues, 75),
    avgPrice: average(priceTotals),
    medianPrice: median(priceTotals),
    agencies,
    topAgencies: countBy(rows, (project) => project.agency_name || "No registrado").slice(0, 8),
    phases: countBy(rows, (project) => project.project_phase || "No registrado"),
    typologies: countBy(rows, (project) => project.typology || "No registrado"),
  };
}

function districtBenchmarks() {
  return getDistricts().map((district) => buildBenchmark(getProjectsByDistrict(district), district))
    .sort((left, right) => right.projects - left.projects || right.units - left.units || left.district.localeCompare(right.district));
}

function getCompetitors(strategy, limit = 6) {
  const rows = getScenarioProjects(strategy);
  const fallback = rows.length ? rows : getProjectsByDistrict(strategy.district);
  return sortProjects(fallback, "direct").slice(0, limit);
}

function comparableScore(project, strategy) {
  let score = 0;
  if (project.district === strategy.district) score += 30;
  if (strategy.typology !== "Todos" && project.typology === strategy.typology) score += 15;
  if (strategy.bedrooms !== "Todos" && projectHasBedroom(project, Number(strategy.bedrooms))) score += 15;
  if (strategy.deliveryYear !== "Todos" && String(project.delivery_year || "") === String(strategy.deliveryYear)) score += 8;
  const targetPriceM2 = getTargetPriceM2(strategy);
  const ppm = projectPriceM2(project);
  if (targetPriceM2 && ppm) {
    const diff = Math.abs(ppm - targetPriceM2) / targetPriceM2;
    score += Math.max(0, 26 - diff * 90);
  }
  const targetArea = positiveNumber(strategy.area);
  const area = projectArea(project);
  if (targetArea && area) {
    const diff = Math.abs(area - targetArea) / targetArea;
    score += Math.max(0, 16 - diff * 40);
  }
  score += Math.min(8, numberOrZero(project.unit_count) / 10);
  return score;
}

function classifyPricePosition(targetPriceM2, benchmark) {
  if (!targetPriceM2 || !benchmark.medianPriceM2) {
    return {
      label: "Benchmark general",
      summary: "Sin precio objetivo; la lectura se concentra en oferta, presión competitiva y rango del distrito.",
      tone: "neutral",
    };
  }
  const median = benchmark.medianPriceM2;
  const low = benchmark.lowPriceM2 || median * 0.92;
  const high = benchmark.highPriceM2 || median * 1.08;
  const distance = (targetPriceM2 - median) / median;
  if (targetPriceM2 < low || distance < -0.08) {
    return {
      label: "Entrada competitiva",
      summary: `El precio objetivo está ${formatPercent(Math.abs(distance))} por debajo de la mediana del distrito.`,
      tone: "success",
    };
  }
  if (targetPriceM2 <= high || Math.abs(distance) <= 0.08) {
    return {
      label: "Alineado al mercado",
      summary: "El precio objetivo se ubica cerca de la banda central del distrito.",
      tone: "neutral",
    };
  }
  return {
    label: "Posicionamiento premium",
    summary: `El precio objetivo está ${formatPercent(distance)} por encima de la mediana del distrito.`,
    tone: "warning",
  };
}

function buildCommercialRecommendation(strategy, benchmark, comparableProjects) {
  const targetPriceM2 = getTargetPriceM2(strategy);
  const position = classifyPricePosition(targetPriceM2, benchmark);
  const competition = competitionLevel(benchmark);
  const pressure = comparableProjects.length >= 24 || competition.level === "Alta";

  if (!targetPriceM2) {
    return {
      tone: competition.tone,
      diagnosis: `${strategy.district} muestra ${competition.level.toLowerCase()} presión competitiva.`,
      implication: "Conviene definir precio objetivo y comparar contra la mediana antes de cerrar el mensaje comercial.",
      action: pressure
        ? "Priorizar diferenciación por ubicación, entrega y atributos visibles."
        : "Explorar una campaña de entrada con educación del distrito y captura temprana de leads.",
    };
  }

  if (position.label === "Entrada competitiva") {
    return {
      tone: "success",
      diagnosis: "Tu proyecto estaría por debajo de la mediana del distrito.",
      implication: "El precio puede funcionar como gancho comercial sin depender solo de descuentos.",
      action: pressure
        ? "Comunicar oportunidad, ahorro relativo y urgencia frente a competidores directos."
        : "Posicionar como alternativa de valor y capturar leads tempranos.",
    };
  }

  if (position.label === "Alineado al mercado") {
    return {
      tone: pressure ? "warning" : "neutral",
      diagnosis: "Tu proyecto estaría alineado al rango central del mercado.",
      implication: "La decisión no se ganará solo por precio; el valor percibido debe ser claro.",
      action: pressure
        ? "Diferenciar por ubicación, entrega, financiamiento y áreas comunes."
        : "Reforzar atributos del distrito y beneficios concretos para sostener conversión.",
    };
  }

  return {
    tone: "warning",
    diagnosis: "Tu proyecto estaría por encima del promedio del distrito.",
    implication: "El precio necesita una justificación clara para evitar comparación directa por costo.",
    action: "Reforzar ubicación, acabados, exclusividad, financiamiento y beneficios diferenciales en la campaña.",
  };
}

function buildAssistantResponse(questionText) {
  const text = normalizeSearch(questionText);
  const district = extractDistrictFromText(text) || state.strategy.district || defaultDistrict();
  const districtProjects = getProjectsByDistrict(district);
  const benchmark = buildBenchmark(districtProjects, district);
  const competitors = getCompetitors({ ...state.strategy, district }, 5);
  const position = classifyPricePosition(getTargetPriceM2(state.strategy), benchmark);
  const recommendation = buildCommercialRecommendation({ ...state.strategy, district }, benchmark, competitors);

  if (text.includes("inmobiliaria") || text.includes("dominan")) {
    const leaders = benchmark.topAgencies.slice(0, 4);
    return {
      title: `Inmobiliarias activas en ${district}`,
      summary: `${district} registra ${formatNumber(benchmark.agencies)} inmobiliarias con presencia visible.`,
      metrics: [
        { label: "Proyectos", value: formatNumber(benchmark.projects) },
        { label: "Inmobiliarias", value: formatNumber(benchmark.agencies) },
      ],
      reading: leaders.length
        ? `La presencia se concentra en ${leaders.map((row) => row.name).join(", ")}.`
        : "La información visible no permite identificar líderes claros.",
      action: "Revisar los proyectos de las tres inmobiliarias con mayor presencia antes de definir mensaje y promoción.",
      references: leaders.map((row) => `${row.name}: ${formatNumber(row.count)} proyectos`),
      caution: "Información referencial para análisis comercial. Validar cifras antes de uso contractual.",
    };
  }

  if (text.includes("presion") || text.includes("mayor")) {
    const top = districtBenchmarks().slice(0, 5);
    return {
      title: "Distritos con mayor presión competitiva",
      summary: "La presión se estima por cantidad de proyectos, unidades publicadas e inmobiliarias activas.",
      metrics: [
        { label: "Distrito líder", value: top[0]?.district || "No disponible" },
        { label: "Proyectos", value: formatNumber(top[0]?.projects) },
      ],
      reading: `${top[0]?.district || district} concentra una de las ofertas visibles más altas del mercado observado.`,
      action: "Usar benchmark de precio por m2 y comparador estratégico antes de activar una campaña en los distritos más saturados.",
      references: top.map((row) => `${row.district}: ${formatNumber(row.projects)} proyectos`),
      caution: "Las unidades publicadas son oferta visible, no stock definitivo.",
    };
  }

  if (text.includes("sobre") || text.includes("premium") || text.includes("argumento")) {
    return {
      title: "Argumento para precio sobre el promedio",
      summary: position.label === "Posicionamiento premium" ? position.summary : "El argumento comercial debe sostener valor aunque el precio esté cerca del mercado.",
      metrics: [
        { label: "Mediana / m2", value: priceM2(benchmark.medianPriceM2) },
        { label: "Rango competitivo", value: formatRange(benchmark.lowPriceM2, benchmark.highPriceM2) },
      ],
      reading: "Cuando el precio supera la referencia del distrito, la campaña debe reducir la comparación directa por costo.",
      action: "Justificar valor con ubicación, entrega, áreas comunes, acabados, financiamiento y menor riesgo percibido.",
      references: messageAngles(benchmark, position, competitors).slice(0, 5),
      caution: "Validar el precio objetivo con comparables cercanos antes de comunicar una ventaja premium.",
    };
  }

  if (text.includes("atributo") || text.includes("destacar") || text.includes("campana")) {
    const angles = messageAngles(benchmark, position, competitors);
    return {
      title: `Atributos a destacar en ${district}`,
      summary: "La selección de atributos depende de presión competitiva, precio objetivo y oferta dominante.",
      metrics: [
        { label: "Comparables", value: formatNumber(competitors.length) },
        { label: "Competencia", value: competitionLevel(benchmark).level },
      ],
      reading: recommendation.implication,
      action: recommendation.action,
      references: angles,
      caution: "Elegir pocos mensajes fuertes suele ser más claro que listar todos los atributos disponibles.",
    };
  }

  if (text.includes("proyecto") || text.includes("compiten") || text.includes("presionar")) {
    return {
      title: `Competidores directos en ${district}`,
      summary: `${district} tiene ${formatNumber(benchmark.projects)} proyectos visibles para comparar posicionamiento.`,
      metrics: [
        { label: "Mediana / m2", value: priceM2(benchmark.medianPriceM2) },
        { label: "Inmobiliarias", value: formatNumber(benchmark.agencies) },
      ],
      reading: competitors.length
        ? `Los proyectos que conviene revisar primero son ${competitors.slice(0, 3).map((project) => project.project_name).join(", ")}.`
        : "No hay suficientes proyectos visibles para una lectura profunda.",
      action: "Comparar precio por m2, área, entrega y atributos antes de definir promoción.",
      references: competitors.slice(0, 5).map((project) => `${project.project_name} - ${priceM2(projectPriceM2(project))}`),
      caution: "Los precios publicados pueden incluir descuentos o condiciones de campaña.",
    };
  }

  return {
    title: `Lectura comercial de ${district}`,
    summary: districtInsight(benchmark, competitors),
    metrics: [
      { label: "Proyectos", value: formatNumber(benchmark.projects) },
      { label: "Unidades publicadas", value: formatNumber(benchmark.units) },
      { label: "Mediana / m2", value: priceM2(benchmark.medianPriceM2) },
    ],
    reading: recommendation.implication,
    action: recommendation.action,
    references: messageAngles(benchmark, position, competitors).slice(0, 5),
    caution: "Información referencial para análisis comercial. Validar cifras antes de uso contractual.",
  };
}

function buildOpportunitySignals(benchmark, comparableProjects, pricePosition) {
  const topAgency = benchmark.topAgencies[0];
  const topShare = topAgency && benchmark.projects ? topAgency.count / benchmark.projects : 0;
  const immediate = benchmark.phases.find((row) => normalizeSearch(row.name).includes("entrega"))?.count ?? 0;
  const signals = [
    {
      tone: competitionClass(benchmark),
      title: `${competitionLevel(benchmark).level} presión competitiva`,
      body: `${formatNumber(benchmark.projects)} proyectos y ${formatNumber(benchmark.agencies)} inmobiliarias activas en la lectura.`,
    },
    {
      tone: pricePosition.tone,
      title: pricePosition.label,
      body: pricePosition.summary,
    },
    {
      tone: topShare >= 0.22 ? "warning" : "neutral",
      title: topAgency ? `${topAgency.name} concentra presencia` : "Presencia distribuida",
      body: topAgency ? `${formatPercent(topShare)} de proyectos visibles pertenecen a este jugador.` : "No se detecta un jugador dominante.",
    },
    {
      tone: immediate >= 10 ? "warning" : "success",
      title: immediate >= 10 ? "Oferta con entrega inmediata" : "Menor presión por entrega inmediata",
      body: immediate >= 10 ? `${formatNumber(immediate)} proyectos pueden competir con urgencia de entrega.` : "La comunicación puede enfocarse en propuesta de valor y captura temprana.",
    },
  ];
  if (!comparableProjects.length) {
    signals.unshift({
      tone: "warning",
      title: "Información insuficiente para este cálculo",
      body: "Revisa proyectos comparables del distrito o amplia los filtros del escenario.",
    });
  }
  return signals.slice(0, 4);
}

function checklistRisks(benchmark, pricePosition, lowerCompetitors) {
  return [
    {
      tone: competitionClass(benchmark),
      title: "Concentración competitiva",
      body: competitionLevel(benchmark).level === "Alta" ? "Hay alta presencia de proyectos similares." : "La presión observable es manejable.",
    },
    {
      tone: pricePosition.tone === "warning" ? "warning" : "neutral",
      title: "Sensibilidad de precio",
      body: pricePosition.tone === "warning" ? "El precio superior exige un argumento de valor fuerte." : "El precio no aparece como riesgo principal del escenario.",
    },
    {
      tone: lowerCompetitors.length ? "warning" : "success",
      title: "Competidores agresivos",
      body: lowerCompetitors.length ? "Existen comparables con menor precio por m2." : "No se detecta presión fuerte por menor precio.",
    },
  ];
}

function messageAngles(benchmark, pricePosition, comparableProjects) {
  const angles = [];
  if (pricePosition.label === "Entrada competitiva") angles.push("Ahorro relativo", "Valor por m2", "Oportunidad de entrada");
  if (pricePosition.label === "Posicionamiento premium") angles.push("Ubicación", "Acabados", "Exclusividad", "Menor riesgo de entrega");
  if (pricePosition.label === "Alineado al mercado" || pricePosition.label === "Benchmark general") angles.push("Ubicación", "Entrega", "Financiamiento", "Áreas comunes");
  if (competitionLevel(benchmark).level === "Alta") angles.push("Diferenciación clara", "Urgencia comercial");
  if (comparableProjects.length < 8) angles.push("Menor saturación competitiva");
  return unique(angles).slice(0, 8);
}

function marketEvents() {
  const priceChanges = getProjects()
    .filter((project) => Number.isFinite(Number(project.price_delta_pct)) && Number(project.price_delta_pct) !== 0)
    .sort((left, right) => Math.abs(Number(right.price_delta_pct)) - Math.abs(Number(left.price_delta_pct)))
    .slice(0, 5)
    .map((project) => ({
      date: formatDate(project.update_date || project.captured_at),
      title: "Proyecto con variación relevante de precio",
      body: `${project.project_name} en ${project.district} muestra una variación publicada de ${formatNumber(project.price_delta_pct, 1)}%.`,
      tone: Number(project.price_delta_pct) > 0 ? "warning" : "success",
      tags: [project.district, project.agency_name, priceM2(projectPriceM2(project))],
    }));

  const topDistricts = districtBenchmarks().slice(0, 3).map((row) => ({
    date: formatDate(metadataDate()),
    title: "Distrito con alta concentración de oferta",
    body: `${row.district} registra ${formatNumber(row.projects)} proyectos y ${formatNumber(row.agencies)} inmobiliarias activas.`,
    tone: row.district === state.strategy.district ? "warning" : "neutral",
    tags: [formatNumber(row.units) + " unidades publicadas", priceM2(row.medianPriceM2)],
  }));

  return [...priceChanges, ...topDistricts].slice(0, 8);
}

function weeklyRecommendations(benchmark) {
  const competitors = getCompetitors(state.strategy, 3);
  return [
    {
      title: "Revisar competidores principales",
      body: competitors.length ? `Priorizar ${competitors.map((project) => project.project_name).join(", ")}.` : "Seleccionar un distrito con oferta visible.",
    },
    {
      title: "Validar precio objetivo",
      body: `Contrastar contra mediana ${priceM2(benchmark.medianPriceM2)} y rango ${formatRange(benchmark.lowPriceM2, benchmark.highPriceM2)}.`,
    },
    {
      title: "Ajustar mensaje de campaña",
      body: "Definir si la promoción competirá por valor, atributos, entrega o oportunidad de entrada.",
    },
    {
      title: "Preparar argumento de ventas",
      body: "Convertir riesgos de precio y competencia en respuestas simples para el equipo comercial.",
    },
  ];
}

function districtInsight(benchmark, comparableProjects) {
  if (!benchmark.projects) return "Información insuficiente para este distrito. Revisa proyectos comparables del mercado visible.";
  const competition = competitionLevel(benchmark).level.toLowerCase();
  const price = benchmark.medianPriceM2 ? `mediana de ${priceM2(benchmark.medianPriceM2)}` : "precio por m2 aún no concluyente";
  return `${benchmark.district} muestra ${competition} competencia, ${formatNumber(benchmark.projects)} proyectos visibles y una ${price}.`;
}

function districtExecutiveReading(benchmark) {
  const level = competitionLevel(benchmark);
  if (!benchmark.projects) return "No hay oferta suficiente para una lectura comercial del distrito.";
  if (level.level === "Alta") {
    return "El distrito exige una propuesta clara de diferenciación: precio, entrega, ubicación o atributos visibles deben sostener la campaña.";
  }
  if (level.level === "Media") {
    return "El distrito permite competir con un mensaje bien segmentado y comparación directa contra proyectos representativos.";
  }
  return "La menor saturacion observable abre espacio para educar al mercado y capturar leads temprano.";
}

function competitiveReading(project, strategy, benchmark) {
  const targetPriceM2 = getTargetPriceM2(strategy);
  const ppm = projectPriceM2(project);
  if (targetPriceM2 && ppm) {
    if (ppm < targetPriceM2 * 0.95) return "Puede presionar la campaña por menor precio por m2.";
    if (ppm > targetPriceM2 * 1.08) return "Puede justificar precio superior por atributos visibles, ubicación o entrega.";
    return "Compite directamente por precio y rango de valor.";
  }
  if (ppm && benchmark.medianPriceM2) {
    if (ppm < benchmark.medianPriceM2 * 0.95) return "Compite por precio frente a la mediana del distrito.";
    if (ppm > benchmark.medianPriceM2 * 1.08) return "Se ubica en rango premium frente al distrito.";
  }
  const area = projectArea(project);
  const targetArea = positiveNumber(strategy.area);
  if (area && targetArea && Math.abs(area - targetArea) / targetArea < 0.12) return "Compite por metraje y segmento de departamento.";
  return "Conviene revisar atributos, entrega y financiamiento antes de definir comparación.";
}

function comparisonConclusion(projects) {
  if (projects.length < 2) {
    return { title: "Selección insuficiente", body: "Elige al menos 2 proyectos comparables." };
  }
  const withPpm = projects.filter((project) => projectPriceM2(project));
  const lowest = [...withPpm].sort((left, right) => projectPriceM2(left) - projectPriceM2(right))[0];
  const highestArea = [...projects].filter((project) => projectArea(project)).sort((left, right) => projectArea(right) - projectArea(left))[0];
  const premium = [...withPpm].sort((left, right) => projectPriceM2(right) - projectPriceM2(left))[0];

  if (lowest && premium && lowest.id !== premium.id) {
    return {
      title: `${lowest.project_name} tiene mejor precio por m2`,
      body: `${premium.project_name} queda en rango más alto. La ventaja competitiva debe construirse sobre ${highestArea?.id === premium.id ? "mayor área y atributos visibles" : "ubicación, entrega y valor percibido"}.`,
    };
  }
  if (highestArea) {
    return {
      title: `${highestArea.project_name} ofrece mayor área`,
      body: "Cuando el precio por m2 es similar, conviene destacar metraje, distribución y beneficios concretos.",
    };
  }
  return {
    title: "Comparación en rango similar",
    body: "Existe presión de precio en este segmento; conviene reforzar valor percibido y argumentos de diferenciación.",
  };
}

function competitionLevel(benchmark) {
  if (benchmark.projects >= 60 || benchmark.agencies >= 28) return { level: "Alta", tone: "warning" };
  if (benchmark.projects >= 20 || benchmark.agencies >= 10) return { level: "Media", tone: "neutral" };
  return { level: "Baja", tone: "success" };
}

function competitionClass(benchmark) {
  return competitionLevel(benchmark).tone;
}

function renderSignals(project) {
  const signals = [
    projectPriceM2(project) ? "Precio visible" : "Precio no visible",
    projectArea(project) ? "Metraje visible" : "Metraje no visible",
    toArray(project.amenities).length ? "Atributos visibles" : "Atributos no visibles",
    project.delivery_year ? "Entrega visible" : "Entrega no visible",
  ];
  return `<div class="chip-list">${signals.map(chip).join("")}</div>`;
}

function kpiCard(label, value, detail) {
  return `
    <article class="kpi-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value || "No disponible"))}</strong>
      <small>${escapeHtml(detail)}</small>
    </article>
  `;
}

function miniMetric(label, value) {
  return `
    <div class="mini-metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value || "No disponible"))}</strong>
    </div>
  `;
}

function projectListCard(project, selected) {
  const reading = competitiveReading(project, state.strategy, buildBenchmark(getProjectsByDistrict(project.district), project.district));
  return `
    <button class="project-card ${selected ? "selected" : ""}" type="button" data-select-project="${escapeAttr(project.id)}">
      <div class="project-card-head">
        <div>
          <strong>${escapeHtml(project.project_name || "Proyecto sin nombre")}</strong>
          <span>${escapeHtml(project.agency_name || "Inmobiliaria no registrada")}</span>
        </div>
        <span class="tag neutral">${escapeHtml(project.district || "Sin distrito")}</span>
      </div>
      <div class="project-metrics">
        ${miniMetric("Precio", money(project.list_price_avg))}
        ${miniMetric("S/ m2", priceM2(projectPriceM2(project)))}
        ${miniMetric("Área", areaLabel(projectArea(project)))}
        ${miniMetric("Unid.", formatNumber(numberOrZero(project.unit_count)))}
      </div>
      <p>${escapeHtml(reading)}</p>
      <div class="card-badges">
        <span>${escapeHtml(project.project_phase || "Fase no disponible")}</span>
        <span>${escapeHtml(bedroomsLabel(project))}</span>
        <span>${escapeHtml(deliveryLabel(project))}</span>
      </div>
    </button>
  `;
}

function competitorCard(project, variant = "") {
  const reading = competitiveReading(project, state.strategy, buildBenchmark(getProjectsByDistrict(project.district), project.district));
  return `
    <article class="competitor-card ${escapeAttr(variant)}">
      <div>
        <span>${escapeHtml(project.agency_name || "Inmobiliaria no registrada")}</span>
        <strong>${escapeHtml(project.project_name || "Proyecto sin nombre")}</strong>
      </div>
      <div class="competitor-metrics">
        <span>${priceM2(projectPriceM2(project))}</span>
        <span>${areaLabel(projectArea(project))}</span>
      </div>
      <p>${escapeHtml(reading)}</p>
    </article>
  `;
}

function compareCandidate(project, checked) {
  const disabled = !checked && state.compareProjectIds.length >= 3;
  return `
    <label class="compare-candidate ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}">
      <input type="checkbox" data-compare-toggle value="${escapeAttr(project.id)}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""} />
      <span>
        <strong>${escapeHtml(project.project_name || "Proyecto sin nombre")}</strong>
        <small>${escapeHtml(project.agency_name || "Inmobiliaria no registrada")} · ${escapeHtml(project.district || "Sin distrito")}</small>
      </span>
      <em>${priceM2(projectPriceM2(project))}</em>
    </label>
  `;
}

function compareProjectCard(project) {
  return `
    <article class="compare-project-card">
      <span class="tag neutral">${escapeHtml(project.district || "Sin distrito")}</span>
      <h3>${escapeHtml(project.project_name || "Proyecto sin nombre")}</h3>
      <p>${escapeHtml(project.agency_name || "Inmobiliaria no registrada")}</p>
      <div class="compare-facts">
        ${miniMetric("Precio", money(project.list_price_avg))}
        ${miniMetric("Precio / m2", priceM2(projectPriceM2(project)))}
        ${miniMetric("Área", areaLabel(projectArea(project)))}
        ${miniMetric("Dormitorios", bedroomsLabel(project))}
        ${miniMetric("Fase", project.project_phase || "No registrado")}
        ${miniMetric("Entrega", deliveryLabel(project))}
        ${miniMetric("Unidades", formatNumber(numberOrZero(project.unit_count)))}
      </div>
      <div class="chip-list">${toArray(project.amenities).slice(0, 5).map(chip).join("") || chip("Atributos no disponibles")}</div>
      <div class="chip-list muted-chips">${toArray(project.financing_banks).slice(0, 3).map(chip).join("") || chip("Financiamiento no registrado")}</div>
    </article>
  `;
}

function comparisonMetric(label, projects, accessor, formatter, higherIsBetter) {
  const values = projects.map((project) => ({ project, value: accessor(project) })).filter((item) => isPositive(item.value));
  const max = Math.max(...values.map((item) => item.value), 1);
  const bestValue = higherIsBetter ? Math.max(...values.map((item) => item.value), 0) : Math.min(...values.map((item) => item.value), Infinity);
  return `
    <div class="comparison-row">
      <strong>${escapeHtml(label)}</strong>
      <div class="comparison-track-list">
        ${projects.map((project) => {
          const value = accessor(project);
          const width = isPositive(value) ? clamp((value / max) * 100, 4, 100) : 4;
          const best = isPositive(value) && value === bestValue;
          return `
            <div class="comparison-track">
              <span>${escapeHtml(project.project_name || "Proyecto")}</span>
              <div class="bar-track"><i style="width:${width}%"></i></div>
              <em class="${best ? "best" : ""}">${escapeHtml(isPositive(value) ? formatter(value) : "No disponible")}</em>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function signalCard(signal) {
  return `
    <article class="signal-card ${escapeAttr(signal.tone)}">
      <span>${escapeHtml(signal.title)}</span>
      <p>${escapeHtml(signal.body)}</p>
    </article>
  `;
}

function checkItem(question, answer, tone) {
  return `
    <article class="check-item ${escapeAttr(tone)}">
      <span>${escapeHtml(question)}</span>
      <p>${escapeHtml(answer)}</p>
    </article>
  `;
}

function barRow(label, value, max, meta, trailing, dataAttribute) {
  const width = clamp((Number(value) / Math.max(Number(max), 1)) * 100, 3, 100);
  const content = `
    <div>
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(meta ?? "")}</span>
    </div>
    <div class="bar-track"><i style="width:${width}%"></i></div>
    <em>${escapeHtml(String(trailing ?? value))}</em>
  `;
  if (dataAttribute) {
    return `<button class="bar-row as-button" type="button" ${dataAttribute}="${escapeAttr(label)}">${content}</button>`;
  }
  return `<div class="bar-row">${content}</div>`;
}

function summaryBar(label, value, total) {
  const width = clamp((Number(value) / Math.max(Number(total), 1)) * 100, 4, 100);
  return `
    <div class="summary-bar">
      <div><span>${escapeHtml(label)}</span><strong>${formatNumber(value)}</strong></div>
      <div class="bar-track"><i style="width:${width}%"></i></div>
    </div>
  `;
}

function districtTile(row, maxProjects) {
  const intensity = clamp(row.projects / Math.max(maxProjects, 1), 0.18, 1);
  return `
    <button class="district-tile" type="button" data-district-chip="${escapeAttr(row.district)}" style="--intensity:${intensity}">
      <strong>${escapeHtml(row.district)}</strong>
      <span>${formatNumber(row.projects)} proyectos</span>
      <em>${priceM2(row.medianPriceM2)}</em>
    </button>
  `;
}

function rangeGauge(benchmark, targetPriceM2) {
  if (!benchmark.medianPriceM2) {
    return emptyState("Información insuficiente", "Revisa proyectos comparables del distrito.");
  }
  const low = benchmark.lowPriceM2 || benchmark.medianPriceM2 * 0.9;
  const high = benchmark.highPriceM2 || benchmark.medianPriceM2 * 1.1;
  const min = Math.max(1, low * 0.82);
  const max = high * 1.18;
  const lowPos = clamp(((low - min) / (max - min)) * 100, 0, 100);
  const highPos = clamp(((high - min) / (max - min)) * 100, 0, 100);
  const medianPos = clamp(((benchmark.medianPriceM2 - min) / (max - min)) * 100, 0, 100);
  const targetPos = targetPriceM2 ? clamp(((targetPriceM2 - min) / (max - min)) * 100, 0, 100) : null;

  return `
    <div class="range-gauge">
      <div class="range-track">
        <span class="range-band" style="left:${lowPos}%; width:${Math.max(4, highPos - lowPos)}%"></span>
        <span class="range-median" style="left:${medianPos}%"></span>
        ${targetPos !== null ? `<span class="range-target" style="left:${targetPos}%"><b>Objetivo</b></span>` : ""}
      </div>
      <div class="range-labels">
        <span>${priceM2(low)}</span>
        <span>Mediana ${priceM2(benchmark.medianPriceM2)}</span>
        <span>${priceM2(high)}</span>
      </div>
    </div>
  `;
}

function scatterPlot(projects, strategy) {
  const points = projects.map((project) => ({
    project,
    area: projectArea(project),
    ppm: projectPriceM2(project),
  })).filter((point) => isPositive(point.area) && isPositive(point.ppm));

  if (points.length < 3) {
    return emptyState("Información insuficiente para este cálculo", "Revisa proyectos comparables del distrito.");
  }

  const width = 1080;
  const height = 480;
  const plot = { left: 86, right: 34, top: 38, bottom: 66 };
  const areas = points.map((point) => point.area);
  const prices = points.map((point) => point.ppm);
  const niceStep = (range, intervals = 5) => {
    const rough = Math.max(range, 1) / intervals;
    const power = 10 ** Math.floor(Math.log10(rough));
    const normalized = rough / power;
    const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
    return factor * power;
  };
  const axis = (values, intervals = 5) => {
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const step = niceStep(rawMax - rawMin, intervals);
    const min = Math.floor(rawMin / step) * step;
    const max = Math.ceil(rawMax / step) * step || min + step;
    const ticks = [];
    for (let value = min; value <= max + step * 0.01 && ticks.length < 10; value += step) ticks.push(value);
    return { min, max, step, ticks };
  };
  const areaAxis = axis(areas, 6);
  const priceAxis = axis(prices, 6);
  const medianArea = percentile(areas, 50);
  const medianPrice = percentile(prices, 50);
  const targetArea = positiveNumber(strategy.area);
  const targetPriceM2 = getTargetPriceM2(strategy);
  const x = (value) => plot.left + ((value - areaAxis.min) / Math.max(areaAxis.max - areaAxis.min, 1)) * (width - plot.left - plot.right);
  const y = (value) => height - plot.bottom - ((value - priceAxis.min) / Math.max(priceAxis.max - priceAxis.min, 1)) * (height - plot.top - plot.bottom);
  const compactText = (value, length = 34) => {
    const text = String(value || "No informado");
    return text.length > length ? `${text.slice(0, length - 1)}…` : text;
  };
  const axisPrice = (value) => value >= 1000 ? `S/ ${formatNumber(value / 1000, value % 1000 ? 1 : 0)}k` : `S/ ${formatNumber(value)}`;

  return `
    <div class="scatter-wrap">
      <div class="scatter-meta">
        <div class="scatter-legend" aria-label="Leyenda del mapa">
          <span><i class="legend-dot below"></i>En o bajo la mediana</span>
          <span><i class="legend-dot above"></i>Sobre la mediana</span>
          <span><i class="legend-bubble"></i>Tamaño = unidades publicadas</span>
          ${targetArea && targetPriceM2 ? '<span><i class="legend-target"></i>Escenario objetivo</span>' : ""}
        </div>
        <p><strong>Referencia:</strong> mediana ${priceM2(medianPrice)} y ${formatNumber(medianArea, 1)} m².</p>
      </div>
      <div class="scatter-canvas" tabindex="0" aria-label="Área desplazable del mapa de posicionamiento">
      <svg class="scatter-plot" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="scatter-title scatter-description">
        <title id="scatter-title">Mapa de precio por metro cuadrado y área publicada</title>
        <desc id="scatter-description">Cada círculo representa un proyecto comparable. El tamaño indica unidades publicadas y el color muestra su posición frente a la mediana de precio por metro cuadrado.</desc>
        ${priceAxis.ticks.map((value) => `
          <g class="axis-tick">
            <line x1="${plot.left}" y1="${y(value).toFixed(1)}" x2="${width - plot.right}" y2="${y(value).toFixed(1)}" class="grid-line"></line>
            <text x="${plot.left - 13}" y="${(y(value) + 4).toFixed(1)}" text-anchor="end" class="tick-label">${axisPrice(value)}</text>
          </g>
        `).join("")}
        ${areaAxis.ticks.map((value) => `
          <g class="axis-tick">
            <line x1="${x(value).toFixed(1)}" y1="${plot.top}" x2="${x(value).toFixed(1)}" y2="${height - plot.bottom}" class="grid-line"></line>
            <text x="${x(value).toFixed(1)}" y="${height - plot.bottom + 25}" text-anchor="middle" class="tick-label">${formatNumber(value)}</text>
          </g>
        `).join("")}
        <line x1="${plot.left}" y1="${height - plot.bottom}" x2="${width - plot.right}" y2="${height - plot.bottom}" class="axis"></line>
        <line x1="${plot.left}" y1="${plot.top}" x2="${plot.left}" y2="${height - plot.bottom}" class="axis"></line>
        <line x1="${plot.left}" y1="${y(medianPrice).toFixed(1)}" x2="${width - plot.right}" y2="${y(medianPrice).toFixed(1)}" class="median-line"></line>
        <line x1="${x(medianArea).toFixed(1)}" y1="${plot.top}" x2="${x(medianArea).toFixed(1)}" y2="${height - plot.bottom}" class="median-line"></line>
        <text x="${plot.left}" y="22" class="axis-label">Precio por m² (S/)</text>
        <text x="${width - plot.right}" y="${height - 12}" text-anchor="end" class="axis-label">Área publicada (m²)</text>
        <text x="${width - plot.right - 6}" y="${(y(medianPrice) - 8).toFixed(1)}" text-anchor="end" class="median-label">Mediana de precio</text>
        <text x="${(x(medianArea) + 8).toFixed(1)}" y="${plot.top + 15}" class="median-label">Mediana de área</text>
        ${points.map((point) => {
          const cx = x(point.area);
          const cy = y(point.ppm);
          const radius = clamp(Math.sqrt(numberOrZero(point.project.unit_count)) + 4, 5, 13);
          const tooltipWidth = 260;
          const tooltipHeight = 88;
          const tooltipX = cx > width - plot.right - tooltipWidth - 18 ? cx - tooltipWidth - 14 : cx + 14;
          const tooltipY = cy < plot.top + tooltipHeight + 14 ? cy + 14 : cy - tooltipHeight - 14;
          const units = numberOrZero(point.project.unit_count);
          const ariaLabel = `${point.project.project_name || "Proyecto no informado"}, ${priceM2(point.ppm)}, ${formatNumber(point.area, 1)} metros cuadrados, ${units ? `${formatNumber(units)} unidades publicadas` : "unidades no informadas"}, ${point.project.agency_name || "inmobiliaria no informada"}`;
          return `
            <g class="scatter-node ${point.ppm > medianPrice ? "above" : "below"}">
              <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${Math.max(radius + 7, 16).toFixed(1)}" class="scatter-hit" tabindex="0" focusable="true" role="img" aria-label="${escapeAttr(ariaLabel)}"></circle>
              <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${radius.toFixed(1)}" class="scatter-point"></circle>
              <g class="scatter-tooltip" transform="translate(${tooltipX.toFixed(1)} ${tooltipY.toFixed(1)})">
                <rect width="${tooltipWidth}" height="${tooltipHeight}" rx="9"></rect>
                <text x="14" y="22" class="tooltip-title">${escapeHtml(compactText(point.project.project_name))}</text>
                <text x="14" y="45" class="tooltip-value">${priceM2(point.ppm)} · ${formatNumber(point.area, 1)} m² · ${units ? `${formatNumber(units)} unid.` : "Sin unidades"}</text>
                <text x="14" y="68" class="tooltip-meta">${escapeHtml(compactText(point.project.agency_name, 26))} · ${escapeHtml(point.project.district || "Sin distrito")}</text>
              </g>
            </g>
          `;
        }).join("")}
        ${targetArea && targetPriceM2 ? `
          <circle cx="${x(targetArea).toFixed(1)}" cy="${y(targetPriceM2).toFixed(1)}" r="9" class="target-point"></circle>
          <text x="${clamp(x(targetArea) + 14, plot.left, width - 120).toFixed(1)}" y="${clamp(y(targetPriceM2) - 12, 24, height - plot.bottom).toFixed(1)}" class="target-label">Objetivo</text>
        ` : ""}
      </svg>
      </div>
      <p class="scatter-help">Pasa el puntero o usa Tab para consultar cada proyecto. Las líneas discontinuas marcan las medianas del escenario.</p>
    </div>
  `;
}

function ensureSelectedProject(projects) {
  const current = projects.find((project) => project.id === state.selectedProjectId);
  if (current) return current;
  const next = projects[0] ?? null;
  if (next) state.selectedProjectId = next.id;
  return next;
}

function getDistricts() {
  return unique(getProjects().map((project) => project.district)).sort((left, right) => left.localeCompare(right));
}

function getTypologies() {
  return unique(getProjects().map((project) => project.typology)).sort((left, right) => left.localeCompare(right));
}

function getPhases() {
  return unique(getProjects().map((project) => project.project_phase)).sort((left, right) => left.localeCompare(right));
}

function getDeliveryYears() {
  return unique(getProjects().map((project) => project.delivery_year).filter(Boolean).map(String)).sort();
}

function getBedroomOptions() {
  const max = Math.max(...getProjects().map((project) => numberOrZero(project.bedrooms_max)), 0);
  return Array.from({ length: Math.min(max, 6) }, (_, index) => String(index + 1));
}

function defaultDistrict() {
  return districtBenchmarks()[0]?.district ?? getProjects()[0]?.district ?? "";
}

function activeView() {
  return views.find((view) => view.id === state.view) ?? views[0];
}

function viewIcon(view) {
  const icons = {
    dashboard: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="3"></circle><path d="M12 4v2M20 12h-2M12 20v-2M4 12h2"></path></svg>',
    projects: '<svg viewBox="0 0 24 24"><path d="M4 20V8l7-4v16M11 9h9v11M7 11h1M7 15h1M14 12h2M14 16h2"></path></svg>',
    market: '<svg viewBox="0 0 24 24"><path d="M5 19V9M12 19V5M19 19v-7M3 19h18"></path></svg>',
    compare: '<svg viewBox="0 0 24 24"><path d="M7 7h12l-3-3M19 7l-3 3M17 17H5l3-3M5 17l3 3"></path></svg>',
    trust: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.6-2.9 7.8-7 10-4.1-2.2-7-5.4-7-10V6l7-3zM8.5 12l2.2 2.2 4.8-5"></path></svg>',
    assistant: '<svg viewBox="0 0 24 24"><path d="M6 5h12a3 3 0 013 3v7a3 3 0 01-3 3h-6l-4 3v-3H6a3 3 0 01-3-3V8a3 3 0 013-3zM8 11h.01M12 11h.01M16 11h.01"></path></svg>',
    activity: '<svg viewBox="0 0 24 24"><path d="M3 12h4l2-6 4 12 2-6h6"></path></svg>',
  };
  return icons[view] ?? icons.dashboard;
}

function interfaceIcon(icon) {
  if (icon === "close") {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>';
  }
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"></path></svg>';
}

function viewFromHash() {
  const raw = window.location.hash.replace("#", "");
  const value = legacyRoutes[raw] ?? raw;
  return views.some((view) => view.id === value) ? value : "dashboard";
}

function metadataDate() {
  return state.data?.metadata?.source_snapshot?.max_captured_at || state.data?.metadata?.generated_at;
}

function extractDistrictFromText(text) {
  return getDistricts().find((district) => text.includes(normalizeSearch(district)));
}

function projectHasBedroom(project, bedroom) {
  if (!Number.isFinite(bedroom)) return true;
  const min = numberOrZero(project.bedrooms_min);
  const max = numberOrZero(project.bedrooms_max);
  if (min && max) return bedroom >= min && bedroom <= max;
  return normalizeSearch(project.bedrooms).includes(String(bedroom));
}

function projectPriceM2(project) {
  return positiveNumber(project.price_per_m2_list) || (positiveNumber(project.list_price_avg) && projectArea(project) ? positiveNumber(project.list_price_avg) / projectArea(project) : null);
}

function projectArea(project) {
  return positiveNumber(project.total_area) || positiveNumber(project.total_area_min) || positiveNumber(project.total_area_max);
}

function getTargetPriceM2(strategy) {
  const price = positiveNumber(strategy.targetPrice);
  const area = positiveNumber(strategy.area);
  return price && area ? price / area : null;
}

function countBy(rows, mapper) {
  const map = new Map();
  rows.forEach((row) => {
    const key = mapper(row) || "No registrado";
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

function sum(rows, mapper) {
  return rows.reduce((total, row) => total + numberOrZero(mapper(row)), 0);
}

function average(values) {
  const clean = values.filter(isPositive);
  return clean.length ? clean.reduce((total, value) => total + value, 0) / clean.length : null;
}

function median(values) {
  return percentile(values, 50);
}

function percentile(values, pct) {
  const clean = values.filter(isPositive).sort((left, right) => left - right);
  if (!clean.length) return null;
  const index = (clean.length - 1) * (pct / 100);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return clean[lower];
  return clean[lower] + (clean[upper] - clean[lower]) * (index - lower);
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function isPositive(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function sortNumeric(left, right) {
  const leftValid = isPositive(left);
  const rightValid = isPositive(right);
  if (!leftValid && !rightValid) return 0;
  if (!leftValid) return 1;
  if (!rightValid) return -1;
  return Number(left) - Number(right);
}

function firstAvailable(values) {
  return values.find((value) => String(value ?? "").trim());
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined && String(value).trim() !== ""))];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function normalizeSearch(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function shortText(value, maxLength) {
  const text = String(value ?? "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}...`;
}

function safeUrl(value) {
  try {
    const url = new URL(String(value ?? ""));
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function optionList(values, selected, labeler = (value) => value) {
  return values.map((value) => `<option value="${escapeAttr(value)}" ${String(value) === String(selected) ? "selected" : ""}>${escapeHtml(labeler(value))}</option>`).join("");
}

function sortLabel(value) {
  const labels = {
    direct: "Competencia directa",
    price_m2: "Precio por m2 menor",
    price_total: "Precio total menor",
    area: "Mayor área",
    bedrooms: "Mas dormitorios",
    units: "Mas unidades publicadas",
    delivery: "Entrega más cercana",
    closest_price: "Cercania al precio objetivo",
    competition: "Nivel de competencia",
  };
  return labels[value] ?? value;
}

function bedroomsLabel(project) {
  if (project.bedrooms) return `${project.bedrooms} dorm.`;
  const min = positiveNumber(project.bedrooms_min);
  const max = positiveNumber(project.bedrooms_max);
  if (min && max && min !== max) return `${formatNumber(min)} a ${formatNumber(max)} dorm.`;
  if (min || max) return `${formatNumber(min || max)} dorm.`;
  return "No registrado";
}

function deliveryLabel(project) {
  if (project.delivery_date) return formatDate(project.delivery_date);
  if (project.delivery_year) return String(project.delivery_year);
  return "No registrado para este proyecto";
}

function areaLabel(value) {
  return isPositive(value) ? `${formatNumber(value, 1)} m2` : "No disponible";
}

function priceM2(value) {
  return isPositive(value) ? `S/ ${formatNumber(value, 0)} / m2` : "No disponible";
}

function money(value) {
  return isPositive(value) ? `S/ ${formatNumber(value, 0)}` : "No disponible";
}

function formatRange(low, high) {
  if (!isPositive(low) || !isPositive(high)) return "No disponible";
  return `S/ ${formatNumber(low, 0)} - ${formatNumber(high, 0)} / m2`;
}

function formatNumber(value, digits = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  return new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(number);
}

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0%";
  return new Intl.NumberFormat("es-PE", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(number);
}

function formatDate(value) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(date);
}

function emptyState(title, description) {
  return `
    <div class="empty-state">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(description)}</p>
    </div>
  `;
}

function loadingTemplate() {
  return `
    <div class="loading-screen">
      <div>
        <strong>Preparando Viva Inteligencia</strong>
        <span>Cargando lectura comercial.</span>
      </div>
    </div>
  `;
}

function errorTemplate(error) {
  return `
    <div class="loading-screen">
      <div class="error-box">
        <strong>No se pudo iniciar la plataforma</strong>
        <span>${escapeHtml(error.message)}</span>
      </div>
    </div>
  `;
}

function chip(value) {
  return `<span class="chip">${escapeHtml(String(value || "No disponible"))}</span>`;
}

function rememberFocus(element) {
  restoreFocus = {
    id: element.id,
    start: element.selectionStart,
    end: element.selectionEnd,
  };
}

function restoreActiveInput() {
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

function findProjectById(id) {
  return getProjects().find((project) => project.id === id);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
