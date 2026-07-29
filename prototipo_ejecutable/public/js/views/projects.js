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
      <div class="project-metrics">
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
        ${miniMetric(
          "Cobertura de evidencia",
          `${formatNumber(row.evidenceCoverage, 1)}%`,
        )}
      </div>
      <p>${escapeHtml(distanceLabel(row))}</p>
      <div class="card-badges">
        <span>${escapeHtml(project.project_phase || "Fase no disponible")}</span>
        <span>${escapeHtml(bedroomsLabel(project))}</span>
        <span>${escapeHtml(deliveryLabel(project))}</span>
      </div>
    </button>
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
      ${miniMetric("Distancia", distanceLabel(row))}
    </div>
    <div class="detail-section highlight-section">
      <h3>Por qué es comparable</h3>
      <dl>${scoreComponentsMarkup(row)}</dl>
    </div>
    <div class="detail-section">
      <h3>Resumen ejecutivo</h3>
      <p>${escapeHtml(shortText(project.project_description, 260) || "No disponible en la información visible.")}</p>
    </div>
    <div class="detail-section">
      <h3>Datos publicados</h3>
      <dl>
        <div><dt>Distrito</dt><dd>${escapeHtml(project.district || "No disponible")}</dd></div>
        <div><dt>Fase</dt><dd>${escapeHtml(project.project_phase || "No disponible")}</dd></div>
        <div><dt>Dormitorios</dt><dd>${escapeHtml(bedroomsLabel(project))}</dd></div>
        <div><dt>Entrega</dt><dd>${escapeHtml(deliveryLabel(project))}</dd></div>
        <div><dt>Dirección</dt><dd>${escapeHtml(project.address || "No disponible")}</dd></div>
      </dl>
    </div>
    <div class="detail-section">
      <h3>Atributos publicados</h3>
      <div class="chip-list">
        ${
          toArray(project.amenities).slice(0, 12).map(chip).join("") ||
          chip("No disponibles")
        }
      </div>
    </div>
    <div class="detail-section">
      <h3>Fuente</h3>
      ${
        url
          ? `<a class="text-link" href="${escapeAttr(url)}" target="_blank" rel="noreferrer">Abrir publicación visible</a>`
          : "<p>No disponible en la información visible.</p>"
      }
      <p>Los precios son referencias publicadas provisionales; no representan precios reales de cierre.</p>
    </div>
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
      <section class="panel catalog-panel">
        <div class="panel-header">
          <div>
            <h2>Comparables del escenario</h2>
            <p>
              ${escapeHtml(catalog.scopeText)} ·
              ${formatNumber(catalog.comparableCount)} proyectos en el universo canónico.
            </p>
          </div>
          <div class="panel-header-actions">
            <span class="tag success">
              ${formatNumber(catalog.priceReferenceCount)}
              con precio provisional elegible
            </span>
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
        <div class="project-card-list">
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
