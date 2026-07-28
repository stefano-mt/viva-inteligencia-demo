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

export function renderCompare() {
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
          ${panelActions(
            `<span class="tag neutral">${formatNumber(selected.length)} seleccionados</span>`,
            "Selección de comparables",
            "Elige entre dos y tres proyectos del mismo escenario. Una selección pequeña hace que las diferencias sean más fáciles de interpretar."
          )}
        </div>
        <div class="local-controls single-row">
          <label class="field-control search-control" for="compare-query">
            <span>Buscar comparable</span>
            <input id="compare-query" type="search" value="${escapeAttr(state.compareQuery)}" placeholder="Proyecto o inmobiliaria" />
          </label>
        </div>
        <div class="compare-candidates">
          ${candidates.slice(0, 9).map((project) => compareCandidate(project, selected.some((item) => item.id === project.id))).join("") || emptyState("Sin candidatos", "Cambia el distrito objetivo para revisar otros proyectos.")}
        </div>
        ${candidates.length > 9 ? `
          <details class="content-expander">
            <summary>Ver ${formatNumber(Math.min(candidates.length, 18) - 9)} comparables adicionales</summary>
            <div class="compare-candidates">
              ${candidates.slice(9, 18).map((project) => compareCandidate(project, selected.some((item) => item.id === project.id))).join("")}
            </div>
          </details>
        ` : ""}
      </section>

      <section class="panel compare-board">
        <div class="panel-header">
          <div>
            <h2>Posicionamiento lado a lado</h2>
            <p>Compara precio, metraje, etapa, entrega y atributos visibles.</p>
          </div>
          ${componentHelp("Comparación lado a lado", "Busca diferencias relevantes, no solo el menor valor. La conclusión final resume la posición relativa de la selección.")}
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
