import {
  bedroomsLabel,
  canonicalProjectId,
  emptyState,
  escapeAttr,
  escapeHtml,
  findProjectById,
  formatNumber,
  miniMetric,
  money,
  priceM2,
} from "../domain.js";
import { state } from "../state.js";
import { renderGeographicMap } from "./geographic-map.js";
import { renderPositioningMap } from "./positioning-map.js";

const FACTOR_LABELS = Object.freeze({
  geography: "Geografía",
  area: "Área",
  bedrooms: "Dormitorios",
  typology: "Tipología",
  delivery: "Entrega",
  price_per_m2: "Precio publicado / m²",
});

export function renderDashboard() {
  const context = state.scenarioContext;
  if (!state.data || !context) {
    return `
      <section class="dashboard-grid" aria-busy="true">
        <section class="panel span-12">
          <div class="panel-header">
            <div>
              <h2>Preparando radar comercial</h2>
              <p>Estamos conectando el escenario, la geografía y los comparables.</p>
            </div>
          </div>
        </section>
      </section>
    `;
  }

  const boundaryGeoJson =
    state.geographyArtifact.status === "valid"
      ? state.geographyArtifact.geojson
      : null;

  return `
    <section
      class="dashboard-grid dashboard-grid--radar"
      data-radar-reading
      data-observed-projects="${escapeAttr(context.observed_scope_project_ids.length)}"
      data-geography-included="${escapeAttr(context.geography_coverage?.included ?? 0)}"
      data-geography-total="${escapeAttr(context.geography_coverage?.total ?? 0)}"
      data-comparable-projects="${escapeAttr(context.comparable_project_ids.length)}"
      data-excluded-projects="${escapeAttr(context.excluded_projects?.length ?? 0)}"
      data-active-visualization="${escapeAttr(context.scenario.visualization ?? "geographic")}"
    >
      ${renderRadarOverview(context)}

      <div class="radar-primary span-12">
        ${renderRadarVisualization(context, boundaryGeoJson)}
      </div>

      <section class="radar-priority work-surface span-12" aria-labelledby="priority-comparables-title">
        ${renderPriorityComparables(context)}
      </section>

      <details class="radar-simulation detail-disclosure span-12">
        <summary>
          <span>
            <strong>Simular escenario Viva</strong>
            <small>Edita producto y precio sin confundir la hipótesis con datos observados.</small>
          </span>
        </summary>
        <div class="radar-simulation__grid detail-disclosure__body">
          <section class="planner-panel" aria-labelledby="scenario-product-title">
            ${renderProductPlanner(context)}
          </section>
          <section class="radar-diagnosis" aria-labelledby="price-diagnosis-title">
            ${renderPriceDiagnosis(context)}
          </section>
        </div>
      </details>

      <details class="radar-deep-dive detail-disclosure span-12">
        <summary>
          <span>
            <strong>Cómo se construye la comparabilidad</strong>
            <small>Revisa score, factores y límites metodológicos.</small>
          </span>
        </summary>
        <div class="radar-deep-dive__body detail-disclosure__body">
          <section aria-labelledby="score-explanation-title">
            ${renderScoreExplanation(context)}
          </section>
        </div>
      </details>
    </section>
  `;
}

function renderRadarOverview(context) {
  const benchmark = state.benchmarkContext?.quantitative?.pricePerM2Total ?? {};
  const publishedCount = context.price_reference_project_ids?.length ?? 0;
  const eligiblePairCount = benchmark.n ?? 0;
  const orientativeCount = benchmark.orientative?.n ?? 0;
  const observedCount = context.observed_scope_project_ids.length;
  const comparableCount = context.comparable_project_ids.length;
  const diagnosis = context.price_diagnosis ?? {};
  const targetPricePerM2 = scenarioTargetPricePerM2(context.scenario);
  const reading = targetPricePerM2 && diagnosis.status === "ready"
    ? `El precio Viva simulado se contrasta con ${formatNumber(publishedCount)} publicaciones del alcance; la posición no representa un precio observado.`
    : `${context.scope_text} reúne ${formatNumber(observedCount)} proyectos observados y ${formatNumber(comparableCount)} comparables para revisar en el mapa.`;

  return `
    <section
      class="radar-overview span-12"
      data-radar-summary
      data-published-price-area="${escapeAttr(publishedCount)}"
      data-eligible-price-per-m2="${escapeAttr(eligiblePairCount)}"
    >
      <div class="decision-line radar-decision-line">
        <span class="decision-line__label">Lectura territorial</span>
        <p class="decision-line__reading">${escapeHtml(reading)}</p>
        <p class="decision-line__limit">
          <strong>Límite:</strong> ${formatNumber(publishedCount)} publicaciones declaran precio y área total, pero ${formatNumber(eligiblePairCount)} tienen pairing certificado por unidad. Los ${formatNumber(orientativeCount)} cocientes disponibles son orientativos y no representan precios reales de cierre.
        </p>
      </div>
      <dl class="metric-row radar-metrics" aria-label="Resumen del escenario territorial">
        <div class="metric-pair">
          <dt>Proyectos observados</dt>
          <dd>${formatNumber(observedCount)}</dd>
        </div>
        <div class="metric-pair">
          <dt>Comparables elegibles</dt>
          <dd>${formatNumber(comparableCount)}</dd>
        </div>
        <div class="metric-pair">
          <dt>Pairing certificado precio/m²</dt>
          <dd>${formatNumber(eligiblePairCount)}</dd>
        </div>
      </dl>
    </section>
  `;
}

function renderRadarVisualization(context, boundaryGeoJson) {
  const shared = {
    scenarioContext: context,
    data: state.data,
    selectedProjectId: state.selectedProjectId,
    showVisualizationControl: true,
  };

  if (context.scenario.visualization === "positioning") {
    return renderPositioningMap(shared);
  }

  return renderGeographicMap({
    ...shared,
    boundaryGeoJson,
  });
}

function renderProductPlanner(context) {
  const scenario = context.scenario;
  const catalogs = state.data.scenario_catalogs ?? {};

  return `
    <div class="panel-header">
      <div>
        <span class="section-kicker">Escenario Viva · simulado</span>
        <h2 id="scenario-product-title">Producto y precio</h2>
        <p>Edita el borrador y aplica todos los cambios en una sola actualización.</p>
      </div>
    </div>
    <form id="scenario-product-form" novalidate>
      <div class="planner-form">
        ${renderSelectField({
          id: "scenario-product-typology",
          name: "typology",
          label: "Tipo de inmueble",
          values: catalogs.typologies,
          selected: scenario.typology,
          labeler: typologyLabel,
        })}
        ${renderSelectField({
          id: "scenario-product-bedrooms",
          name: "bedrooms",
          label: "Dormitorios objetivo",
          values: catalogs.bedrooms,
          selected: scenario.bedrooms,
          labeler: bedroomsTargetLabel,
        })}
        ${renderNumberField({
          id: "scenario-product-area",
          name: "target_area_m2",
          label: "Área estimada (m²)",
          value: scenario.target_area_m2,
          max: 10000,
          step: "0.01",
          placeholder: "Ej. 72",
        })}
        ${renderNumberField({
          id: "scenario-product-price",
          name: "target_price_pen",
          label: "Precio objetivo simulado (S/)",
          value: scenario.target_price_pen,
          max: 1000000000,
          step: "0.01",
          placeholder: "Ej. 520000",
        })}
        ${renderSelectField({
          id: "scenario-product-delivery",
          name: "delivery_year",
          label: "Año de entrega",
          values: catalogs.delivery_years,
          selected: scenario.delivery_year,
          labeler: deliveryTargetLabel,
        })}
      </div>
      <p id="scenario-product-error" role="alert" hidden></p>
      <div class="planner-results">
        <button
          class="primary-button"
          id="scenario-product-submit"
          type="submit"
        >Actualizar escenario</button>
        <button
          class="secondary-button"
          id="scenario-product-cancel"
          type="reset"
        >Cancelar cambios</button>
      </div>
    </form>
  `;
}

function renderPriceDiagnosis(context) {
  const diagnosis = context.price_diagnosis ?? {};
  const scenario = context.scenario;
  const targetPricePerM2 = scenarioTargetPricePerM2(scenario);
  const ready = diagnosis.status === "ready";
  const diagnosisLabel = ready
    ? diagnosis.position
      ? pricePositionLabel(diagnosis.position)
      : "Referencia publicada lista"
    : "Referencia de precio insuficiente";
  const tone = !ready
    ? "warning"
    : diagnosis.position === "Entrada"
      ? "success"
      : diagnosis.position === "Premium"
        ? "warning"
        : "neutral";

  return `
    <div class="panel-header">
      <div>
        <span class="section-kicker">Hipótesis de precio</span>
        <h2 id="price-diagnosis-title">Diagnóstico publicado vs. simulado</h2>
        <p>Solo usa las referencias compatibles del escenario activo.</p>
      </div>
      <span class="status-badge ${tone}">${escapeHtml(diagnosisLabel)}</span>
    </div>
    <div class="planner-results">
      ${miniMetric(
        "Precio total Viva · simulado",
        scenario.target_price_pen ? money(scenario.target_price_pen) : "Por definir",
      )}
      ${miniMetric(
        "Precio Viva / m² · simulado",
        targetPricePerM2 ? priceM2(targetPricePerM2) : "Por definir",
      )}
      ${miniMetric(
        "Mediana publicada del alcance",
        ready ? priceM2(diagnosis.median) : "No disponible",
      )}
      ${miniMetric(
        "Diferencia frente a la mediana",
        ready && diagnosis.relative_difference_from_median_pct !== null
          ? signedPercent(diagnosis.relative_difference_from_median_pct)
          : "No calculable",
      )}
      ${miniMetric(
        "Rango intercuartílico publicado",
        ready
          ? `${priceM2(diagnosis.p25)} — ${priceM2(diagnosis.p75)}`
          : "No disponible",
      )}
      ${miniMetric(
        "Referencias compatibles",
        formatNumber(diagnosis.reference_count),
      )}
    </div>
    <div class="recommendation-card ${tone}" role="note">
      <strong>${escapeHtml(diagnosisLabel)}</strong>
      <p>${
        ready
          ? diagnosis.position
            ? escapeHtml(pricePositionCopy(diagnosis.position))
            : "Define área y precio para ubicar el escenario Viva dentro de la banda publicada."
          : "Se requieren al menos tres precios de lista compatibles para emitir un diagnóstico fuerte."
      }</p>
      <p>${escapeHtml(
        diagnosis.methodology ||
          "Escenario estimado frente a precios de lista publicados. No representa precios reales de cierre.",
      )}</p>
    </div>
  `;
}

function renderScoreExplanation(context) {
  const selectedCanonicalId = canonicalProjectId(state.selectedProjectId);
  const score =
    context.comparable_scores.find(
      (record) => record.project_id === selectedCanonicalId,
    ) ?? context.comparable_scores[0];

  if (!score) {
    return `
      <div class="panel-header">
        <div>
          <span class="section-kicker">Comparabilidad</span>
          <h2 id="score-explanation-title">Por qué es comparable</h2>
          <p>Los factores aparecerán cuando exista un proyecto elegible.</p>
        </div>
      </div>
      ${emptyState(
        "Comparables insuficientes",
        "Ajusta el alcance o los filtros de producto; la plataforma no ampliará la zona automáticamente.",
      )}
    `;
  }

  const project = findProjectById(score.project_id);
  const label =
    score.evidence_coverage_pct < 60
      ? "Orientativa"
      : score.score >= 80
        ? "Alta"
        : score.score >= 60
          ? "Media"
          : "Baja";

  return `
    <div class="panel-header">
      <div>
        <span class="section-kicker">Score explicable</span>
        <h2 id="score-explanation-title">Por qué es comparable</h2>
        <p>${escapeHtml(project?.project_name ?? score.project_id)}</p>
      </div>
      <div class="panel-header-actions">
        <span class="status-badge ${score.evidence_coverage_pct < 60 ? "warning" : "success"}">${escapeHtml(label)}</span>
        <span class="tag neutral">${formatNumber(score.score, 1)} / 100 · ${formatNumber(score.evidence_coverage_pct, 1)}% evidencia</span>
      </div>
    </div>
    <div class="bar-list">
      ${Object.values(score.components)
        .map((component) =>
          renderScoreFactor(
            component,
            project,
            context.scenario,
            context,
            score,
          ),
        )
        .join("")}
    </div>
  `;
}

function renderPriorityComparables(context) {
  const scores = context.comparable_scores.slice(0, 5);
  return `
    <div class="panel-header">
      <div>
        <span class="section-kicker">Lista prioritaria</span>
        <h2 id="priority-comparables-title">Comparables a revisar primero</h2>
        <p>Máximo cinco, ordenados por score, cobertura, distancia e ID estable.</p>
      </div>
      <button class="text-button" type="button" data-view="projects">Ver todos</button>
    </div>
    ${
      scores.length
        ? `
          <div class="bar-list">
            ${scores.map(renderComparableRow).join("")}
          </div>
        `
        : emptyState(
            "Comparables insuficientes",
            "El alcance permanece visible y no se amplía al distrito completo.",
          )
    }
  `;
}

function renderComparableRow(score) {
  const project = findProjectById(score.project_id);
  const selected =
    canonicalProjectId(state.selectedProjectId) === score.project_id;
  return `
    <button
      class="bar-row as-button"
      type="button"
      data-scenario-project="${escapeAttr(score.observed_project_id)}"
      ${selected ? 'aria-current="true"' : ""}
    >
      <div>
        <strong>${escapeHtml(project?.project_name ?? score.project_id)}</strong>
        <span>${escapeHtml(project?.agency_name ?? "Inmobiliaria no registrada")}</span>
      </div>
      <div class="bar-track" aria-hidden="true">
        <i style="width:${boundedPercent(score.score)}%"></i>
      </div>
      <em>${formatNumber(score.score, 1)} / 100<br>${formatNumber(score.evidence_coverage_pct, 1)}% evidencia</em>
    </button>
  `;
}

function renderScoreFactor(component, project, scenario, context, score) {
  const available = Number(component.available_weight) || 0;
  const maximum = Number(component.maximum_weight) || 0;
  const earned = Number(component.earned_points) || 0;
  const comparison = factorComparison(
    component.key,
    project,
    scenario,
    context,
    score,
  );
  const trailing = available
    ? `${formatNumber(earned, 1)}/${formatNumber(available, 1)} pts`
    : `No evaluado · peso ${formatNumber(maximum, 0)}`;

  return `
    <div class="bar-row">
      <div>
        <strong>${escapeHtml(FACTOR_LABELS[component.key] ?? component.key)}</strong>
        <span>${escapeHtml(comparison)}</span>
      </div>
      <div
        class="bar-track"
        role="img"
        aria-label="${escapeAttr(`${trailing}. ${component.explanation}`)}"
      >
        <i style="width:${available ? boundedPercent((earned / available) * 100) : 0}%"></i>
      </div>
      <em>${escapeHtml(trailing)}</em>
    </div>
  `;
}

function factorComparison(key, project, scenario, context, score) {
  if (key === "geography") {
    const projectValue = Number.isFinite(score.distance_meters)
      ? `${formatNumber(score.distance_meters, 0)} m`
      : project?.district || "Ámbito validado";
    return `${projectValue} · Viva: ${context.scope_text}`;
  }
  if (key === "area") {
    return `${project?.total_area ? `${formatNumber(project.total_area, 1)} m²` : "No disponible"} · Viva: ${scenario.target_area_m2 ? `${formatNumber(scenario.target_area_m2, 1)} m²` : "No definido"}`;
  }
  if (key === "bedrooms") {
    return `${project ? bedroomsLabel(project) : "No disponible"} · Viva: ${scenario.bedrooms === "all" ? "No definido" : `${scenario.bedrooms} dorm.`}`;
  }
  if (key === "typology") {
    return `${project?.typology || "No disponible"} · Viva: ${scenario.typology === "all" ? "No definida" : typologyLabel(scenario.typology)}`;
  }
  if (key === "delivery") {
    return `${project?.delivery_year || "No disponible"} · Viva: ${scenario.delivery_year === "all" ? "No definida" : scenario.delivery_year}`;
  }
  if (key === "price_per_m2") {
    const target = scenarioTargetPricePerM2(scenario);
    return `${project?.price_per_m2_list ? priceM2(project.price_per_m2_list) : "No disponible"} · Viva: ${target ? priceM2(target) : "No definido"}`;
  }
  return "Dato no disponible";
}

function renderSelectField({
  id,
  name,
  label,
  values = [],
  selected,
  labeler,
}) {
  const errorId = `${id}-error`;
  return `
    <label class="field-control" for="${escapeAttr(id)}">
      <span>${escapeHtml(label)}</span>
      <select
        id="${escapeAttr(id)}"
        name="${escapeAttr(name)}"
        data-scenario-product-field="${escapeAttr(name)}"
        aria-describedby="${escapeAttr(errorId)}"
      >
        ${values
          .map(
            (value) => `
              <option
                value="${escapeAttr(value)}"
                ${String(value) === String(selected) ? "selected" : ""}
              >${escapeHtml(labeler(value))}</option>
            `,
          )
          .join("")}
      </select>
      <small id="${escapeAttr(errorId)}" data-product-error="${escapeAttr(name)}" hidden></small>
    </label>
  `;
}

function renderNumberField({
  id,
  name,
  label,
  value,
  max,
  step,
  placeholder,
}) {
  const errorId = `${id}-error`;
  return `
    <label class="field-control" for="${escapeAttr(id)}">
      <span>${escapeHtml(label)}</span>
      <input
        id="${escapeAttr(id)}"
        name="${escapeAttr(name)}"
        data-scenario-product-field="${escapeAttr(name)}"
        type="number"
        min="0.01"
        max="${escapeAttr(max)}"
        step="${escapeAttr(step)}"
        inputmode="decimal"
        value="${escapeAttr(value ?? "")}"
        placeholder="${escapeAttr(placeholder)}"
        aria-describedby="${escapeAttr(errorId)}"
      />
      <small id="${escapeAttr(errorId)}" data-product-error="${escapeAttr(name)}" hidden></small>
    </label>
  `;
}

function typologyLabel(value) {
  const labels = {
    all: "Todos",
    casa: "Casa",
    departamento: "Departamento",
    lote: "Lote",
    oficina: "Oficina",
  };
  return labels[value] ?? value;
}

function bedroomsTargetLabel(value) {
  if (value === "all") return "Todos";
  if (Number(value) === 0) return "Estudio / 0 dormitorios";
  return `${value} dormitorio${Number(value) === 1 ? "" : "s"}`;
}

function deliveryTargetLabel(value) {
  return value === "all" ? "Todos" : String(value);
}

function scenarioTargetPricePerM2(scenario) {
  const area = Number(scenario?.target_area_m2);
  const price = Number(scenario?.target_price_pen);
  return Number.isFinite(area) &&
    area > 0 &&
    Number.isFinite(price) &&
    price > 0
    ? price / area
    : null;
}

function pricePositionLabel(position) {
  if (position === "Entrada") return "Entrada competitiva";
  if (position === "Alineado") return "Alineado";
  if (position === "Premium") return "Premium";
  return "Referencia publicada lista";
}

function pricePositionCopy(position) {
  if (position === "Entrada") {
    return "El precio simulado queda por debajo del P25 de las publicaciones compatibles.";
  }
  if (position === "Alineado") {
    return "El precio simulado está dentro de la banda central publicada, incluidos sus límites.";
  }
  if (position === "Premium") {
    return "El precio simulado queda por encima del P75 de las publicaciones compatibles.";
  }
  return "";
}

function signedPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "No calculable";
  const sign = number > 0 ? "+" : "";
  return `${sign}${formatNumber(number, 1)}%`;
}

function boundedPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, number));
}
