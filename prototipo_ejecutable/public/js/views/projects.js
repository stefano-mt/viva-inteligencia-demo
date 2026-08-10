import {
  areaLabel,
  bedroomsLabel,
  chip,
  componentHelp,
  deliveryLabel,
  emptyState,
  escapeAttr,
  escapeHtml,
  formatNumber,
  miniMetric,
  money,
  normalizeSearch,
  optionList,
  priceM2,
  safeUrl,
  shortText,
  toArray,
} from "../domain.js";
import { inspectorCaseHash } from "../navigation.js";
import { state } from "../state.js";

const DEFAULT_FILTERS = Object.freeze({
  phase: "Todos",
  query: "",
  sort: "direct",
});

const LOCAL_SORT_KEYS = new Set([
  "direct",
  "score",
  "distance",
  "price_m2",
  "price_total",
  "area",
  "bedrooms",
  "delivery",
]);

const SCORE_COMPONENT_LABELS = Object.freeze({
  geography: "Geografía",
  area: "Área",
  bedrooms: "Dormitorios",
  typology: "Tipología",
  delivery: "Entrega",
  price_per_m2: "Precio publicado / m²",
});

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function positiveNumber(value) {
  const number = finiteNumber(value);
  return number !== null && number > 0 ? number : null;
}

function integerLimit(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function compareIds(left, right) {
  return String(left ?? "").localeCompare(String(right ?? ""), "es");
}

export function canonicalProjectIdForView(projectOrId) {
  const value =
    typeof projectOrId === "object" && projectOrId !== null
      ? projectOrId.project_id ?? projectOrId.id
      : projectOrId;
  const id = String(value ?? "");
  if (!id) return null;
  if (id.startsWith("project:")) return id;
  if (id.startsWith("observed:nexo-")) {
    return `project:nexo-${id.slice("observed:nexo-".length)}`;
  }
  return id.includes(":") ? null : `project:nexo-${id}`;
}

export function buildProjectInspectorEntry({
  projectId,
  inspectorCases = [],
  typologies = [],
  currentCaseId = null,
} = {}) {
  if (typeof projectId !== "string" || !projectId) {
    return { inspectable: false };
  }
  const typologyById = new Map(
    toArray(typologies)
      .filter(
        (typology) =>
          typeof typology?.typology_id === "string" &&
          typology.typology_id,
      )
      .map((typology) => [typology.typology_id, typology]),
  );
  const candidates = toArray(inspectorCases)
    .filter(
      (inspectorCase) =>
        inspectorCase?.project_id === projectId &&
        typologyById.has(inspectorCase.typology_id) &&
        inspectorCaseHash(inspectorCase.route_slug),
    )
    .sort((left, right) => compareIds(left.case_id, right.case_id));
  const selected =
    candidates.find(({ case_id: caseId }) => caseId === currentCaseId) ??
    candidates[0] ??
    null;
  if (!selected) return { inspectable: false };

  const typology = typologyById.get(selected.typology_id);
  return {
    inspectable: true,
    caseId: selected.case_id,
    routeSlug: selected.route_slug,
    projectId,
    typologyId: selected.typology_id,
    typologyLabel:
      String(typology?.model ?? "").trim() || "Tipología sin nombre",
    provenance: selected.provenance_classification,
    href: inspectorCaseHash(selected.route_slug),
  };
}

function legacyProjectId(projectOrId) {
  const canonicalId = canonicalProjectIdForView(projectOrId);
  return canonicalId?.startsWith("project:nexo-")
    ? canonicalId.slice("project:nexo-".length)
    : null;
}

function compareAvailableNumbers(left, right, direction = "asc") {
  const leftValue = finiteNumber(left);
  const rightValue = finiteNumber(right);
  if (leftValue === null && rightValue === null) return 0;
  if (leftValue === null) return 1;
  if (rightValue === null) return -1;
  return direction === "desc"
    ? rightValue - leftValue
    : leftValue - rightValue;
}

function searchableText(row) {
  return [
    row.projectId,
    row.legacyId,
    row.project.project_name,
    row.project.agency_name,
    row.project.address,
    row.project.project_phase,
  ]
    .map(normalizeSearch)
    .join(" ");
}

function sortedRows(rows, sort) {
  if (sort === "direct") return [...rows];
  const accessors = {
    score: [(row) => row.score, "desc"],
    distance: [(row) => row.distanceMeters, "asc"],
    price_m2: [(row) => row.pricePerM2, "asc"],
    price_total: [(row) => row.priceTotal, "asc"],
    area: [(row) => positiveNumber(row.project.total_area), "desc"],
    bedrooms: [(row) => finiteNumber(row.project.bedrooms_max), "desc"],
    delivery: [(row) => finiteNumber(row.project.delivery_year), "asc"],
  };
  const [accessor, direction] = accessors[sort] ?? accessors.score;
  return [...rows].sort(
    (left, right) =>
      compareAvailableNumbers(
        accessor(left),
        accessor(right),
        direction,
      ) || left.scenarioRank - right.scenarioRank,
  );
}

/**
 * Builds the canonical comparable universe without consulting or mutating
 * global state. Order and membership come exclusively from scenarioContext.
 */
export function buildComparableRows({
  projects = [],
  scenarioContext = null,
} = {}) {
  const comparableIds = Array.isArray(
    scenarioContext?.comparable_project_ids,
  )
    ? scenarioContext.comparable_project_ids
    : [];
  const priceReferenceIds = new Set(
    Array.isArray(scenarioContext?.price_reference_project_ids)
      ? scenarioContext.price_reference_project_ids
      : [],
  );
  const scoresById = new Map(
    (scenarioContext?.comparable_scores ?? [])
      .filter((record) => record?.project_id)
      .map((record) => [record.project_id, record]),
  );
  const projectsById = new Map(
    projects
      .map((project) => [canonicalProjectIdForView(project), project])
      .filter(([projectId]) => projectId),
  );

  return comparableIds
    .map((projectId, scenarioRank) => {
      const project = projectsById.get(projectId);
      if (!project) return null;
      const scoreRecord = scoresById.get(projectId) ?? {};
      const priceEligible = priceReferenceIds.has(projectId);
      return {
        projectId,
        legacyId: legacyProjectId(projectId),
        project,
        scenarioRank,
        score: finiteNumber(scoreRecord.score) ?? 0,
        evidenceCoverage:
          finiteNumber(
            scoreRecord.evidence_coverage_pct ??
              scoreRecord.evidence_coverage ??
              scoreRecord.available_weight,
          ) ?? 0,
        evidenceLabel:
          String(scoreRecord.evidence_label ?? "Orientativa"),
        distanceMeters:
          positiveNumber(scoreRecord.distance_meters) ??
          (finiteNumber(scoreRecord.distance_meters) === 0 ? 0 : null),
        components: scoreRecord.components ?? {},
        priceEligible,
        priceTotal: priceEligible
          ? positiveNumber(project.list_price_avg)
          : null,
        pricePerM2: priceEligible
          ? positiveNumber(project.price_per_m2_list)
          : null,
      };
    })
    .filter(Boolean);
}

export function buildProjectCatalogModel({
  projects = [],
  scenarioContext = null,
  filters = DEFAULT_FILTERS,
  limit = 18,
  selectedProjectId = null,
} = {}) {
  const comparableRows = buildComparableRows({
    projects,
    scenarioContext,
  });
  const normalizedFilters = {
    phase: String(filters?.phase || DEFAULT_FILTERS.phase),
    query: String(filters?.query || ""),
    sort: LOCAL_SORT_KEYS.has(String(filters?.sort))
      ? String(filters.sort)
      : DEFAULT_FILTERS.sort,
  };
  const query = normalizeSearch(normalizedFilters.query).trim();
  const locallyFiltered = comparableRows.filter((row) => {
    const phaseMatches =
      normalizedFilters.phase === "Todos" ||
      row.project.project_phase === normalizedFilters.phase;
    const queryMatches =
      !query || searchableText(row).includes(query);
    return phaseMatches && queryMatches;
  });
  const rows = sortedRows(locallyFiltered, normalizedFilters.sort);
  const selectedCanonicalId =
    canonicalProjectIdForView(selectedProjectId);
  const selected =
    rows.find((row) => row.projectId === selectedCanonicalId) ??
    rows[0] ??
    null;
  const safeLimit = integerLimit(limit, 18);

  return {
    scopeText:
      String(scenarioContext?.scope_text ?? "") ||
      "Alcance sin descripción",
    comparableCount: comparableRows.length,
    priceReferenceCount: comparableRows.filter(
      (row) => row.priceEligible,
    ).length,
    filters: normalizedFilters,
    availablePhases: [
      ...new Set(
        comparableRows
          .map((row) => row.project.project_phase)
          .filter(Boolean),
      ),
    ].sort((left, right) => left.localeCompare(right, "es")),
    rows,
    visibleRows: rows.slice(0, safeLimit),
    selected,
    limit: safeLimit,
  };
}

function distanceLabel(row) {
  return row.distanceMeters === null
    ? "Incluido en distrito/cuadrante"
    : `${formatNumber(row.distanceMeters, 0)} m del punto Viva`;
}

function provisionalPriceLabel(row, formatter) {
  return row.priceEligible
    ? formatter(row)
    : "No elegible para referencia";
}

function scoreBadge(row) {
  return `
    <span class="tag success">
      Score ${formatNumber(row.score, 1)} ·
      ${escapeHtml(row.evidenceLabel)}
    </span>
  `;
}

function projectSelectionReading(row) {
  return row.priceEligible
    ? "Comparable con precio publicado provisional habilitado para contraste."
    : "Comparable por sus atributos; su precio no es elegible como referencia."
}

function projectListRow(row, selected) {
  const project = row.project;
  return `
    <button
      class="project-card ${selected ? "selected" : ""}"
      type="button"
      data-select-project="${escapeAttr(row.legacyId)}"
      data-canonical-project-id="${escapeAttr(row.projectId)}"
      aria-pressed="${selected}"
    >
      <div class="project-card-head">
        <div>
          <strong>${escapeHtml(project.project_name || "Proyecto sin nombre")}</strong>
          <span>${escapeHtml(project.agency_name || "Inmobiliaria no registrada")}</span>
        </div>
        ${scoreBadge(row)}
      </div>
      <dl class="project-row-facts">
        <div>
          <dt>Precio / m²</dt>
          <dd>${escapeHtml(provisionalPriceLabel(row, ({ pricePerM2 }) => priceM2(pricePerM2)))}</dd>
        </div>
        <div>
          <dt>Área total</dt>
          <dd>${escapeHtml(areaLabel(project.total_area))}</dd>
        </div>
        <div>
          <dt>Evidencia</dt>
          <dd>${formatNumber(row.evidenceCoverage, 1)}%</dd>
        </div>
      </dl>
      <p class="project-card-meta">
        <span>${escapeHtml(distanceLabel(row))}</span>
        <span>${escapeHtml(project.project_phase || "Fase no disponible")}</span>
        <span>${escapeHtml(bedroomsLabel(project))}</span>
        <span>${escapeHtml(deliveryLabel(project))}</span>
      </p>
    </button>
  `;
}

function renderCatalogOrientation(catalog) {
  const excludedFromPrice = Math.max(
    0,
    catalog.comparableCount - catalog.priceReferenceCount,
  );
  const hasComparables = catalog.comparableCount > 0;
  const conclusion = hasComparables
    ? `${formatNumber(catalog.comparableCount)} proyectos sostienen la muestra comparable; ${formatNumber(catalog.priceReferenceCount)} con precio publicado provisional elegible. Selecciona candidatos y contrasta sus diferencias antes de decidir.`
    : "El escenario actual no tiene proyectos comparables. Revisa el alcance antes de intentar una comparación.";

  return `
    <section
      class="project-catalog-orientation"
      data-projects-conclusion
      data-comparable-count="${escapeAttr(catalog.comparableCount)}"
      data-filtered-count="${escapeAttr(catalog.rows.length)}"
      data-price-reference-count="${escapeAttr(catalog.priceReferenceCount)}"
      aria-labelledby="project-catalog-orientation-title"
    >
      <div class="project-catalog-orientation__copy">
        <span class="project-catalog-orientation__eyebrow">Inventario comparable · ${escapeHtml(catalog.scopeText)}</span>
        <h2 id="project-catalog-orientation-title">${formatNumber(catalog.comparableCount)} proyectos para priorizar</h2>
        <p>${escapeHtml(conclusion)}</p>
        <small>La comparabilidad no convierte todos los campos publicados en evidencia elegible.</small>
      </div>
      <div
        class="project-catalog-orientation__status"
        aria-label="Estado del inventario"
      >
        <strong>${formatNumber(catalog.rows.length)}</strong>
        <span>visibles tras filtros · ${formatNumber(excludedFromPrice)} sin precio elegible</span>
      </div>
      <div class="project-catalog-orientation__actions">
        ${
          hasComparables
            ? `<a class="primary-button" href="#compare" data-view="compare">Comparar proyectos con evidencia</a>`
            : `<a class="primary-button" href="#journey/depth" data-journey-return="depth">Revisar alcance en Profundidad</a>`
        }
        <a class="project-catalog-return" href="#journey/depth" data-journey-return="depth">Volver al recorrido: Profundidad</a>
      </div>
    </section>
  `;
}

function scoreComponentsMarkup(row) {
  return Object.entries(SCORE_COMPONENT_LABELS)
    .map(([key, label]) => {
      const component = row.components[key] ?? {};
      const availableWeight =
        finiteNumber(component.available_weight) ?? 0;
      const earnedPoints =
        finiteNumber(component.earned_points) ?? 0;
      return `
        <div>
          <dt>${escapeHtml(label)}</dt>
          <dd>
            ${
              availableWeight > 0
                ? `${formatNumber(earnedPoints, 1)}/${formatNumber(availableWeight, 1)} puntos`
                : "No evaluado"
            }
          </dd>
        </div>
      `;
    })
    .join("");
}

function inspectorProvenanceLabel(value) {
  return (
    {
      observed: "Caso observado",
      controlled: "Caso controlado",
      simulated: "Caso simulado",
    }[value] ?? "Procedencia declarada"
  );
}

function renderProjectInspectorEntry(row, data = state.data) {
  const projectName =
    row?.project?.project_name || "Proyecto sin nombre";
  const entry = buildProjectInspectorEntry({
    projectId: row?.projectId,
    inspectorCases: data?.inspector?.cases,
    typologies: data?.model?.typologies,
    currentCaseId: state.inspectorPreset,
  });
  const descriptionId = "project-inspector-description";

  if (!entry.inspectable) {
    return `
      <div
        class="detail-section project-inspector-entry is-unavailable"
        data-project-inspector-entry="unavailable"
        data-inspector-project-id="${escapeAttr(row?.projectId ?? "")}"
      >
        <h3>Cobertura de evidencia</h3>
        <p id="${descriptionId}">Este proyecto no tiene una tipología inspeccionable en esta demo. La cobertura territorial no implica expediente de evidencia.</p>
        <a
          class="secondary-button project-inspector-action"
          href="#inspector"
          aria-describedby="${descriptionId}"
        >
          Ver cobertura disponible
        </a>
      </div>
    `;
  }

  return `
    <div
      class="detail-section project-inspector-entry"
      data-project-inspector-entry="available"
      data-inspector-project-id="${escapeAttr(entry.projectId)}"
      data-inspector-route-slug="${escapeAttr(entry.routeSlug)}"
    >
      <h3>Evidencia por tipología</h3>
      <p id="${descriptionId}">
        ${escapeHtml(entry.typologyLabel)} ·
        ${escapeHtml(inspectorProvenanceLabel(entry.provenance))}.
        Abre el expediente sin cambiar el escenario territorial.
      </p>
      <a
        class="secondary-button project-inspector-action"
        href="${escapeAttr(entry.href)}"
        aria-label="Inspeccionar evidencia de ${escapeAttr(projectName)}, ${escapeAttr(entry.typologyLabel)}"
        aria-describedby="${descriptionId}"
      >
        Inspeccionar evidencia
      </a>
    </div>
  `;
}

export function renderProjectDetail(row) {
  if (!row) {
    return emptyState(
      "Sin detalle",
      "Selecciona un proyecto comparable del alcance activo.",
    );
  }
  const project = row.project;
  const url = safeUrl(project.source_url);

  return `
    <div
      class="detail-header"
      data-canonical-project-id="${escapeAttr(row.projectId)}"
    >
      <div class="detail-header-row">
        <div class="detail-kicker">
          ${scoreBadge(row)}
          <span class="tag neutral">
            ${formatNumber(row.evidenceCoverage, 1)}% evidencia
          </span>
        </div>
        ${componentHelp(
          "Por qué aparece aquí",
          "Este proyecto pertenece exactamente a comparable_project_ids del escenario. Los filtros de búsqueda, fase y orden solo cambian esta vista.",
        )}
      </div>
      <h2>${escapeHtml(project.project_name || "Proyecto sin nombre")}</h2>
      <p>${escapeHtml(project.agency_name || "Inmobiliaria no registrada")}</p>
      <p class="project-detail-reading">${escapeHtml(projectSelectionReading(row))}</p>
    </div>
    <div class="detail-metrics">
      ${miniMetric(
        "Precio publicado provisional",
        provisionalPriceLabel(row, ({ priceTotal }) =>
          money(priceTotal),
        ),
      )}
      ${miniMetric(
        "Precio publicado / m²",
        provisionalPriceLabel(row, ({ pricePerM2 }) =>
          priceM2(pricePerM2),
        ),
      )}
      ${miniMetric("Área total publicada", areaLabel(project.total_area))}
    </div>
    ${renderProjectInspectorEntry(row)}
    <details class="project-detail-disclosure">
      <summary>Cómo se construye la comparabilidad</summary>
      <div class="project-detail-disclosure__body highlight-section">
        <p>${escapeHtml(distanceLabel(row))}</p>
        <dl>${scoreComponentsMarkup(row)}</dl>
      </div>
    </details>
    <details class="project-detail-disclosure">
      <summary>Ver datos publicados, atributos y fuente</summary>
      <div class="project-detail-disclosure__body">
        <h3>Resumen ejecutivo</h3>
        <p>${escapeHtml(shortText(project.project_description, 260) || "No disponible en la información visible.")}</p>
        <h3>Datos publicados</h3>
        <dl>
          <div><dt>Distrito</dt><dd>${escapeHtml(project.district || "No disponible")}</dd></div>
          <div><dt>Fase</dt><dd>${escapeHtml(project.project_phase || "No disponible")}</dd></div>
          <div><dt>Dormitorios</dt><dd>${escapeHtml(bedroomsLabel(project))}</dd></div>
          <div><dt>Entrega</dt><dd>${escapeHtml(deliveryLabel(project))}</dd></div>
          <div><dt>Dirección</dt><dd>${escapeHtml(project.address || "No disponible")}</dd></div>
        </dl>
        <h3>Atributos publicados</h3>
        <div class="chip-list">
          ${
            toArray(project.amenities).slice(0, 12).map(chip).join("") ||
            chip("No disponibles")
          }
        </div>
        <h3>Fuente</h3>
        ${
          url
            ? `<a class="text-link" href="${escapeAttr(url)}" target="_blank" rel="noreferrer">Abrir publicación visible</a>`
            : "<p>No disponible en la información visible.</p>"
        }
        <p>Los precios son referencias publicadas provisionales; no representan precios reales de cierre.</p>
      </div>
    </details>
  `;
}

export function renderProjects() {
  const catalog = buildProjectCatalogModel({
    projects: state.data?.projects ?? [],
    scenarioContext: state.scenarioContext,
    filters: state.projectFilters,
    limit: state.projectLimit,
    selectedProjectId: state.selectedProjectId,
  });

  return `
    <section
      class="catalog-layout"
      data-scenario-consumer="catalog"
    >
      ${renderCatalogOrientation(catalog)}
      <section class="panel catalog-panel">
        <div class="panel-header">
          <div>
            <h2>Ordena y selecciona candidatos</h2>
            <p>Los filtros de esta lista no modifican el escenario territorial.</p>
          </div>
          <div class="panel-header-actions">
            ${componentHelp(
              "Filtros locales",
              "Buscar, filtrar por fase u ordenar no modifica el distrito, alcance ni filtros de producto del escenario compartido.",
            )}
          </div>
        </div>
        <div class="local-controls">
          <label class="field-control" for="project-phase">
            <span>Fase publicada</span>
            <select id="project-phase" data-project-filter="phase">
              ${optionList(
                ["Todos", ...catalog.availablePhases],
                catalog.filters.phase,
              )}
            </select>
          </label>
          <label class="field-control" for="project-sort">
            <span>Ordenar sin cambiar el escenario</span>
            <select id="project-sort" data-project-filter="sort">
              ${optionList(
                [
                  "direct",
                  "score",
                  "distance",
                  "price_m2",
                  "price_total",
                  "area",
                  "bedrooms",
                  "delivery",
                ],
                catalog.filters.sort,
                (value) =>
                  ({
                    direct: "Orden del escenario",
                    score: "Mayor score",
                    distance: "Menor distancia",
                    price_m2: "Menor precio publicado / m²",
                    price_total: "Menor precio publicado",
                    area: "Mayor área total",
                    bedrooms: "Más dormitorios",
                    delivery: "Entrega más próxima",
                  })[value] ?? value,
              )}
            </select>
          </label>
          <label class="field-control search-control" for="project-query">
            <span>Buscar en estos comparables</span>
            <input
              id="project-query"
              data-project-filter="query"
              type="search"
              value="${escapeAttr(catalog.filters.query)}"
              placeholder="Proyecto, inmobiliaria, dirección o ID"
            />
          </label>
        </div>
        <div class="catalog-result-list">
          ${
            catalog.visibleRows
              .map((row) =>
                projectListRow(
                  row,
                  catalog.selected?.projectId === row.projectId,
                ),
              )
              .join("") ||
            emptyState(
              "Sin comparables para estos filtros locales",
              "Limpia la búsqueda o selecciona Todas las fases. El escenario no se amplió ni cambió de distrito.",
            )
          }
        </div>
        ${
          catalog.rows.length > catalog.limit
            ? `
              <div class="catalog-footer">
                <span>
                  Mostrando ${formatNumber(catalog.limit)} de
                  ${formatNumber(catalog.rows.length)} comparables filtrados
                </span>
                <button class="secondary-button" id="load-more-projects" type="button">
                  Ver 18 más
                </button>
              </div>
            `
            : ""
        }
      </section>
      <aside class="detail-panel">
        ${renderProjectDetail(catalog.selected)}
      </aside>
    </section>
  `;
}
