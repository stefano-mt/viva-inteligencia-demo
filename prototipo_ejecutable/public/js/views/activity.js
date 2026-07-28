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

export function renderActivity() {
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

      <section class="panel span-12">
        <div class="panel-header">
          <div>
            <h2>Línea de tiempo comercial</h2>
            <p>Eventos redactados como señales de negocio para seguimiento ejecutivo.</p>
          </div>
          ${componentHelp("Línea de tiempo", "Lee las señales desde la más reciente y usa sus etiquetas para reconocer distrito, precio o competidor afectado.")}
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

      <section class="panel span-12 management-panel">
        <div class="panel-header">
          <div>
            <h2>Para gerencia</h2>
            <p>Puntos concretos para revisar antes de activar acciones.</p>
          </div>
          ${componentHelp("Prioridades para gerencia", "Resume los temas que requieren decisión, responsable o seguimiento en la siguiente reunión comercial.")}
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
