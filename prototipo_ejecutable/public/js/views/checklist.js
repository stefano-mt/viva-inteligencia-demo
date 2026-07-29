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

export function buildChecklistModel({
  data,
  scenarioContext,
} = {}) {
  if (!scenarioContext) {
    return {
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

  return {
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
    >
      <section class="checklist-hero span-12">
        <div>
          <span class="status-badge ${escapeHtml(model.comparison.tone)}">
            ${escapeHtml(model.comparison.label)}
          </span>
          <h2>Checklist de evidencia · ${escapeHtml(model.scopeText)}</h2>
          <p>
            Verifica qué puede sostenerse con el escenario activo antes de
            convertirlo en argumento comercial.
          </p>
        </div>
        <button class="primary-button" type="button" data-view="projects">
          Abrir comparables
        </button>
      </section>

      <section class="check-block workflow-step span-12">
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

      <section class="check-block workflow-step span-12">
        <div class="check-block-title">
          <div>
            <span class="step-label">Precio</span>
            <h2>Referencia publicada provisional</h2>
            <span class="status-badge ${escapeAttr(
              model.price.tone,
            )}">
              ${escapeHtml(model.price.label)}
            </span>
          </div>
          ${componentHelp(
            "Referencia publicada provisional",
            "Solo usa precios de lista publicados compatibles del escenario. La mediana y el rango no equivalen a precios reales de cierre.",
          )}
        </div>
        ${checkItem(
          "¿La muestra de precio es suficiente?",
          model.price.copy,
          model.price.tone,
        )}
        ${checkItem(
          "¿Qué limitación debe acompañar la lectura?",
          model.methodology,
          "neutral",
        )}
      </section>

      <section class="check-block workflow-step span-12">
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
      </section>

      <section class="check-block workflow-step final-step span-12">
        <div class="check-block-title">
          <div>
            <span class="step-label">Decisión</span>
            <h2>Condición de avance</h2>
          </div>
        </div>
        <div class="next-action-card">
          <strong>
            ${
              model.comparableCount > 0 &&
              model.priceReferenceCount >= 3
                ? "La evidencia permite continuar con una revisión humana."
                : "Detén cualquier conclusión de precio."
            }
          </strong>
          <p>
            ${
              model.comparableCount > 0 &&
              model.priceReferenceCount >= 3
                ? "Contrasta los proyectos listados y conserva la etiqueta provisional al comunicar resultados."
                : "Ajusta alcance o filtros y vuelve a comprobar la muestra; no reemplaces los faltantes con una lectura distrital."
            }
          </p>
        </div>
      </section>
    </section>
  `;
}

export function renderChecklist() {
  return renderChecklistModel(
    buildChecklistModel({
      data: state.data,
      scenarioContext: state.scenarioContext,
    }),
  );
}
