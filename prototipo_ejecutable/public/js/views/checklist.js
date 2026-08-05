import {
  checkItem,
  componentHelp,
  escapeAttr,
  escapeHtml,
  formatDate,
  formatNumber,
} from "../domain.js";
import { state } from "../state.js";

function canonicalProjectId(project) {
  return project?.id === null || project?.id === undefined
    ? null
    : `project:nexo-${project.id}`;
}

function projectLabels(data, projectIds) {
  const requested = new Set(projectIds ?? []);
  return (data?.projects ?? [])
    .map((project) => ({
      projectId: canonicalProjectId(project),
      label: project.project_name || "Proyecto sin nombre",
    }))
    .filter(({ projectId }) => requested.has(projectId));
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

function comparisonState(context) {
  const labels = {
    ready: {
      label: "Comparabilidad lista",
      tone: "success",
      copy: "La muestra cumple el mínimo y la cobertura de evidencia requerida.",
    },
    orientative: {
      label: "Comparabilidad orientativa",
      tone: "warning",
      copy: "La muestra puede orientar una revisión, pero no sustenta una conclusión fuerte.",
    },
    insufficient: {
      label: "Comparables insuficientes",
      tone: "danger",
      copy: "No hay comparables elegibles; revisa el alcance o los filtros sin aplicar un fallback silencioso.",
    },
  };
  return (
    labels[context?.comparability_status] ?? {
      label: "Comparabilidad no disponible",
      tone: "danger",
      copy: "El contexto no expone un estado de comparabilidad verificable.",
    }
  );
}

function priceState(context) {
  const diagnosis = context?.price_diagnosis ?? {};
  const referenceCount =
    context?.price_reference_project_ids?.length ?? 0;
  if (context?.price_status !== "ready") {
    return {
      label: "Referencia de precio insuficiente",
      tone: "warning",
      copy: `${formatNumber(referenceCount)} referencias publicadas provisionales; se requieren al menos 3.`,
    };
  }

  const range = `${pricePerM2(diagnosis.p25)} – ${pricePerM2(
    diagnosis.p75,
  )}`;
  const position = diagnosis.position
    ? ` El escenario simulado se clasifica como ${diagnosis.position}.`
    : " Define un precio objetivo para estimar una posición.";
  return {
    label: "Referencia de precio lista",
    tone: "success",
    copy:
      `${formatNumber(referenceCount)} referencias publicadas provisionales; ` +
      `mediana ${pricePerM2(diagnosis.median)} y rango central ${range}.` +
      position,
  };
}

function checklistReadiness({
  available,
  comparableCount,
  priceReferenceCount,
  comparison,
  price,
  assistantHandoff,
}) {
  const ready =
    available &&
    comparison.tone === "success" &&
    price.tone === "success" &&
    comparableCount > 0 &&
    priceReferenceCount >= 3;

  return {
    ready,
    readyText: !available
      ? "No existe un escenario verificable para preparar el cierre."
      : comparableCount === 0
        ? "Sin comparables elegibles y sin referencias publicadas provisionales para sostener la lectura."
        : `${formatNumber(comparableCount)} comparables y ${formatNumber(priceReferenceCount)} referencias publicadas provisionales identificadas.`,
    blockedText: ready
      ? "El precio real de cierre y las causas comerciales no están observados."
      : `${comparison.label}. ${price.label}.`,
    nextText: ready
      ? "Contrasta las referencias y conserva sus límites antes de comunicar la recomendación."
      : "Ajusta el escenario o sus filtros y vuelve a validar la evidencia antes de avanzar.",
    assistantHandoff,
  };
}

export function buildChecklistModel({
  data,
  scenarioContext,
  assistantResponse = null,
} = {}) {
  if (!scenarioContext) {
    const model = {
      available: false,
      scopeText: "Escenario no disponible",
      comparableCount: 0,
      priceReferenceCount: 0,
      evidenceCoverage: 0,
      cutoffLabel: "Sin fecha de corte",
      comparison: comparisonState(null),
      price: priceState(null),
      references: [],
      methodology:
        "No se puede evaluar el checklist sin un contexto de escenario vigente.",
    };
    model.readiness = checklistReadiness({
      ...model,
      assistantHandoff: Boolean(assistantResponse),
    });
    return model;
  }

  const comparableIds = [
    ...(scenarioContext.comparable_project_ids ?? []),
  ];
  const priceReferenceIds = new Set(
    scenarioContext.price_reference_project_ids ?? [],
  );
  const references = projectLabels(data, comparableIds)
    .slice(0, 3)
    .map((project) => ({
      ...project,
      hasPublishedPrice: priceReferenceIds.has(project.projectId),
    }));

  const model = {
    available: true,
    scopeText: scenarioContext.scope_text ?? "Alcance sin nombre",
    comparableCount: comparableIds.length,
    priceReferenceCount: priceReferenceIds.size,
    evidenceCoverage:
      finiteNumber(scenarioContext.evidence_coverage_pct) ?? 0,
    cutoffLabel: scenarioContext.cutoff_at
      ? `Corte ${formatDate(scenarioContext.cutoff_at)}`
      : "Sin fecha de corte",
    comparison: comparisonState(scenarioContext),
    price: priceState(scenarioContext),
    references,
    methodology:
      scenarioContext.price_diagnosis?.methodology ??
      "Referencia publicada provisional; no representa precios reales de cierre.",
  };
  model.readiness = checklistReadiness({
    ...model,
    assistantHandoff: Boolean(assistantResponse),
  });
  return model;
}

function referenceRows(model) {
  if (!model.references.length) {
    return checkItem(
      "¿Qué proyectos conviene abrir?",
      "No hay comparables elegibles para recomendar una revisión. Amplía el alcance o corrige filtros de forma explícita.",
      "warning",
    );
  }
  return model.references
    .map((reference) =>
      `
        <div data-canonical-project-id="${escapeAttr(
          reference.projectId,
        )}">
          ${checkItem(
            reference.label,
            `${reference.projectId} · ${
              reference.hasPublishedPrice
                ? "con precio publicado provisional compatible"
                : "sin referencia de precio compatible"
            }`,
            reference.hasPublishedPrice
              ? "success"
              : "neutral",
          )}
        </div>
      `,
    )
    .join("");
}

export function renderChecklistModel(model) {
  return `
    <section
      class="dashboard-grid checklist-evidence"
      data-scenario-consumer="checklist"
      data-checklist-readiness="${model.readiness.ready ? "ready" : "blocked"}"
    >
      <section class="checklist-hero span-12">
        <div>
          <span class="status-badge ${escapeHtml(model.comparison.tone)}">
            ${escapeHtml(model.comparison.label)}
          </span>
          <h2>Checklist de evidencia · ${escapeHtml(model.scopeText)}</h2>
          <p>Verifica qué puede sostenerse antes de convertirlo en argumento comercial.</p>
        </div>
        <a
          class="primary-button checklist-return"
          href="#journey/decision"
          data-journey-return="decision"
        >Volver al recorrido: Decisión</a>
      </section>

      <section class="checklist-close span-12" aria-labelledby="checklist-close-title">
        <div class="checklist-close__heading">
          <span class="step-label">Resumen de cierre</span>
          <h2 id="checklist-close-title">
            ${model.readiness.ready ? "Listo para revisión humana" : "Avance bloqueado por evidencia"}
          </h2>
          <p>${escapeHtml(model.scopeText)} · ${escapeHtml(model.cutoffLabel)}</p>
        </div>
        <div class="checklist-summary" aria-label="Estado del cierre">
          <div class="checklist-summary__item is-ready">
            <span>Qué está listo</span>
            <p>${escapeHtml(model.readiness.readyText)}</p>
          </div>
          <div class="checklist-summary__item is-blocked">
            <span>Qué está bloqueado</span>
            <p>${escapeHtml(model.readiness.blockedText)}</p>
          </div>
          <div class="checklist-summary__item is-next">
            <span>Próximo paso</span>
            <p>${escapeHtml(model.readiness.nextText)}</p>
          </div>
        </div>
        <div
          class="checklist-assistant-handoff"
          data-assistant-handoff="${model.readiness.assistantHandoff ? "ready" : "empty"}"
        >
          <div>
            <strong>Handoff desde el asistente</strong>
            <p>
              ${
                model.readiness.assistantHandoff
                  ? "La lectura ejecutiva ya fue preparada para este escenario. El checklist conserva sus límites sin repetir la consulta."
                  : "Aún no existe una lectura del asistente para este escenario. El checklist no genera una consulta implícita."
              }
            </p>
          </div>
          <a class="checklist-assistant-link" href="#assistant">
            ${model.readiness.assistantHandoff ? "Revisar lectura" : "Formular consulta"}
          </a>
        </div>
      </section>

      <details class="checklist-detail span-12">
        <summary>Ver comprobaciones y referencias</summary>
        <div class="checklist-detail__body">
          <section class="check-block workflow-step">
            <div class="check-block-title">
              <div>
                <span class="step-label">Alcance</span>
                <h2>Muestra vigente</h2>
              </div>
              ${componentHelp(
                "Muestra vigente",
                "Los conteos provienen del mismo escenario que usan mapa, catálogo y comparador. El checklist no sustituye una muestra vacía por datos distritales.",
              )}
            </div>
            ${checkItem(
              "¿Cuál es el alcance evaluado?",
              `${model.scopeText} · ${model.cutoffLabel}.`,
              model.available ? "success" : "warning",
            )}
            ${checkItem(
              "¿Cuántos comparables entran?",
              `${formatNumber(model.comparableCount)} proyectos comparables · ${formatNumber(
                model.evidenceCoverage,
                1,
              )}% de cobertura media de evidencia. ${model.comparison.copy}`,
              model.comparison.tone,
            )}
          </section>

          <section class="check-block workflow-step">
            <div class="check-block-title">
              <div>
                <span class="step-label">Precio</span>
                <h2>Referencia publicada provisional</h2>
                <span class="status-badge ${escapeAttr(model.price.tone)}">${escapeHtml(model.price.label)}</span>
              </div>
              ${componentHelp(
                "Referencia publicada provisional",
                "Solo usa precios de lista publicados compatibles del escenario. La mediana y el rango no equivalen a precios reales de cierre.",
              )}
            </div>
            ${checkItem("¿La muestra de precio es suficiente?", model.price.copy, model.price.tone)}
            ${checkItem("¿Qué limitación debe acompañar la lectura?", model.methodology, "neutral")}
          </section>

          <section class="check-block workflow-step">
            <div class="check-block-title">
              <div>
                <span class="step-label">Trazabilidad</span>
                <h2>Comparables para revisión</h2>
              </div>
              ${componentHelp(
                "Comparables para revisión",
                "La lista se limita a tres IDs del conjunto comparable vigente. No incorpora proyectos del distrito que hayan quedado fuera del escenario.",
              )}
            </div>
            ${referenceRows(model)}
            <a class="secondary-button checklist-projects-link" href="#projects">Abrir comparables</a>
          </section>

          <section class="check-block workflow-step final-step">
            <div class="check-block-title">
              <div>
                <span class="step-label">Decisión</span>
                <h2>Condición de avance</h2>
              </div>
            </div>
            <div class="next-action-card">
              <strong>${
                model.readiness.ready
                  ? "La evidencia permite continuar con una revisión humana."
                  : "Detén cualquier conclusión de precio."
              }</strong>
              <p>${escapeHtml(model.readiness.nextText)}</p>
            </div>
          </section>
        </div>
      </details>
    </section>
  `;
}

export function renderChecklist() {
  return renderChecklistModel(
    buildChecklistModel({
      data: state.data,
      scenarioContext: state.scenarioContext,
      assistantResponse: state.assistantResponse,
    }),
  );
}
