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
      ? "Lectura trazable"
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
        <h3>Referencias trazables</h3>
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
  const response = buildScenarioAssistantResponse({
    data: state.data,
    scenarioContext: state.scenarioContext,
    input: state.assistantInput,
  });

  return `
    <section
      class="assistant-layout"
      data-scenario-consumer="assistant"
    >
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>Preguntas de estrategia</h2>
            <p>
              Explora la evidencia del escenario activo sin cambiar su
              distrito, alcance o muestra.
            </p>
          </div>
          ${componentHelp(
            "Preguntas de estrategia",
            "Elige una pregunta sugerida o redacta una propia. La respuesta no cambia el escenario activo ni incorpora proyectos ajenos a sus comparables.",
          )}
        </div>
        <div class="suggestion-list">
          ${suggestedQuestions
            .slice(0, 4)
            .map(
              (question) => `
                <button
                  class="suggestion-button ${
                    state.assistantInput === question ? "active" : ""
                  }"
                  type="button"
                  data-suggest="${escapeAttr(question)}"
                >
                  ${escapeHtml(question)}
                </button>
              `,
            )
            .join("")}
        </div>
        <details class="more-suggestions">
          <summary>
            Ver ${formatNumber(
              Math.max(suggestedQuestions.length - 4, 0),
            )} preguntas adicionales
          </summary>
          <div class="suggestion-list">
            ${suggestedQuestions
              .slice(4)
              .map(
                (question) => `
                  <button
                    class="suggestion-button ${
                      state.assistantInput === question
                        ? "active"
                        : ""
                    }"
                    type="button"
                    data-suggest="${escapeAttr(question)}"
                  >
                    ${escapeHtml(question)}
                  </button>
                `,
              )
              .join("")}
          </div>
        </details>
        <form class="assistant-composer" id="assistant-form">
          <label class="field-control" for="assistant-input">
            <span>Pregunta comercial</span>
            <textarea
              id="assistant-input"
              placeholder="Ej. ¿Qué evidencia de precio tiene este escenario?"
            >${escapeHtml(state.assistantInput)}</textarea>
          </label>
          <button class="primary-button" type="submit">
            Generar lectura
          </button>
        </form>
      </section>

      ${renderAssistantResponse(response)}
    </section>
  `;
}
