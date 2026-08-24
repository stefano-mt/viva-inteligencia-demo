import { buildComparisonModel } from "../benchmark.js";
import {
  componentHelp,
  emptyState,
  escapeAttr,
  escapeHtml,
  formatDate,
  formatNumber,
  money,
  normalizeSearch,
  priceM2,
} from "../domain.js";
import { state } from "../state.js";

const MAX_SELECTED = 3;
const INITIAL_CANDIDATE_COUNT = 8;

const VALUE_STATE_LABELS = Object.freeze({
  announced: "Anunciado",
  derived: "Derivado",
  excluded: "Excluido",
  observed: "Observado",
  simulated: "Simulado",
  unknown: "No informado",
});

const VALUE_STATE_DESCRIPTIONS = Object.freeze({
  announced: "Declarado en la publicación; no equivale a verificación física.",
  derived: "Calculado a partir de valores visibles del escenario.",
  excluded: "El dato existe, pero no cumple la política de comparación.",
  observed: "Dato visible en una fuente autorizada de la muestra.",
  simulated: "Valor ingresado para el escenario Viva; no es una oferta publicada.",
  unknown: "La fuente pública no informa este dato.",
});

function summaryMap(benchmarkContext) {
  return new Map([
    ...(benchmarkContext?.projectSummaries ?? []).map((summary) => [
      summary.projectId,
      summary,
    ]),
    ...(benchmarkContext?.targetScenario
      ? [["target:viva", benchmarkContext.targetScenario]]
      : []),
  ]);
}

function comparisonProjectId(benchmarkContext, requestedId) {
  const projectId = String(requestedId ?? "");
  const available = benchmarkContext?.projectSummaries ?? [];
  if (available.some((summary) => summary.projectId === projectId)) {
    return projectId;
  }
  const legacyMatches = available.filter(({ projectId: candidateId }) =>
    candidateId.endsWith(`-${projectId}`),
  );
  return legacyMatches.length === 1 ? legacyMatches[0].projectId : projectId;
}

function searchableText(summary) {
  return [summary.projectId, summary.name, summary.agencyName, summary.district]
    .map(normalizeSearch)
    .join(" ");
}

function safeDomId(value) {
  return String(value ?? "row")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function rowDomId(rowId) {
  return `comparison-row-${safeDomId(rowId)}`;
}

function sourceMetadata(summary) {
  if (!summary?.source) return null;
  return {
    sourceId: summary.source.sourceId ?? null,
    capturedAt: summary.source.capturedAt ?? null,
    evidenceStatus: summary.source.evidenceStatus ?? null,
  };
}

function safeCount(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function normalizeList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item !== null && item !== undefined && item !== "")
    .map((item) => String(item));
}

function readableAttribute(value) {
  return String(value)
    .replace(/^attribute:/u, "")
    .replaceAll("_", " ")
    .replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

function displayValue(row, value) {
  if (value?.state === "unknown" || value?.normalizedValue === null) {
    return "No informado";
  }
  if (value.state === "excluded") return "Excluido de esta comparación";

  const normalized = value.normalizedValue;
  switch (row.id) {
    case "price.published_from":
      return money(normalized);
    case "price.price_per_m2_total":
      return priceM2(normalized);
    case "areas.total":
      return `${formatNumber(normalized, 2)} m²`;
    case "product.units_reported":
      return `${formatNumber(normalized)} unidades reportadas`;
    case "parking.reported":
      return `${formatNumber(normalized)} estacionamientos reportados`;
    case "common_areas.announced": {
      const originals = normalizeList(value.originalValue);
      const attributes = originals.length
        ? originals
        : normalizeList(normalized).map(readableAttribute);
      return attributes.length ? attributes.join(" · ") : "No informado";
    }
    case "sources.confidence":
      return normalized ? readableAttribute(normalized) : "No informado";
    default:
      return Array.isArray(normalized)
        ? normalizeList(normalized).map(readableAttribute).join(" · ")
        : String(normalized);
  }
}

function originalValueLabel(value) {
  const originals = normalizeList(value?.originalValue);
  if (originals.length) return originals.join(" · ");
  if (value?.originalValue !== null && value?.originalValue !== undefined) {
    return String(value.originalValue);
  }
  return "No informado por la fuente";
}

function evidenceDetails(row, value, summary) {
  const source = sourceMetadata(summary);
  const inspectorAllowed =
    value?.state !== "unknown" && Boolean(summary?.inspectorPath);
  const hasDetails =
    source ||
    value?.factId ||
    value?.exclusionReason ||
    value?.originalValue !== null;

  if (!hasDetails && !inspectorAllowed) return "";

  return `
    <details class="comparison-evidence">
      <summary>Ver datos y evidencia</summary>
      <dl>
        <div>
          <dt>Valor original</dt>
          <dd>${escapeHtml(originalValueLabel(value))}</dd>
        </div>
        ${
          source?.sourceId
            ? `<div><dt>Fuente</dt><dd>${escapeHtml(source.sourceId)}</dd></div>`
            : ""
        }
        ${
          source?.capturedAt
            ? `<div><dt>Captura</dt><dd>${escapeHtml(formatDate(source.capturedAt))}</dd></div>`
            : ""
        }
        ${
          source?.evidenceStatus
            ? `<div><dt>Estado de evidencia</dt><dd>${escapeHtml(readableAttribute(source.evidenceStatus))}</dd></div>`
            : ""
        }
        ${
          value?.confidence !== null && value?.confidence !== undefined
            ? `<div><dt>Confianza</dt><dd>${escapeHtml(formatNumber(value.confidence, 2))}</dd></div>`
            : ""
        }
        ${
          value?.factId
            ? `<div><dt>ID de dato</dt><dd><code>${escapeHtml(value.factId)}</code></dd></div>`
            : ""
        }
        ${
          value?.exclusionReason
            ? `<div><dt>Motivo</dt><dd>${escapeHtml(readableAttribute(value.exclusionReason))}</dd></div>`
            : ""
        }
      </dl>
      ${
        inspectorAllowed
          ? `<a class="comparison-inspector-link" href="${escapeAttr(summary.inspectorPath)}">Abrir inspector de evidencia</a>`
          : ""
      }
    </details>
  `;
}

function comparisonCell(row, value, selectedProject, summaries) {
  const summary = summaries.get(value.projectId);
  const stateLabel = VALUE_STATE_LABELS[value.state] ?? "No informado";
  const stateDescription =
    VALUE_STATE_DESCRIPTIONS[value.state] ?? VALUE_STATE_DESCRIPTIONS.unknown;
  return `
    <div
      class="comparison-cell is-${escapeAttr(value.state ?? "unknown")}${
        selectedProject?.simulated ? " is-viva-target" : ""
      }"
      role="cell"
      data-project-id="${escapeAttr(value.projectId)}"
    >
      <span class="comparison-cell__project">${escapeHtml(
        selectedProject?.name ?? "Proyecto",
      )}</span>
      <strong>${escapeHtml(displayValue(row, value))}</strong>
      <span
        class="comparison-value-state"
        title="${escapeAttr(stateDescription)}"
      >${escapeHtml(stateLabel)}</span>
      ${evidenceDetails(row, value, summary)}
    </div>
  `;
}

function comparisonRow(row, selected, summaries, priorityRows) {
  const isPriority = priorityRows.has(row.id);
  return `
    <div
      id="${escapeAttr(rowDomId(row.id))}"
      class="comparison-metric-row${isPriority ? " is-priority" : ""}"
      role="row"
      data-comparison-row="${escapeAttr(row.id)}"
      tabindex="-1"
    >
      <div class="comparison-metric-row__label" role="rowheader">
        <span>${escapeHtml(row.label)}</span>
        ${isPriority ? "<small>Diferencia prioritaria</small>" : ""}
      </div>
      <div
        class="comparison-metric-row__values"
        role="presentation"
        style="--comparison-columns: ${Math.max(selected.length, 1)}"
      >
        ${row.values
          .map((value, index) =>
            comparisonCell(row, value, selected[index], summaries),
          )
          .join("")}
      </div>
    </div>
  `;
}

function comparisonGroup(group, model, summaries) {
  const priorityRows = new Set(model.priorityRows);
  const startsOpen = group.id === "price";
  return `
    <details
      class="comparison-group"
      data-comparison-group="${escapeAttr(group.id)}"
      ${startsOpen ? "open" : ""}
    >
      <summary>
        <span>${escapeHtml(group.label)}</span>
        <small>${formatNumber(group.rows.length)} ${
          group.rows.length === 1 ? "criterio" : "criterios"
        }</small>
      </summary>
      <div class="comparison-group__body" role="table" aria-label="${escapeAttr(
        `Comparación: ${group.label}`,
      )}">
        ${group.rows
          .map((row) =>
            comparisonRow(row, model.selected, summaries, priorityRows),
          )
          .join("")}
      </div>
    </details>
  `;
}

function conclusionMarkup(model, { linksEnabled = true } = {}) {
  return `
    <section
      class="comparison-conclusion"
      aria-labelledby="comparison-conclusion-title"
      data-comparison-findings="${formatNumber(model.conclusion.length)}"
      data-commercial-comparison-summary
    >
      <div class="comparison-decision-sheet">
        <div>
          <span class="comparison-eyebrow">Decisión sustentada</span>
          <h2 id="comparison-conclusion-title">Qué cambia la decisión</h2>
          <p>Lee primero la condición principal; abre la matriz solo para comprobar el criterio y su evidencia.</p>
        </div>
        ${
          linksEnabled
            ? `<div class="comparison-decision-sheet__actions">
                <a class="primary-button comparison-next-action" href="#journey/movement">Revisar movimiento</a>
                ${componentHelp(
                  "Cómo se construye esta conclusión",
                  "Cada hallazgo se calcula con la comparación de mercado y enlaza el criterio exacto que lo sustenta. No reemplaza la validación comercial.",
                )}
              </div>`
            : componentHelp(
                "Cómo se construye esta conclusión",
                "Cada hallazgo se calcula con la comparación de mercado y enlaza el criterio exacto que lo sustenta. No reemplaza la validación comercial.",
              )
        }
      </div>
      <ol class="comparison-findings comparison-row-ledger">
        ${model.conclusion
          .map(
            (finding, index) => `
              <li class="comparison-finding${index === 0 ? " is-lead" : ""}">
                <div class="comparison-finding__number">${String(index + 1).padStart(2, "0")}</div>
                <div class="comparison-finding__content">
                  <span class="comparison-finding__role">${
                    index === 0 ? "Condición principal" : "Diferencia de apoyo"
                  }</span>
                  <strong>${escapeHtml(finding.finding)}</strong>
                  <div class="comparison-finding__decision">
                    <p><b>Para la decisión</b><span>${escapeHtml(finding.implication)}</span></p>
                    <p><b>Qué revisar</b><span>${escapeHtml(finding.nextAction)}</span></p>
                  </div>
                  <div class="comparison-finding__actions">
                    <details class="comparison-finding__limit">
                      <summary>Límite de este hallazgo</summary>
                      <p>${escapeHtml(finding.limitation)}</p>
                    </details>
                    ${
                      linksEnabled
                        ? `<button
                            type="button"
                            class="comparison-row-link"
                            data-comparison-row-target="${escapeAttr(finding.rowId)}"
                            aria-controls="${escapeAttr(rowDomId(finding.rowId))}"
                          >Ver criterio y evidencia</button>`
                        : ""
                    }
                  </div>
                </div>
              </li>
            `,
          )
          .join("")}
      </ol>
    </section>
  `;
}

function denominatorMarkup(benchmarkContext, model) {
  const scopeCount = safeCount(benchmarkContext?.scope?.projectCount);
  const selectedCount = model.selected.filter(({ simulated }) => !simulated).length;
  const eligibleCount = safeCount(
    benchmarkContext?.quantitative?.pricePerM2Total?.n,
  );
  const orientativeCount = safeCount(
    benchmarkContext?.quantitative?.pricePerM2Total?.orientative?.n,
  );
  const countLabel = (value) =>
    value === null ? "No disponible" : formatNumber(value);

  return `
    <details
      class="comparison-basis"
      aria-labelledby="comparison-basis-title"
      data-comparison-denominators
      data-scope-projects="${scopeCount ?? "unavailable"}"
      data-selected-projects="${selectedCount}"
      data-eligible-price-pairs="${eligibleCount ?? "unavailable"}"
      data-orientative-price-ratios="${orientativeCount ?? "unavailable"}"
      data-commercial-comparison-basis
    >
      <summary class="comparison-basis__summary">
        <span>
          <span class="comparison-eyebrow">Base de lectura</span>
          <strong id="comparison-basis-title">${countLabel(scopeCount)} comparables · ${formatNumber(
            selectedCount,
          )} seleccionados · ${countLabel(eligibleCount)} pares de precio elegibles</strong>
        </span>
        <span>Ver base de comparación</span>
      </summary>
      <div class="comparison-basis__body">
        <div class="comparison-basis__intro">
          <h2>Tres grupos que no deben sumarse</h2>
          <p>La tabla compara una selección de la zona; el precio por m² requiere que precio y área correspondan a la misma unidad.</p>
        </div>
        <dl class="comparison-basis__ledger">
          <div>
            <dt>Zona activa</dt>
            <dd><strong>${countLabel(scopeCount)}</strong> proyectos comparables</dd>
          </div>
          <div>
            <dt>Matriz visible</dt>
            <dd><strong>${formatNumber(selectedCount)}</strong> proyectos seleccionados</dd>
          </div>
          <div>
            <dt>Precio por m²</dt>
            <dd><strong>${countLabel(eligibleCount)}</strong> pares comparables · ${countLabel(orientativeCount)} referencias orientativas</dd>
          </div>
        </dl>
        <div class="comparison-basis__references">
          <p>Estos conteos describen grupos distintos y no se suman.</p>
          <a href="#market">Revisar referencia y metodología</a>
        </div>
      </div>
    </details>
  `;
}

function selectedChips(model) {
  if (!model.selected.length) return "";
  return `
    <div class="comparison-selected" aria-label="Proyectos seleccionados">
      ${model.selected
        .map(
          (project) => `
            <span class="comparison-chip${project.simulated ? " is-target" : ""}">
              <span>
                <strong>${escapeHtml(project.name)}</strong>
                <small>${escapeHtml(project.agencyName ?? "Inmobiliaria no informada")}</small>
              </span>
              <button
                type="button"
                ${
                  project.simulated
                    ? "data-compare-target-toggle"
                    : `data-compare-remove="${escapeAttr(project.projectId)}"`
                }
                aria-label="Quitar ${escapeAttr(project.name)} de la comparación"
              >×</button>
            </span>
          `,
        )
        .join("")}
    </div>
  `;
}

function candidateMarkup(summary, selectedIds, atMaximum) {
  const checked = selectedIds.has(summary.projectId);
  const disabled = atMaximum && !checked;
  return `
    <label class="comparison-candidate${checked ? " is-selected" : ""}${
      disabled ? " is-disabled" : ""
    }">
      <input
        type="checkbox"
        data-compare-toggle
        value="${escapeAttr(summary.projectId)}"
        ${checked ? "checked" : ""}
        ${disabled ? "disabled" : ""}
      />
      <span>
        <strong>${escapeHtml(summary.name ?? "Proyecto sin nombre")}</strong>
        <small>${escapeHtml(summary.agencyName ?? "Inmobiliaria no informada")} · ${escapeHtml(
          summary.district ?? "Distrito no informado",
        )}</small>
      </span>
      <code>${escapeHtml(summary.projectId)}</code>
    </label>
  `;
}

function selectorMarkup({ benchmarkContext, model, query }) {
  const selectedIds = new Set(
    model.selected.filter(({ simulated }) => !simulated).map(({ projectId }) => projectId),
  );
  const normalizedQuery = normalizeSearch(query).trim();
  const candidates = (benchmarkContext?.projectSummaries ?? []).filter(
    (summary) => !normalizedQuery || searchableText(summary).includes(normalizedQuery),
  );
  const visible = candidates.slice(0, INITIAL_CANDIDATE_COUNT);
  const additional = candidates.slice(INITIAL_CANDIDATE_COUNT);
  const atMaximum = selectedIds.size >= MAX_SELECTED;

  return `
    <details class="comparison-selector">
      <summary class="${model.status === "insufficient" ? "primary-button" : "secondary-button"}">${
        model.status === "insufficient" ? "Seleccionar proyectos" : "Cambiar proyectos"
      }</summary>
      <div class="comparison-selector__body">
        <label class="field-control" for="compare-query">
          <span>Buscar dentro del escenario</span>
          <input
            id="compare-query"
            type="search"
            value="${escapeAttr(query)}"
            placeholder="Proyecto, inmobiliaria, distrito o ID"
          />
        </label>
        <p class="comparison-selector__rule">
          Elige entre 2 y 3 proyectos de la zona activa. La búsqueda no añade proyectos de otra zona.
        </p>
        <div class="comparison-candidate-list">
          ${
            visible
              .map((summary) => candidateMarkup(summary, selectedIds, atMaximum))
              .join("") ||
            emptyState(
              "Sin coincidencias en este escenario",
              "Limpia la búsqueda para recuperar los proyectos disponibles.",
            )
          }
        </div>
        ${
          additional.length
            ? `<details class="comparison-candidate-more">
                <summary>Ver ${formatNumber(additional.length)} proyectos adicionales</summary>
                <div class="comparison-candidate-list">
                  ${additional
                    .map((summary) => candidateMarkup(summary, selectedIds, atMaximum))
                    .join("")}
                </div>
              </details>`
            : ""
        }
      </div>
    </details>
  `;
}

function comparisonHeader(benchmarkContext, model) {
  const targetAvailable = Boolean(benchmarkContext?.targetScenario);
  const targetIncluded = model.selected.some(({ simulated }) => simulated);
  const marketCount = model.selected.filter(({ simulated }) => !simulated).length;
  return `
    <header class="comparison-hero">
      <div>
        <span class="comparison-eyebrow">Decisión entre comparables</span>
        <h1>Comparador comercial</h1>
        <p>
          Contrasta diferencias respaldadas del mismo escenario y separa lo observado de lo simulado.
        </p>
      </div>
      <div class="comparison-hero__status" aria-label="Estado de la selección">
        <strong>${formatNumber(marketCount)}/${MAX_SELECTED}</strong>
        <span>proyectos de mercado</span>
      </div>
    </header>
    ${
      model.status === "ready"
        ? conclusionMarkup(model)
        : ""
    }
    <section class="comparison-command" aria-label="Selección de proyectos">
      <div>
        ${selectedChips(model)}
        ${
          model.removedProjectIds.length
            ? `<p class="comparison-announcement" role="status">Se retiraron ${formatNumber(
                model.removedProjectIds.length,
              )} selecciones fuera del escenario o del máximo permitido.</p>`
            : ""
        }
      </div>
      <div class="comparison-command__actions">
        ${
          targetAvailable
            ? `<button
                type="button"
                class="secondary-button comparison-target-action"
                data-compare-target-toggle
                aria-pressed="${targetIncluded ? "true" : "false"}"
              >${targetIncluded ? "Quitar escenario Viva" : "Incluir escenario Viva"}</button>`
            : `<p class="comparison-target-hint">Configura precio y área del escenario para compararlo con Viva.</p>`
        }
        ${selectorMarkup({
          benchmarkContext,
          model,
          query: state.compareQuery ?? "",
        })}
      </div>
    </section>
    ${denominatorMarkup(benchmarkContext, model)}
  `;
}

function unavailableMarkup(status, benchmarkContext) {
  const isLegacy = status === "contract_unavailable";
  const description = isLegacy
    ? "Esta versión de datos conserva el análisis territorial, pero no incluye la información requerida por el comparador."
    : "La vista se detuvo para no presentar una conclusión sin estructura de evidencia válida.";
  return `
    <section class="comparison-unavailable" data-comparison-status="${escapeAttr(status)}">
      <span class="comparison-eyebrow">Comparador comercial</span>
      <h1>${isLegacy ? "Comparador no disponible para esta versión de datos" : "No se pudo construir una comparación segura"}</h1>
      <p>${escapeHtml(description)}</p>
      ${
        benchmarkContext?.errorCodes?.length
          ? `<code>${escapeHtml(benchmarkContext.errorCodes.join(" · "))}</code>`
          : ""
      }
    </section>
  `;
}

export function buildComparisonViewModel({
  benchmarkContext = state.benchmarkContext,
  selectedProjectIds = state.compareProjectIds,
  includeTargetScenario = state.compareIncludeTarget,
} = {}) {
  return buildComparisonModel({
    benchmarkContext,
    selectedProjectIds: Array.isArray(selectedProjectIds)
      ? selectedProjectIds.map((projectId) =>
          comparisonProjectId(benchmarkContext, projectId),
        )
      : [],
    includeTargetScenario,
  });
}

export function renderCompare() {
  const benchmarkContext = state.benchmarkContext;
  const model = buildComparisonViewModel({
    benchmarkContext,
    selectedProjectIds: state.compareProjectIds,
    includeTargetScenario: state.compareIncludeTarget,
  });

  if (["contract_unavailable", "error"].includes(model.status)) {
    return `
      <section class="comparison-shell" data-scenario-consumer="compare">
        ${unavailableMarkup(model.status, benchmarkContext)}
      </section>
    `;
  }

  const summaries = summaryMap(benchmarkContext);
  const selectionReady = model.selected.filter(({ simulated }) => !simulated).length >= 2;

  return `
    <section
      class="comparison-shell"
      data-scenario-consumer="compare"
      data-comparison-status="${escapeAttr(model.status)}"
    >
      ${comparisonHeader(benchmarkContext, model)}

      ${
        selectionReady
          ? `
            <section class="comparison-matrix" aria-labelledby="comparison-matrix-title" data-commercial-comparison-matrix>
              <div class="comparison-section-heading">
                <div>
                  <span class="comparison-eyebrow">Evidencia por criterio</span>
                  <h2 id="comparison-matrix-title">Comparación completa</h2>
                  <p>Precio inicia abierto; despliega otro grupo solo cuando aporte a tu decisión.</p>
                </div>
                <span class="comparison-count">${formatNumber(model.groups.length)} grupos · ${formatNumber(
                  model.groups.reduce((total, group) => total + group.rows.length, 0),
                )} criterios</span>
                ${componentHelp(
                  "Cómo leer las celdas",
                  "Cada valor indica si fue observado, calculado, simulado, anunciado, excluido o no informado. Abre sus datos para revisar fuente y fecha cuando estén disponibles.",
                )}
              </div>
              <div class="comparison-project-head" style="--comparison-columns: ${Math.max(
                model.selected.length,
                1,
              )}">
                <span>Criterio</span>
                <div>
                  ${model.selected
                    .map(
                      (project) => `<span class="${project.simulated ? "is-viva-target" : ""}">
                        <strong>${escapeHtml(project.name)}</strong>
                        <small>${escapeHtml(project.agencyName ?? "Inmobiliaria no informada")}</small>
                      </span>`,
                    )
                    .join("")}
                </div>
              </div>
              <div class="comparison-groups">
                ${model.groups
                  .map((group) => comparisonGroup(group, model, summaries))
                  .join("")}
              </div>
            </section>
          `
          : `<section class="comparison-selection-empty">
              ${emptyState(
                model.selected.length
                  ? "Selecciona un proyecto más"
                  : "Selecciona dos proyectos para comenzar",
                "El comparador admite hasta tres proyectos del escenario y, opcionalmente, el escenario Viva.",
              )}
            </section>`
      }

      ${
        model.limitations.length
          ? `<details class="comparison-limitations">
              <summary>Limitaciones de esta lectura</summary>
              <ul>${model.limitations
                .map((limitation) => `<li>${escapeHtml(limitation)}</li>`)
                .join("")}</ul>
            </details>`
          : ""
      }
    </section>
  `;
}
