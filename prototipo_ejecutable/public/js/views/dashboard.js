import { suggestedQuestions } from "../config.js";
import * as domain from "../domain.js";
import { state } from "../state.js";

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

export function renderDashboard() {
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
          ${componentHelp("Oportunidades y riesgos", "Prioriza señales que pueden fortalecer o presionar el escenario. Empieza por las alertas y conviértelas en preguntas para el comparador.")}
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
          ${panelActions(
            '<button class="text-button" type="button" data-view="projects">Revisar comparables</button>',
            "Competidores prioritarios",
            "Muestra los proyectos más cercanos al escenario por precio, metraje, dormitorios y ubicación. Úsalos como primera lista de revisión."
          )}
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
          ${panelActions(
            `<span class="tag neutral">${formatNumber(comparableProjects.length)} comparables</span>`,
            "Mapa de posicionamiento",
            "Cada punto es un proyecto. El eje horizontal representa área, el vertical precio por m² y el tamaño del círculo las unidades publicadas."
          )}
        </div>
        ${scatterPlot(comparableProjects.slice(0, 90), state.strategy)}
      </section>
    </section>
  `;
}

export function renderStrategyPlanner(benchmark, comparableProjects) {
  const targetPriceM2 = getTargetPriceM2(state.strategy);
  const recommendation = buildCommercialRecommendation(state.strategy, benchmark, comparableProjects);
  const competitors = getCompetitors(state.strategy, 4);

  return `
    <div class="panel-header">
      <div>
        <h2>Planificador de estrategia comercial</h2>
        <p>Configura un escenario y contrasta el precio objetivo contra el distrito.</p>
      </div>
      ${componentHelp("Planificador", "Completa solo los criterios que ya conoces. El sistema recalcula comparables, precio por m² y recomendación con cada cambio.")}
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

    <div class="planner-results primary-results">
      ${miniMetric("Precio objetivo / m2", targetPriceM2 ? priceM2(targetPriceM2) : "Sin precio objetivo")}
      ${miniMetric("Promedio distrito / m2", priceM2(benchmark.avgPriceM2))}
      ${miniMetric("Rango competitivo", formatRange(benchmark.lowPriceM2, benchmark.highPriceM2))}
    </div>
    <details class="secondary-metrics">
      <summary>Ver referencias adicionales</summary>
      <div class="planner-results">
        ${miniMetric("Mediana distrito / m2", priceM2(benchmark.medianPriceM2))}
        ${miniMetric("Comparables", formatNumber(comparableProjects.length))}
        ${miniMetric("Inmobiliarias activas", formatNumber(benchmark.agencies))}
      </div>
    </details>

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
