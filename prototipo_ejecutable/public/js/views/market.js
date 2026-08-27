import {
  componentHelp,
  escapeAttr,
  escapeHtml,
  formatNumber,
} from "../domain.js";
import {
  isEligiblePriceReference,
  quantileR7,
} from "../comparability.js";
import { state } from "../state.js";

const QUADRANT_ORDER = ["NW", "NE", "SW", "SE"];

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function countOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function scaleValue(value, suffix) {
  const count = countOrNull(value);
  return count === null ? "No disponible" : `${formatNumber(count)} ${suffix}`;
}

function renderScaleLedger() {
  const counts = state.data?.metadata?.counts ?? {};
  const pilot = state.data?.pilot?.counts ?? {};
  const scenario = state.scenarioContext ?? {};
  const modelAgencyCount = countOrNull(counts.canonical_agencies);
  const pilotBaseCount = countOrNull(pilot.base_count);
  const pilotEnrichedCount = countOrNull(pilot.enriched_count);
  const pilotDeepCount = countOrNull(pilot.deep_count);
  const observedProjectCount = countOrNull(
    scenario.scope?.observed_project_count ??
      scenario.observed_scope_project_ids?.length,
  );
  const comparableProjectCount = countOrNull(
    scenario.market_reading?.comparable_project_count ??
      scenario.comparable_project_ids?.length,
  );

  return `
    <section
      class="scale-primer span-12"
      aria-labelledby="scale-primer-title"
      data-scale-ledger
      data-model-agencies="${escapeAttr(modelAgencyCount ?? "")}"
      data-pilot-base="${escapeAttr(pilotBaseCount ?? "")}"
      data-pilot-enriched="${escapeAttr(pilotEnrichedCount ?? "")}"
      data-pilot-deep="${escapeAttr(pilotDeepCount ?? "")}"
      data-scenario-observed="${escapeAttr(observedProjectCount ?? "")}"
      data-scenario-comparable="${escapeAttr(comparableProjectCount ?? "")}"
    >
      <div class="scale-primer__heading">
        <span class="benchmark-kicker">Regla de escala</span>
        <h2 id="scale-primer-title">Tres niveles de cobertura que no deben sumarse</h2>
        <p>La cobertura general, la muestra revisada y el escenario activo responden preguntas distintas.</p>
      </div>
      <dl class="scale-ledger">
        <div>
          <dt>Cobertura general</dt>
          <dd>${scaleValue(modelAgencyCount, "inmobiliarias")}</dd>
          <small>Inmobiliarias normalizadas disponibles en la demo.</small>
        </div>
        <div>
          <dt>Muestra revisada</dt>
          <dd>${scaleValue(pilotBaseCount, "base")} · ${scaleValue(pilotEnrichedCount, "enriquecidas")} · ${scaleValue(pilotDeepCount, "profundas")}</dd>
          <small>Son niveles de cobertura dentro del piloto, no grupos adicionales.</small>
        </div>
        <div>
          <dt>Zona activa</dt>
          <dd>${scaleValue(observedProjectCount, "observados")} · ${scaleValue(comparableProjectCount, "comparables")}</dd>
          <small>Se recalcula con el distrito y los filtros vigentes.</small>
        </div>
      </dl>
    </section>
  `;
}

function districtName(district) {
  return district?.source_name ?? district?.district_name ?? "Distrito";
}

function rankHighLoadDistricts(districts) {
  return [...(districts ?? [])]
    .filter((district) => district.high_load)
    .sort(
      (left, right) =>
        right.observed_project_count - left.observed_project_count ||
        districtName(left).localeCompare(districtName(right), "es"),
    );
}

export function resolveMarketDistricts({
  geography,
  districtId,
} = {}) {
  const allDistricts = geography?.districts ?? [];
  return {
    ranking: rankHighLoadDistricts(allDistricts),
    active:
      allDistricts.find(
        (district) => district.district_id === districtId,
      ) ?? null,
  };
}

function observedId(project) {
  return `observed:nexo-${project.id}`;
}

function canonicalId(project) {
  return `project:nexo-${project.id}`;
}

function projectIndexes() {
  const projects = state.data?.projects ?? [];
  return {
    byObservedId: new Map(
      projects.map((project) => [observedId(project), project]),
    ),
    byCanonicalId: new Map(
      projects.map((project) => [canonicalId(project), project]),
    ),
  };
}

function formatPublishedPrice(value) {
  return value
    ? `S/ ${formatNumber(value, 0)} / m²`
    : "No disponible";
}

function staticQuadrantReading(quadrant, indexes, cutoffAt) {
  const observedIds = quadrant.observed_project_ids ?? [];
  const authoritativeIds = quadrant.authoritative_project_ids ?? [];
  const projects = observedIds
    .map((id) => indexes.byObservedId.get(id))
    .filter(Boolean);
  const agencies = new Set(
    projects
      .map((project) => String(project.agency_name ?? "").trim())
      .filter(Boolean),
  );
  const priceProjects = authoritativeIds
    .map((id) => indexes.byCanonicalId.get(id))
    .filter(Boolean)
    .filter((project) =>
      isEligiblePriceReference({ project, cutoffAt }),
    );

  return {
    observed: observedIds.length,
    geographyValid: observedIds.length,
    reconciled: authoritativeIds.length,
    agencies: agencies.size,
    priceReferenceCount: priceProjects.length,
    medianPublishedPricePerM2: quantileR7(
      priceProjects.map((project) => project.price_per_m2_list),
      0.5,
    ),
  };
}

function activeScenarioReading(quadrantId) {
  const context = state.scenarioContext;
  const active =
    state.scenario?.scope_mode === "quadrant" &&
    state.scenario?.quadrant_id === quadrantId &&
    context?.scenario?.district_id === state.scenario?.district_id &&
    context?.scenario?.quadrant_id === quadrantId;
  if (!active) return null;

  const diagnosis = context.price_diagnosis ?? {};
  const comparabilityLabels = {
    ready: "Comparabilidad lista",
    orientative: "Comparabilidad orientativa",
    insufficient: "Comparables insuficientes",
  };
  const pricePositionLabels = {
    entry: "Entrada competitiva",
    aligned: "Alineado",
    premium: "Premium",
    Entrada: "Entrada competitiva",
    Alineado: "Alineado",
    Premium: "Premium",
  };
  return {
    comparableCount: context.comparable_project_ids?.length ?? 0,
    comparabilityLabel:
      comparabilityLabels[context.comparability_status] ??
      "Comparabilidad sin estado",
    evidenceCoverage: context.evidence_coverage_pct ?? 0,
    priceStatus: context.price_status,
    priceReferenceCount:
      context.price_reference_project_ids?.length ?? 0,
    priceMedian: positiveNumber(diagnosis.median),
    pricePosition:
      pricePositionLabels[diagnosis.position] ??
      diagnosis.position ??
      null,
  };
}

function rankingRow(district, index, maximumObserved) {
  const name = districtName(district);
  const observed = district.observed_project_count ?? 0;
  const geographyValid = district.polygon_valid_count ?? 0;
  const outside = Math.max(observed - geographyValid, 0);
  const selected = district.district_id === state.scenario?.district_id;
  const width = maximumObserved
    ? Math.max(0, Math.min(100, (observed / maximumObserved) * 100))
    : 0;

  return `
    <button
      class="bar-row as-button"
      id="market-district-${escapeAttr(district.district_id)}"
      type="button"
      data-district-chip="${escapeAttr(district.district_id)}"
      aria-pressed="${selected}"
    >
      <span>
        <strong>${formatNumber(index + 1)}. ${escapeHtml(name)}</strong>
        <span class="status-badge success">Top 7 · alta carga</span>
      </span>
      <span>
        <span class="bar-track" aria-hidden="true">
          <i style="width:${width.toFixed(1)}%"></i>
        </span>
        <span>${formatNumber(geographyValid)}/${formatNumber(observed)} con geografía válida</span>
      </span>
      <em>
        <strong>${formatNumber(observed)} observados</strong>
        ${
          outside
            ? `${formatNumber(outside)} fuera del polígono`
            : "Sin exclusiones territoriales"
        }
      </em>
    </button>
  `;
}

function activeScenarioMarkup(activeReading) {
  if (!activeReading) {
    return `
      <span>
        Selecciona esta fila para calcular comparables del escenario.
      </span>
    `;
  }
  const priceCopy =
    activeReading.priceStatus === "ready"
      ? `${formatNumber(activeReading.priceReferenceCount)} referencias · mediana ${formatPublishedPrice(activeReading.priceMedian)}`
      : `${formatNumber(activeReading.priceReferenceCount)} referencias · precio insuficiente`;
  return `
    <span>
      <strong>Escenario activo</strong>
      ${formatNumber(activeReading.comparableCount)} comparables ·
      ${escapeHtml(activeReading.comparabilityLabel)} ·
      ${formatNumber(activeReading.evidenceCoverage, 1)}% de evidencia
    </span>
    <span>
      ${escapeHtml(priceCopy)}
      ${
        activeReading.pricePosition
          ? ` · ${escapeHtml(activeReading.pricePosition)}`
          : ""
      }
    </span>
  `;
}

function quadrantRow(quadrant, indexes, cutoffAt) {
  const reading = staticQuadrantReading(quadrant, indexes, cutoffAt);
  const activeReading = activeScenarioReading(quadrant.quadrant_id);
  const selected = Boolean(activeReading);
  const label = quadrant.label ?? quadrant.quadrant_id;

  return `
    <button
      class="bar-row as-button"
      id="market-quadrant-${escapeAttr(quadrant.quadrant_id.toLowerCase())}"
      type="button"
      data-scenario-quadrant="${escapeAttr(quadrant.quadrant_id)}"
      aria-pressed="${selected}"
    >
      <span>
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(quadrant.quadrant_id)} · cuadrante analítico</span>
      </span>
      <span>
        <strong>${formatNumber(reading.observed)} observados asignados</strong>
        ${formatNumber(reading.geographyValid)} con geografía válida ·
        ${formatNumber(reading.reconciled)} reconciliados ·
        ${formatNumber(reading.agencies)} inmobiliarias
      </span>
      <em>
        <strong>Referencia publicada provisional</strong>
        ${formatPublishedPrice(reading.medianPublishedPricePerM2)} ·
        ${formatNumber(reading.priceReferenceCount)} precios compatibles
        ${activeScenarioMarkup(activeReading)}
      </em>
    </button>
  `;
}

function noQuadrants(district) {
  return `
    <div class="empty-state">
      <strong>Sin cuadrantes analíticos disponibles</strong>
      <p>
        ${escapeHtml(districtName(district))} no pertenece al Top 7 de alta
        carga o no tiene cuatro cuadrantes versionados. La lectura permanece
        en el alcance seleccionado; no se sustituye silenciosamente por el
        distrito completo.
      </p>
    </div>
  `;
}

const BENCHMARK_STATUS = {
  ready: { label: "Listo", tone: "success" },
  orientative: { label: "Orientativo", tone: "warning" },
  orientative_noncomparable: {
    label: "Orientación no comparable",
    tone: "warning",
  },
  insufficient: { label: "Información insuficiente", tone: "warning" },
  contract_unavailable: { label: "Contrato no disponible", tone: "neutral" },
  error: { label: "Benchmark no disponible", tone: "danger" },
};

function benchmarkStatus(status) {
  return BENCHMARK_STATUS[status] ?? BENCHMARK_STATUS.error;
}

function formatCutoff(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha de corte no disponible";
  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function scopeDescription(context, district) {
  const scope = context?.scope ?? {};
  const districtLabel = districtName(district);
  if (scope.scopeMode === "quadrant" && scope.quadrantId) {
    return `${districtLabel} · Cuadrante ${scope.quadrantId}`;
  }
  if (scope.scopeMode === "radius" && positiveNumber(scope.radiusMeters)) {
    return `${districtLabel} · Radio de ${formatNumber(scope.radiusMeters)} m`;
  }
  return `${districtLabel} · Distrito completo`;
}

function formatPricePerM2(value) {
  const price = positiveNumber(value);
  return price ? `S/ ${formatNumber(price, 0)} / m²` : "No disponible";
}

function projectLabel(projectId, summaries) {
  const summary = summaries.get(projectId);
  if (!summary) return projectId;
  return `${summary.name}${summary.agencyName ? ` · ${summary.agencyName}` : ""}`;
}

function projectList(projectIds, summaries, emptyCopy = "Ninguno") {
  if (!projectIds?.length) return `<p>${escapeHtml(emptyCopy)}</p>`;
  return `
    <ul class="benchmark-id-list">
      ${projectIds
        .map(
          (projectId) => `
            <li>
              <span>${escapeHtml(projectLabel(projectId, summaries))}</span>
              <code>${escapeHtml(projectId)}</code>
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

function renderBenchmarkUnavailable(context, district) {
  const meta = benchmarkStatus(context?.status);
  const contractUnavailable = context?.status === "contract_unavailable";
  return `
    <section class="benchmark-sheet benchmark-state-panel span-12" data-benchmark-status="${escapeAttr(context?.status ?? "error")}">
      <header class="benchmark-sheet__header">
        <div>
          <span class="benchmark-kicker">Benchmark de microzona</span>
          <h2>${escapeHtml(scopeDescription(context, district))}</h2>
        </div>
        <span class="status-badge ${meta.tone}">${escapeHtml(meta.label)}</span>
      </header>
      <div class="benchmark-state-copy">
        <strong>${contractUnavailable ? "Esta versión de datos conserva el análisis territorial, pero no incluye la información necesaria para comparar el mercado." : "No se pudo construir una referencia de mercado segura."}</strong>
        <p>${contractUnavailable ? "Puedes seguir consultando distritos y cuadrantes. Usa una versión de datos compatible para ver la base, la composición y los atributos." : "La vista se detuvo para no mostrar cifras parciales. Revisa la versión de datos y vuelve a cargar la demo."}</p>
        ${context?.errorCodes?.length ? `<p class="benchmark-error-code">Código: ${escapeHtml(context.errorCodes.join(", "))}</p>` : ""}
      </div>
    </section>
  `;
}

function renderEvidenceLine(context) {
  const quantitative = context.quantitative.pricePerM2Total;
  const qualitative = context.qualitative;
  const steps = [
    {
      label: "Alcance",
      value: context.scope.projectCount,
      copy: "Proyectos comparables del escenario activo.",
    },
    {
      label: "Pareja demostrada",
      value: quantitative.n,
      copy: "Precio publicado desde y área total vinculados por la fuente.",
    },
    {
      label: "Orientación",
      value: quantitative.orientative.n,
      copy: "Cálculos con valores mínimos; no sostienen una recomendación de precio.",
    },
    {
      label: "Atributos informados",
      value: qualitative.coverage.usedProjectIds.length,
      copy: "Proyectos con campo cualitativo informado.",
    },
  ];
  return `
    <ol class="benchmark-evidence-line benchmark-row-ledger" aria-label="Transformación del universo de benchmark">
      ${steps
        .map(
          (step) => `
            <li>
              <span class="benchmark-evidence-line__node" aria-hidden="true"></span>
              <div>
                <span>${escapeHtml(step.label)}</span>
                <strong>${formatNumber(step.value)}</strong>
                <p>${escapeHtml(step.copy)}</p>
              </div>
            </li>
          `,
        )
        .join("")}
    </ol>
  `;
}

function renderCommercialBenchmarkSummary(context) {
  const quantitative = context.quantitative.pricePerM2Total;
  const coverage = quantitative.coverage;
  const rawPublications = state.scenarioContext?.price_reference_project_ids?.length ?? 0;
  const orientativeCount = quantitative.orientative?.n ?? 0;
  return `
    <section
      class="benchmark-decision-brief"
      aria-labelledby="benchmark-decision-title"
      data-commercial-benchmark-summary
      data-raw-publications="${escapeAttr(rawPublications)}"
      data-orientative-ratios="${escapeAttr(orientativeCount)}"
      data-eligible-pairs="${escapeAttr(quantitative.n)}"
    >
      <div class="benchmark-decision-brief__copy">
        <span class="benchmark-kicker">Lectura para decidir</span>
        <h3 id="benchmark-decision-title">Referencia orientativa; no es un benchmark certificado</h3>
        <p>Sirve para reconocer el rango de entrada publicado. No representa precios reales de cierre ni una recomendación de posicionamiento.</p>
      </div>
      <dl class="benchmark-decision-ledger" aria-label="Partición principal del benchmark">
        <div><dt>Publicaciones con precio y área</dt><dd>${formatNumber(rawPublications)}</dd></div>
        <div><dt>Cocientes orientativos</dt><dd>${formatNumber(orientativeCount)}</dd></div>
        <div><dt>Usados / parejas elegibles</dt><dd>${formatNumber(quantitative.n)}</dd></div>
        <div><dt>Faltantes</dt><dd>${formatNumber(coverage.missingProjectIds.length)}</dd></div>
        <div><dt>Excluidos</dt><dd>${formatNumber(coverage.excludedProjects.length)}</dd></div>
      </dl>
    </section>
  `;
}

function progressiveBenchmarkSection(label, description, content, className) {
  return `
    <details class="benchmark-progressive ${escapeAttr(className)}">
      <summary>
        <span><strong>${escapeHtml(label)}</strong>${escapeHtml(description)}</span>
        <span aria-hidden="true">+</span>
      </summary>
      <div class="benchmark-progressive__body">${content}</div>
    </details>
  `;
}

function renderQuantitative(context) {
  const quantitative = context.quantitative.pricePerM2Total;
  const orientation = quantitative.orientative;
  const eligibleReady = quantitative.status === "ready";
  const eligibleOrientative = quantitative.status === "orientative";
  const showNoncomparableOrientation =
    !eligibleReady && !eligibleOrientative && orientation.n > 0;
  const series = eligibleReady ? quantitative : orientation;
  const title = eligibleReady
    ? "Referencia elegible por m² de área total"
    : eligibleOrientative
      ? "Referencia elegible orientativa"
      : showNoncomparableOrientation
        ? "Índice orientativo de entrada"
        : "Referencia elegible por m² de área total";
  const caution = eligibleReady
    ? "Parejas precio–área demostradas y elegibles según las reglas de la demo."
    : eligibleOrientative
      ? "La pareja precio–área está demostrada, pero una muestra de uno o dos proyectos no describe una distribución."
      : showNoncomparableOrientation
        ? "Cálculo con precios y áreas mínimos publicados. No demuestra una tipología y no sustenta una recomendación de precio."
        : "No hay parejas precio–área demostradas suficientes para calcular una referencia.";
  const coverage = quantitative.coverage;
  return `
    <section class="benchmark-section benchmark-quantitative" aria-labelledby="benchmark-quantitative-title">
      <div class="benchmark-section__heading">
        <div>
          <span class="benchmark-section__index">02 · Referencia</span>
          <h3 id="benchmark-quantitative-title">${escapeHtml(title)}</h3>
          <p>${escapeHtml(caution)}</p>
        </div>
        <span class="status-badge ${eligibleReady ? "success" : "warning"}">
          ${
            eligibleReady
              ? `${formatNumber(quantitative.n)} elegibles`
              : eligibleOrientative
                ? `${formatNumber(quantitative.n)} elegible${quantitative.n === 1 ? "" : "s"} · muestra corta`
                : showNoncomparableOrientation
                  ? `${formatNumber(orientation.n)} orientativos`
                  : "Información insuficiente"
          }
        </span>
      </div>
      ${
        eligibleReady
          ? `
            <div class="benchmark-quantile-strip" aria-label="Cuantiles visibles del ${eligibleReady ? "benchmark elegible" : "índice orientativo"}">
              <div><span>P25</span><strong>${formatPricePerM2(series.p25)}</strong></div>
              <div class="is-median"><span>Mediana</span><strong>${formatPricePerM2(series.median)}</strong></div>
              <div><span>P75</span><strong>${formatPricePerM2(series.p75)}</strong></div>
            </div>
          `
          : eligibleOrientative
            ? `
              <div class="benchmark-short-sample" role="status">
                <span>Referencia observada · n = ${formatNumber(quantitative.n)}</span>
                <strong>${formatPricePerM2(quantitative.median)}</strong>
                <p>Valor orientativo; no se muestran P25/P75 como si existiera una distribución robusta.</p>
              </div>
            `
            : showNoncomparableOrientation
              ? `
                <div class="benchmark-quantile-strip" aria-label="Cuantiles visibles del índice orientativo no comparable">
                  <div><span>P25</span><strong>${formatPricePerM2(series.p25)}</strong></div>
                  <div class="is-median"><span>Mediana</span><strong>${formatPricePerM2(series.median)}</strong></div>
                  <div><span>P75</span><strong>${formatPricePerM2(series.p75)}</strong></div>
                </div>
              `
          : `
            <div class="benchmark-insufficient" role="status">
              <strong>Información insuficiente</strong>
              <p>No hay parejas precio–área probadas para calcular una referencia elegible.</p>
            </div>
          `
      }
      <dl class="benchmark-method-strip">
        <div><dt>Tipo de precio</dt><dd>Precio publicado desde</dd></div>
        <div><dt>Base del cálculo</dt><dd>Área total</dd></div>
        <div><dt>Método</dt><dd>Percentiles R-7</dd></div>
        <div><dt>Casos considerados</dt><dd>${formatNumber(coverage.inputProjectIds.length)} de entrada = ${formatNumber(coverage.usedProjectIds.length)} usados + ${formatNumber(coverage.missingProjectIds.length)} faltantes + ${formatNumber(coverage.excludedProjects.length)} excluidos</dd></div>
      </dl>
    </section>
  `;
}

function renderOfferComposition(context, summaries) {
  const projects = context.projectSummaries ?? [];
  const agencies = new Set(projects.map(({ agencyName }) => agencyName).filter(Boolean));
  const reportedUnits = projects
    .map(({ reportedUnits: cell }) => positiveNumber(cell?.normalizedValue))
    .filter(Boolean);
  const reportedUnitTotal = reportedUnits.reduce((total, value) => total + value, 0);
  return `
    <section class="benchmark-section benchmark-offer" aria-labelledby="benchmark-offer-title">
      <div class="benchmark-section__heading">
        <div>
          <span class="benchmark-section__index">03 · Composición</span>
          <h3 id="benchmark-offer-title">Oferta de la muestra</h3>
          <p>Conteos de la misma zona, sin convertir publicaciones en ventas o stock.</p>
        </div>
      </div>
      <dl class="benchmark-ledger">
        <div><dt>Proyectos comparables</dt><dd>${formatNumber(context.scope.projectCount)}</dd></div>
        <div><dt>Inmobiliarias identificadas</dt><dd>${formatNumber(agencies.size)}</dd></div>
        <div><dt>Unidades reportadas por la publicación</dt><dd>${reportedUnits.length ? `${formatNumber(reportedUnitTotal)} · ${formatNumber(reportedUnits.length)}/${formatNumber(context.scope.projectCount)} informados` : "No informado"}</dd></div>
      </dl>
      <details class="benchmark-disclosure">
        <summary>Ver composición de la muestra</summary>
        ${projectList(context.scope.projectIds, summaries)}
      </details>
    </section>
  `;
}

function renderAttribute(attribute, summaries) {
  const informed = attribute.informedProjectCount ?? 0;
  const announced = attribute.announcedProjectCount ?? 0;
  const missing = attribute.coverage?.missingProjectIds?.length ?? 0;
  const excluded = attribute.coverage?.excludedProjects?.length ?? 0;
  const percentage = Math.max(0, Math.min(100, attribute.prevalencePercent ?? 0));
  const canShowPrevalence =
    attribute.canDescribePattern === true && informed >= 5;
  const originalLabels = [
    ...new Set((attribute.originalValues ?? []).map(({ originalValue }) => originalValue)),
  ];
  return `
    <article class="benchmark-attribute" data-attribute-id="${escapeAttr(attribute.attributeId)}">
      <div class="benchmark-attribute__summary">
        <div>
          <strong>${escapeHtml(attribute.label)}</strong>
          <span>Anunciado · ${formatNumber(announced)}/${formatNumber(informed)} informados</span>
        </div>
        ${
          canShowPrevalence
            ? `<strong>${formatNumber(percentage, 1)}%</strong>`
            : '<span class="status-badge warning">Muestra insuficiente</span>'
        }
      </div>
      ${
        canShowPrevalence
          ? `<div class="benchmark-prevalence" aria-label="${escapeAttr(`${attribute.label}: ${percentage}%`)}"><i style="width:${percentage}%"></i></div>`
          : ""
      }
      <p>${formatNumber(missing)} no informados · ${formatNumber(excluded)} excluidos · ${formatNumber(attribute.documentedProjectCount ?? 0)} documentados</p>
      ${canShowPrevalence ? "" : "<p>Menos de cinco proyectos informados: se muestran conteos, no prevalencia.</p>"}
      <details>
        <summary>Ver proyectos y texto original</summary>
        ${originalLabels.length ? `<p><strong>Texto original:</strong> ${escapeHtml(originalLabels.join(" · "))}</p>` : "<p>Sin texto anunciado en la muestra.</p>"}
        ${projectList(attribute.announcedProjectIds, summaries, "Ningún proyecto lo anuncia.")}
      </details>
    </article>
  `;
}

function renderQualitative(context, summaries) {
  const attributes = [...(context.qualitative.attributes ?? [])]
    .filter((attribute) => (attribute.announcedProjectCount ?? 0) > 0)
    .sort(
      (left, right) =>
        (right.prevalencePercent ?? 0) - (left.prevalencePercent ?? 0) ||
        left.label.localeCompare(right.label, "es"),
    );
  const visible = attributes.slice(0, 6);
  const remaining = attributes.slice(6);
  return `
    <section class="benchmark-section benchmark-qualitative" aria-labelledby="benchmark-qualitative-title">
      <div class="benchmark-section__heading">
        <div>
          <span class="benchmark-section__index">04 · Atributos</span>
          <h3 id="benchmark-qualitative-title">Atributos anunciados</h3>
          <p>Prevalencia sobre proyectos con el campo informado. “No informado” nunca significa “No tiene”.</p>
        </div>
        <span class="status-badge ${context.qualitative.status === "ready" ? "success" : "warning"}">
          ${formatNumber(context.qualitative.coverage.usedProjectIds.length)}/${formatNumber(context.scope.projectCount)} informados
        </span>
      </div>
      <details class="benchmark-progressive benchmark-progressive--attributes">
        <summary>
          <span><strong>Explorar atributos</strong>Prevalencias, cobertura y texto original.</span>
          <span aria-hidden="true">+</span>
        </summary>
        <div class="benchmark-progressive__body">
          <div class="benchmark-attribute-list">
            ${visible.map((attribute) => renderAttribute(attribute, summaries)).join("")}
          </div>
          ${remaining.length ? `<details class="benchmark-disclosure benchmark-more-attributes"><summary>Ver ${formatNumber(remaining.length)} atributos anunciados adicionales</summary><div class="benchmark-attribute-list">${remaining.map((attribute) => renderAttribute(attribute, summaries)).join("")}</div></details>` : ""}
          <div class="benchmark-data-gaps" aria-label="Coberturas que requieren más evidencia">
            <div><strong>Acabados y materiales</strong><span>Información insuficiente en la muestra territorial.</span></div>
            <div><strong>Estacionamientos</strong><span>Se muestran como “No informado” cuando la publicación no declara el dato.</span></div>
          </div>
        </div>
      </details>
    </section>
  `;
}

function renderCompositionAndExclusions(context, summaries) {
  const quantitative = context.quantitative.pricePerM2Total;
  const coverage = quantitative.coverage;
  return `
    <details class="benchmark-disclosure benchmark-audit">
      <summary>Composición, exclusiones y metodología</summary>
      <div class="benchmark-audit__grid">
        <section>
          <h3>Usados por el benchmark elegible</h3>
          ${projectList(coverage.usedProjectIds, summaries, "Ninguna pareja precio–área demostrada.")}
        </section>
        <section>
          <h3>Faltantes</h3>
          ${projectList(coverage.missingProjectIds, summaries)}
        </section>
        <section>
          <h3>Excluidos</h3>
          ${
            coverage.excludedProjects.length
              ? `<ul class="benchmark-id-list">${coverage.excludedProjects.map(({ projectId, reasons, inspectorPath }) => `<li><span>${escapeHtml(projectLabel(projectId, summaries))}<code>${escapeHtml(projectId)}</code></span><span><small>${escapeHtml((reasons ?? []).join(" · "))}</small>${inspectorPath ? `<a href="${escapeAttr(inspectorPath)}">Abrir inspector</a>` : ""}</span></li>`).join("")}</ul>`
              : "<p>Ninguno.</p>"
          }
        </section>
        <section>
          <h3>Regla de lectura</h3>
          <p>Solo <code>source_paired</code> entra al benchmark elegible. Los mínimos sin vínculo probado permanecen como orientación no comparable.</p>
          <p>${escapeHtml(context.methodology.certification_label)} · corte ${escapeHtml(formatCutoff(context.methodology.cutoff_at))}.</p>
        </section>
      </div>
    </details>
  `;
}

function renderTerritorialContext() {
  const { ranking: districts, active: district } =
    resolveMarketDistricts({
      geography: state.data?.geography,
      districtId: state.scenario?.district_id,
    });
  if (!district) {
    return `
      <section class="panel span-12">
        <div class="empty-state">
          <strong>Lectura territorial no disponible</strong>
          <p>El distrito activo no pertenece al ranking geográfico versionado.</p>
        </div>
      </section>
    `;
  }

  const indexes = projectIndexes();
  const cutoffAt = state.data?.metadata?.cutoff_at;
  const quadrants = [...(district.quadrants ?? [])].sort(
    (left, right) =>
      QUADRANT_ORDER.indexOf(left.quadrant_id) -
      QUADRANT_ORDER.indexOf(right.quadrant_id),
  );
  const totalObserved = districts.reduce(
    (total, item) => total + (item.observed_project_count ?? 0),
    0,
  );
  const totalGeographyValid = districts.reduce(
    (total, item) => total + (item.polygon_valid_count ?? 0),
    0,
  );
  const outsidePolygon = Math.max(
    totalObserved - totalGeographyValid,
    0,
  );
  const outsideBreakdown = districts
    .map((item) => ({
      name: districtName(item),
      count: Math.max(
        (item.observed_project_count ?? 0) -
          (item.polygon_valid_count ?? 0),
        0,
      ),
    }))
    .filter(({ count }) => count > 0)
    .map(({ name, count }) => `${name} ${formatNumber(count)}`)
    .join(", ");
  const activeOutside = Math.max(
    (district.observed_project_count ?? 0) -
      (district.polygon_valid_count ?? 0),
    0,
  );

  return `
    <section class="dashboard-grid market-reading">
      <section class="benchmark-hero span-12">
        <div>
          <span class="status-badge ${district.high_load ? "success" : "neutral"}">
            ${
              district.high_load
                ? "Top 7 · alta carga"
                : "Lectura distrital · sin cuadrantes"
            }
          </span>
          <h2>Lectura territorial de ${escapeHtml(districtName(district))}</h2>
          <p>
            Compara la carga observada del distrito y abre sus cuadrantes
            analíticos sin confundirlos con microzonas oficiales.
          </p>
        </div>
        <div class="phase-stack" aria-label="Cobertura del distrito activo">
          <strong>
            ${formatNumber(district.polygon_valid_count)}/${formatNumber(district.observed_project_count)}
            con geografía válida
          </strong>
          <span>
            ${formatNumber(district.authoritative_project_count)}
            observados reconciliados antes del filtro territorial
          </span>
          <span>
            ${
              activeOutside
                ? `${formatNumber(activeOutside)} fuera del polígono OSM; permanece visible como brecha de cobertura.`
                : "Sin proyectos fuera del polígono OSM en este distrito."
            }
          </span>
        </div>
      </section>

      <section class="panel span-12 market-ranking">
        <div class="panel-header">
          <div>
            <h2>Ranking distrital por carga observada</h2>
            <p>
              Los siete distritos con más proyectos en la muestra. Seleccionar una
              fila actualiza la zona activa.
            </p>
          </div>
          ${componentHelp(
            "Cómo leer el ranking",
            "La longitud representa proyectos observados, no ventas ni stock. La cobertura territorial compara esos observados con los puntos que caen dentro o sobre el límite OSM versionado.",
          )}
        </div>
        <div class="bar-list" role="group" aria-label="Top siete distritos de alta carga">
          ${districts
            .map((item, index) =>
              rankingRow(
                item,
                index,
                districts[0]?.observed_project_count ?? 1,
              ),
            )
            .join("")}
        </div>
        <details class="content-expander">
          <summary>Cobertura territorial del ranking</summary>
          <div class="bar-list">
            <p>
              ${formatNumber(totalGeographyValid)}/${formatNumber(totalObserved)}
              proyectos tienen geografía válida dentro de los siete límites
              versionados. Los ${formatNumber(outsidePolygon)} restantes
              quedan reportados como fuera del polígono:
              ${escapeHtml(outsideBreakdown)}.
            </p>
            <p>
              Geometría referencial: © OpenStreetMap contributors, ODbL 1.0.
              RENLIM es la referencia jurídica para límites oficiales.
            </p>
          </div>
        </details>
      </section>

      <section class="panel span-12 market-quadrants">
        <div class="panel-header">
          <div>
            <h2>Cuadrantes para analizar la muestra</h2>
            <p>
              ${escapeHtml(districtName(district))}: división reproducible por
              las medianas de latitud y longitud de proyectos con geografía
              válida.
            </p>
          </div>
          ${componentHelp(
            "Qué significa un cuadrante",
            "Noroeste, noreste, suroeste y sureste dividen la muestra para facilitar su lectura. No representan límites municipales, catastrales ni microzonas oficiales.",
          )}
        </div>
        ${
          district.high_load && quadrants.length
            ? `
              <div class="bar-list" role="group" aria-label="Cuatro cuadrantes analíticos">
                ${quadrants
                  .map((quadrant) =>
                    quadrantRow(quadrant, indexes, cutoffAt),
                  )
                  .join("")}
              </div>
            `
            : noQuadrants(district)
        }
        <details class="content-expander">
          <summary>Metodología y alcance de precios</summary>
          <div class="bar-list">
            <p>
              Los proyectos fuera del polígono se excluyen antes de asignar
              cuadrante; no se sustituyen por una lectura distrital. Por eso la
              suma de cuadrantes coincide con la geografía válida, no siempre
              con todos los observados.
            </p>
            <p>
              “Referencia publicada provisional” resume precios de lista PEN
              compatibles, con URL y fecha hasta el corte. No representa un
              benchmark elegible ni transacciones de cierre observadas.
            </p>
            <p>
              Solo la fila del cuadrante activo muestra comparables y
              diagnóstico del escenario vigente. Las otras
              filas conservan los conteos de la muestra y no recomponen
              escenarios durante el render.
            </p>
          </div>
        </details>
      </section>
    </section>
  `;
}

export function renderMarket() {
  const { active: district } = resolveMarketDistricts({
    geography: state.data?.geography,
    districtId: state.scenario?.district_id,
  });
  if (!district) return renderTerritorialContext();

  const benchmark = state.benchmarkContext;
  const benchmarkAvailable =
    benchmark && !["contract_unavailable", "error"].includes(benchmark.status);
  const summaries = new Map(
    (benchmark?.projectSummaries ?? []).map((project) => [
      project.projectId,
      project,
    ]),
  );
  const quantitative = benchmark?.quantitative?.pricePerM2Total;
  const statusMeta = benchmarkStatus(benchmark?.status);
  const thesis = benchmarkAvailable
    ? quantitative.n > 0
      ? `${districtName(district)}: ${formatNumber(benchmark.scope.projectCount)} comparables; ${formatNumber(quantitative.n)} sostienen una referencia elegible por m².`
      : quantitative.orientative.n > 0
        ? `${districtName(district)} tiene ${formatNumber(benchmark.scope.projectCount)} comparables; ${formatNumber(quantitative.orientative.n)} permiten un índice orientativo.`
        : `${districtName(district)} tiene ${formatNumber(benchmark.scope.projectCount)} comparables, pero no dispone de pares precio–área demostrados ni referencias orientativas utilizables.`
    : null;

  return `
    <section class="dashboard-grid market-reading benchmark-view" data-scenario-consumer="benchmark">
      ${
        benchmarkAvailable
          ? `
            <article class="benchmark-sheet span-12" data-benchmark-status="${escapeAttr(benchmark.status)}">
              <header class="benchmark-sheet__header">
                <div>
                  <span class="benchmark-kicker">Benchmark de microzona</span>
                  <h2>${escapeHtml(thesis)}</h2>
                  <p>${escapeHtml(scopeDescription(benchmark, district))} · corte ${escapeHtml(formatCutoff(benchmark.methodology.cutoff_at))}</p>
                </div>
                <span class="status-badge ${statusMeta.tone}">${escapeHtml(statusMeta.label)}</span>
              </header>

              ${renderCommercialBenchmarkSummary(benchmark)}
              ${renderQuantitative(benchmark)}

              <footer class="benchmark-sheet__footer">
                <div>
                  <strong>¿Qué cambia entre proyectos de esta misma muestra?</strong>
                  <span>Contrasta precio, áreas, producto y evidencia por filas homogéneas.</span>
                </div>
                <button class="primary-button benchmark-primary-action" type="button" data-view="compare">
                  Comparar proyectos de esta muestra
                </button>
              </footer>

              <section class="benchmark-secondary" aria-label="Detalle complementario del benchmark">
                ${progressiveBenchmarkSection(
                  "Cómo se construye la muestra",
                  "Alcance, parejas demostradas y cobertura informada.",
                  `<section class="benchmark-section benchmark-scope" aria-labelledby="benchmark-scope-title">
                    <div class="benchmark-section__heading">
                      <div>
                        <span class="benchmark-section__index">01 · Alcance</span>
                        <h3 id="benchmark-scope-title">Cómo se usa esta muestra</h3>
                        <p>Cada paso conserva la misma zona y muestra qué información puede sostener.</p>
                      </div>
                      ${componentHelp(
                        "Cómo leer la línea de evidencia",
                        "La zona no cambia. Cada indicador distingue proyectos usados, faltantes y excluidos; una referencia basada en mínimos no se convierte en una comparación confiable.",
                      )}
                    </div>
                    ${renderEvidenceLine(benchmark)}
                  </section>`,
                  "benchmark-progressive--scope",
                )}
                ${progressiveBenchmarkSection(
                  "Composición de la muestra",
                  "Proyectos, inmobiliarias y unidades declaradas.",
                  renderOfferComposition(benchmark, summaries),
                  "benchmark-progressive--offer",
                )}
                ${renderQualitative(benchmark, summaries)}
                ${renderCompositionAndExclusions(benchmark, summaries)}
              </section>
            </article>
          `
          : renderBenchmarkUnavailable(benchmark, district)
      }

      ${renderScaleLedger()}

      <details class="benchmark-territory span-12">
        <summary>
          <span>
            <strong>Contexto territorial</strong>
            Distritos con más proyectos y cuadrantes de la muestra
          </span>
          <span>${formatNumber(district.polygon_valid_count)}/${formatNumber(district.observed_project_count)} con geografía válida</span>
        </summary>
        <div class="benchmark-territory__content">
          ${renderTerritorialContext()}
        </div>
      </details>
    </section>
  `;
}
