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

export function renderProjects() {
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
          ${panelActions(
            `<span class="tag neutral">${formatNumber(projects.length)} resultados</span>`,
            "Explorador de competidores",
            "Filtra primero y luego selecciona una tarjeta. El detalle de la derecha explica por qué el proyecto puede competir con tu escenario."
          )}
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
          ${projects.slice(0, state.projectLimit).map((project) => projectListCard(project, selected?.id === project.id)).join("") || emptyState("Sin proyectos", "Ajusta filtros o cambia de distrito para revisar comparables.")}
        </div>
        ${projects.length > state.projectLimit ? `
          <div class="catalog-footer">
            <span>Mostrando ${formatNumber(state.projectLimit)} de ${formatNumber(projects.length)} proyectos</span>
            <button class="secondary-button" id="load-more-projects" type="button">Ver 18 más</button>
          </div>
        ` : ""}
      </section>
      <aside class="detail-panel">
        ${selected ? renderProjectDetail(selected) : emptyState("Sin detalle", "Selecciona un proyecto comparable.")}
      </aside>
    </section>
  `;
}

export function renderProjectDetail(project) {
  const benchmark = buildBenchmark(getProjectsByDistrict(project.district), project.district);
  const reading = competitiveReading(project, state.strategy, benchmark);
  const contact = firstAvailable([project.project_contact, project.project_phone, project.project_whatsapp, project.project_email]);
  const url = safeUrl(project.source_url);

  return `
    <div class="detail-header">
      <div class="detail-header-row">
        <div class="detail-kicker">
          <span class="tag success">${escapeHtml(project.district || "Distrito no disponible")}</span>
          <span class="tag neutral">${escapeHtml(project.project_phase || "Fase no disponible")}</span>
        </div>
        ${componentHelp("Detalle del proyecto", "Resume evidencia visible del comparable seleccionado. Contrasta precio, área y atributos antes de abrir la publicación original.")}
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
      <h3>Publicación</h3>
      ${url ? `<a class="text-link" href="${escapeAttr(url)}" target="_blank" rel="noreferrer">Abrir fuente visible</a>` : `<p>No disponible en la información visible.</p>`}
    </div>
  `;
}
