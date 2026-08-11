import { suggestedQuestions } from "../config.js";
import {
  componentHelp,
  escapeAttr,
  escapeHtml,
  formatDate,
  formatNumber,
  miniMetric,
} from "../domain.js";
import { state } from "../state.js";

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function pricePerM2(value) {
  const number = finiteNumber(value);
  return number !== null && number > 0
    ? `S/ ${formatNumber(number, 0)} / m²`
    : "No disponible";
}

function canonicalProjectId(project) {
  return project?.id === null || project?.id === undefined
    ? null
    : `project:nexo-${project.id}`;
}

function projectLabelMap(data) {
  return new Map(
    (data?.projects ?? []).map((project) => [
      canonicalProjectId(project),
      project.project_name || "Proyecto sin nombre",
    ]),
  );
}

function selectedReferences(data, context, preferredIds) {
  const comparableIds = new Set(
    context?.comparable_project_ids ?? [],
  );
  const labels = projectLabelMap(data);
  return [...(preferredIds ?? [])]
    .filter((projectId) => comparableIds.has(projectId))
    .slice(0, 3)
    .map((projectId) => ({
      projectId,
      label: labels.get(projectId) ?? projectId,
    }));
}

function mentionedForeignDistrict(data, context, input) {
  const query = normalizeText(input);
  if (!query) return null;
  const activeDistrictId = String(
    context?.scenario?.district_id ?? "",
  );
  return (
    (data?.geography?.districts ?? []).find((district) => {
      if (String(district.district_id) === activeDistrictId) {
        return false;
      }
      const names = [
        district.district_name,
        district.source_name,
      ]
        .map(normalizeText)
        .filter((name) => name.length >= 4);
      return names.some(
        (name) =>
          query === name ||
          query.startsWith(`${name} `) ||
          query.endsWith(` ${name}`) ||
          query.includes(` ${name} `),
      );
    }) ?? null
  );
}

function asksForRealClosingPrice(input) {
  const query = normalizeText(input);
  const mentionsPrice = /\b(precio|precios|valor|valores)\b/.test(
    query,
  );
  const mentionsClosing =
    /\b(cierre|cerrado|cerrados|real|reales|transaccion|transacciones)\b/.test(
      query,
    );
  return mentionsPrice && mentionsClosing;
}

function activeContextNote(data, context, input) {
  const foreignDistrict = mentionedForeignDistrict(
    data,
    context,
    input,
  );
  if (!foreignDistrict) return null;
  const name =
    foreignDistrict.district_name ??
    foreignDistrict.source_name ??
    "otro distrito";
  return `La pregunta menciona ${name}, pero esta lectura conserva el escenario activo y no cambia su distrito.`;
}

function baselineResponse(data, context, input) {
  const comparableIds = [
    ...(context.comparable_project_ids ?? []),
  ];
  const priceReferenceIds = [
    ...(context.price_reference_project_ids ?? []),
  ];
  const diagnosis = context.price_diagnosis ?? {};
  const contextNote = activeContextNote(data, context, input);
  const scopeText = context.scope_text ?? "Alcance sin nombre";
  const comparableCount = comparableIds.length;
  const priceReferenceCount = priceReferenceIds.length;
  const references = selectedReferences(
    data,
    context,
    priceReferenceIds.length
      ? priceReferenceIds
      : comparableIds,
  );

  if (asksForRealClosingPrice(input)) {
    return {
      tone: "warning",
      badge: "Límite de evidencia",
      title: "El precio real de cierre no está disponible",
      summary:
        `${scopeText}: ${formatNumber(comparableCount)} comparables en el escenario activo. ` +
        "La demo solo observa precios de lista publicados y no puede afirmar el precio final de una transacción.",
      metrics: [
        { label: "Comparables", value: formatNumber(comparableCount) },
        {
          label: "Precios publicados",
          value: formatNumber(priceReferenceCount),
        },
        {
          label: "Corte",
          value: context.cutoff_at
            ? formatDate(context.cutoff_at)
            : "No disponible",
        },
      ],
      reading:
        "Los precios publicados pueden servir como referencia provisional, pero no prueban descuentos, bonos ni condiciones negociadas al cierre.",
      action:
        "Si necesitas explorar un cierre, define un supuesto explícito y preséntalo como escenario estimado; nunca como dato observado.",
      references,
      contextNote,
      caution:
        "Referencia publicada provisional. No representa precios reales de cierre.",
    };
  }

  if (comparableCount === 0) {
    return {
      tone: "warning",
      badge: "Evidencia insuficiente",
      title: "No hay comparables elegibles",
      summary:
        `${scopeText}: 0 comparables en el escenario activo. ` +
        "No hay base suficiente para producir una lectura comercial.",
      metrics: [
        { label: "Comparables", value: "0" },
        {
          label: "Precios publicados",
          value: formatNumber(priceReferenceCount),
        },
        {
          label: "Cobertura",
          value: `${formatNumber(
            finiteNumber(context.evidence_coverage_pct) ?? 0,
            1,
          )}%`,
        },
      ],
      reading:
        "Una muestra vacía no se reemplaza con proyectos de todo el distrito ni con un promedio externo al escenario.",
      action:
        "Revisa el alcance o los filtros de forma explícita y vuelve a consultar cuando existan comparables elegibles.",
      references: [],
      contextNote,
      caution:
        "Resultado prudente: sin comparables no se emite recomendación ni referencia de precio.",
    };
  }

  const priceReady =
    context.price_status === "ready" &&
    priceReferenceCount >= 3;
  const medianText = pricePerM2(diagnosis.median);
  const rangeText =
    finiteNumber(diagnosis.p25) !== null &&
    finiteNumber(diagnosis.p75) !== null
      ? `${pricePerM2(diagnosis.p25)} – ${pricePerM2(
          diagnosis.p75,
        )}`
      : "No disponible";
  const positionText = diagnosis.position
    ? `El escenario simulado se ubica en posición ${diagnosis.position}.`
    : "Aún no se definió un precio objetivo para estimar posición.";

  return {
    tone: priceReady ? "success" : "warning",
    badge: priceReady
      ? "Lectura con fuentes"
      : "Precio insuficiente",
    title: "Lectura del escenario activo",
    summary:
      `${scopeText}: ${formatNumber(comparableCount)} comparables y ` +
      `${formatNumber(priceReferenceCount)} referencias de precio publicado provisional.`,
    metrics: [
      {
        label: "Comparables",
        value: formatNumber(comparableCount),
      },
      {
        label: "Mediana publicada",
        value: priceReady ? medianText : "No disponible",
      },
      {
        label: "Rango central",
        value: priceReady ? rangeText : "No disponible",
      },
    ],
    reading: priceReady
      ? `${positionText} La lectura usa únicamente las referencias compatibles del escenario activo.`
      : "La cantidad de referencias de precio es insuficiente para sostener una mediana o un rango comercial.",
    action: priceReady
      ? "Abre las referencias listadas, contrasta sus atributos y conserva la etiqueta provisional al comunicar la lectura."
      : "Revisa los comparables disponibles y evita concluir sobre precio hasta contar con al menos tres referencias compatibles.",
    references,
    contextNote,
    caution:
      diagnosis.methodology ??
      "Referencia publicada provisional; no representa precios reales de cierre.",
  };
}

export function buildScenarioAssistantResponse({
  data,
  scenarioContext,
  input = "",
} = {}) {
  if (!scenarioContext) {
    return {
      tone: "warning",
      badge: "Escenario no disponible",
      title: "No se puede generar la lectura",
      summary:
        "El escenario activo no está disponible: 0 comparables verificables.",
      metrics: [
        { label: "Comparables", value: "0" },
        { label: "Precios publicados", value: "0" },
        { label: "Alcance", value: "No disponible" },
      ],
      reading:
        "La respuesta necesita un contexto de escenario vigente para mantener el mismo alcance que el resto de la demo.",
      action:
        "Vuelve al radar, define un escenario válido y genera nuevamente la lectura.",
      references: [],
      contextNote: null,
      caution:
        "Sin contexto no se aplican fallbacks ni se emiten conclusiones.",
    };
  }
  return baselineResponse(data, scenarioContext, input);
}

function renderReferences(references) {
  if (!references.length) {
    return '<p class="empty-inline">Sin referencias elegibles en el escenario activo.</p>';
  }
  return references
    .map(
      (reference) => `
        <span
          class="chip"
          title="${escapeAttr(reference.projectId)}"
          data-canonical-project-id="${escapeAttr(
            reference.projectId,
          )}"
        >
          ${escapeHtml(reference.label)}
        </span>
      `,
    )
    .join("");
}

export function renderAssistantResponse(response) {
  return `
    <section class="answer-panel">
      <div class="answer-header">
        <div class="answer-header-row">
          <span class="status-badge ${escapeAttr(response.tone)}">
            ${escapeHtml(response.badge)}
          </span>
          ${componentHelp(
            "Respuesta ejecutiva",
            "La lectura conserva el alcance y la muestra del escenario activo. Las referencias siempre pertenecen al mismo conjunto comparable.",
          )}
        </div>
        <h2>${escapeHtml(response.title)}</h2>
        <p>${escapeHtml(response.summary)}</p>
      </div>
      <div class="answer-metrics">
        ${response.metrics
          .map((metric) => miniMetric(metric.label, metric.value))
          .join("")}
      </div>
      ${
        response.contextNote
          ? `
            <div class="detail-section subtle-note">
              <strong>Contexto conservado</strong>
              <p>${escapeHtml(response.contextNote)}</p>
            </div>
          `
          : ""
      }
      <div class="detail-section">
        <h3>Lectura de evidencia</h3>
        <p>${escapeHtml(response.reading)}</p>
      </div>
      <div class="detail-section highlight-section">
        <h3>Siguiente verificación</h3>
        <p>${escapeHtml(response.action)}</p>
      </div>
      <div class="detail-section">
        <h3>Fuentes utilizadas</h3>
        <div class="chip-list">${renderReferences(
          response.references,
        )}</div>
      </div>
      <div class="detail-section subtle-note">
        <p>${escapeHtml(response.caution)}</p>
      </div>
    </section>
  `;
}

export function renderAssistant() {
  return renderAssistantWorkbench();
}

function renderAssistantWorkbench() {
  const questions = assistantQuestions();
  const maximumCharacters = Number(
    state.data?.assistant?.policy?.maximum_input_characters ?? 500,
  );
  const response = state.assistantResponse;
  return `
    <section
      class="assistant-workbench"
      data-scenario-consumer="assistant"
      data-assistant-status="${escapeAttr(response?.status ?? "idle")}"
    >
      <section class="assistant-intro panel">
        <div class="assistant-intro__copy">
          <span class="assistant-mode">Respuesta basada en los datos visibles</span>
          <h2>Convierte una pregunta en una recomendación verificable</h2>
          <p>
            El asistente usa la zona activa y las fuentes disponibles en la
            demo. No busca datos externos ni cambia la muestra mientras responde.
          </p>
          ${
            (state.scenarioContext?.comparable_project_ids?.length ?? 0) === 0
              ? '<p class="assistant-availability-note">Sin comparables elegibles: la lectura explicará la cobertura insuficiente y no inventará referencias.</p>'
              : ""
          }
        </div>
        <dl class="assistant-scenario" aria-label="Escenario usado por el asistente">
          <div><dt>Escenario</dt><dd>${escapeHtml(state.scenarioContext?.scope_text ?? "No disponible")}</dd></div>
          <div><dt>Comparables</dt><dd>${formatNumber(state.scenarioContext?.comparable_project_ids?.length ?? 0)}</dd></div>
          <div><dt>Corte</dt><dd>${escapeHtml(formatAssistantDate(state.scenarioContext?.cutoff_at))}</dd></div>
        </dl>
      </section>

      ${response ? renderTraceableAssistantResponse(response) : renderAssistantEmptyState()}

      <section class="assistant-query panel" aria-labelledby="assistant-query-title">
        <div class="assistant-question-bank">
          <div>
            <p class="assistant-step">1 · Elige una pregunta compatible</p>
            <h2 id="assistant-query-title">¿Qué necesitas leer?</h2>
            <p>Parte de una pregunta validada o escribe una consulta breve sobre el escenario activo.</p>
          </div>
          <div class="assistant-suggestions">
            ${questions.slice(0, 3).map(renderAssistantQuestion).join("")}
          </div>
          ${renderAdditionalQuestions(questions.slice(3))}
        </div>

        <form class="assistant-composer" id="assistant-form" novalidate>
          <div class="assistant-composer__heading">
            <p class="assistant-step">2 · Formula la consulta</p>
            <h2>Pregunta comercial</h2>
          </div>
          <label for="assistant-input">Escribe una pregunta sobre el escenario activo</label>
          <textarea
            id="assistant-input"
            name="assistant-input"
            rows="5"
            maxlength="${maximumCharacters}"
            aria-describedby="assistant-input-help assistant-input-count assistant-input-error"
            placeholder="Ej. ¿Qué precios publicados cambiaron en este escenario?"
          >${escapeHtml(state.assistantInput)}</textarea>
          <div class="assistant-composer__meta">
            <p id="assistant-input-help">La consulta no se guarda. Usa Ctrl + Enter para generar.</p>
            <p id="assistant-input-count" aria-live="off">${formatNumber(state.assistantInput.length)} de ${formatNumber(maximumCharacters)} caracteres</p>
          </div>
          <p class="assistant-input-error" id="assistant-input-error" hidden></p>
          <div class="assistant-composer__actions">
            <button class="${response ? "secondary-button" : "primary-button"} assistant-submit" type="submit">Generar lectura</button>
            ${response ? '<button class="secondary-button" type="button" data-assistant-clear>Nueva pregunta</button>' : ""}
          </div>
        </form>
      </section>

      <p class="sr-only" id="assistant-live" aria-live="polite" aria-atomic="true"></p>
    </section>
  `;
}

function assistantQuestions() {
  const catalog = state.data?.assistant?.intents;
  if (Array.isArray(catalog) && catalog.length) {
    return catalog.flatMap((intent) =>
      (intent.suggested_questions ?? []).map((question) => ({
        intentId: intent.intent_id,
        label: intent.label,
        question,
      })),
    );
  }
  return suggestedQuestions.map((question) => ({
    intentId: null,
    label: "Pregunta compatible",
    question,
  }));
}

function renderAssistantQuestion(entry) {
  const active =
    state.assistantInput === entry.question ||
    state.assistantIntentId === entry.intentId;
  return `
    <button
      class="assistant-question${active ? " is-active" : ""}"
      type="button"
      data-assistant-question="${escapeAttr(entry.question)}"
      data-assistant-intent="${escapeAttr(entry.intentId ?? "")}"
      aria-pressed="${active ? "true" : "false"}"
    >
      <span>${escapeHtml(displayQuestionLabel(entry.label))}</span>
      ${escapeHtml(displayQuestion(entry.question))}
    </button>
  `;
}

function displayQuestionLabel(label) {
  return label === "Señal prioritaria" ? "Cambio para revisar" : label;
}

function displayQuestion(question) {
  return question === "¿Qué señal certificada conviene revisar primero?"
    ? "¿Qué cambio publicado conviene revisar primero?"
    : question;
}

function renderAdditionalQuestions(questions) {
  if (!questions.length) return "";
  return `
    <details class="assistant-more">
      <summary>Ver preguntas compatibles <span>${formatNumber(questions.length)} más</span></summary>
      <div class="assistant-suggestions assistant-suggestions--more">
        ${questions.map(renderAssistantQuestion).join("")}
      </div>
    </details>
  `;
}

function renderAssistantEmptyState() {
  return `
    <section class="assistant-empty panel" aria-labelledby="assistant-empty-title" data-assistant-decision="idle">
      <div class="assistant-empty__marker" aria-hidden="true">↳</div>
      <div>
        <p class="assistant-step">Decisión pendiente</p>
        <h2 id="assistant-empty-title">Formula una consulta antes de tomar una decisión</h2>
        <p>La respuesta aparecerá aquí después de que envíes una pregunta; no se genera sola.</p>
        <a class="assistant-canonical-return" href="#journey/decision" data-journey-return="decision">Volver al recorrido: Decisión</a>
      </div>
    </section>
  `;
}

export function renderTraceableAssistantResponse(response) {
  const meta = assistantStatusMeta(response.status);
  const blocks = Array.isArray(response.blocks) ? response.blocks : [];
  const responseBlock = blocks.find(({ type }) => type === "response");
  const nextStepBlock = blocks.find(({ type }) => type === "next_step");
  const referencesBlock = blocks.find(({ type }) => type === "references");
  const limitationsBlock = blocks.find(({ type }) => type === "limitations");
  const detailBlocks = blocks.filter(
    ({ type }) =>
      type !== "response" &&
      type !== "next_step" &&
      type !== "references" &&
      type !== "limitations",
  );
  const canCloseDecision = ["ready", "insufficient"].includes(response.status);
  const shouldReformulate = [
    "refused",
    "unknown_intent",
    "invalid_input",
  ].includes(response.status);
  return `
    <section
      class="assistant-response panel assistant-response--${escapeAttr(meta.tone)}"
      aria-labelledby="assistant-response-title"
      data-assistant-response="${escapeAttr(response.status)}"
      data-assistant-decision="${escapeAttr(response.status)}"
    >
      <header class="assistant-response__header">
        <div><p class="assistant-step">Decisión y siguiente acción</p><h2 id="assistant-response-title" tabindex="-1">${escapeHtml(meta.title)}</h2></div>
        <span class="assistant-response__status">${escapeHtml(meta.label)}</span>
      </header>
      <div class="assistant-response__context">
        <span>${escapeHtml(response.scenario?.scopeText ?? "Escenario no disponible")}</span>
        <span>${formatNumber(response.scenario?.comparableProjectCount ?? 0)} comparables</span>
        <span>Respuesta verificable</span>
      </div>
      <div class="assistant-decision-lead">
        ${responseBlock ? renderAssistantBlock(responseBlock, blocks.indexOf(responseBlock)) : ""}
        ${nextStepBlock ? renderAssistantBlock(nextStepBlock, blocks.indexOf(nextStepBlock)) : ""}
        <div class="assistant-decision-handoff" aria-label="Continuar la decisión">
          ${
            canCloseDecision
              ? '<a class="primary-button" href="#trust" data-view="trust">Preparar checklist comercial</a>'
              : shouldReformulate
                ? '<button class="primary-button" type="button" data-assistant-clear>Formular otra consulta</button>'
                : '<a class="primary-button" href="#journey/decision" data-journey-return="decision">Volver a Decisión</a>'
          }
          <a class="assistant-canonical-return" href="#journey/decision" data-journey-return="decision">Volver al recorrido: Decisión</a>
        </div>
      </div>
      ${
        limitationsBlock
          ? `<div class="assistant-limit-access">${renderAssistantBlock(limitationsBlock, blocks.indexOf(limitationsBlock))}</div>`
          : ""
      }
      ${
        referencesBlock
          ? `<div class="assistant-reference-access">${renderAssistantBlock(referencesBlock, blocks.indexOf(referencesBlock))}</div>`
          : ""
      }
      <details class="assistant-evidence-disclosure">
        <summary>Ver datos usados e interpretación completa</summary>
        <div class="assistant-ledger">
          ${detailBlocks.map((block) => renderAssistantBlock(block, blocks.indexOf(block))).join("")}
        </div>
      </details>
    </section>
  `;
}

function renderAssistantBlock(block, index) {
  return `
    <section class="assistant-block assistant-block--${escapeAttr(block.type)}" data-assistant-block="${escapeAttr(block.type)}" aria-labelledby="assistant-block-${escapeAttr(block.type)}">
      <div class="assistant-block__marker" aria-hidden="true">${index + 1}</div>
      <div class="assistant-block__body">
        <h3 id="assistant-block-${escapeAttr(block.type)}">${escapeHtml(block.title)}</h3>
        ${renderAssistantItems(block)}
      </div>
    </section>
  `;
}

function renderAssistantItems(block) {
  const items = Array.isArray(block.items) ? block.items : [];
  if (!items.length) return '<p class="assistant-empty-line">Sin datos elegibles para este bloque.</p>';
  if (block.type === "references") {
    return renderAssistantReferences(items);
  }
  if (block.type === "next_step") {
    return `<div class="assistant-next-actions">${items.map(renderAssistantAction).join("")}</div>`;
  }
  if (block.type === "data") {
    return `<div class="assistant-data-list">${items.map(renderAssistantDataItem).join("")}</div>`;
  }
  return `<div class="assistant-copy-list">${items
    .map((item) => `<p class="assistant-copy assistant-copy--${escapeAttr(item.tone ?? "neutral")}">${escapeHtml(item.text ?? item.label ?? "")}</p>`)
    .join("")}</div>`;
}

function renderAssistantDataItem(item) {
  if (item.kind === "history_change") {
    return `
      <article class="assistant-change-row">
        <div><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(assistantQualityLabel(item.status))} · ${escapeHtml(assistantValidityLabel(item.validity))}</span></div>
        <dl>
          <div><dt>Anterior</dt><dd>${escapeHtml(formatAssistantValue(item.previousValue, item))}</dd></div>
          <div><dt>Publicado</dt><dd>${escapeHtml(formatAssistantValue(item.currentValue, item))}</dd></div>
          <div><dt>Variación</dt><dd>${escapeHtml(formatSignedPercent(item.deltaPercent))}</dd></div>
        </dl>
      </article>
    `;
  }
  if (item.kind === "agenda_item") {
    return `<article class="assistant-agenda-row"><span class="assistant-agenda-row__position">${formatNumber(item.position)}</span><div><strong>${escapeHtml(item.label)}</strong><p>${escapeHtml(item.description ?? "")}</p></div></article>`;
  }
  if (item.kind === "comparison_row") {
    return `<article class="assistant-comparison-row"><strong>${escapeHtml(item.label)}</strong><div>${(item.values ?? []).map((value) => `<span class="assistant-comparison-value">${escapeHtml(assistantProjectLabel(value.projectId))} · ${escapeHtml(formatAssistantValue(value.value, value))}</span>`).join("")}</div></article>`;
  }
  return `
    <div class="assistant-data-row assistant-data-row--${escapeAttr(item.kind ?? "value")}">
      <span>${escapeHtml(item.label ?? "Dato")}</span>
      <strong>${escapeHtml(formatAssistantValue(item.value ?? item.originalValue, item))}</strong>
    </div>
  `;
}

function renderAssistantReference(reference) {
  return `
    <li><button type="button" data-assistant-reference="${escapeAttr(reference.id)}" data-assistant-reference-type="${escapeAttr(reference.type)}" data-assistant-reference-route="${escapeAttr(reference.route ?? "dashboard")}" data-assistant-project="${escapeAttr(reference.projectId ?? "")}"${reference.projectId ? ` data-canonical-project-id="${escapeAttr(reference.projectId)}"` : ""}>
      <span>${escapeHtml(assistantReferenceType(reference.type))}</span>
      <strong>${escapeHtml(assistantReferenceLabel(reference))}</strong>
      <small>${escapeHtml(assistantQualityLabel(reference.status))} · Abrir</small>
    </button></li>
  `;
}

function renderAssistantReferences(items) {
  const visible = items.slice(0, 5);
  const additional = items.slice(5);
  return `
    <ul class="assistant-reference-list">${visible.map(renderAssistantReference).join("")}</ul>
    ${
      additional.length
        ? `
          <details class="assistant-reference-more">
            <summary>Ver ${formatNumber(additional.length)} referencias adicionales</summary>
            <ul class="assistant-reference-list">${additional.map(renderAssistantReference).join("")}</ul>
          </details>
        `
        : ""
    }
  `;
}

function renderAssistantAction(item) {
  return `<button class="assistant-next-action" type="button" data-assistant-route="${escapeAttr(item.route ?? "dashboard")}" data-assistant-detail="${escapeAttr(item.detail ?? "")}"><span>Siguiente verificación</span><strong>${escapeHtml(item.label)}</strong></button>`;
}

function assistantStatusMeta(status) {
  return {
    ready: { tone: "ready", title: "Lectura del escenario", label: "Lectura lista" },
    insufficient: { tone: "caution", title: "Lectura con evidencia insuficiente", label: "Revisar cobertura" },
    refused: { tone: "caution", title: "Límite de la demo", label: "Límite aplicado" },
    unknown_intent: { tone: "caution", title: "Pregunta fuera del catálogo", label: "Reformula la consulta" },
    invalid_input: { tone: "caution", title: "La pregunta necesita ajuste", label: "Revisa el texto" },
    contract_unavailable: { tone: "unavailable", title: "Asistente no disponible", label: "Contrato no compatible" },
  }[status] ?? { tone: "unavailable", title: "Lectura no disponible", label: "Sin resultado" };
}

function formatAssistantValue(value, item = {}) {
  if (value === null || value === undefined || value === "") return "No disponible";
  if (typeof value !== "number") return String(value);
  if (item.currency === "PEN" || item.unit === "PEN") {
    return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 0 }).format(value);
  }
  const suffix = item.unit && item.unit !== "count" ? ` ${item.unit}` : "";
  return `${formatNumber(value)}${suffix}`;
}

function formatSignedPercent(value) {
  if (!Number.isFinite(Number(value))) return "No disponible";
  const numeric = Number(value);
  return `${numeric > 0 ? "+" : ""}${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 }).format(numeric)}%`;
}

function formatAssistantDate(value) {
  if (!value) return "No disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No disponible";
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

function assistantReferenceType(type) {
  return { scenario: "Escenario", history_event: "Señal histórica", fact: "Hecho", evidence: "Evidencia" }[type] ?? "Referencia";
}

function assistantReferenceLabel(reference) {
  if (reference.type !== "history_event") return reference.label;
  const [label, timestamp] = String(reference.label ?? "").split(" · ");
  return timestamp
    ? `${label} · ${formatAssistantDate(timestamp)}`
    : String(reference.label ?? "");
}

function assistantProjectLabel(projectId) {
  return (
    state.benchmarkContext?.projectSummaries?.find(
      ({ projectId: candidate }) => candidate === projectId,
    )?.name ?? "Proyecto comparable"
  );
}

function assistantQualityLabel(value) {
  return { valid: "Válido", certified: "Certificado", available: "Disponible", reviewable: "Por revisar", insufficient: "Insuficiente", restricted: "Restringido" }[value] ?? String(value ?? "Sin estado");
}

function assistantValidityLabel(value) {
  return { current: "Vigente", aging: "En seguimiento", historical: "Histórico", unknown: "Vigencia no determinada" }[value] ?? String(value ?? "Vigencia no determinada");
}
