import { journeyEntry, journeyStages, views } from "../config.js";
import {
  DEFAULT_JOURNEY_STAGE_ID,
  journeyNeighbors,
  journeyStageById,
} from "../journey.js";

const BASE_STAGE_COPY = Object.freeze({
  scale: Object.freeze({
    reading: "Delimita la muestra observable antes de interpretar el mercado.",
    known: "El recorrido separa cobertura del modelo, profundidad del piloto y alcance del escenario.",
    limitation: "La cobertura describe lo observado; no representa la totalidad del mercado inmobiliario.",
  }),
  geography: Object.freeze({
    reading: "Ubica el escenario y conserva el mismo territorio en todo el análisis.",
    known: "El alcance territorial determina qué proyectos pueden verse y cuáles son comparables.",
    limitation: "Los cuadrantes son analíticos y no constituyen microzonas oficiales.",
  }),
  quality: Object.freeze({
    reading: "Contrasta fuentes antes de permitir que un dato alimente una comparación.",
    known: "El caso Tipo 7 muestra por qué una discrepancia visible puede exigir exclusión.",
    limitation: "Caso demostrativo transversal · Miraflores; no pertenece al escenario territorial activo.",
  }),
  depth: Object.freeze({
    reading: "Compara diferencias respaldadas sin confundir publicación con evidencia elegible.",
    known: "La comparación se organiza por atributos, denominadores y referencias trazables.",
    limitation: "Un precio publicado no demuestra un precio de cierre ni una pareja precio–área válida.",
  }),
  movement: Object.freeze({
    reading: "Prioriza cambios publicados que requieren seguimiento comercial.",
    known: "Cada señal conserva valor anterior, valor nuevo, vigencia y evidencia disponible.",
    limitation: "Un cambio observado no permite atribuir una causa que la fuente no declara.",
  }),
  decision: Object.freeze({
    reading: "Cierra el recorrido con una recomendación prudente y una siguiente acción verificable.",
    known: "La decisión reúne la lectura disponible, sus referencias y el checklist vigente.",
    limitation: "La demo no infiere precios de cierre, causalidad ni exhaustividad del mercado.",
  }),
});

const BASE_STATES = new Set(["ready", "loading", "unavailable", "error"]);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 }).format(number)
    : "No disponible";
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
    <aside class="journey-expert" aria-labelledby="journey-expert-title">
      <div>
        <p class="journey-section-label">Explorar análisis</p>
        <h2 id="journey-expert-title">Abrir el respaldo completo</h2>
      </div>
      <div class="journey-expert__links">
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
    </aside>
  `;
}

function renderBaseState(stage, status) {
  if (status === "loading") {
    return `
      <section class="journey-state journey-state--loading" aria-live="polite" aria-busy="true">
        <p class="journey-section-label">Preparando la etapa</p>
        <div class="journey-state__skeleton" aria-hidden="true"><span></span><span></span><span></span></div>
        <p>Estamos verificando el escenario y la evidencia antes de mostrar la lectura.</p>
      </section>
    `;
  }
  if (status === "error") {
    return `
      <section class="journey-state journey-state--error" role="alert">
        <p class="journey-section-label">No pudimos preparar la etapa</p>
        <p>La información necesaria no terminó de cargar. Reinicia el recorrido para volver a verificarla.</p>
      </section>
    `;
  }
  if (status === "unavailable") {
    return `
      <section class="journey-state journey-state--unavailable" role="status">
        <p class="journey-section-label">Lectura no disponible</p>
        <p>Esta capacidad no está disponible para el escenario o contrato actual. Conservamos la limitación sin sustituir datos.</p>
      </section>
    `;
  }

  const copy = BASE_STAGE_COPY[stage.id];
  return `
    <div class="journey-reading">
      <p class="journey-reading__lead">${escapeHtml(copy.reading)}</p>
      <div class="journey-reading__ledger">
        <section aria-labelledby="journey-known-title">
          <p class="journey-section-label">Lectura base</p>
          <h2 id="journey-known-title">Qué sabemos</h2>
          <p>${escapeHtml(copy.known)}</p>
        </section>
        <section class="journey-reading__limit" aria-labelledby="journey-limit-title">
          <p class="journey-section-label">Límite visible</p>
          <h2 id="journey-limit-title">Qué falta o no puede afirmarse</h2>
          <p>${escapeHtml(copy.limitation)}</p>
        </section>
      </div>
    </div>
  `;
}

function renderJourneyActions(stage, status) {
  const neighbors = journeyNeighbors(stage.id);
  const nextStageId = neighbors?.nextStageId ?? DEFAULT_JOURNEY_STAGE_ID;
  const primary = status === "loading"
    ? `<button class="journey-primary-action" type="button" disabled>${escapeHtml(stage.primaryActionLabel)}</button>`
    : status === "error"
      ? '<a class="journey-primary-action" href="#journey/scale">Reiniciar recorrido</a>'
      : status === "unavailable"
        ? '<a class="journey-primary-action" href="#dashboard">Ajustar escenario</a>'
        : `<a class="journey-primary-action" href="#journey/${escapeHtml(nextStageId)}">${escapeHtml(stage.primaryActionLabel)}</a>`;
  const previous = neighbors?.previousStageId
    ? `<a class="journey-previous-action" href="#journey/${escapeHtml(neighbors.previousStageId)}">Volver a la etapa anterior</a>`
    : "";
  return `<div class="journey-actions">${previous}${primary}</div>`;
}

export function renderJourney({
  stageId = DEFAULT_JOURNEY_STAGE_ID,
  status = "ready",
  announcement = "",
} = {}) {
  const stage = normalizeStage(stageId);
  const normalizedStatus = BASE_STATES.has(status) ? status : "unavailable";
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
        ${renderBaseState(stage, normalizedStatus)}
        ${renderExpertLinks(stage)}
        ${renderJourneyActions(stage, normalizedStatus)}
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
          <p class="eyebrow">Viva Inteligencia / Recorrido</p>
          <strong>${escapeHtml(journeyEntry.label)}</strong>
          <span>Etapa ${stage.position} de ${journeyStages.length} · ${escapeHtml(stage.label)}</span>
        </div>
      </div>
      <div class="journey-topbar__scenario" aria-label="Escenario activo">
        <strong>${escapeHtml(model.scopeTitle ?? "Escenario por confirmar")}</strong>
        <span>${escapeHtml(model.cutoffLabel ?? "Corte no disponible")}</span>
      </div>
      <div class="journey-topbar__counts">
        <span><strong>${escapeHtml(formatNumber(model.comparableCount))}</strong> comparables</span>
        <span><strong>${escapeHtml(formatNumber(model.reviewCount))}</strong> fuera o por revisar</span>
      </div>
      <div class="journey-topbar__actions">
        <a class="ghost-button" href="#dashboard">Ajustar escenario</a>
        <button
          class="ghost-button scenario-reset"
          id="reset-scenario"
          type="button"
          data-scenario-action="reset"
          ${model.loading ? "disabled" : ""}
        >Reiniciar</button>
      </div>
    </header>
  `;
}
