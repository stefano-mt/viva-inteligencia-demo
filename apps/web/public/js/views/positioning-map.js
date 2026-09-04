import { buildScenarioProjectRows } from "./geographic-map.js";

const PLOT_WIDTH = 960;
const PLOT_HEIGHT = 520;
const PLOT_MARGIN = Object.freeze({
  top: 44,
  right: 38,
  bottom: 70,
  left: 88,
});

export function buildPositioningMapModel({
  scenarioContext,
  data,
  selectedProjectId = null,
} = {}) {
  if (!scenarioContext || !data) {
    return {
      status: "loading",
      points: [],
      selected_point: null,
      x_ticks: [],
      y_ticks: [],
      target: null,
      median: null,
    };
  }

  const projectRows = buildScenarioProjectRows({
    scenarioContext,
    data,
    selectedProjectId,
  });
  const comparableRows = projectRows.rows.filter((row) => row.comparable);
  const plottableRows = comparableRows.filter(
    (row) =>
      positiveNumber(row.total_area) !== null &&
      positiveNumber(row.price_per_m2_list) !== null,
  );
  const scenario = scenarioContext.scenario ?? {};
  const targetArea = positiveNumber(scenario.target_area_m2);
  const targetPrice = positiveNumber(scenario.target_price_pen);
  const targetPricePerM2 =
    targetArea && targetPrice ? targetPrice / targetArea : null;
  const target =
    targetArea && targetPricePerM2
      ? {
          area: targetArea,
          price_per_m2: targetPricePerM2,
          simulated: true,
        }
      : null;
  const median = positiveNumber(
    scenarioContext.price_diagnosis?.median,
  );
  const xValues = plottableRows.map((row) => row.total_area);
  const yValues = plottableRows.map((row) => row.price_per_m2_list);
  if (target) {
    xValues.push(target.area);
    yValues.push(target.price_per_m2);
  }
  if (median) yValues.push(median);

  const xDomain = paddedDomain(xValues, {
    fallbackMin: 0,
    fallbackMax: 100,
    includeZero: false,
  });
  const yDomain = paddedDomain(yValues, {
    fallbackMin: 0,
    fallbackMax: 10_000,
    includeZero: false,
  });
  const plotWidth =
    PLOT_WIDTH - PLOT_MARGIN.left - PLOT_MARGIN.right;
  const plotHeight =
    PLOT_HEIGHT - PLOT_MARGIN.top - PLOT_MARGIN.bottom;
  const xScale = (value) =>
    PLOT_MARGIN.left +
    ((value - xDomain.min) / (xDomain.max - xDomain.min)) *
      plotWidth;
  const yScale = (value) =>
    PLOT_MARGIN.top +
    (1 - (value - yDomain.min) / (yDomain.max - yDomain.min)) *
      plotHeight;
  const points = plottableRows.map((row) => ({
    ...row,
    x: xScale(row.total_area),
    y: yScale(row.price_per_m2_list),
  }));
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

  const targetPoint = target
    ? {
        ...target,
        x: xScale(target.area),
        y: yScale(target.price_per_m2),
      }
    : null;
  const medianLine = median
    ? {
        value: median,
        y: yScale(median),
      }
    : null;

  return {
    status: points.length ? "ready" : "insufficient",
    scenario_invalid: scenarioContext.scenario_status === "invalid",
    price_status: scenarioContext.price_status,
    scenario,
    scope_text:
      cleanText(scenarioContext.scope_text) ||
      "Escenario de posicionamiento",
    points,
    point_ids: points.map((point) => point.observed_project_id),
    source_comparable_ids: comparableRows.map(
      (row) => row.observed_project_id,
    ),
    selected_point: selectedPoint,
    requested_selected_observed_id:
      projectRows.selected_observed_project_id,
    omitted_metric_count: comparableRows.length - points.length,
    x_domain: xDomain,
    y_domain: yDomain,
    x_ticks: numericTicks(xDomain.min, xDomain.max, 5).map(
      (value) => ({
        value,
        x: xScale(value),
      }),
    ),
    y_ticks: numericTicks(yDomain.min, yDomain.max, 5).map(
      (value) => ({
        value,
        y: yScale(value),
      }),
    ),
    target: targetPoint,
    median: medianLine,
    plot: {
      left: PLOT_MARGIN.left,
      right: PLOT_WIDTH - PLOT_MARGIN.right,
      top: PLOT_MARGIN.top,
      bottom: PLOT_HEIGHT - PLOT_MARGIN.bottom,
      width: plotWidth,
      height: plotHeight,
    },
  };
}

export function renderPositioningMap(input = {}) {
  const model = buildPositioningMapModel(input);
  const showVisualizationControl =
    input.showVisualizationControl !== false;
  if (model.status === "loading") {
    return `
      <section class="positioning-panel positioning-panel--loading" aria-busy="true">
        <div class="positioning-skeleton" aria-hidden="true"></div>
        <p><strong>Preparando posicionamiento área/precio</strong></p>
      </section>
    `;
  }

  const visualization = model.scenario?.visualization ?? "positioning";
  return `
    <section
      class="positioning-panel"
      data-positioning-state="${escapeAttr(model.status)}"
      data-visualization-active="${visualization === "positioning"}"
    >
      <header class="positioning-panel-header">
        <div>
          <span class="positioning-eyebrow">Lectura de producto</span>
          <h2>Posicionamiento área/precio</h2>
          <p>${escapeHtml(
            model.scope_text,
          )} · Precio de lista publicado por m² frente al área total publicada.</p>
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
      ${renderPositioningNotice(model)}
      <div class="positioning-stage">
        <div class="positioning-chart-column">
          ${renderPositioningSurface(model)}
          ${renderPositioningSelector(model)}
          ${renderPositioningLegend(model)}
        </div>
        ${renderPositioningDetail(model)}
      </div>
      ${renderAccessibleTable(model)}
      <p class="positioning-method">
        Escenario estimado frente a precios de lista publicados. No representa precios reales de cierre.
      </p>
    </section>
  `;
}

function renderPositioningNotice(model) {
  const notices = [];
  if (model.scenario_invalid) {
    notices.push(`
      <div class="positioning-notice positioning-notice--warning" role="status">
        <strong>Escenario compartido corregido</strong>
        <span>El gráfico utiliza únicamente los valores válidos resultantes.</span>
      </div>
    `);
  }
  if (model.price_status === "insufficient") {
    notices.push(`
      <div class="positioning-notice" role="status">
        <strong>Referencia de precio insuficiente</strong>
        <span>Se mantienen los puntos disponibles, sin emitir una conclusión fuerte de precio.</span>
      </div>
    `);
  }
  return notices.join("");
}

function renderPositioningSurface(model) {
  if (model.points.length === 0) {
    return `
      <div class="positioning-state" role="status">
        <span class="positioning-state-mark" aria-hidden="true">↗</span>
        <div>
          <strong>No hay comparables con área y precio/m² compatibles</strong>
          <p>El gráfico no convierte rangos o faltantes en valores inventados. Ajusta el escenario o revisa la cobertura.</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="positioning-frame">
      <svg
        class="positioning-chart"
        viewBox="0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}"
        role="img"
        aria-labelledby="positioning-title positioning-description"
      >
        <title id="positioning-title">Posicionamiento área/precio</title>
        <desc id="positioning-description">${escapeHtml(
          `${model.points.length} comparables con área total y precio de lista por metro cuadrado. Hay una tabla equivalente debajo del gráfico.`,
        )}</desc>
        <rect class="positioning-ground" width="${PLOT_WIDTH}" height="${PLOT_HEIGHT}" rx="18"></rect>
        ${renderGridAndAxes(model)}
        ${renderMedian(model)}
        ${renderPositioningPoints(model)}
        ${renderPositioningTarget(model)}
      </svg>
    </div>
  `;
}

function renderGridAndAxes(model) {
  return `
    <g class="positioning-grid" aria-hidden="true">
      ${model.y_ticks
        .map(
          (tick) => `
            <line x1="${numberText(model.plot.left)}" y1="${numberText(
              tick.y,
            )}" x2="${numberText(model.plot.right)}" y2="${numberText(
              tick.y,
            )}"></line>
            <text x="${numberText(
              model.plot.left - 14,
            )}" y="${numberText(tick.y + 4)}" text-anchor="end">${escapeHtml(
              compactMoney(tick.value),
            )}</text>
          `,
        )
        .join("")}
      ${model.x_ticks
        .map(
          (tick) => `
            <line x1="${numberText(tick.x)}" y1="${numberText(
              model.plot.top,
            )}" x2="${numberText(tick.x)}" y2="${numberText(
              model.plot.bottom,
            )}"></line>
            <text x="${numberText(tick.x)}" y="${numberText(
              model.plot.bottom + 27,
            )}" text-anchor="middle">${escapeHtml(
              formatNumber(tick.value, tick.value < 10 ? 1 : 0),
            )}</text>
          `,
        )
        .join("")}
    </g>
    <g class="positioning-axes" aria-hidden="true">
      <line x1="${numberText(model.plot.left)}" y1="${numberText(
        model.plot.bottom,
      )}" x2="${numberText(model.plot.right)}" y2="${numberText(
        model.plot.bottom,
      )}"></line>
      <line x1="${numberText(model.plot.left)}" y1="${numberText(
        model.plot.top,
      )}" x2="${numberText(model.plot.left)}" y2="${numberText(
        model.plot.bottom,
      )}"></line>
      <text class="positioning-axis-title" x="${numberText(
        model.plot.left + model.plot.width / 2,
      )}" y="${PLOT_HEIGHT - 16}" text-anchor="middle">Área total publicada (m²)</text>
      <text class="positioning-axis-title" transform="translate(23 ${
        model.plot.top + model.plot.height / 2
      }) rotate(-90)" text-anchor="middle">Precio de lista publicado (S/ por m²)</text>
    </g>
  `;
}

function renderMedian(model) {
  if (!model.median) return "";
  return `
    <g class="positioning-median" aria-label="Mediana publicada ${escapeAttr(
      formatPricePerM2(model.median.value),
    )}">
      <line x1="${numberText(model.plot.left)}" y1="${numberText(
        model.median.y,
      )}" x2="${numberText(model.plot.right)}" y2="${numberText(
        model.median.y,
      )}"></line>
      <text x="${numberText(
        model.plot.right - 6,
      )}" y="${numberText(model.median.y - 9)}" text-anchor="end">Mediana ${escapeHtml(
        formatPricePerM2(model.median.value),
      )}</text>
    </g>
  `;
}

function renderPositioningPoints(model) {
  return `
    <g class="positioning-projects">
      ${model.points
        .map(
          (point) => `
            <g
              class="positioning-node ${
                point.selected ? "is-selected" : ""
              }"
              data-scenario-project="${escapeAttr(
                point.observed_project_id,
              )}"
              data-positioning-point-id="${escapeAttr(
                point.observed_project_id,
              )}"
              aria-hidden="true"
              transform="translate(${numberText(point.x)} ${numberText(
                point.y,
              )})"
            >
              <circle class="positioning-hit" r="14"></circle>
              <circle class="positioning-mark" r="${
                point.selected ? 8 : 6
              }"></circle>
              <title>${escapeHtml(positioningAriaLabel(point))}</title>
            </g>
          `,
        )
        .join("")}
    </g>
  `;
}

function renderPositioningTarget(model) {
  if (!model.target) return "";
  return `
    <g
      class="positioning-target"
      transform="translate(${numberText(model.target.x)} ${numberText(
        model.target.y,
      )})"
      role="img"
      aria-label="${escapeAttr(
        `Escenario Viva simulado, ${formatNumber(
          model.target.area,
          2,
        )} metros cuadrados y ${formatPricePerM2(
          model.target.price_per_m2,
        )}`,
      )}"
    >
      <path d="M 0 -11 L 11 0 L 0 11 L -11 0 Z"></path>
      <circle r="3"></circle>
      <text x="15" y="-13">Escenario Viva</text>
    </g>
  `;
}

function renderPositioningSelector(model) {
  if (model.points.length === 0) {
    return model.omitted_metric_count
      ? `<p class="positioning-selector-note">${model.omitted_metric_count} comparables no se grafican porque falta área total puntual o precio/m² compatible.</p>`
      : "";
  }
  return `
    <div class="positioning-selector">
      <label for="positioning-project-select">
        <span>Explorar comparable sin usar el puntero</span>
        <select id="positioning-project-select" data-scenario-project>
          ${model.points
            .map(
              (point) => `
                <option
                  value="${escapeAttr(point.observed_project_id)}"
                  ${point.selected ? "selected" : ""}
                >${escapeHtml(
                  `${point.project_name} · ${formatNumber(
                    point.total_area,
                    2,
                  )} m² · ${formatPricePerM2(
                    point.price_per_m2_list,
                  )}`,
                )}</option>
              `,
            )
            .join("")}
        </select>
      </label>
      <p>${model.points.length} comparables graficados${
        model.omitted_metric_count
          ? ` · ${model.omitted_metric_count} sin métricas compatibles`
          : ""
      }.</p>
    </div>
  `;
}

function renderPositioningLegend(model) {
  return `
    <div class="positioning-legend" aria-label="Leyenda del posicionamiento">
      <span><i class="positioning-legend-symbol is-project" aria-hidden="true"></i>Comparable publicado</span>
      <span><i class="positioning-legend-symbol is-median" aria-hidden="true"></i>Mediana publicada</span>
      ${
        model.target
          ? `<span><i class="positioning-legend-symbol is-target" aria-hidden="true"></i>Escenario Viva simulado</span>`
          : ""
      }
    </div>
  `;
}

function renderPositioningDetail(model) {
  const point = model.selected_point;
  if (!point) {
    return `
      <aside class="positioning-detail" aria-live="polite">
        <span class="positioning-eyebrow">Detalle persistente</span>
        <h3>Sin comparable seleccionado</h3>
        <p>${
          model.requested_selected_observed_id
            ? "El proyecto seleccionado no tiene métricas compatibles para este análisis."
            : "Selecciona un comparable para revisar sus valores publicados."
        }</p>
      </aside>
    `;
  }
  return `
    <aside class="positioning-detail" aria-live="polite" data-selected-project="${escapeAttr(
      point.observed_project_id,
    )}">
      <span class="positioning-eyebrow">Detalle persistente</span>
      <span class="positioning-status">Comparable</span>
      <h3>${escapeHtml(point.project_name)}</h3>
      <p class="positioning-detail-agency">${escapeHtml(
        point.agency_name,
      )}</p>
      <dl class="positioning-detail-list">
        <div><dt>Área total publicada</dt><dd>${escapeHtml(
          `${formatNumber(point.total_area, 2)} m²`,
        )}</dd></div>
        <div><dt>Precio de lista por m²</dt><dd>${escapeHtml(
          formatPricePerM2(point.price_per_m2_list),
        )}</dd></div>
        <div><dt>Precio de lista total</dt><dd>${escapeHtml(
          point.list_price_avg
            ? formatMoney(point.list_price_avg)
            : "No disponible",
        )}</dd></div>
        <div><dt>Score</dt><dd>${escapeHtml(
          `${formatNumber(point.score, 1)} / 100`,
        )}</dd></div>
        <div><dt>Cobertura de evidencia</dt><dd>${escapeHtml(
          `${formatNumber(point.evidence_coverage_pct, 1)}%`,
        )}</dd></div>
      </dl>
      <div class="positioning-detail-actions">
        <a href="#projects" data-view="projects">Ver por qué es comparable</a>
        <a href="#compare" data-view="compare">Abrir en comparables</a>
      </div>
    </aside>
  `;
}

function renderAccessibleTable(model) {
  if (model.points.length === 0) return "";
  return `
    <details class="positioning-table">
      <summary>Ver tabla accesible de ${model.points.length} comparables</summary>
      <div class="positioning-table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Proyecto</th>
              <th scope="col">Inmobiliaria</th>
              <th scope="col">Área total</th>
              <th scope="col">Precio de lista/m²</th>
              <th scope="col">Score</th>
            </tr>
          </thead>
          <tbody>
            ${model.points
              .map(
                (point) => `
                  <tr ${
                    point.selected
                      ? 'class="is-selected" aria-current="true"'
                      : ""
                  }>
                    <th scope="row">${escapeHtml(
                      point.project_name,
                    )}</th>
                    <td>${escapeHtml(point.agency_name)}</td>
                    <td>${escapeHtml(
                      `${formatNumber(point.total_area, 2)} m²`,
                    )}</td>
                    <td>${escapeHtml(
                      formatPricePerM2(point.price_per_m2_list),
                    )}</td>
                    <td>${escapeHtml(
                      `${formatNumber(point.score, 1)} / 100`,
                    )}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </details>
  `;
}

function paddedDomain(
  values,
  { fallbackMin, fallbackMax, includeZero = false },
) {
  const numeric = values.filter(
    (value) => Number.isFinite(value) && value >= 0,
  );
  if (numeric.length === 0) {
    return { min: fallbackMin, max: fallbackMax };
  }
  let min = Math.min(...numeric);
  let max = Math.max(...numeric);
  if (min === max) {
    const expansion = Math.max(1, Math.abs(min) * 0.1);
    min -= expansion;
    max += expansion;
  } else {
    const padding = (max - min) * 0.08;
    min -= padding;
    max += padding;
  }
  if (includeZero) min = Math.min(0, min);
  return {
    min: Math.max(0, min),
    max: Math.max(max, min + 1),
  };
}

function numericTicks(min, max, count) {
  const span = max - min;
  if (!Number.isFinite(span) || span <= 0) return [min];
  const rawStep = span / Math.max(1, count - 1);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const step =
    normalized >= 5
      ? 5 * magnitude
      : normalized >= 2
        ? 2 * magnitude
        : magnitude;
  const first = Math.ceil(min / step) * step;
  const ticks = [];
  for (
    let value = first;
    value <= max + step * 0.001 && ticks.length < count + 2;
    value += step
  ) {
    ticks.push(Math.round(value * 1_000_000) / 1_000_000);
  }
  if (ticks.length < 2) return [min, max];
  return ticks;
}

function positioningAriaLabel(point) {
  return `${point.project_name}, ${formatNumber(
    point.total_area,
    2,
  )} metros cuadrados, ${formatPricePerM2(
    point.price_per_m2_list,
  )}, score ${formatNumber(point.score, 1)} de 100`;
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

function cleanText(value) {
  return String(value ?? "").trim();
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

function compactMoney(value) {
  const numeric = finiteNumber(value);
  if (numeric === null) return "No disponible";
  if (numeric >= 1000) {
    return `S/ ${formatNumber(numeric / 1000, numeric % 1000 ? 1 : 0)}k`;
  }
  return `S/ ${formatNumber(numeric, 0)}`;
}

function formatPricePerM2(value) {
  const numeric = positiveNumber(value);
  return numeric === null
    ? "No disponible"
    : `S/ ${formatNumber(numeric, 2)} / m²`;
}

function formatMoney(value) {
  const numeric = positiveNumber(value);
  return numeric === null
    ? "No disponible"
    : `S/ ${new Intl.NumberFormat("es-PE", {
        maximumFractionDigits: 0,
      }).format(numeric)}`;
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
