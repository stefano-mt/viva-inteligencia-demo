import {
  componentHelp,
  escapeAttr,
  escapeHtml,
  formatNumber,
} from "../domain.js";
import {
  isEligiblePriceReference,
  quantileR7,
} from "../comparability.js";
import { state } from "../state.js";

const QUADRANT_ORDER = ["NW", "NE", "SW", "SE"];

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function districtName(district) {
  return district?.source_name ?? district?.district_name ?? "Distrito";
}

function rankHighLoadDistricts(districts) {
  return [...(districts ?? [])]
    .filter((district) => district.high_load)
    .sort(
      (left, right) =>
        right.observed_project_count - left.observed_project_count ||
        districtName(left).localeCompare(districtName(right), "es"),
    );
}

export function resolveMarketDistricts({
  geography,
  districtId,
} = {}) {
  const allDistricts = geography?.districts ?? [];
  return {
    ranking: rankHighLoadDistricts(allDistricts),
    active:
      allDistricts.find(
        (district) => district.district_id === districtId,
      ) ?? null,
  };
}

function observedId(project) {
  return `observed:nexo-${project.id}`;
}

function canonicalId(project) {
  return `project:nexo-${project.id}`;
}

function projectIndexes() {
  const projects = state.data?.projects ?? [];
  return {
    byObservedId: new Map(
      projects.map((project) => [observedId(project), project]),
    ),
    byCanonicalId: new Map(
      projects.map((project) => [canonicalId(project), project]),
    ),
  };
}

function formatPublishedPrice(value) {
  return value
    ? `S/ ${formatNumber(value, 0)} / m²`
    : "No disponible";
}

function staticQuadrantReading(quadrant, indexes, cutoffAt) {
  const observedIds = quadrant.observed_project_ids ?? [];
  const authoritativeIds = quadrant.authoritative_project_ids ?? [];
  const projects = observedIds
    .map((id) => indexes.byObservedId.get(id))
    .filter(Boolean);
  const agencies = new Set(
    projects
      .map((project) => String(project.agency_name ?? "").trim())
      .filter(Boolean),
  );
  const priceProjects = authoritativeIds
    .map((id) => indexes.byCanonicalId.get(id))
    .filter(Boolean)
    .filter((project) =>
      isEligiblePriceReference({ project, cutoffAt }),
    );

  return {
    observed: observedIds.length,
    geographyValid: observedIds.length,
    reconciled: authoritativeIds.length,
    agencies: agencies.size,
    priceReferenceCount: priceProjects.length,
    medianPublishedPricePerM2: quantileR7(
      priceProjects.map((project) => project.price_per_m2_list),
      0.5,
    ),
  };
}

function activeScenarioReading(quadrantId) {
  const context = state.scenarioContext;
  const active =
    state.scenario?.scope_mode === "quadrant" &&
    state.scenario?.quadrant_id === quadrantId &&
    context?.scenario?.district_id === state.scenario?.district_id &&
    context?.scenario?.quadrant_id === quadrantId;
  if (!active) return null;

  const diagnosis = context.price_diagnosis ?? {};
  const comparabilityLabels = {
    ready: "Comparabilidad lista",
    orientative: "Comparabilidad orientativa",
    insufficient: "Comparables insuficientes",
  };
  const pricePositionLabels = {
    entry: "Entrada competitiva",
    aligned: "Alineado",
    premium: "Premium",
    Entrada: "Entrada competitiva",
    Alineado: "Alineado",
    Premium: "Premium",
  };
  return {
    comparableCount: context.comparable_project_ids?.length ?? 0,
    comparabilityLabel:
      comparabilityLabels[context.comparability_status] ??
      "Comparabilidad sin estado",
    evidenceCoverage: context.evidence_coverage_pct ?? 0,
    priceStatus: context.price_status,
    priceReferenceCount:
      context.price_reference_project_ids?.length ?? 0,
    priceMedian: positiveNumber(diagnosis.median),
    pricePosition:
      pricePositionLabels[diagnosis.position] ??
      diagnosis.position ??
      null,
  };
}

function rankingRow(district, index, maximumObserved) {
  const name = districtName(district);
  const observed = district.observed_project_count ?? 0;
  const geographyValid = district.polygon_valid_count ?? 0;
  const outside = Math.max(observed - geographyValid, 0);
  const selected = district.district_id === state.scenario?.district_id;
  const width = maximumObserved
    ? Math.max(0, Math.min(100, (observed / maximumObserved) * 100))
    : 0;

  return `
    <button
      class="bar-row as-button"
      id="market-district-${escapeAttr(district.district_id)}"
      type="button"
      data-district-chip="${escapeAttr(district.district_id)}"
      aria-pressed="${selected}"
    >
      <span>
        <strong>${formatNumber(index + 1)}. ${escapeHtml(name)}</strong>
        <span class="status-badge success">Top 7 · alta carga</span>
      </span>
      <span>
        <span class="bar-track" aria-hidden="true">
          <i style="width:${width.toFixed(1)}%"></i>
        </span>
        <span>${formatNumber(geographyValid)}/${formatNumber(observed)} con geografía válida</span>
      </span>
      <em>
        <strong>${formatNumber(observed)} observados</strong>
        ${
          outside
            ? `${formatNumber(outside)} fuera del polígono`
            : "Sin exclusiones territoriales"
        }
      </em>
    </button>
  `;
}

function activeScenarioMarkup(activeReading) {
  if (!activeReading) {
    return `
      <span>
        Selecciona esta fila para calcular comparables del escenario.
      </span>
    `;
  }
  const priceCopy =
    activeReading.priceStatus === "ready"
      ? `${formatNumber(activeReading.priceReferenceCount)} referencias · mediana ${formatPublishedPrice(activeReading.priceMedian)}`
      : `${formatNumber(activeReading.priceReferenceCount)} referencias · precio insuficiente`;
  return `
    <span>
      <strong>Escenario activo</strong>
      ${formatNumber(activeReading.comparableCount)} comparables ·
      ${escapeHtml(activeReading.comparabilityLabel)} ·
      ${formatNumber(activeReading.evidenceCoverage, 1)}% de evidencia
    </span>
    <span>
      ${escapeHtml(priceCopy)}
      ${
        activeReading.pricePosition
          ? ` · ${escapeHtml(activeReading.pricePosition)}`
          : ""
      }
    </span>
  `;
}

function quadrantRow(quadrant, indexes, cutoffAt) {
  const reading = staticQuadrantReading(quadrant, indexes, cutoffAt);
  const activeReading = activeScenarioReading(quadrant.quadrant_id);
  const selected = Boolean(activeReading);
  const label = quadrant.label ?? quadrant.quadrant_id;

  return `
    <button
      class="bar-row as-button"
      id="market-quadrant-${escapeAttr(quadrant.quadrant_id.toLowerCase())}"
      type="button"
      data-scenario-quadrant="${escapeAttr(quadrant.quadrant_id)}"
      aria-pressed="${selected}"
    >
      <span>
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(quadrant.quadrant_id)} · cuadrante analítico</span>
      </span>
      <span>
        <strong>${formatNumber(reading.observed)} observados asignados</strong>
        ${formatNumber(reading.geographyValid)} con geografía válida ·
        ${formatNumber(reading.reconciled)} reconciliados ·
        ${formatNumber(reading.agencies)} inmobiliarias
      </span>
      <em>
        <strong>Referencia publicada provisional</strong>
        ${formatPublishedPrice(reading.medianPublishedPricePerM2)} ·
        ${formatNumber(reading.priceReferenceCount)} precios compatibles
        ${activeScenarioMarkup(activeReading)}
      </em>
    </button>
  `;
}

function noQuadrants(district) {
  return `
    <div class="empty-state">
      <strong>Sin cuadrantes analíticos disponibles</strong>
      <p>
        ${escapeHtml(districtName(district))} no pertenece al Top 7 de alta
        carga o no tiene cuatro cuadrantes versionados. La lectura permanece
        en el alcance seleccionado; no se sustituye silenciosamente por el
        distrito completo.
      </p>
    </div>
  `;
}

export function renderMarket() {
  const { ranking: districts, active: district } =
    resolveMarketDistricts({
      geography: state.data?.geography,
      districtId: state.scenario?.district_id,
    });
  if (!district) {
    return `
      <section class="panel span-12">
        <div class="empty-state">
          <strong>Lectura territorial no disponible</strong>
          <p>El distrito activo no pertenece al ranking geográfico versionado.</p>
        </div>
      </section>
    `;
  }

  const indexes = projectIndexes();
  const cutoffAt = state.data?.metadata?.cutoff_at;
  const quadrants = [...(district.quadrants ?? [])].sort(
    (left, right) =>
      QUADRANT_ORDER.indexOf(left.quadrant_id) -
      QUADRANT_ORDER.indexOf(right.quadrant_id),
  );
  const totalObserved = districts.reduce(
    (total, item) => total + (item.observed_project_count ?? 0),
    0,
  );
  const totalGeographyValid = districts.reduce(
    (total, item) => total + (item.polygon_valid_count ?? 0),
    0,
  );
  const outsidePolygon = Math.max(
    totalObserved - totalGeographyValid,
    0,
  );
  const outsideBreakdown = districts
    .map((item) => ({
      name: districtName(item),
      count: Math.max(
        (item.observed_project_count ?? 0) -
          (item.polygon_valid_count ?? 0),
        0,
      ),
    }))
    .filter(({ count }) => count > 0)
    .map(({ name, count }) => `${name} ${formatNumber(count)}`)
    .join(", ");
  const activeOutside = Math.max(
    (district.observed_project_count ?? 0) -
      (district.polygon_valid_count ?? 0),
    0,
  );

  return `
    <section class="dashboard-grid market-reading">
      <section class="benchmark-hero span-12">
        <div>
          <span class="status-badge ${district.high_load ? "success" : "neutral"}">
            ${
              district.high_load
                ? "Top 7 · alta carga"
                : "Lectura distrital · sin cuadrantes"
            }
          </span>
          <h2>Lectura territorial de ${escapeHtml(districtName(district))}</h2>
          <p>
            Compara la carga observada del distrito y abre sus cuadrantes
            analíticos sin confundirlos con microzonas oficiales.
          </p>
        </div>
        <div class="phase-stack" aria-label="Cobertura del distrito activo">
          <strong>
            ${formatNumber(district.polygon_valid_count)}/${formatNumber(district.observed_project_count)}
            con geografía válida
          </strong>
          <span>
            ${formatNumber(district.authoritative_project_count)}
            observados reconciliados antes del filtro territorial
          </span>
          <span>
            ${
              activeOutside
                ? `${formatNumber(activeOutside)} fuera del polígono OSM; permanece visible como brecha de cobertura.`
                : "Sin proyectos fuera del polígono OSM en este distrito."
            }
          </span>
        </div>
      </section>

      <section class="panel span-12 market-ranking">
        <div class="panel-header">
          <div>
            <h2>Ranking distrital por carga observada</h2>
            <p>
              Los siete distritos de mayor carga del snapshot. Seleccionar una
              fila actualiza el escenario canónico.
            </p>
          </div>
          ${componentHelp(
            "Cómo leer el ranking",
            "La longitud representa proyectos observados, no ventas ni stock. La cobertura territorial compara esos observados con los puntos que caen dentro o sobre el límite OSM versionado.",
          )}
        </div>
        <div class="bar-list" role="group" aria-label="Top siete distritos de alta carga">
          ${districts
            .map((item, index) =>
              rankingRow(
                item,
                index,
                districts[0]?.observed_project_count ?? 1,
              ),
            )
            .join("")}
        </div>
        <details class="content-expander">
          <summary>Cobertura territorial del ranking</summary>
          <div class="bar-list">
            <p>
              ${formatNumber(totalGeographyValid)}/${formatNumber(totalObserved)}
              proyectos tienen geografía válida dentro de los siete límites
              versionados. Los ${formatNumber(outsidePolygon)} restantes
              quedan reportados como fuera del polígono:
              ${escapeHtml(outsideBreakdown)}.
            </p>
            <p>
              Geometría referencial: © OpenStreetMap contributors, ODbL 1.0.
              RENLIM es la referencia jurídica para límites oficiales.
            </p>
          </div>
        </details>
      </section>

      <section class="panel span-12 market-quadrants">
        <div class="panel-header">
          <div>
            <h2>Cuadrantes analíticos del snapshot</h2>
            <p>
              ${escapeHtml(districtName(district))}: división reproducible por
              las medianas de latitud y longitud de proyectos con geografía
              válida.
            </p>
          </div>
          ${componentHelp(
            "Qué significa un cuadrante",
            "Noroeste, noreste, suroeste y sureste son particiones analíticas del snapshot. No representan límites municipales, catastrales ni microzonas oficiales.",
          )}
        </div>
        ${
          district.high_load && quadrants.length
            ? `
              <div class="bar-list" role="group" aria-label="Cuatro cuadrantes analíticos">
                ${quadrants
                  .map((quadrant) =>
                    quadrantRow(quadrant, indexes, cutoffAt),
                  )
                  .join("")}
              </div>
            `
            : noQuadrants(district)
        }
        <details class="content-expander">
          <summary>Metodología y alcance de precios</summary>
          <div class="bar-list">
            <p>
              Los proyectos fuera del polígono se excluyen antes de asignar
              cuadrante; no se trasladan al distrito como fallback. Por eso la
              suma de cuadrantes coincide con la geografía válida, no siempre
              con todos los observados.
            </p>
            <p>
              “Referencia publicada provisional” resume precios de lista PEN
              compatibles, con URL y fecha hasta el corte. No representa un
              benchmark certificado ni precios reales de cierre.
            </p>
            <p>
              Solo la fila del cuadrante activo muestra comparables y
              diagnóstico del escenario vigente. Las otras
              filas conservan conteos estáticos del snapshot y no recomponen
              escenarios durante el render.
            </p>
          </div>
        </details>
      </section>
    </section>
  `;
}
