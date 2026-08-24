import { journeyEntry, journeyStages, views } from "../config.js";
import {
  DEFAULT_JOURNEY_STAGE_ID,
  journeyNeighbors,
  journeyStageById,
} from "../journey.js";

const BASE_STAGE_COPY = Object.freeze({
  scale: Object.freeze({
    reading: "Primero confirma cuánta información sostiene la lectura.",
    known: "La demo separa la cobertura general, la muestra revisada y los proyectos de la zona activa.",
    limitation: "La cobertura describe lo observado; no representa la totalidad del mercado inmobiliario.",
  }),
  geography: Object.freeze({
    reading: "Ubica el escenario y conserva la misma zona en todo el análisis.",
    known: "La zona elegida determina qué proyectos pueden verse y cuáles pueden compararse.",
    limitation: "Los cuadrantes ayudan a ordenar la muestra; no son microzonas oficiales.",
  }),
  quality: Object.freeze({
    reading: "Contrasta las fuentes antes de usar un dato en una comparación.",
    known: "El caso Tipo 7 muestra por qué una discrepancia visible puede exigir exclusión.",
    limitation: "Es un ejemplo de Miraflores para revisar la calidad del dato; no pertenece a la zona activa.",
  }),
  depth: Object.freeze({
    reading: "Compara diferencias respaldadas sin asumir que todo dato publicado puede usarse.",
    known: "La comparación organiza atributos, base utilizada y fuente de cada proyecto.",
    limitation: "Un precio publicado no demuestra el precio de cierre ni que precio y área provengan de la misma unidad.",
  }),
  movement: Object.freeze({
    reading: "Prioriza cambios publicados que requieren seguimiento comercial.",
    known: "Cada señal conserva valor anterior, valor nuevo, fecha y fuente disponible.",
    limitation: "Un cambio observado no permite atribuir una causa que la fuente no declara.",
  }),
  decision: Object.freeze({
    reading: "Cierra el recorrido con una recomendación prudente y una siguiente acción verificable.",
    known: "La decisión reúne la lectura disponible, sus fuentes y la validación comercial.",
    limitation: "La demo no infiere precios de cierre, causalidad ni exhaustividad del mercado.",
  }),
});

const BASE_STATES = new Set([
  "ready",
  "loading",
  "empty",
  "insufficient",
  "error",
  "capability_unavailable",
  "contract_unavailable",
  "unavailable",
]);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatNumber(value) {
  const number = finiteNumber(value);
  return number !== null
    ? new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 }).format(number)
    : "No disponible";
}

function finiteNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    typeof value === "boolean" ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatDecimal(value, digits = 2) {
  const number = finiteNumber(value);
  return number === null
    ? "No disponible"
    : new Intl.NumberFormat("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(number);
}

function formatCurrency(value) {
  const number = finiteNumber(value);
  return number === null
    ? "No disponible"
    : new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN",
        maximumFractionDigits: 0,
      }).format(number);
}

function formatPercent(value) {
  const number = finiteNumber(value);
  return number === null ? "No disponible" : `${formatDecimal(number, 2)}%`;
}

function statusLabel(value) {
  return {
    ready: "Referencia de precio disponible",
    orientative: "Lectura orientativa",
    insufficient: "Evidencia insuficiente",
    unavailable: "No disponible",
    current: "Vigente",
    aging: "En seguimiento",
    historical: "Histórico",
    unknown: "Vigencia no determinada",
  }[value] ?? String(value ?? "No disponible");
}

function renderFact(id, label, value, detail = "") {
  return `
    <div class="journey-fact metric-pair" data-journey-fact="${escapeHtml(id)}">
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value)}</dd>
      ${detail ? `<p>${escapeHtml(detail)}</p>` : ""}
    </div>
  `;
}

function renderScaleFacts(data) {
  const pilot = data?.pilot ?? {};
  const scenario = data?.scenario ?? {};
  return [
    renderFact(
      "model-agencies",
      "Inmobiliarias modeladas",
      formatNumber(data?.modelAgencyCount),
      "Cobertura general del modelo; no equivale al piloto.",
    ),
    renderFact(
      "pilot-levels",
      "Piloto por profundidad",
      `${formatNumber(pilot.baseCount)} / ${formatNumber(pilot.enrichedCount)} / ${formatNumber(pilot.deepCount)}`,
      "Base / enriquecidas / evidencia profunda. Son niveles anidados y no se suman.",
    ),
    renderFact(
      "scenario-sample",
      scenario.scopeText ?? "Escenario activo",
      `${formatNumber(scenario.observedProjectCount)} observados · ${formatNumber(scenario.comparableProjectCount)} comparables`,
      "La comparación usa solo el subconjunto elegible del escenario.",
    ),
  ];
}

function renderGeographyFacts(data) {
  const observedCount = finiteNumber(data?.scope?.observed_project_count);
  const comparableCount = finiteNumber(data?.comparableProjectCount);
  const unreconciledCount =
    observedCount !== null && comparableCount !== null
      ? Math.max(0, observedCount - comparableCount)
      : null;
  return [
    renderFact(
      "geography-scope",
      "Alcance activo",
      data?.scopeText ?? "No disponible",
      "Distrito, cuadrante o radio analítico; no es un límite legal oficial.",
    ),
    renderFact(
      "geography-sample",
      "Muestra del escenario",
      `${formatNumber(observedCount)} observados · ${formatNumber(comparableCount)} comparables`,
    ),
    renderFact(
      "geography-exclusions",
      "No reconciliados o por revisar",
      formatNumber(unreconciledCount),
      "Se conservan en la cobertura observada y se excluyen de comparabilidad.",
    ),
  ];
}

function renderQualityFacts(data) {
  const eligible = data?.decision?.benchmarkEligible === true;
  return [
    `
      <div class="journey-fact journey-fact--sources metric-pair">
        <dt>Dos fuentes, una discrepancia</dt>
        <dd>
          <span data-journey-fact="card-area">Tarjeta · ${escapeHtml(formatDecimal(data?.cardArea?.normalized_value))} m²</span>
          <span data-journey-fact="plan-area">Plano · ${escapeHtml(formatDecimal(data?.planArea?.normalized_value))} m²</span>
        </dd>
        <p>Ambas observaciones se conservan con su fuente.</p>
      </div>
    `,
    renderFact(
      "area-delta",
      "Diferencia derivada",
      `${formatDecimal(data?.areaDelta?.normalized_value)} m²`,
      "Explica el conflicto; no crea una nueva área certificada.",
    ),
    renderFact(
      "benchmark-decision",
      "Decisión de uso",
      eligible ? "Elegible para benchmark" : "Excluido del benchmark",
      eligible
        ? "El expediente cumple las reglas de uso vigentes."
        : "La inconsistencia bloquea su uso en agregados certificados.",
    ),
  ];
}

function renderDepthFacts(data) {
  const quantitative = data?.quantitative ?? {};
  return [
    renderFact(
      "depth-scope",
      "Proyectos en alcance",
      formatNumber(data?.scope?.projectCount),
    ),
    renderFact(
      "depth-eligible",
      "Parejas certificadas elegibles",
      formatNumber(quantitative.n),
      "Solo precio y área compatibles pueden sostener un indicador certificado.",
    ),
    renderFact(
      "depth-orientative",
      "Cocientes orientativos",
      formatNumber(quantitative.orientative?.n),
      "Se muestran como referencia publicada no comparable; no sustituyen parejas elegibles.",
    ),
  ];
}

function renderMovementFacts(data) {
  const signal = Array.isArray(data?.timeline) ? data.timeline[0] : null;
  return [
    renderFact(
      "movement-signal",
      "Señal prioritaria",
      signal?.project?.canonical_name ?? "Sin señal elegible",
      signal
        ? `${formatCurrency(signal.previous_value)} → ${formatCurrency(signal.current_value)}`
        : "No se observó un cambio elegible.",
    ),
    renderFact(
      "movement-change",
      "Variación publicada",
      formatPercent(signal?.delta_pct),
      signal?.validity
        ? `Vigencia: ${statusLabel(signal.validity)}.`
        : "Vigencia no disponible.",
    ),
    renderFact(
      "movement-coverage",
      "Cobertura visible",
      `${formatNumber(data?.coverage?.shown_count)} de ${formatNumber(data?.coverage?.scenario_event_count)} señales`,
      "Describe cambios publicados; la causa no está observada.",
    ),
  ];
}

function responseItemText(item) {
  if (!item || typeof item !== "object") return "";
  if (item.text) return String(item.text);
  if (item.label && item.value !== undefined) {
    return `${item.label}: ${item.value}${item.unit && item.unit !== "count" ? ` ${item.unit}` : ""}`;
  }
  if (item.label) return String(item.label);
  return "";
}

function responseBlockText(response, type) {
  const block = response?.blocks?.find((candidate) => candidate.type === type);
  return (block?.items ?? [])
    .map(responseItemText)
    .filter(Boolean)
    .join(" ");
}

function renderDecisionDisclosure(response) {
  const references =
    response?.blocks
      ?.find((candidate) => candidate.type === "references")
      ?.items?.map(responseItemText)
      .filter(Boolean) ?? [];
  if (!references.length) return "";
  const referenceLabel = references.length === 1
    ? "1 referencia"
    : `${formatNumber(references.length)} referencias`;
  return `
    <details class="journey-decision-disclosure">
      <summary>Ver ${escapeHtml(referenceLabel)}</summary>
      <div>
        <div data-journey-response-block="references">
          <strong>Referencias:</strong>
          <ul>${references.map((label) => `<li>${escapeHtml(label)}</li>`).join("")}</ul>
        </div>
      </div>
    </details>
  `;
}

function renderDecisionResponseFacts(response) {
  const answer = responseBlockText(response, "answer") || "Sin lectura elegible";
  const data = responseBlockText(response, "data") || "Sin datos elegibles";
  const interpretation =
    responseBlockText(response, "interpretation") ||
    "La interpretación no está disponible.";
  const nextStep =
    responseBlockText(response, "next_step") || "Revisar el checklist comercial";
  const limitations =
    responseBlockText(response, "limitations") || "Sin límites adicionales registrados.";
  const scope = response.scenario?.scopeText ?? "Escenario activo";
  return [
    renderFact(
      "decision-answer",
      "Respuesta breve",
      answer,
      interpretation,
    ),
    renderFact(
      "decision-data",
      "Datos usados",
      data,
      `Escenario: ${scope}`,
    ),
    `
      <div class="journey-fact metric-pair" data-journey-fact="decision-next-step">
        <dt>Siguiente verificación</dt>
        <dd>${escapeHtml(nextStep)}</dd>
        <p data-journey-response-block="limitations"><strong>Límites:</strong> ${escapeHtml(limitations)}</p>
        ${renderDecisionDisclosure(response)}
      </div>
    `,
  ];
}

function renderDecisionFacts(data) {
  const response = data?.response ?? null;
  if (response) {
    return renderDecisionResponseFacts(response);
  }
  const checklist = data?.checklist ?? {};
  return [
    renderFact(
      "decision-mode",
      "Modo de decisión",
      "Lista de verificación",
      checklist.scopeText ?? "Escenario activo",
    ),
    renderFact(
      "decision-checklist",
      "Base disponible",
      `${formatNumber(checklist.comparableCount)} comparables · ${formatNumber(checklist.priceReferenceCount)} referencias de precio`,
      `${formatNumber(checklist.evidenceCoverage)}% de cobertura de evidencia.`,
    ),
    renderFact(
      "decision-status",
      "Estado de la lectura",
      statusLabel(checklist.priceStatus),
      "La recomendación final requiere formular una consulta explícita; no se genera automáticamente.",
    ),
  ];
}

function renderStageFacts(stageId, data) {
  if (!data) return "";
  const facts = {
    scale: renderScaleFacts,
    geography: renderGeographyFacts,
    quality: renderQualityFacts,
    depth: renderDepthFacts,
    movement: renderMovementFacts,
    decision: renderDecisionFacts,
  }[stageId]?.(data);
  return Array.isArray(facts) && facts.length
    ? `<dl class="journey-facts metric-row" data-journey-stage-data>${facts.join("")}</dl>`
    : "";
}

function normalizeStage(stageId) {
  return (
    journeyStageById(stageId) ??
    journeyStageById(DEFAULT_JOURNEY_STAGE_ID)
  );
}

function expertHref(stageId, viewId) {
  return stageId === "quality" && viewId === "inspector"
    ? "#inspector/case/f3-ct-g-pardo"
    : `#${viewId}`;
}

function renderRail(activeStage) {
  return `
    <nav class="journey-rail" aria-label="Etapas del recorrido ejecutivo">
      <ol>
        ${journeyStages.map((stage) => `
          <li class="journey-rail__item ${stage.id === activeStage.id ? "is-current" : ""}">
            <a
              href="#journey/${escapeHtml(stage.id)}"
              data-journey-step="${escapeHtml(stage.id)}"
              ${stage.id === activeStage.id ? 'aria-current="step"' : ""}
            >
              <span class="journey-rail__number" aria-hidden="true">${String(stage.position).padStart(2, "0")}</span>
              <span>
                <strong>${escapeHtml(stage.label)}</strong>
                <small>${escapeHtml(stage.question)}</small>
              </span>
            </a>
          </li>
        `).join("")}
      </ol>
      <details class="journey-rail__mobile">
        <summary>Etapa ${activeStage.position} de ${journeyStages.length} · ${escapeHtml(activeStage.label)}</summary>
        <div>
          ${journeyStages.map((stage) => `
            <a
              href="#journey/${escapeHtml(stage.id)}"
              data-journey-mobile-step="${escapeHtml(stage.id)}"
              ${stage.id === activeStage.id ? 'aria-current="step"' : ""}
            >${String(stage.position).padStart(2, "0")} · ${escapeHtml(stage.label)}</a>
          `).join("")}
        </div>
      </details>
    </nav>
  `;
}

function renderExpertLinks(stage) {
  const permittedViews = stage.expertLinks
    .map((viewId) => views.find(({ id }) => id === viewId))
    .filter(Boolean);
  return `
    <details class="journey-expert detail-disclosure">
      <summary>
        <span>
          <strong>Profundizar esta lectura</strong>
          <small>Abre las herramientas expertas relacionadas con esta etapa.</small>
        </span>
      </summary>
      <div class="journey-expert__body detail-disclosure__body">
        <div>
          <p class="journey-section-label">Explorar análisis</p>
          <h2 id="journey-expert-title">Revisar el detalle</h2>
        </div>
        <div class="journey-expert__links" aria-labelledby="journey-expert-title">
          ${permittedViews.map((view) => `
            <a
              class="journey-expert-link"
              href="${escapeHtml(expertHref(stage.id, view.id))}"
              data-journey-expert="${escapeHtml(view.id)}"
            >
              <strong>${escapeHtml(view.label)}</strong>
              <span>${escapeHtml(view.hint)}</span>
            </a>
          `).join("")}
        </div>
      </div>
    </details>
  `;
}

function stateMessage(stage, model) {
  const version = model?.capability?.contractVersion ?? "actual";
  const minimum = model?.capability?.minimumContractVersion ?? "compatible";
  if (model.status === "empty") {
    return stage.id === "geography"
      ? "No hay proyectos observados para este alcance. Ajusta el escenario sin sustituirlo por datos de otra zona."
      : "No hay información elegible para esta etapa en el escenario activo. El vacío se conserva como resultado."
  }
  if (model.status === "insufficient") {
    return "La evidencia disponible no alcanza para cerrar esta lectura. Revisa el detalle y la acción correctiva antes de continuar."
  }
  if (["capability_unavailable", "contract_unavailable", "unavailable"].includes(model.status)) {
    return `Esta etapa no está disponible para el contrato ${version}; requiere ${minimum}. No se muestran datos de otra capacidad como sustituto.`;
  }
  return "La información necesaria no terminó de cargar. Reinicia el recorrido para volver a verificarla.";
}

function renderBaseState(stage, model) {
  const status = model.status;
  if (status === "loading") {
    return `
      <section class="journey-state journey-state--loading" aria-live="polite" aria-busy="true">
        <p class="journey-section-label">Preparando la etapa</p>
        <div class="journey-state__skeleton" aria-hidden="true"><span></span><span></span><span></span></div>
        <p>Estamos verificando el escenario y la evidencia antes de mostrar la lectura.</p>
      </section>
    `;
  }
  if (status !== "ready") {
    const unavailable = [
      "empty",
      "insufficient",
      "capability_unavailable",
      "contract_unavailable",
      "unavailable",
    ].includes(status);
    return `
      <div class="journey-reading">
        <div class="journey-reading__ledger decision-line">
          <section class="journey-state ${unavailable ? "journey-state--unavailable" : "journey-state--error"}" ${status === "error" ? 'role="alert"' : 'role="status"'}>
            <p class="journey-section-label">${status === "empty" ? "Sin proyectos para esta lectura" : status === "insufficient" ? "Evidencia insuficiente" : status === "error" ? "No pudimos preparar la etapa" : "Lectura no disponible"}</p>
            <h2 id="journey-known-title">Qué sabemos</h2>
            <p class="journey-reading__lead decision-line__reading">${escapeHtml(stateMessage(stage, model))}</p>
            ${renderStageFacts(stage.id, model.data)}
          </section>
          <section class="journey-reading__limit decision-line__limit">
            <p class="journey-section-label">Límite de la lectura</p>
            <h2 id="journey-limit-title">Qué falta o no puede afirmarse</h2>
            <p>${escapeHtml(BASE_STAGE_COPY[stage.id].limitation)}</p>
          </section>
        </div>
      </div>
    `;
  }

  const copy = BASE_STAGE_COPY[stage.id];
  return `
    <div class="journey-reading">
      <div class="journey-reading__ledger decision-line">
        <section aria-labelledby="journey-known-title">
          <p class="journey-section-label">Lectura principal</p>
          <h2 id="journey-known-title">Qué sabemos</h2>
          <p class="journey-reading__lead decision-line__reading">${escapeHtml(copy.reading)}</p>
          <p>${escapeHtml(copy.known)}</p>
        </section>
        <section class="journey-reading__limit decision-line__limit" aria-labelledby="journey-limit-title">
          <p class="journey-section-label">Límite de la lectura</p>
          <h2 id="journey-limit-title">Qué falta o no puede afirmarse</h2>
          <p>${escapeHtml(copy.limitation)}</p>
        </section>
      </div>
      ${renderStageFacts(stage.id, model.data)}
    </div>
  `;
}

function renderJourneyActions(stage, model) {
  const status = model.status;
  const neighbors = journeyNeighbors(stage.id);
  const nextStageId = neighbors?.nextStageId ?? DEFAULT_JOURNEY_STAGE_ID;
  const insufficientWithData =
    status === "insufficient" && model.data && model.correctiveAction;
  const primary = status === "loading"
    ? `<button class="journey-primary-action" type="button" disabled>${escapeHtml(stage.primaryActionLabel)}</button>`
    : model.correctiveAction?.href && model.correctiveAction?.label && !insufficientWithData
      ? `<a class="journey-primary-action" href="${escapeHtml(model.correctiveAction.href)}">${escapeHtml(model.correctiveAction.label)}</a>`
      : status === "error"
        ? '<a class="journey-primary-action" href="#journey/scale">Reiniciar recorrido</a>'
        : insufficientWithData
          ? `<a class="journey-primary-action" href="#journey/${escapeHtml(nextStageId)}">${escapeHtml(stage.primaryActionLabel)}</a>`
        : status !== "ready"
          ? '<a class="journey-primary-action" href="#dashboard">Ajustar escenario</a>'
          : `<a class="journey-primary-action" href="#journey/${escapeHtml(nextStageId)}">${escapeHtml(stage.primaryActionLabel)}</a>`;
  const previous = neighbors?.previousStageId
    ? `<a class="journey-previous-action" href="#journey/${escapeHtml(neighbors.previousStageId)}">Volver a la etapa anterior</a>`
    : "";
  const corrective = insufficientWithData
    ? `<a class="journey-corrective-link" data-journey-corrective-action href="${escapeHtml(model.correctiveAction.href)}">${escapeHtml(model.correctiveAction.label)}</a>`
    : "";
  return `<div class="journey-actions">${previous}${corrective}${primary}</div>`;
}

export function renderJourney({
  stageId = DEFAULT_JOURNEY_STAGE_ID,
  status = "ready",
  stageModel = null,
  announcement = "",
} = {}) {
  const stage = normalizeStage(stageId);
  const candidateStatus = stageModel?.status ?? status;
  const normalizedStatus = BASE_STATES.has(candidateStatus)
    ? candidateStatus
    : "unavailable";
  const model = {
    stageId: stage.id,
    status: normalizedStatus,
    capability: stageModel?.capability ?? null,
    data: stageModel?.data ?? null,
    correctiveAction: stageModel?.correctiveAction ?? null,
  };
  return `
    <section
      class="journey-view"
      data-journey-stage="${escapeHtml(stage.id)}"
      data-journey-state="${escapeHtml(normalizedStatus)}"
      aria-labelledby="journey-title"
    >
      ${renderRail(stage)}
      <article class="journey-stage">
        <header class="journey-stage__header">
          <p class="journey-stage__eyebrow">Etapa ${stage.position} de ${journeyStages.length} · ${escapeHtml(stage.label)}</p>
          <h1 id="journey-title" tabindex="-1">${escapeHtml(stage.question)}</h1>
        </header>
        ${renderBaseState(stage, model)}
        ${renderExpertLinks(stage)}
        ${renderJourneyActions(stage, model)}
      </article>
      <p id="journey-live" class="sr-only" aria-live="polite" aria-atomic="true">${escapeHtml(announcement)}</p>
    </section>
  `;
}

export function renderJourneyTopbar(model = {}, stageId = DEFAULT_JOURNEY_STAGE_ID) {
  const stage = normalizeStage(stageId);
  return `
    <header class="topbar journey-topbar" aria-label="Contexto del recorrido ejecutivo">
      <div class="journey-topbar__heading">
        <button
          class="icon-button menu-toggle"
          id="menu-toggle"
          type="button"
          aria-controls="primary-sidebar"
          aria-expanded="${Boolean(model.mobileNavOpen)}"
          aria-label="Abrir menú principal"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"></path></svg>
        </button>
        <div>
          <strong>${escapeHtml(journeyEntry.label)}</strong>
          <span>Etapa ${stage.position} de ${journeyStages.length} · ${escapeHtml(stage.label)}</span>
        </div>
      </div>
      <div class="journey-topbar__scenario" aria-label="Escenario activo">
        <span>Escenario activo</span>
        <strong>${escapeHtml(model.scopeTitle ?? "Escenario por confirmar")}</strong>
      </div>
    </header>
  `;
}
