import { getHistoryEventDetail } from "../history.js";
import {
  escapeAttr,
  escapeHtml,
  formatDate,
  formatNumber,
  safeUrl,
} from "../domain.js";
import { state } from "../state.js";

const STATUS_LABELS = Object.freeze({
  certified: "Con fuente confirmada",
  reviewable: "Por revisar",
  insufficient: "Insuficiente",
});

const VALIDITY_LABELS = Object.freeze({
  current: "Vigente",
  aging: "En seguimiento",
  historical: "Histórica",
  unknown: "Vigencia desconocida",
});

const DIRECTION_LABELS = Object.freeze({
  increase: "Aumento",
  decrease: "Disminución",
  unchanged: "Sin cambio",
});

const REASON_LABELS = Object.freeze({
  invalid_status: "El estado de origen no es válido.",
  inverted_dates: "Las fechas observadas no conservan un orden válido.",
  invalid_dates: "Una fecha necesaria no está disponible.",
  unknown_currency: "La moneda no pudo confirmarse.",
  invalid_values: "Los valores observados no son comparables.",
  inconsistent_delta: "La variación no coincide con los valores observados.",
  missing_project_reference: "Falta la referencia canónica del proyecto.",
  missing_observation_reference: "Falta una observación necesaria.",
  missing_fact_reference: "Falta un hecho necesario.",
  incompatible_fact: "Los hechos no representan la misma métrica.",
  missing_evidence_reference: "Falta una referencia de evidencia.",
  unavailable_evidence: "La evidencia no está disponible.",
  restricted_evidence: "La evidencia tiene acceso restringido.",
  unsupported_cause: "La causa mencionada no tiene evidencia suficiente.",
});

const FILTER_OPTIONS = Object.freeze({
  statuses: Object.freeze([
    ["all", "Todos los estados"],
    ["certified", "Con fuente confirmada"],
    ["reviewable", "Por revisar"],
    ["insufficient", "Insuficientes"],
  ]),
  validities: Object.freeze([
    ["all", "Todas las vigencias"],
    ["current", "Vigentes"],
    ["aging", "En seguimiento"],
    ["historical", "Históricas"],
    ["unknown", "Vigencia desconocida"],
  ]),
  directions: Object.freeze([
    ["all", "Todos los cambios"],
    ["increase", "Aumentos"],
    ["decrease", "Disminuciones"],
    ["unchanged", "Sin cambio"],
  ]),
});

const FILTER_VALUES = Object.freeze({
  statuses: Object.freeze(["certified", "reviewable", "insufficient"]),
  validities: Object.freeze(["current", "aging", "historical", "unknown"]),
  directions: Object.freeze(["increase", "decrease", "unchanged"]),
});

const DEFAULT_VISIBLE_SIGNALS = 5;

export function renderActivity() {
  const context = state.historyContext;
  if (!context) return renderLoadingHistory();

  const status = context.status ?? "error";
  const header = renderHistoryHeader(context);
  if (status === "contract_unavailable") {
    return renderHistoryShell({
      status,
      header,
      body: renderUnavailableHistory(),
    });
  }
  if (status === "invalid_context" || status === "error") {
    return renderHistoryShell({
      status,
      header,
      body: renderIntegrityError(),
    });
  }

  return renderHistoryShell({
    status,
    header,
    body: `
      ${renderCurrentSignalBrief(context)}
      ${renderQualityBand(context)}
      ${renderHistoryFilters(context)}
      ${renderHistoryTimeline(context)}
      ${renderHistoryAgenda(context)}
    `,
  });
}

function renderHistoryShell({ status, header, body }) {
  return `
    <section
      class="history-view"
      data-scenario-consumer="history"
      data-history-status="${escapeAttr(status)}"
      aria-labelledby="history-view-title"
    >
      ${header}
      <div id="history-live" class="history-sr-only" aria-live="polite" aria-atomic="true"></div>
      ${body}
    </section>
  `;
}

function renderLoadingHistory() {
  return renderHistoryShell({
    status: "loading",
    header: `
      <header class="history-hero">
        <div>
          <span class="history-eyebrow">Cuaderno de señales</span>
          <h2 id="history-view-title">Preparando señales del escenario</h2>
          <p>Estamos organizando cambios, fechas y evidencia.</p>
        </div>
      </header>
    `,
    body: `
      <section class="history-state" aria-busy="true">
        <strong>Preparando el histórico</strong>
        <p>La lectura aparecerá cuando el escenario termine de cargar.</p>
      </section>
    `,
  });
}

function renderHistoryHeader(context) {
  const district = state.selectedDistrict || "Distrito no informado";
  const scope = scopeLabel(context);
  const certified = Number(context.coverage?.by_status?.certified ?? 0);
  const priority = context.timeline?.find(
    ({ effective_status: status }) => status === "certified",
  );
  const cutoff =
    context.scenario?.cutoff_at ?? state.scenarioContext?.cutoff_at ?? null;
  return `
    <header class="history-hero">
      <div class="history-hero__copy">
        <span class="history-eyebrow">Cuaderno de señales</span>
        <h2 id="history-view-title">Cambios publicados en ${escapeHtml(district)}</h2>
        <p>${escapeHtml(scope)} · Corte ${escapeHtml(formatDate(cutoff))}. Cada cambio compara dos observaciones publicadas; no representa una venta.</p>
      </div>
      <div class="history-hero__actions" aria-label="Acciones principales del histórico">
        ${priority && certified > 0 ? `
          <button
            class="secondary-button history-primary-action"
            id="history-priority-action"
            type="button"
            data-history-priority="${escapeAttr(priority.history_event_id)}"
          >Revisar señal prioritaria</button>
        ` : ""}
        <button class="secondary-button" type="button" data-view="projects">Ver comparables</button>
      </div>
    </header>
  `;
}

function scopeLabel(context) {
  const scope = context.scenario?.scope ?? state.scenarioContext?.scope ?? {};
  if (scope.scope_mode === "quadrant") {
    return `Cuadrante analítico ${scope.quadrant_id ?? "sin identificar"}`;
  }
  if (scope.scope_mode === "radius") {
    const radius = Number(scope.radius_meters);
    return Number.isFinite(radius)
      ? `Radio de ${formatNumber(radius / 1000, 1)} km`
      : "Radio del escenario";
  }
  return "Distrito completo";
}

function renderCurrentSignalBrief(context) {
  const signal = context.timeline?.[0] ?? null;
  if (!signal) {
    return `
      <section class="history-signal-brief is-empty" data-history-signal-brief="empty">
        <div>
          <span class="history-eyebrow">Lectura del movimiento</span>
          <h3>Sin una señal vigente para resumir</h3>
          <p>La ausencia de dos observaciones compatibles no demuestra estabilidad. Revisa filtros o comparables antes de decidir.</p>
        </div>
      </section>
    `;
  }

  const causeLabel = signal.cause ?? "Causa no observada";
  const causeStatus = signal.cause_status ?? "not_observed";
  return `
    <section
      class="history-signal-brief"
      aria-labelledby="history-signal-brief-title"
      data-history-signal-brief="ready"
      data-history-current-event="${escapeAttr(signal.history_event_id)}"
      data-history-current-validity="${escapeAttr(signal.validity ?? "unknown")}"
      data-history-current-status="${escapeAttr(signal.effective_status ?? "insufficient")}"
      data-history-current-cause="${escapeAttr(causeStatus)}"
    >
      <div class="history-signal-brief__thesis">
        <span class="history-eyebrow">Lectura del movimiento</span>
        <h3 id="history-signal-brief-title">Hay un cambio publicado; su causa no se presume</h3>
        <p>${escapeHtml(signal.project?.canonical_name ?? "Proyecto sin nombre")} encabeza la agenda vigente. El cambio describe publicaciones observadas, no ventas ni una explicación causal.</p>
      </div>
      <dl class="history-signal-brief__ledger">
        <div>
          <dt>Anterior → nuevo</dt>
          <dd><strong>${escapeHtml(valueLabel(signal.previous_value, signal))}</strong><span aria-hidden="true">→</span><strong>${escapeHtml(valueLabel(signal.current_value, signal))}</strong></dd>
        </div>
        <div>
          <dt>Actualidad</dt>
          <dd><strong>${escapeHtml(VALIDITY_LABELS[signal.validity] ?? "Vigencia desconocida")}</strong><small>Observado ${escapeHtml(formatDate(signal.current_observed_at))}</small></dd>
        </div>
        <div>
          <dt>Uso analítico</dt>
          <dd><strong>${escapeHtml(STATUS_LABELS[signal.effective_status] ?? "Estado desconocido")}</strong><small>${escapeHtml(causeLabel)}</small></dd>
        </div>
      </dl>
      <div class="history-signal-brief__handoff">
        <p><strong>Límite:</strong> un cambio publicado no permite afirmar precio de cierre, venta ni motivo comercial.</p>
        <a class="primary-button history-decision-action" href="#assistant">Preparar decisión</a>
      </div>
    </section>
  `;
}

function renderQualityBand(context) {
  const coverage = context.coverage ?? {};
  const eventCount = Number(coverage.scenario_event_count ?? 0);
  const datedCount = ["current", "aging", "historical"]
    .reduce(
      (total, validity) =>
        total + Number(coverage.by_validity?.[validity] ?? 0),
      0,
    );
  const temporalCoverage = eventCount
    ? Math.round((datedCount / eventCount) * 100)
    : 0;
  const items = [
    {
      label: "Eventos detectados",
      value: eventCount,
      explanation:
        "Cambios compatibles encontrados dentro de los proyectos comparables del escenario activo.",
    },
    {
      label: "Con fuente confirmada",
      value: Number(coverage.by_status?.certified ?? 0),
      explanation:
        "Valores, moneda, fechas, hechos y evidencia cumplen las reglas del histórico.",
    },
    {
      label: "Por revisar",
      value: Number(coverage.by_status?.reviewable ?? 0),
      explanation:
        "Señales visibles que requieren validación antes de respaldar una decisión.",
    },
    {
      label: "Cobertura temporal",
      value: `${temporalCoverage}%`,
      explanation:
        "Proporción de cambios cuya actualidad puede revisarse contra la fecha de corte.",
    },
  ];
  return `
    <section class="history-quality-band" aria-labelledby="history-quality-title">
      <h3 id="history-quality-title" class="history-sr-only">Resumen de calidad</h3>
      ${items.map((item) => `
        <details class="history-quality-item">
          <summary>
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
            <span class="history-quality-item__hint">Ver explicación</span>
          </summary>
          <p>${escapeHtml(item.explanation)}</p>
        </details>
      `).join("")}
    </section>
  `;
}

function renderHistoryFilters(context) {
  return `
    <section class="history-controls" aria-labelledby="history-filter-title">
      <div class="history-controls__heading">
        <div>
          <h3 id="history-filter-title">Acotar la lectura</h3>
          <p>${formatNumber(context.coverage?.shown_count ?? 0)} de ${formatNumber(context.coverage?.scenario_event_count ?? 0)} señales visibles.</p>
        </div>
        <button class="text-button" type="button" data-history-clear>Limpiar filtros</button>
      </div>
      <div class="history-filter-grid">
        ${renderFilterSelect({
          id: "history-status-filter",
          label: "Estado de calidad",
          key: "statuses",
          values: context.filters?.statuses,
        })}
        ${renderFilterSelect({
          id: "history-validity-filter",
          label: "Vigencia",
          key: "validities",
          values: context.filters?.validities,
        })}
        ${renderFilterSelect({
          id: "history-direction-filter",
          label: "Tipo de cambio",
          key: "directions",
          values: context.filters?.directions,
        })}
      </div>
    </section>
  `;
}

function renderFilterSelect({ id, label, key, values }) {
  const allowed = FILTER_VALUES[key];
  const selectedValues = Array.isArray(values) ? values : allowed;
  const selected =
    selectedValues.length === allowed.length
      ? "all"
      : selectedValues.length === 1
        ? selectedValues[0]
        : "custom";
  return `
    <label class="history-filter" for="${escapeAttr(id)}">
      <span>${escapeHtml(label)}</span>
      <select id="${escapeAttr(id)}" data-history-filter="${escapeAttr(key)}">
        ${selected === "custom" ? '<option value="custom" selected disabled>Selección combinada</option>' : ""}
        ${FILTER_OPTIONS[key].map(([value, optionLabel]) => `
          <option value="${escapeAttr(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(optionLabel)}</option>
        `).join("")}
      </select>
    </label>
  `;
}

function renderHistoryTimeline(context) {
  if (!context.timeline?.length) return renderEmptyHistory(context);
  const visible = context.timeline.slice(0, DEFAULT_VISIBLE_SIGNALS);
  const remainder = context.timeline.slice(DEFAULT_VISIBLE_SIGNALS);
  const selectedInRemainder = remainder.some(
    ({ history_event_id: eventId }) => eventId === state.selectedHistoryEventId,
  );
  return `
    <section class="history-ledger" aria-labelledby="history-timeline-title">
      <header class="history-ledger__header">
        <div>
          <span class="history-section-index">Lectura principal</span>
          <h3 id="history-timeline-title">Línea de tiempo explicable</h3>
          <p>Primero revisa la calidad y la fecha; después, la magnitud. Abre una señal para comprobar sus valores y fuentes.</p>
        </div>
        <details class="history-method">
          <summary>Cómo leer este cuaderno</summary>
          <p>“Anterior” y “Nuevo” son precios publicados desde. La demo no observa ventas, cierres ni causas del cambio.</p>
        </details>
      </header>
      <ol class="history-timeline">
        ${visible.map(renderSignalRow).join("")}
      </ol>
      ${remainder.length ? `
        <details class="history-more" ${selectedInRemainder ? "open" : ""}>
          <summary>Ver ${formatNumber(remainder.length)} señal${remainder.length === 1 ? "" : "es"} más</summary>
          <ol class="history-timeline history-timeline--continuation" start="${DEFAULT_VISIBLE_SIGNALS + 1}">
            ${remainder.map(renderSignalRow).join("")}
          </ol>
        </details>
      ` : ""}
    </section>
  `;
}

function renderHistoryAgenda(context) {
  const agenda = Array.isArray(context.agenda)
    ? context.agenda.slice(0, 3)
    : [];
  return `
    <section class="history-agenda" aria-labelledby="history-agenda-title">
      <header class="history-agenda__header">
        <div>
          <span class="history-section-index">Siguiente lectura</span>
          <h3 id="history-agenda-title">Agenda de seguimiento</h3>
          <p>Orden sugerido: calidad antes que magnitud. Cada acción nace de la muestra y los filtros activos.</p>
        </div>
        <span class="history-agenda__limit">Máximo 3 acciones</span>
      </header>
      ${agenda.length
        ? `<ol class="history-agenda__list">
            ${agenda.map((item, index) => renderAgendaItem(item, index, context)).join("")}
          </ol>`
        : `<p class="history-agenda__unavailable">La agenda no está disponible para este histórico. Revisa la cobertura antes de concluir.</p>`}
    </section>
  `;
}

function renderAgendaItem(item, index, context) {
  const position = Number.isInteger(Number(item.position))
    ? Number(item.position)
    : index + 1;
  const references = item.references ?? {};
  const eventId = references.history_event_ids?.[0] ?? null;
  const event = eventId
    ? context.timeline?.find(
        ({ history_event_id: candidateId }) => candidateId === eventId,
      )
    : null;
  const factCount = references.fact_ids?.length ?? 0;
  const evidenceCount = references.evidence_ids?.length ?? 0;
  const title = item.title ?? "Revisar acción de seguimiento";
  const description = item.description ??
    "Contrastar la acción con la cobertura y evidencia disponibles.";
  const itemId = domIdentifier(item.agenda_item_id ?? `agenda-${position}`);
  return `
    <li
      class="history-agenda__item"
      data-history-agenda-position="${escapeAttr(position)}"
    >
      <span class="history-agenda__position" aria-label="Prioridad ${escapeAttr(position)}">${escapeHtml(position)}</span>
      <div class="history-agenda__copy">
        <h4>${escapeHtml(title)}</h4>
        <p>${escapeHtml(description)}</p>
        <div class="history-agenda__provenance">
          <span>${event
            ? `Señal de origen · ${escapeHtml(event.project?.canonical_name ?? "Proyecto sin nombre")} · ${escapeHtml(formatDate(event.current_observed_at))}`
            : "Origen · cobertura del escenario"}</span>
          <span>${event
            ? `${escapeHtml(countLabel(factCount, "hecho", "hechos"))} · ${escapeHtml(countLabel(evidenceCount, "evidencia", "evidencias"))}`
            : `${escapeHtml(formatNumber(context.coverage?.by_status?.certified ?? 0))} con fuente confirmada · ${escapeHtml(formatNumber(context.coverage?.scenario_event_count ?? 0))} cambios detectados`}</span>
        </div>
      </div>
      ${event
        ? `<button
            class="history-agenda__action"
            id="history-agenda-${escapeAttr(itemId)}"
            type="button"
            data-history-agenda-event="${escapeAttr(event.history_event_id)}"
          >Abrir señal de origen</button>`
        : `<button
            class="history-agenda__action"
            id="history-agenda-${escapeAttr(itemId)}"
            type="button"
            data-history-focus="history-status-filter"
          >Revisar filtros</button>`}
    </li>
  `;
}

function countLabel(value, singular, plural) {
  const count = Number(value) || 0;
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

function renderSignalRow(event) {
  const selected = event.history_event_id === state.selectedHistoryEventId;
  const domId = domIdentifier(event.history_event_id);
  const agency = agencyName(event.project?.agency_id);
  const detail = selected
    ? getHistoryEventDetail(state.historyContext, event.history_event_id)
    : null;
  return `
    <li
      class="history-timeline__row history-timeline__row--${escapeAttr(event.effective_status)} ${selected ? "is-selected" : ""}"
      data-history-row="${escapeAttr(event.history_event_id)}"
    >
      <article aria-labelledby="history-title-${escapeAttr(domId)}">
        <div class="history-signal__date">
          <time datetime="${escapeAttr(event.current_observed_at)}">${escapeHtml(formatDate(event.current_observed_at))}</time>
          <span>${escapeHtml(VALIDITY_LABELS[event.validity] ?? "Vigencia no informada")}</span>
        </div>
        <div class="history-signal__main">
          <div class="history-signal__heading">
            <div>
              <span class="history-signal__agency">${escapeHtml(agency)}</span>
              <h4 id="history-title-${escapeAttr(domId)}">${escapeHtml(event.project?.canonical_name ?? "Proyecto sin nombre")}</h4>
            </div>
            ${renderStatusBadge(event)}
          </div>
          <span class="history-signal__field">${escapeHtml(fieldLabel(event.field))}</span>
          <div class="history-value-flow" aria-label="Comparación de precio publicado">
            <span><small>Anterior</small><strong>${escapeHtml(valueLabel(event.previous_value, event))}</strong></span>
            <span class="history-value-flow__arrow" aria-hidden="true">→</span>
            <span><small>Nuevo</small><strong>${escapeHtml(valueLabel(event.current_value, event))}</strong></span>
            ${renderDelta(event)}
          </div>
          <p class="history-signal__reason">${escapeHtml(reasonSummary(event))}</p>
          <div class="history-signal__actions">
            <button
              class="history-action history-action--primary"
              id="history-evidence-${escapeAttr(domId)}"
              type="button"
              data-history-event="${escapeAttr(event.history_event_id)}"
              aria-expanded="${selected}"
              aria-controls="history-detail-${escapeAttr(domId)}"
            >${selected ? "Cerrar evidencia" : "Ver evidencia"}</button>
            <button
              class="history-action"
              type="button"
              data-history-project="${escapeAttr(event.project_id)}"
            >Ver proyecto</button>
          </div>
        </div>
        ${detail ? renderHistoryDetail(detail, domId) : ""}
      </article>
    </li>
  `;
}

function renderStatusBadge(event) {
  const icons = { certified: "✓", reviewable: "!", insufficient: "i" };
  return `
    <span class="history-status history-status--${escapeAttr(event.effective_status)}">
      <span aria-hidden="true">${icons[event.effective_status] ?? "i"}</span>
      ${escapeHtml(STATUS_LABELS[event.effective_status] ?? "Estado desconocido")}
    </span>
  `;
}

function renderDelta(event) {
  const value = Number(event.delta_pct);
  const label = Number.isFinite(value)
    ? `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatNumber(Math.abs(value), 1)}%`
    : "Sin porcentaje";
  const direction =
    event.direction === "increase"
      ? "aumentó"
      : event.direction === "decrease"
        ? "disminuyó"
        : "no cambió";
  return `
    <strong class="history-delta history-delta--${escapeAttr(event.direction)}">
      <span aria-hidden="true">${escapeHtml(label)}</span>
      <span class="history-sr-only">El precio publicado ${escapeHtml(direction)} ${Number.isFinite(value) ? `${formatNumber(Math.abs(value), 1)} por ciento` : "sin porcentaje calculable"}.</span>
    </strong>
  `;
}

function renderHistoryDetail(event, domId) {
  const evidenceAvailable = event.evidence_status === "available";
  const evidenceHeading =
    event.evidence_status === "restricted"
      ? "Evidencia restringida"
      : evidenceAvailable
        ? "Evidencia autorizada"
        : "Evidencia no disponible";
  return `
    <section
      class="history-detail"
      id="history-detail-${escapeAttr(domId)}"
      aria-labelledby="history-detail-title-${escapeAttr(domId)}"
    >
      <header>
        <div>
          <span class="history-detail__eyebrow">Detalle y evidencia</span>
          <h5 id="history-detail-title-${escapeAttr(domId)}">Dos observaciones del mismo precio publicado</h5>
        </div>
        <span class="history-detail__semantic">Precio publicado, no precio de cierre</span>
      </header>
      <div class="history-observation-pair">
        ${renderObservation("Observación anterior", event.previous_value, event.previous_observed_at, event)}
        ${renderObservation("Observación nueva", event.current_value, event.current_observed_at, event)}
      </div>
      <dl class="history-detail__facts">
        <div><dt>Tipo de cambio</dt><dd>${escapeHtml(DIRECTION_LABELS[event.direction] ?? "No informado")}</dd></div>
        <div><dt>Calidad</dt><dd>${escapeHtml(STATUS_LABELS[event.effective_status] ?? "No informada")}</dd></div>
        <div><dt>Causa</dt><dd>${event.cause ? escapeHtml(event.cause) : "Causa no observada"}</dd></div>
      </dl>
      <section class="history-evidence" aria-labelledby="history-evidence-title-${escapeAttr(domId)}">
        <div class="history-evidence__heading">
          <h6 id="history-evidence-title-${escapeAttr(domId)}">${escapeHtml(evidenceHeading)}</h6>
          <span>${formatNumber(event.evidence?.length ?? 0)} referencias</span>
        </div>
        ${evidenceAvailable
          ? `<ul>${event.evidence.map((evidence) => renderEvidenceItem(evidence, event)).join("")}</ul>`
          : `<p class="history-evidence__unavailable">No disponible para consulta pública. La señal permanece visible como insuficiente y no respalda una conclusión positiva.</p>`}
      </section>
    </section>
  `;
}

function renderObservation(label, value, observedAt, event) {
  return `
    <div>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(valueLabel(value, event))}</strong>
      <time datetime="${escapeAttr(observedAt)}">${escapeHtml(formatDate(observedAt))}</time>
    </div>
  `;
}

function renderEvidenceItem(evidence, event) {
  const observation = event.observations?.find(
    ({ observation_id: observationId }) =>
      observationId === evidence.observation_id,
  );
  const sourceUrl = safeUrl(observation?.source_url);
  return `
    <li>
      <div>
        <strong>${escapeHtml(evidence.fragment ?? "Valor estructurado autorizado")}</strong>
        <span>${escapeHtml(formatDate(evidence.captured_at))} · Referencia ${escapeHtml(evidence.evidence_id)}</span>
      </div>
      ${sourceUrl ? `<a href="${escapeAttr(sourceUrl)}" target="_blank" rel="noopener noreferrer">Abrir fuente pública<span class="history-sr-only"> en una pestaña nueva</span></a>` : ""}
    </li>
  `;
}

function renderEmptyHistory(context) {
  const filtered = Number(context.coverage?.filtered_out_count ?? 0) > 0;
  return `
    <section class="history-state history-state--empty">
      <span class="history-state__icon" aria-hidden="true">${filtered ? "⌁" : "○"}</span>
      <h3>${filtered ? "No hay señales con estos filtros" : "No hay cambios elegibles en este escenario"}</h3>
      <p>${filtered
        ? "Amplía los filtros para volver a ver los cambios compatibles del escenario."
        : "La ausencia de señales no demuestra estabilidad: indica que no hay dos observaciones compatibles para esta muestra."}</p>
      ${filtered
        ? ""
        : '<button class="secondary-button" type="button" data-view="projects">Ver comparables</button>'}
    </section>
  `;
}

function renderUnavailableHistory() {
  return `
    <section class="history-state">
      <span class="history-state__icon" aria-hidden="true">i</span>
      <h3>Histórico no disponible</h3>
      <p>Esta versión de datos no incluye el histórico requerido. El análisis territorial sigue disponible, pero no se reconstruyen cambios con campos antiguos.</p>
      <button class="secondary-button" type="button" data-view="projects">Ver comparables</button>
    </section>
  `;
}

function renderIntegrityError() {
  return `
    <section class="history-state history-state--error">
      <span class="history-state__icon" aria-hidden="true">!</span>
      <h3>No se pudo construir una lectura segura</h3>
      <p>El histórico está incompleto. Reinicia el escenario; si el estado continúa, no uses estas señales para decidir.</p>
      <button class="secondary-button" id="history-reset-scenario" type="button" data-history-reset>Reiniciar escenario</button>
    </section>
  `;
}

function reasonSummary(event) {
  if (event.reason_codes?.length) {
    return REASON_LABELS[event.reason_codes[0]] ??
      "La señal requiere revisión antes de utilizarse.";
  }
  if (event.effective_status === "reviewable") {
    return "Cambio compatible, pero su magnitud requiere validación antes de decidir.";
  }
  if (event.effective_status === "insufficient") {
    return "La evidencia no alcanza para respaldar una conclusión.";
  }
  return "Valores compatibles y evidencia disponible; la causa no fue observada.";
}

function agencyName(agencyId) {
  return (
    state.data?.model?.agencies?.find(
      ({ agency_id: candidateId }) => candidateId === agencyId,
    )?.canonical_name ?? "Inmobiliaria no informada"
  );
}

function fieldLabel(field) {
  return field === "published_price_from"
    ? "Precio publicado desde"
    : "Valor publicado";
}

function valueLabel(value, event) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "No disponible";
  if (event.currency === "PEN" || event.unit === "PEN") {
    return `S/ ${formatNumber(number, 0)}`;
  }
  if (event.currency === "USD" || event.unit === "USD") {
    return `US$ ${formatNumber(number, 0)}`;
  }
  return `${formatNumber(number, 1)} ${event.unit ?? ""}`.trim();
}

function domIdentifier(value) {
  return String(value ?? "history-event").replace(/[^a-zA-Z0-9_-]/gu, "-");
}
