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

export function renderChecklist() {
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

      <section class="check-block workflow-step span-12">
        <div class="check-block-title">
          <div><span class="step-label">Paso 1</span><h2>Precio y posicionamiento</h2></div>
          ${componentHelp("Precio y posicionamiento", "Confirma si el precio objetivo está alineado y si existe un argumento claro para explicar cualquier prima frente al mercado.")}
        </div>
        ${checkItem("¿El precio esta por debajo, cerca o por encima del mercado?", pricePosition.summary, pricePosition.tone)}
        ${checkItem("¿El diferencial se puede justificar?", recommendation.implication, recommendation.tone)}
        ${checkItem("¿Hay competidores más agresivos?", lowerCompetitors.length ? `${formatNumber(lowerCompetitors.length)} proyectos muestran menor precio por m2.` : "No se detecta presión fuerte por menor precio en el escenario.", lowerCompetitors.length ? "warning" : "success")}
      </section>

      <section class="check-block workflow-step span-12">
        <div class="check-block-title">
          <div><span class="step-label">Paso 2</span><h2>Competencia directa</h2></div>
          ${componentHelp("Competencia directa", "Identifica la cantidad de comparables, los jugadores dominantes y los proyectos que deben revisarse antes del lanzamiento.")}
        </div>
        ${checkItem("¿Cuantos proyectos similares existen?", `${formatNumber(comparableProjects.length)} proyectos comparables en el escenario.`, competitionClass(benchmark))}
        ${checkItem("¿Qué inmobiliarias tienen mayor presencia?", benchmark.topAgencies.slice(0, 3).map((row) => row.name).join(", ") || "Información insuficiente para este cálculo.", "neutral")}
        ${checkItem("¿Que proyectos conviene revisar antes de lanzar?", getCompetitors(state.strategy, 3).map((project) => project.project_name).join(", ") || "Revisar proyectos comparables del distrito.", "neutral")}
      </section>

      <section class="check-block workflow-step span-12">
        <div class="check-block-title">
          <div><span class="step-label">Paso 3</span><h2>Mensaje comercial sugerido</h2></div>
          ${componentHelp("Mensaje comercial", "Convierte los diferenciales del escenario en argumentos simples que la fuerza de ventas pueda reconocer y explicar.")}
        </div>
        <div class="chip-list prominent-chips">${angles.map(chip).join("")}</div>
      </section>

      <section class="check-block workflow-step span-12">
        <div class="check-block-title">
          <div><span class="step-label">Paso 4</span><h2>Riesgos antes de campaña</h2></div>
          ${componentHelp("Riesgos antes de campaña", "Revisa primero las alertas que pueden afectar conversión, comparación por precio o claridad del mensaje.")}
        </div>
        <div class="risk-list">
          ${risks.map((risk) => signalCard(risk)).join("")}
        </div>
      </section>

      <section class="check-block workflow-step final-step span-12">
        <div class="check-block-title">
          <div><span class="step-label">Paso 5</span><h2>Siguiente acción</h2></div>
          ${componentHelp("Siguiente acción", "Cierra el checklist con una tarea concreta que puede asignarse y verificarse antes de activar la promoción.")}
        </div>
        <div class="next-action-card">
          <strong>${escapeHtml(recommendation.action)}</strong>
          <p>Preparar argumento para fuerza de ventas y contrastarlo contra los competidores principales antes de activar la promoción.</p>
        </div>
      </section>
    </section>
  `;
}
