const EARTH_RADIUS_METERS = 6_371_008.8;
const MAP_WIDTH = 960;
const MAP_HEIGHT = 560;
const MAP_PADDING = 42;
const OSM_COPYRIGHT_URL = "https://www.openstreetmap.org/copyright";
const ODBL_URL = "https://opendatacommons.org/licenses/odbl/1-0/";

const QUADRANT_LABELS = Object.freeze({
  NW: "Noroeste",
  NE: "Noreste",
  SW: "Suroeste",
  SE: "Sureste",
});

export function buildScenarioProjectRows({
  scenarioContext,
  data,
  selectedProjectId = null,
} = {}) {
  const assignments = toArray(data?.geography?.assignments);
  const projects = toArray(data?.projects);
  const assignmentByObservedId = new Map(
    assignments.map((assignment) => [
      String(assignment.observed_project_id ?? ""),
      assignment,
    ]),
  );
  const assignmentByAuthoritativeId = new Map(
    assignments
      .filter((assignment) => assignment.authoritative_project_id)
      .map((assignment) => [
        String(assignment.authoritative_project_id),
        assignment,
      ]),
  );
  const projectByLegacyId = new Map(
    projects.map((project) => [String(project.id ?? ""), project]),
  );
  const comparableIds = new Set(
    toArray(scenarioContext?.comparable_project_ids).map(String),
  );
  const geographyValidIds = new Set(
    toArray(scenarioContext?.geography_valid_project_ids).map(String),
  );
  const geographyUnavailable =
    scenarioContext?.geography_status === "unavailable";
  const scoreByObservedId = new Map(
    toArray(scenarioContext?.comparable_scores).map((score) => [
      String(score.observed_project_id ?? ""),
      score,
    ]),
  );
  const exclusionByObservedId = new Map();
  for (const exclusion of toArray(scenarioContext?.excluded_projects)) {
    const observedId = resolveObservedProjectId(exclusion.project_id, {
      assignmentByObservedId,
      assignmentByAuthoritativeId,
    });
    if (observedId && !exclusionByObservedId.has(observedId)) {
      exclusionByObservedId.set(observedId, exclusion);
    }
  }

  const displayIds = uniqueStrings(
    scenarioContext?.display_project_ids ??
      scenarioContext?.geography_valid_project_ids,
  );
  const comparableRank = new Map(
    toArray(scenarioContext?.comparable_project_ids).map((id, index) => [
      String(id),
      index,
    ]),
  );
  const selectedObservedId = resolveObservedProjectId(selectedProjectId, {
    assignmentByObservedId,
    assignmentByAuthoritativeId,
  });

  const rows = displayIds
    .map((observedId) => {
      const assignment = assignmentByObservedId.get(observedId);
      const legacyId = legacyIdFromObserved(observedId);
      const project = projectByLegacyId.get(legacyId) ?? null;
      const authoritativeId =
        assignment?.authoritative_project_id ??
        authoritativeIdFromObserved(observedId);
      const comparable = comparableIds.has(String(authoritativeId ?? ""));
      const score = scoreByObservedId.get(observedId) ?? null;
      const exclusion = exclusionByObservedId.get(observedId) ?? null;
      const latitude = finiteNumber(assignment?.latitude);
      const longitude = finiteNumber(assignment?.longitude);
      const coordinateValid =
        assignment?.coordinate_valid === true &&
        latitude !== null &&
        longitude !== null &&
        !(latitude === 0 && longitude === 0);
      const unreconciled =
        !assignment?.authoritative_project_id ||
        assignment?.reconciliation_status === "unmatched" ||
        exclusion?.reason === "not_reconciled";
      const geographyValid = geographyValidIds.has(observedId);
      const geographyInvalid =
        !geographyUnavailable &&
        (!geographyValid || exclusion?.origin === "territorial");

      return {
        observed_project_id: observedId,
        authoritative_project_id: authoritativeId,
        legacy_project_id: legacyId,
        project_name:
          cleanText(project?.project_name) || `Proyecto ${legacyId || "sin ID"}`,
        agency_name:
          cleanText(project?.agency_name) || "Inmobiliaria no registrada",
        latitude,
        longitude,
        coordinate_valid: coordinateValid,
        quadrant_id: cleanText(assignment?.quadrant_id) || null,
        distance_meters: finiteNumber(
          scenarioContext?.distance_meters_by_observed_project_id?.[
            observedId
          ],
        ),
        geography_valid: geographyValid,
        geography_invalid: geographyInvalid,
        geography_unavailable: geographyUnavailable,
        comparable,
        unreconciled,
        comparison_status: geographyUnavailable
          ? "geography-unavailable"
          : geographyInvalid
            ? "geography-invalid"
            : comparable
              ? "comparable"
              : unreconciled
                ? "unreconciled"
                : "not-comparable",
        comparison_label: geographyUnavailable
          ? "Geografía no disponible o no verificada"
          : geographyInvalid
            ? "Geografía fuera del límite validado"
            : comparable
              ? "Comparable"
              : unreconciled
                ? "Observado no reconciliado"
                : "Fuera de comparabilidad",
        exclusion_reason: cleanText(exclusion?.reason) || null,
        score: comparable ? finiteNumber(score?.score) : null,
        evidence_coverage_pct: comparable
          ? finiteNumber(
              score?.evidence_coverage_pct ?? score?.evidence_coverage,
            )
          : null,
        total_area: positiveNumber(project?.total_area),
        bedrooms_min: finiteNumber(project?.bedrooms_min),
        bedrooms_max: finiteNumber(project?.bedrooms_max),
        bedrooms: cleanText(project?.bedrooms) || null,
        delivery_year: finiteNumber(project?.delivery_year),
        list_price_avg: positiveNumber(project?.list_price_avg),
        price_per_m2_list: positiveNumber(project?.price_per_m2_list),
        selected: observedId === selectedObservedId,
      };
    })
    .sort((left, right) => {
      const leftRank = comparableRank.get(
        String(left.authoritative_project_id ?? ""),
      );
      const rightRank = comparableRank.get(
        String(right.authoritative_project_id ?? ""),
      );
      if (leftRank !== undefined || rightRank !== undefined) {
        if (leftRank === undefined) return 1;
        if (rightRank === undefined) return -1;
        if (leftRank !== rightRank) return leftRank - rightRank;
      }
      return left.observed_project_id.localeCompare(
        right.observed_project_id,
      );
    });

  return {
    rows,
    selected_observed_project_id: selectedObservedId,
    assignment_by_observed_id: assignmentByObservedId,
    assignment_by_authoritative_id: assignmentByAuthoritativeId,
  };
}

export function buildGeographicMapModel({
  scenarioContext,
  data,
  boundaryGeoJson,
  selectedProjectId = null,
} = {}) {
  if (!scenarioContext || !data) {
    return {
      status: "loading",
      scenario_invalid: false,
      points: [],
      selected_point: null,
      geometry: null,
      scope_text: "Escenario geográfico",
    };
  }

  const scenario = scenarioContext.scenario ?? {};
  const district = toArray(data?.geography?.districts).find(
    ({ district_id: districtId }) =>
      String(districtId) === String(scenario.district_id),
  );
  const feature = findBoundaryFeature(
    boundaryGeoJson,
    district?.osm_relation_id,
  );
  const projectRows = buildScenarioProjectRows({
    scenarioContext,
    data,
    selectedProjectId,
  });
  const coordinateRows = projectRows.rows.filter(
    (row) => row.coordinate_valid,
  );
  const displayIdSet = new Set(
    projectRows.rows.map((row) => row.observed_project_id),
  );
  const missingCoordinateCount =
    uniqueStrings(scenarioContext.observed_scope_project_ids).filter(
      (projectId) => !displayIdSet.has(projectId),
    ).length +
    (projectRows.rows.length - coordinateRows.length);
  const target = buildTarget(scenario);
  const geometry =
    feature && scenarioContext.geography_status !== "unavailable"
      ? buildGeometryModel({
          feature,
          district,
          rows: coordinateRows,
          target,
          scenario,
        })
      : null;
  const points = geometry
    ? coordinateRows.map((row) => ({
        ...row,
        ...geometry.project(row.longitude, row.latitude),
      }))
    : coordinateRows;
  const requestedSelected = points.find(
    (point) =>
      point.observed_project_id ===
      projectRows.selected_observed_project_id,
  );
  const selectedPoint =
    requestedSelected ??
    (projectRows.selected_observed_project_id ? null : points[0] ?? null);
  if (selectedPoint) {
    for (const point of points) {
      point.selected =
        point.observed_project_id === selectedPoint.observed_project_id;
    }
  }

  const emptyRadius =
    scenario.scope_mode === "radius" &&
    scenarioContext.geography_status === "ready" &&
    points.length === 0;
  const status =
    scenarioContext.geography_status === "unavailable" ||
    !feature ||
    !geometry
      ? "geometry-unavailable"
      : emptyRadius
        ? "empty-radius"
        : points.length === 0
          ? "empty"
          : "ready";

  return {
    status,
    scenario_invalid: scenarioContext.scenario_status === "invalid",
    geography_status: scenarioContext.geography_status,
    scenario,
    scope_text:
      cleanText(scenarioContext.scope_text) || "Escenario geográfico",
    district: district
      ? {
          district_id: String(district.district_id),
          district_name:
            cleanText(district.district_name) ||
            cleanText(district.source_name) ||
            "Distrito",
          osm_relation_id: district.osm_relation_id,
          high_load: district.high_load === true,
          median_latitude: finiteNumber(district.median_latitude),
          median_longitude: finiteNumber(district.median_longitude),
          quadrants: toArray(district.quadrants),
        }
      : null,
    geometry,
    points,
    point_ids: points.map((point) => point.observed_project_id),
    selected_point: selectedPoint,
    requested_selected_observed_id:
      projectRows.selected_observed_project_id,
    target: geometry?.target ?? target,
    radius: geometry?.radius ?? null,
    missing_coordinate_count: missingCoordinateCount,
    displayed_project_count: points.length,
    comparable_project_count: points.filter((point) => point.comparable)
      .length,
    unreconciled_project_count: points.filter(
      (point) => point.unreconciled,
    ).length,
    cutoff_at: cleanText(scenarioContext.cutoff_at) || null,
  };
}

export function renderGeographicMap(input = {}) {
  const model = buildGeographicMapModel(input);
  const showVisualizationControl =
    input.showVisualizationControl !== false;
  if (model.status === "loading") {
    return `
      <section class="geo-panel geo-panel--loading" aria-busy="true">
        <div class="geo-skeleton" aria-hidden="true"></div>
        <p class="geo-state-title">Preparando escenario geográfico</p>
        <p>Estamos organizando el límite, los proyectos y la lectura territorial.</p>
      </section>
    `;
  }

  const visualization = model.scenario?.visualization ?? "geographic";
  return `
    <section
      class="geo-panel"
      data-geo-state="${escapeAttr(model.status)}"
      data-visualization-active="${visualization === "geographic"}"
    >
      <header class="geo-panel-header">
        <div>
          <span class="geo-eyebrow">Lectura territorial</span>
          <h2>Mapa del escenario</h2>
          <p>${escapeHtml(model.scope_text)}</p>
        </div>
        ${
          showVisualizationControl
            ? `
              <div class="geo-view-switch" role="group" aria-label="Visualización del escenario">
                <button
                  id="scenario-view-geographic"
                  type="button"
                  data-scenario-visualization="geographic"
                  aria-pressed="${visualization === "geographic"}"
                >Mapa geográfico</button>
                <button
                  id="scenario-view-positioning"
                  type="button"
                  data-scenario-visualization="positioning"
                  aria-pressed="${visualization === "positioning"}"
                >Posicionamiento área/precio</button>
              </div>
            `
            : ""
        }
      </header>
      ${renderScenarioNotice(model)}
      <div class="geo-stage">
        <div class="geo-map-column">
          ${renderMapSurface(model)}
          ${renderProjectSelector(model)}
          ${renderLegend(model)}
        </div>
        ${renderProjectDetail(model.selected_point, model)}
      </div>
      ${renderAttribution(model)}
    </section>
  `;
}

export function resolveObservedProjectId(value, indexes = {}) {
  const raw =
    typeof value === "object" && value !== null
      ? value.observed_project_id ??
        value.project_id ??
        value.id
      : value;
  const id = String(raw ?? "");
  if (!id) return null;
  if (id.startsWith("observed:")) {
    return indexes.assignmentByObservedId?.has(id) === false ? null : id;
  }
  if (id.startsWith("project:")) {
    const assignment = indexes.assignmentByAuthoritativeId?.get(id);
    if (assignment?.observed_project_id) {
      return String(assignment.observed_project_id);
    }
    if (id.startsWith("project:nexo-")) {
      return `observed:nexo-${id.slice("project:nexo-".length)}`;
    }
    return null;
  }
  if (id.includes(":")) return null;
  const observedId = `observed:nexo-${id}`;
  return indexes.assignmentByObservedId?.has(observedId) === false
    ? null
    : observedId;
}

function renderScenarioNotice(model) {
  if (!model.scenario_invalid) return "";
  return `
    <div class="geo-notice geo-notice--warning" role="status">
      <strong>Escenario compartido corregido</strong>
      <span>El mapa muestra los valores válidos que pudieron aplicarse.</span>
    </div>
  `;
}

function renderMapSurface(model) {
  if (model.status === "geometry-unavailable") {
    return `
      <div class="geo-state geo-state--unavailable" role="status">
        <span class="geo-state-mark" aria-hidden="true">⌁</span>
        <div>
          <strong class="geo-state-title">Geografía no disponible</strong>
          <p>No podemos dibujar el límite distrital. La lista conserva los proyectos con coordenadas válidas, sin inventar una forma de respaldo.</p>
        </div>
      </div>
    `;
  }

  const geometry = model.geometry;
  const clipId = `geo-clip-${safeToken(
    model.district?.osm_relation_id ?? "district",
  )}`;
  const hatchId = `geo-hatch-${safeToken(
    model.district?.osm_relation_id ?? "district",
  )}`;
  const emptyMessage =
    model.status === "empty-radius"
      ? renderEmptyRadiusMessage(model)
      : model.status === "empty"
        ? `
          <div class="geo-map-message" role="status">
            <strong>Sin proyectos visibles en este alcance</strong>
            <span>Conservamos el límite seleccionado y no usamos un fallback distrital.</span>
          </div>
        `
        : "";

  return `
    <div class="geo-map-frame">
      <svg
        class="geo-map"
        viewBox="0 0 ${MAP_WIDTH} ${MAP_HEIGHT}"
        role="img"
        aria-labelledby="geo-map-title geo-map-description"
      >
        <title id="geo-map-title">${escapeHtml(model.scope_text)}</title>
        <desc id="geo-map-description">${escapeHtml(
          mapDescription(model),
        )}</desc>
        <defs>
          <pattern id="${hatchId}" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="12" class="geo-hatch-line"></line>
          </pattern>
          <clipPath id="${clipId}">
            <path d="${escapeAttr(geometry.path)}" fill-rule="evenodd"></path>
          </clipPath>
        </defs>
        <rect class="geo-map-ground" width="${MAP_WIDTH}" height="${MAP_HEIGHT}" rx="18"></rect>
        ${renderQuadrantLayer(model, clipId, hatchId)}
        <path class="geo-district-shape" d="${escapeAttr(
          geometry.path,
        )}" fill-rule="evenodd"></path>
        ${renderRadius(model)}
        ${renderMapPoints(model)}
        ${renderTarget(model)}
        ${renderScale(geometry.scale_bar)}
        ${renderNorth()}
      </svg>
      ${emptyMessage}
    </div>
  `;
}

function renderQuadrantLayer(model, clipId, hatchId) {
  const quadrants = model.geometry?.quadrants;
  if (!model.district?.high_load || !quadrants) return "";
  return `
    <g class="geo-quadrants" clip-path="url(#${clipId})" aria-hidden="true">
      ${quadrants.cells
        .map(
          (cell) => `
            <rect
              class="geo-quadrant-fill ${
                cell.active ? "is-active" : ""
              }"
              x="${numberText(cell.x)}"
              y="${numberText(cell.y)}"
              width="${numberText(cell.width)}"
              height="${numberText(cell.height)}"
            ></rect>
            ${
              cell.active
                ? `<rect
                    class="geo-quadrant-hatch"
                    x="${numberText(cell.x)}"
                    y="${numberText(cell.y)}"
                    width="${numberText(cell.width)}"
                    height="${numberText(cell.height)}"
                    fill="url(#${hatchId})"
                  ></rect>`
                : ""
            }
          `,
        )
        .join("")}
      <line class="geo-quadrant-axis" x1="${numberText(
        quadrants.vertical_x,
      )}" y1="${MAP_PADDING}" x2="${numberText(
        quadrants.vertical_x,
      )}" y2="${MAP_HEIGHT - MAP_PADDING}"></line>
      <line class="geo-quadrant-axis" x1="${MAP_PADDING}" y1="${numberText(
        quadrants.horizontal_y,
      )}" x2="${MAP_WIDTH - MAP_PADDING}" y2="${numberText(
        quadrants.horizontal_y,
      )}"></line>
      ${quadrants.labels
        .map(
          (label) => `
            <text class="geo-quadrant-label" x="${numberText(
              label.x,
            )}" y="${numberText(label.y)}">${label.id}</text>
          `,
        )
        .join("")}
    </g>
  `;
}

function renderRadius(model) {
  if (!model.radius) return "";
  return `
    <g class="geo-radius-layer" aria-hidden="true">
      <circle
        class="geo-radius-circle"
        cx="${numberText(model.radius.cx)}"
        cy="${numberText(model.radius.cy)}"
        r="${numberText(model.radius.radius_px)}"
      ></circle>
      <text class="geo-radius-label" x="${numberText(
        model.radius.cx,
      )}" y="${numberText(
        Math.max(MAP_PADDING + 14, model.radius.cy - model.radius.radius_px - 10),
      )}" text-anchor="middle">${escapeHtml(
        formatDistance(model.radius.radius_meters),
      )} · escenario simulado</text>
    </g>
  `;
}

function renderMapPoints(model) {
  return `
    <g class="geo-project-layer">
      ${model.points
        .map((point) => {
          const classes = [
            "geo-project-node",
            `is-${point.comparison_status}`,
            point.selected ? "is-selected" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return `
            <g
              class="${classes}"
              data-scenario-project="${escapeAttr(
                point.observed_project_id,
              )}"
              data-geo-point-id="${escapeAttr(
                point.observed_project_id,
              )}"
              aria-hidden="true"
              transform="translate(${numberText(point.x)} ${numberText(
                point.y,
              )})"
            >
              <circle class="geo-project-hit" r="13"></circle>
              ${
                point.geography_invalid
                  ? `<path class="geo-project-mark" d="M 0 -7 L 7 6 L -7 6 Z"></path>`
                  : point.geography_unavailable
                    ? `<circle class="geo-project-mark" r="${
                        point.selected ? 7 : 5
                      }"></circle>`
                  : point.unreconciled
                  ? `<path class="geo-project-mark" d="M -5 -5 L 5 5 M 5 -5 L -5 5"></path>`
                  : `<circle class="geo-project-mark" r="${
                      point.selected ? 7 : 5
                    }"></circle>`
              }
              <title>${escapeHtml(pointAriaLabel(point))}</title>
            </g>
          `;
        })
        .join("")}
    </g>
  `;
}

function renderTarget(model) {
  if (!model.target || model.target.x === undefined) return "";
  return `
    <g
      class="geo-target"
      transform="translate(${numberText(model.target.x)} ${numberText(
        model.target.y,
      )})"
      role="img"
      aria-label="Escenario Viva simulado"
    >
      <path d="M 0 -10 L 10 0 L 0 10 L -10 0 Z"></path>
      <circle r="3"></circle>
      <text x="15" y="-13">Escenario Viva</text>
    </g>
  `;
}

function renderScale(scaleBar) {
  if (!scaleBar) return "";
  return `
    <g class="geo-scale" transform="translate(${numberText(
      scaleBar.x,
    )} ${numberText(scaleBar.y)})" aria-label="Escala aproximada ${escapeAttr(
      scaleBar.label,
    )}">
      <line x1="0" y1="0" x2="${numberText(scaleBar.width)}" y2="0"></line>
      <line x1="0" y1="-5" x2="0" y2="5"></line>
      <line x1="${numberText(scaleBar.width)}" y1="-5" x2="${numberText(
        scaleBar.width,
      )}" y2="5"></line>
      <text x="${numberText(scaleBar.width / 2)}" y="-10" text-anchor="middle">${escapeHtml(
        scaleBar.label,
      )}</text>
    </g>
  `;
}

function renderNorth() {
  return `
    <g class="geo-north" transform="translate(${MAP_WIDTH - 58} 55)" aria-label="Norte">
      <text x="0" y="-18" text-anchor="middle">N</text>
      <path d="M 0 -12 L 8 11 L 0 6 L -8 11 Z"></path>
    </g>
  `;
}

function renderEmptyRadiusMessage(model) {
  const radius = model.scenario?.radius_meters;
  return `
    <div class="geo-map-message geo-map-message--empty" role="status">
      <strong>0 comparables dentro de ${escapeHtml(
        formatDistance(radius),
      )}</strong>
      <span>El punto y el radio se conservan; no mostramos proyectos del distrito como reemplazo.</span>
      <div class="geo-empty-actions">
        ${
          Number(radius) < 1500
            ? `<button type="button" data-scenario-radius="${
                Number(radius) === 500 ? 1000 : 1500
              }">Ampliar radio</button>`
            : ""
        }
        <button type="button" data-scenario-scope="district">Volver al distrito</button>
      </div>
    </div>
  `;
}

function renderProjectSelector(model) {
  if (model.points.length === 0) {
    const excludedCopy =
      model.missing_coordinate_count > 0
        ? `${model.missing_coordinate_count} proyectos se excluyeron por coordenadas no válidas.`
        : "No hay proyectos seleccionables en este alcance.";
    return `<p class="geo-selector-note">${escapeHtml(excludedCopy)}</p>`;
  }
  return `
    <div class="geo-project-selector">
      <label for="geo-project-select">
        <span>Explorar proyecto sin usar el puntero</span>
        <select id="geo-project-select" data-scenario-project>
          ${model.points
            .map(
              (point) => `
                <option
                  value="${escapeAttr(point.observed_project_id)}"
                  ${point.selected ? "selected" : ""}
                >${escapeHtml(
                  `${point.project_name} · ${point.comparison_label}`,
                )}</option>
              `,
            )
            .join("")}
        </select>
      </label>
      <p>${model.points.length} proyectos con ubicación visible${
        model.missing_coordinate_count
          ? ` · ${model.missing_coordinate_count} sin coordenadas válidas`
          : ""
      }.</p>
    </div>
  `;
}

function renderLegend(model) {
  const statuses = new Set(
    model.points.map((point) => point.comparison_status),
  );
  return `
    <div class="geo-legend" aria-label="Leyenda del mapa">
      ${
        statuses.has("comparable")
          ? `<span><i class="geo-legend-symbol is-comparable" aria-hidden="true"></i>Comparable</span>`
          : ""
      }
      ${
        statuses.has("not-comparable")
          ? `<span><i class="geo-legend-symbol is-not-comparable" aria-hidden="true"></i>Fuera de comparabilidad</span>`
          : ""
      }
      ${
        statuses.has("geography-invalid")
          ? `<span><i class="geo-legend-symbol is-geography-invalid" aria-hidden="true">!</i>Geografía por revisar</span>`
          : ""
      }
      ${
        statuses.has("geography-unavailable")
          ? `<span><i class="geo-legend-symbol is-geography-unavailable" aria-hidden="true">?</i>Geografía no disponible o no verificada</span>`
          : ""
      }
      ${
        statuses.has("unreconciled")
          ? `<span><i class="geo-legend-symbol is-unreconciled" aria-hidden="true">×</i>Observado no reconciliado</span>`
          : ""
      }
      <span><i class="geo-legend-symbol is-selected" aria-hidden="true"></i>Seleccionado</span>
      ${
        model.target
          ? `<span><i class="geo-legend-symbol is-target" aria-hidden="true"></i>Escenario Viva simulado</span>`
          : ""
      }
    </div>
  `;
}

function renderProjectDetail(point, model) {
  if (!point) {
    const message = model.requested_selected_observed_id
      ? "El proyecto seleccionado ya no pertenece al alcance visible."
      : "Selecciona un proyecto desde la lista para abrir su lectura.";
    return `
      <aside class="geo-detail" aria-live="polite">
        <span class="geo-eyebrow">Detalle persistente</span>
        <h3>Sin proyecto seleccionado</h3>
        <p>${escapeHtml(message)}</p>
      </aside>
    `;
  }

  const locationReading =
    point.distance_meters !== null
      ? `${formatDistance(point.distance_meters)} del escenario Viva`
      : point.quadrant_id
        ? `Cuadrante analítico ${
            QUADRANT_LABELS[point.quadrant_id] ?? point.quadrant_id
          }`
        : model.district?.district_name ?? "Distrito seleccionado";
  const scoreReading = point.comparable
    ? `${formatNumber(point.score, 1)} / 100`
    : "No aplica";
  const coverageReading = point.comparable
    ? `${formatNumber(point.evidence_coverage_pct, 1)}%`
    : "No evaluada";

  return `
    <aside class="geo-detail" aria-live="polite" data-selected-project="${escapeAttr(
      point.observed_project_id,
    )}">
      <div class="geo-detail-heading">
        <span class="geo-eyebrow">Detalle persistente</span>
        <span class="geo-status geo-status--${escapeAttr(
          point.comparison_status,
        )}">${escapeHtml(point.comparison_label)}</span>
      </div>
      <h3>${escapeHtml(point.project_name)}</h3>
      <p class="geo-detail-agency">${escapeHtml(point.agency_name)}</p>
      <dl class="geo-detail-list">
        <div><dt>Ubicación</dt><dd>${escapeHtml(locationReading)}</dd></div>
        <div><dt>Score</dt><dd>${escapeHtml(scoreReading)}</dd></div>
        <div><dt>Cobertura de evidencia</dt><dd>${escapeHtml(
          coverageReading,
        )}</dd></div>
        <div><dt>Área total publicada</dt><dd>${escapeHtml(
          point.total_area ? `${formatNumber(point.total_area, 2)} m²` : "No disponible",
        )}</dd></div>
        <div><dt>Dormitorios</dt><dd>${escapeHtml(
          bedroomsText(point),
        )}</dd></div>
        <div><dt>Entrega</dt><dd>${escapeHtml(
          point.delivery_year
            ? String(Math.trunc(point.delivery_year))
            : "No disponible",
        )}</dd></div>
        <div><dt>Precio de lista</dt><dd>${escapeHtml(
          point.list_price_avg
            ? formatMoney(point.list_price_avg)
            : "No disponible",
        )}</dd></div>
      </dl>
      ${
        point.comparison_status === "comparable"
          ? `
            <div class="geo-detail-actions">
              <a href="#projects" data-view="projects">Ver por qué es comparable</a>
              <a href="#compare" data-view="compare">Abrir en comparables</a>
            </div>
          `
          : `
            <p class="geo-detail-note">
              ${
                point.geography_invalid
                  ? "La coordenada permanece visible para revisar cobertura, pero queda fuera de la geografía validada y no alimenta acciones analíticas."
                  : point.geography_unavailable
                    ? "La ubicación permanece visible como referencia, pero la geografía no está disponible o verificada y no alimenta acciones analíticas."
                  : point.unreconciled
                  ? "Este observado aporta cobertura territorial, pero no tiene reconciliación autoritativa y no alimenta acciones analíticas."
                  : "Este proyecto queda visible como contexto territorial, pero no cumple los filtros del escenario para el análisis."
              }
            </p>
          `
      }
    </aside>
  `;
}

function renderAttribution(model) {
  const snapshot = model.cutoff_at
    ? ` · Corte ${formatDate(model.cutoff_at)}`
    : "";
  return `
    <p class="geo-attribution">
      <a href="${OSM_COPYRIGHT_URL}" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
      · <a href="${ODBL_URL}" target="_blank" rel="noreferrer">ODbL 1.0</a>.
      Geometría referencial; límites legales: RENLIM. Cuadrantes analíticos no oficiales${escapeHtml(
        snapshot,
      )}.
    </p>
  `;
}

function buildGeometryModel({
  feature,
  district,
  rows,
  target,
  scenario,
}) {
  const coordinates = geometryCoordinates(feature.geometry);
  if (coordinates.length === 0) return null;
  const referenceLatitude =
    finiteNumber(district?.median_latitude) ??
    average(coordinates.map((coordinate) => coordinate[1]));
  const metricProject = createMetricProjection(referenceLatitude);
  const metricGeometry = coordinates.map(([longitude, latitude]) =>
    metricProject(longitude, latitude),
  );
  const metricTarget = target
    ? metricProject(target.longitude, target.latitude)
    : null;
  const radiusMeters =
    scenario.scope_mode === "radius"
      ? positiveNumber(scenario.radius_meters)
      : null;
  const boundsValues = [...metricGeometry];
  for (const row of rows) {
    boundsValues.push(metricProject(row.longitude, row.latitude));
  }
  if (metricTarget) {
    boundsValues.push(metricTarget);
    if (radiusMeters) {
      boundsValues.push(
        [metricTarget[0] - radiusMeters, metricTarget[1] - radiusMeters],
        [metricTarget[0] + radiusMeters, metricTarget[1] + radiusMeters],
      );
    }
  }
  const bounds = coordinateBounds(boundsValues);
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const scale = Math.min(
    (MAP_WIDTH - MAP_PADDING * 2) / width,
    (MAP_HEIGHT - MAP_PADDING * 2) / height,
  );
  const offsetX =
    MAP_PADDING +
    (MAP_WIDTH - MAP_PADDING * 2 - width * scale) / 2;
  const offsetY =
    MAP_PADDING +
    (MAP_HEIGHT - MAP_PADDING * 2 - height * scale) / 2;
  const project = (longitude, latitude) => {
    const metric = metricProject(longitude, latitude);
    return {
      x: offsetX + (metric[0] - bounds.minX) * scale,
      y: MAP_HEIGHT - (offsetY + (metric[1] - bounds.minY) * scale),
    };
  };
  const path = geometryPath(feature.geometry, project);
  if (!path) return null;
  const projectedTarget = target
    ? { ...target, ...project(target.longitude, target.latitude) }
    : null;

  return {
    path,
    relation_id: Number(feature.properties?.osm_id),
    projection: "local-equirectangular-meters",
    reference_latitude: referenceLatitude,
    meters_to_pixels: scale,
    project,
    target: projectedTarget,
    radius:
      projectedTarget && radiusMeters
        ? {
            cx: projectedTarget.x,
            cy: projectedTarget.y,
            radius_meters: radiusMeters,
            radius_px: radiusMeters * scale,
          }
        : null,
    quadrants: buildQuadrants({
      district,
      project,
      scenario,
    }),
    scale_bar: buildScaleBar(scale),
  };
}

function buildQuadrants({ district, project, scenario }) {
  const medianLatitude = finiteNumber(district?.median_latitude);
  const medianLongitude = finiteNumber(district?.median_longitude);
  if (medianLatitude === null || medianLongitude === null) return null;
  const median = project(medianLongitude, medianLatitude);
  const left = MAP_PADDING;
  const right = MAP_WIDTH - MAP_PADDING;
  const top = MAP_PADDING;
  const bottom = MAP_HEIGHT - MAP_PADDING;
  const cells = [
    { id: "NW", x: left, y: top, width: median.x - left, height: median.y - top },
    { id: "NE", x: median.x, y: top, width: right - median.x, height: median.y - top },
    { id: "SW", x: left, y: median.y, width: median.x - left, height: bottom - median.y },
    { id: "SE", x: median.x, y: median.y, width: right - median.x, height: bottom - median.y },
  ].map((cell) => ({
    ...cell,
    width: Math.max(0, cell.width),
    height: Math.max(0, cell.height),
    active:
      scenario.scope_mode === "quadrant" &&
      scenario.quadrant_id === cell.id,
  }));
  return {
    vertical_x: median.x,
    horizontal_y: median.y,
    cells,
    labels: cells.map((cell) => ({
      id: cell.id,
      x: cell.x + cell.width / 2,
      y: cell.y + cell.height / 2,
    })),
  };
}

function buildScaleBar(scale) {
  if (!Number.isFinite(scale) || scale <= 0) return null;
  const targetMeters = (MAP_WIDTH * 0.18) / scale;
  const distance = niceDistance(targetMeters);
  return {
    x: MAP_PADDING + 14,
    y: MAP_HEIGHT - MAP_PADDING - 8,
    width: distance * scale,
    meters: distance,
    label: formatDistance(distance),
  };
}

function buildTarget(scenario) {
  const latitude = finiteNumber(scenario?.center_latitude);
  const longitude = finiteNumber(scenario?.center_longitude);
  if (
    latitude === null ||
    longitude === null ||
    (latitude === 0 && longitude === 0)
  ) {
    return null;
  }
  return {
    latitude,
    longitude,
    simulated: true,
  };
}

function findBoundaryFeature(boundaryGeoJson, relationId) {
  const expected = Number(relationId);
  if (!Number.isFinite(expected)) return null;
  return (
    toArray(boundaryGeoJson?.features).find(
      (feature) =>
        feature?.properties?.osm_type === "relation" &&
        Number(feature?.properties?.osm_id) === expected &&
        ["Polygon", "MultiPolygon"].includes(feature?.geometry?.type),
    ) ?? null
  );
}

function geometryCoordinates(geometry) {
  const coordinates = [];
  visitCoordinates(geometry?.coordinates, (coordinate) => {
    const longitude = finiteNumber(coordinate?.[0]);
    const latitude = finiteNumber(coordinate?.[1]);
    if (longitude !== null && latitude !== null) {
      coordinates.push([longitude, latitude]);
    }
  });
  return coordinates;
}

function visitCoordinates(value, visitor) {
  if (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  ) {
    visitor(value);
    return;
  }
  for (const child of toArray(value)) visitCoordinates(child, visitor);
}

function geometryPath(geometry, project) {
  const polygons =
    geometry?.type === "Polygon"
      ? [geometry.coordinates]
      : geometry?.type === "MultiPolygon"
        ? geometry.coordinates
        : [];
  return polygons
    .flatMap((polygon) =>
      toArray(polygon).map((ring) => ringPath(ring, project)),
    )
    .filter(Boolean)
    .join(" ");
}

function ringPath(ring, project) {
  const points = toArray(ring)
    .map((coordinate) => {
      const longitude = finiteNumber(coordinate?.[0]);
      const latitude = finiteNumber(coordinate?.[1]);
      return longitude === null || latitude === null
        ? null
        : project(longitude, latitude);
    })
    .filter(Boolean);
  if (points.length < 3) return "";
  return `${points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${numberText(point.x)} ${numberText(
          point.y,
        )}`,
    )
    .join(" ")} Z`;
}

function createMetricProjection(referenceLatitude) {
  const cosine = Math.max(
    0.01,
    Math.cos((referenceLatitude * Math.PI) / 180),
  );
  return (longitude, latitude) => [
    EARTH_RADIUS_METERS * ((longitude * Math.PI) / 180) * cosine,
    EARTH_RADIUS_METERS * ((latitude * Math.PI) / 180),
  ];
}

function coordinateBounds(coordinates) {
  const xs = coordinates.map((coordinate) => coordinate[0]);
  const ys = coordinates.map((coordinate) => coordinate[1]);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function niceDistance(value) {
  if (!Number.isFinite(value) || value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step =
    normalized >= 5 ? 5 : normalized >= 2 ? 2 : normalized >= 1 ? 1 : 0.5;
  return step * magnitude;
}

function mapDescription(model) {
  const pieces = [
    `${model.displayed_project_count} proyectos con coordenadas visibles`,
    `${model.comparable_project_count} comparables`,
  ];
  if (model.unreconciled_project_count) {
    pieces.push(
      `${model.unreconciled_project_count} observados no reconciliados`,
    );
  }
  if (model.target) pieces.push("incluye un escenario Viva simulado");
  return `${pieces.join(", ")}. La selección equivalente está disponible debajo del mapa.`;
}

function pointAriaLabel(point) {
  const score =
    point.comparable && point.score !== null
      ? `, score ${formatNumber(point.score, 1)} de 100`
      : "";
  return `${point.project_name}, ${point.agency_name}, ${point.comparison_label}${score}`;
}

function bedroomsText(point) {
  if (point.bedrooms) return point.bedrooms;
  if (
    point.bedrooms_min !== null &&
    point.bedrooms_max !== null
  ) {
    return point.bedrooms_min === point.bedrooms_max
      ? String(point.bedrooms_min)
      : `${point.bedrooms_min} a ${point.bedrooms_max}`;
  }
  return "No disponible";
}

function legacyIdFromObserved(value) {
  const id = String(value ?? "");
  return id.startsWith("observed:nexo-")
    ? id.slice("observed:nexo-".length)
    : "";
}

function authoritativeIdFromObserved(value) {
  const id = String(value ?? "");
  return id.startsWith("observed:nexo-")
    ? `project:nexo-${id.slice("observed:nexo-".length)}`
    : null;
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function positiveNumber(value) {
  const numeric = finiteNumber(value);
  return numeric !== null && numeric > 0 ? numeric : null;
}

function average(values) {
  const numeric = values.filter(Number.isFinite);
  return numeric.length
    ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length
    : 0;
}

function uniqueStrings(values) {
  return [...new Set(toArray(values).map(String).filter(Boolean))];
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function safeToken(value) {
  return String(value ?? "").replace(/[^a-zA-Z0-9_-]/g, "-");
}

function numberText(value) {
  return Number.isFinite(value)
    ? String(Math.round(value * 1000) / 1000)
    : "0";
}

function formatNumber(value, digits = 0) {
  const numeric = finiteNumber(value);
  if (numeric === null) return "No disponible";
  return new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(numeric);
}

function formatMoney(value) {
  const numeric = positiveNumber(value);
  return numeric === null
    ? "No disponible"
    : `S/ ${new Intl.NumberFormat("es-PE", {
        maximumFractionDigits: 0,
      }).format(numeric)}`;
}

function formatDistance(value) {
  const meters = positiveNumber(value);
  if (meters === null) return "distancia no disponible";
  if (meters >= 1000) {
    return `${formatNumber(meters / 1000, meters % 1000 === 0 ? 0 : 1)} km`;
  }
  return `${formatNumber(Math.round(meters), 0)} m`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return cleanText(value);
  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
