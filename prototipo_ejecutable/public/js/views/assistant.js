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

export function renderAssistant() {
  const response = state.assistantResponse ?? buildAssistantResponse(state.assistantInput);

  return `
    <section class="assistant-layout">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>Preguntas de estrategia</h2>
            <p>Consultas orientadas a precio, distrito, competencia y mensaje de campaña.</p>
          </div>
          ${componentHelp("Preguntas de estrategia", "Elige una pregunta sugerida o redacta una propia. La respuesta siempre toma como contexto el distrito y escenario activos.")}
        </div>
        <div class="suggestion-list">
          ${suggestedQuestions.slice(0, 4).map((question) => `
            <button class="suggestion-button ${state.assistantInput === question ? "active" : ""}" type="button" data-suggest="${escapeAttr(question)}">${escapeHtml(question)}</button>
          `).join("")}
        </div>
        <details class="more-suggestions">
          <summary>Ver ${formatNumber(suggestedQuestions.length - 4)} preguntas adicionales</summary>
          <div class="suggestion-list">
            ${suggestedQuestions.slice(4).map((question) => `
              <button class="suggestion-button ${state.assistantInput === question ? "active" : ""}" type="button" data-suggest="${escapeAttr(question)}">${escapeHtml(question)}</button>
            `).join("")}
          </div>
        </details>
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
          <div class="answer-header-row">
            <span class="status-badge success">Respuesta ejecutiva</span>
            ${componentHelp("Respuesta ejecutiva", "Empieza por el resumen y la acción recomendada. Usa métricas y referencias para validar la recomendación antes de compartirla.")}
          </div>
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
