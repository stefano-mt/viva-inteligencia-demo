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

export function renderMarket() {
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

      <section class="panel span-12 market-ranking">
        <div class="panel-header">
          <div>
            <h2>Ranking de distritos</h2>
            <p>Zonas con mayor oferta visible para benchmark comercial.</p>
          </div>
          ${componentHelp("Ranking de distritos", "Ordena las zonas por oferta visible. Selecciona una fila para cambiar el distrito activo y actualizar toda la lectura.")}
        </div>
        <div class="bar-list">
          ${districts.slice(0, 8).map((row) => barRow(row.district, row.projects, districts[0]?.projects ?? 1, `${formatNumber(row.projects)} proyectos`, priceM2(row.medianPriceM2), "data-district-chip")).join("")}
        </div>
        ${districts.length > 8 ? `
          <details class="content-expander">
            <summary>Ver ${formatNumber(Math.min(districts.length, 12) - 8)} distritos adicionales</summary>
            <div class="bar-list">
              ${districts.slice(8, 12).map((row) => barRow(row.district, row.projects, districts[0]?.projects ?? 1, `${formatNumber(row.projects)} proyectos`, priceM2(row.medianPriceM2), "data-district-chip")).join("")}
            </div>
          </details>
        ` : ""}
      </section>

      <section class="panel span-12 market-depth">
        <div class="panel-header">
          <div>
            <h2>Lectura profunda del distrito</h2>
            <p>Composición de oferta, inmobiliarias activas y proyectos representativos.</p>
          </div>
          ${componentHelp("Lectura profunda", "Separa la oferta por fase y muestra quiénes concentran presencia. Los proyectos inferiores funcionan como referencias concretas.")}
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
          ${componentHelp("Presión competitiva", "Los bloques más intensos concentran mayor oferta visible. Selecciona uno para llevar ese distrito al benchmark.")}
        </div>
        <div class="heat-grid">
          ${districts.slice(0, 9).map((row) => districtTile(row, districts[0]?.projects ?? 1)).join("")}
        </div>
        ${districts.length > 9 ? `
          <details class="content-expander">
            <summary>Explorar ${formatNumber(Math.min(districts.length, 24) - 9)} distritos adicionales</summary>
            <div class="heat-grid">
              ${districts.slice(9, 24).map((row) => districtTile(row, districts[0]?.projects ?? 1)).join("")}
            </div>
          </details>
        ` : ""}
      </section>
    </section>
  `;
}
