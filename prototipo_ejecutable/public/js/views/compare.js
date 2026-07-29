import {
  areaLabel,
  bedroomsLabel,
  componentHelp,
  deliveryLabel,
  emptyState,
  escapeAttr,
  escapeHtml,
  formatNumber,
  money,
  normalizeSearch,
  priceM2,
} from "../domain.js";
import { state } from "../state.js";
import {
  buildComparableRows,
  canonicalProjectIdForView,
} from "./projects.js";

const MAX_SELECTED = 3;

function searchableText(row) {
  return [
    row.projectId,
    row.legacyId,
    row.project.project_name,
    row.project.agency_name,
    row.project.address,
  ]
    .map(normalizeSearch)
    .join(" ");
}

export function buildCompareModel({
  projects = [],
  scenarioContext = null,
  query = "",
  selectedProjectIds = [],
  maxSelected = MAX_SELECTED,
} = {}) {
  const rows = buildComparableRows({ projects, scenarioContext });
  const rowsById = new Map(
    rows.map((row) => [row.projectId, row]),
  );
  const safeMaximum =
    Number.isInteger(maxSelected) && maxSelected > 0
      ? Math.min(maxSelected, MAX_SELECTED)
      : MAX_SELECTED;
  const selectedIds = [
    ...new Set(
      selectedProjectIds
        .map(canonicalProjectIdForView)
        .filter((projectId) => rowsById.has(projectId)),
    ),
  ].slice(0, safeMaximum);
  const selectedIdSet = new Set(selectedIds);
  const normalizedQuery = normalizeSearch(query).trim();
  const candidates = rows.filter(
    (row) =>
      !normalizedQuery ||
      searchableText(row).includes(normalizedQuery),
  );

  return {
    scopeText:
      String(scenarioContext?.scope_text ?? "") ||
      "Alcance sin descripción",
    comparableCount: rows.length,
    priceReferenceCount: rows.filter((row) => row.priceEligible)
      .length,
    query: String(query ?? ""),
    candidates,
    selected: selectedIds.map((projectId) =>
      rowsById.get(projectId),
    ),
    selectedIds,
    maxSelected: safeMaximum,
    isAtMaximum: selectedIds.length >= safeMaximum,
    selectedIdSet,
  };
}

function candidateMarkup(row, model) {
  const checked = model.selectedIdSet.has(row.projectId);
  const disabled = model.isAtMaximum && !checked;
  return `
    <label
      class="compare-candidate ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}"
      data-canonical-project-id="${escapeAttr(row.projectId)}"
    >
      <input
        type="checkbox"
        data-compare-toggle
        value="${escapeAttr(row.projectId)}"
        data-canonical-project-id="${escapeAttr(row.projectId)}"
        ${checked ? "checked" : ""}
        ${disabled ? "disabled" : ""}
      />
      <span>
        <strong>${escapeHtml(row.project.project_name || "Proyecto sin nombre")}</strong>
        <small>
          ${escapeHtml(row.project.agency_name || "Inmobiliaria no registrada")} ·
          Score ${formatNumber(row.score, 1)} ·
          ${formatNumber(row.evidenceCoverage, 1)}% evidencia
        </small>
      </span>
      <em>
        ${
          row.distanceMeters === null
            ? "Distrito/cuadrante"
            : `${formatNumber(row.distanceMeters, 0)} m`
        }
      </em>
    </label>
  `;
}

function provisionalPrice(row, formatter) {
  return row.priceEligible
    ? formatter(row)
    : "No elegible";
}

function matrixRow(label, selected, formatter) {
  return `
    <tr>
      <th scope="row">${escapeHtml(label)}</th>
      ${selected
        .map(
          (row) =>
            `<td>${escapeHtml(String(formatter(row)))}</td>`,
        )
        .join("")}
    </tr>
  `;
}

function comparisonMatrix(model) {
  const selected = model.selected;
  return `
    <div class="positioning-table">
      <div class="positioning-table-scroll">
        <table>
          <caption class="sr-only">
            Comparación por filas de los proyectos seleccionados
          </caption>
          <thead>
            <tr>
              <th scope="col">Criterio</th>
              ${selected
                .map(
                  (row) =>
                    `<th
                      scope="col"
                      data-canonical-project-id="${escapeAttr(row.projectId)}"
                    >${escapeHtml(row.project.project_name || "Proyecto")}</th>`,
                )
                .join("")}
            </tr>
          </thead>
          <tbody>
            ${matrixRow(
              "Inmobiliaria",
              selected,
              (row) =>
                row.project.agency_name || "No registrada",
            )}
            ${matrixRow(
              "Score de comparabilidad",
              selected,
              (row) =>
                `${formatNumber(row.score, 1)} · ${row.evidenceLabel}`,
            )}
            ${matrixRow(
              "Cobertura de evidencia",
              selected,
              (row) =>
                `${formatNumber(row.evidenceCoverage, 1)}%`,
            )}
            ${matrixRow(
              "Distancia",
              selected,
              (row) =>
                row.distanceMeters === null
                  ? "Incluido en distrito/cuadrante"
                  : `${formatNumber(row.distanceMeters, 0)} m`,
            )}
            ${matrixRow(
              "Precio publicado provisional",
              selected,
              (row) =>
                provisionalPrice(row, ({ priceTotal }) =>
                  money(priceTotal),
                ),
            )}
            ${matrixRow(
              "Precio publicado / m²",
              selected,
              (row) =>
                provisionalPrice(row, ({ pricePerM2 }) =>
                  priceM2(pricePerM2),
                ),
            )}
            ${matrixRow(
              "Área total publicada",
              selected,
              (row) => areaLabel(row.project.total_area),
            )}
            ${matrixRow(
              "Dormitorios",
              selected,
              (row) => bedroomsLabel(row.project),
            )}
            ${matrixRow(
              "Fase publicada",
              selected,
              (row) =>
                row.project.project_phase || "No disponible",
            )}
            ${matrixRow(
              "Entrega",
              selected,
              (row) => deliveryLabel(row.project),
            )}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export function renderCompare() {
  const model = buildCompareModel({
    projects: state.data?.projects ?? [],
    scenarioContext: state.scenarioContext,
    query: state.compareQuery,
    selectedProjectIds: state.compareProjectIds,
  });
  state.compareProjectIds = [...model.selectedIds];
  const initiallyVisible = model.candidates.slice(0, 9);
  const additional = model.candidates.slice(9);

  return `
    <section
      class="compare-layout"
      data-scenario-consumer="compare"
    >
      <section class="panel compare-picker">
        <div class="panel-header">
          <div>
            <h2>Selecciona hasta 3 comparables</h2>
            <p>
              ${escapeHtml(model.scopeText)} ·
              busca dentro de los ${formatNumber(model.comparableCount)}
              IDs del escenario.
            </p>
          </div>
          <div class="panel-header-actions">
            <span class="tag neutral">
              ${formatNumber(model.selected.length)}/${formatNumber(model.maxSelected)}
              seleccionados
            </span>
            ${componentHelp(
              "Selección canónica",
              "Solo se ofrecen proyectos de comparable_project_ids. La búsqueda no amplía el alcance ni usa un fallback distrital.",
            )}
          </div>
        </div>
        <div class="local-controls single-row">
          <label class="field-control search-control" for="compare-query">
            <span>Buscar en todos los comparables del escenario</span>
            <input
              id="compare-query"
              type="search"
              value="${escapeAttr(model.query)}"
              placeholder="Proyecto, inmobiliaria, dirección o ID"
            />
          </label>
        </div>
        <div class="compare-candidates">
          ${
            initiallyVisible
              .map((row) => candidateMarkup(row, model))
              .join("") ||
            emptyState(
              "Sin candidatos para esta búsqueda",
              "Limpia la búsqueda. El escenario y sus comparables permanecen sin cambios.",
            )
          }
        </div>
        ${
          additional.length
            ? `
              <details class="content-expander">
                <summary>
                  Ver ${formatNumber(additional.length)} comparables adicionales
                </summary>
                <div class="compare-candidates">
                  ${additional
                    .map((row) => candidateMarkup(row, model))
                    .join("")}
                </div>
              </details>
            `
            : ""
        }
      </section>

      <section class="panel compare-board">
        <div class="panel-header">
          <div>
            <h2>Matriz de comparación</h2>
            <p>
              Lee precio, área y atributos en filas para evitar una
              cuadrícula horizontal de tarjetas.
            </p>
          </div>
          ${componentHelp(
            "Alcance de la comparación",
            "Score, cobertura y distancia proceden del escenario vigente. El precio solo aparece cuando pertenece a price_reference_project_ids y sigue siendo una referencia publicada provisional.",
          )}
        </div>
        ${
          model.selected.length >= 2
            ? comparisonMatrix(model)
            : emptyState(
                "Selección insuficiente",
                "Elige al menos 2 proyectos del escenario para abrir la matriz.",
              )
        }
        <div class="executive-conclusion">
          <span>Lectura prudente</span>
          <strong>
            ${
              model.priceReferenceCount >= 3
                ? `${formatNumber(model.priceReferenceCount)} referencias publicadas elegibles`
                : "Referencia de precio insuficiente"
            }
          </strong>
          <p>
            Los precios mostrados son de lista y provisionales. No
            representan precios reales de cierre ni un benchmark certificado.
          </p>
        </div>
      </section>
    </section>
  `;
}
