const ARTIFACT_STATUSES = new Set([
  "loading",
  "valid",
  "missing",
  "hash_mismatch",
  "parse_error",
]);

const QUADRANT_ORDER = ["NW", "NE", "SW", "SE"];
const QUADRANT_LABELS = Object.freeze({
  NW: "Noroeste",
  NE: "Noreste",
  SW: "Suroeste",
  SE: "Sureste",
});

const MONTHS = Object.freeze([
  "ene.",
  "feb.",
  "mar.",
  "abr.",
  "may.",
  "jun.",
  "jul.",
  "ago.",
  "sep.",
  "oct.",
  "nov.",
  "dic.",
]);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatNumber(value, maximumFractionDigits = 0) {
  const number = finiteNumber(value);
  if (number === null) return "No disponible";
  return new Intl.NumberFormat("es-PE", {
    maximumFractionDigits,
  }).format(number);
}

function formatDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Fecha no disponible";
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function formatRadius(radiusMeters) {
  const radius = finiteNumber(radiusMeters);
  if (radius === null) return "Radio no definido";
  return radius >= 1000
    ? `${formatNumber(radius / 1000, 1)} km`
    : `${formatNumber(radius)} m`;
}

function formatTargetPricePerM2(scenario) {
  const price = finiteNumber(scenario?.target_price_pen);
  const area = finiteNumber(scenario?.target_area_m2);
  if (price === null || area === null || price <= 0 || area <= 0) {
    return "Sin precio objetivo";
  }
  return `S/ ${formatNumber(price / area)}`;
}

function normalizeArtifact(artifact) {
  const status = ARTIFACT_STATUSES.has(artifact?.status)
    ? artifact.status
    : "missing";
  return {
    status,
    url: artifact?.url ?? null,
    expected_sha256: artifact?.expected_sha256 ?? null,
    actual_sha256: artifact?.actual_sha256 ?? null,
    geojson: status === "valid" ? artifact?.geojson ?? null : null,
    reason: artifact?.reason ?? null,
  };
}

function districtForScenario(data, scenario) {
  return (
    data?.geography?.districts?.find(
      (district) => district.district_id === scenario?.district_id,
    ) ?? null
  );
}

function observedAgencyCount(data, observedProjectIds) {
  const ids = new Set(observedProjectIds);
  const agencies = new Set();
  for (const project of data?.projects ?? []) {
    if (!ids.has(`observed:nexo-${project.id}`)) continue;
    const agency = String(project.agency_name ?? "").trim();
    if (agency) agencies.add(agency);
  }
  return agencies.size;
}

function geographyStatus(context, artifactStatus) {
  if (artifactStatus === "loading") {
    return {
      tone: "loading",
      label: "Preparando geografía",
      detail: "Verificando el límite territorial versionado.",
      symbol: "…",
    };
  }
  if (context?.geography_status === "ready") {
    return {
      tone: "ready",
      label: "Cobertura territorial completa",
      detail: `${formatNumber(context.geography_coverage?.included)}/${formatNumber(context.geography_coverage?.total)} con geografía válida`,
      symbol: "✓",
    };
  }
  if (context?.geography_status === "partial") {
    return {
      tone: "partial",
      label: "Cobertura territorial parcial",
      detail: `${formatNumber(context.geography_coverage?.included)}/${formatNumber(context.geography_coverage?.total)} con geografía válida`,
      symbol: "!",
    };
  }
  return {
    tone: "unavailable",
    label: "Geografía no disponible",
    detail:
      artifactStatus === "hash_mismatch"
        ? "El límite no coincide con la versión aprobada."
        : artifactStatus === "parse_error"
          ? "El límite territorial no pudo validarse."
          : "El límite territorial no está disponible.",
    symbol: "×",
  };
}

function comparabilityStatus(context) {
  const coverage = formatNumber(context?.evidence_coverage_pct ?? 0, 1);
  if (context?.comparability_status === "ready") {
    return {
      tone: "ready",
      label: "Comparabilidad lista",
      detail: `${coverage}% de evidencia`,
      symbol: "✓",
    };
  }
  if (context?.comparability_status === "orientative") {
    return {
      tone: "partial",
      label: `Comparabilidad orientativa · ${coverage}% evidencia`,
      detail: "Interpreta el resultado junto con los campos no evaluados.",
      symbol: "!",
    };
  }
  return {
    tone: "unavailable",
    label: "Comparables insuficientes",
    detail: "Amplía el alcance o revisa los filtros del escenario.",
    symbol: "×",
  };
}

function priceStatus(context) {
  const declaredCount = context?.price_reference_project_ids?.length ?? 0;
  if (context?.price_status === "ready") {
    return {
      tone: "partial",
      label: "Referencia de precio no demostrada",
      detail: `${formatNumber(declaredCount)} publicaciones declaran precio y área total; no prueban que ambos valores pertenezcan a la misma oferta.`,
      symbol: "!",
    };
  }
  return {
    tone: "unavailable",
    label: "Referencia de precio no demostrada",
    detail:
      declaredCount > 0
        ? `${formatNumber(declaredCount)} publicaciones declaran precio y área total; ninguna pareja está demostrada a nivel de oferta.`
        : "La muestra no demuestra una pareja precio–área de la misma oferta.",
    symbol: "×",
  };
}

function scopeTitle(scenario, district) {
  const districtName =
    district?.district_name ?? district?.source_name ?? "Distrito";
  if (scenario?.scope_mode === "quadrant") {
    const quadrant = district?.quadrants?.find(
      (item) => item.quadrant_id === scenario.quadrant_id,
    );
    return `${districtName} · ${quadrant?.label ?? scenario.quadrant_id}`;
  }
  if (scenario?.scope_mode === "radius") {
    return `${districtName} · Radio ${formatRadius(scenario.radius_meters)}`;
  }
  return `${districtName} · Distrito completo`;
}

function correctionCopy(correction) {
  const copies = {
    INVALID_VERSION:
      "La versión compartida no es compatible; aplicamos el preset base.",
    INVALID_DISTRICT:
      "El distrito compartido no está disponible; aplicamos el preset base.",
    INVALID_SCOPE:
      "El alcance no era válido; conservamos la lectura distrital.",
    INVALID_QUADRANT:
      "El cuadrante no era válido; conservamos la lectura distrital.",
    INVALID_RADIUS_SCOPE:
      "El punto o radio no era válido; conservamos la lectura distrital.",
    INVALID_TYPOLOGY: "Restauramos el tipo de inmueble predeterminado.",
    INVALID_BEDROOMS: "Restauramos los dormitorios predeterminados.",
    INVALID_TARGET_AREA: "Retiramos el área objetivo inválida.",
    INVALID_TARGET_PRICE: "Retiramos el precio objetivo inválido.",
    INVALID_DELIVERY_YEAR: "Restauramos la entrega predeterminada.",
    INVALID_VISUALIZATION:
      "Restauramos la visualización predeterminada.",
    UNKNOWN_PARAMETER:
      "Retiramos un parámetro no reconocido del enlace compartido.",
    DUPLICATE_PARAMETER:
      "Conservamos el primer valor de un parámetro repetido.",
    NON_APPLICABLE_PARAMETER:
      "Retiramos un parámetro que no aplica al alcance resultante.",
  };
  return (
    copies[correction?.code] ??
    "Ajustamos un valor que no pertenece al escenario permitido."
  );
}

function uniqueCorrections(corrections) {
  return [...new Set((corrections ?? []).map(correctionCopy))];
}

export function buildScenarioPresentation({
  data,
  scenarioState,
  scenarioContext,
  geographyArtifact,
  canonicalUrl,
  announcement = "",
  activeView,
  mobileNavOpen = false,
} = {}) {
  const scenario = scenarioState?.scenario ?? scenarioContext?.scenario ?? null;
  if (!data || !scenario) {
    throw new TypeError("Scenario presentation requires data and scenario");
  }
  const artifact = normalizeArtifact(geographyArtifact);
  const district = districtForScenario(data, scenario);
  if (!district) {
    throw new TypeError("Scenario district is not present in geography");
  }
  const observedIds = scenarioContext?.observed_scope_project_ids ?? [];
  const comparableCount =
    scenarioContext?.comparable_project_ids?.length ?? 0;
  const reviewCount = Math.max(observedIds.length - comparableCount, 0);
  const context = scenarioContext ?? {
    geography_status: "unavailable",
    comparability_status: "insufficient",
    price_status: "insufficient",
    evidence_coverage_pct: 0,
    geography_coverage: { included: 0, total: observedIds.length, pct: 0 },
    comparable_project_ids: [],
    price_reference_project_ids: [],
  };
  return {
    view: {
      group: activeView?.group ?? "Análisis",
      label: activeView?.label ?? "Escenario comercial",
      hint: activeView?.hint ?? "Lectura territorial",
    },
    scenario,
    scenarioStatus:
      scenarioState?.scenario_status ?? context.scenario_status ?? "valid",
    corrections: uniqueCorrections(
      scenarioState?.corrections ?? [],
    ),
    districts: data.geography.districts.map((item) => ({
      district_id: item.district_id,
      name: item.district_name ?? item.source_name,
      high_load: Boolean(item.high_load),
      quadrants: [...(item.quadrants ?? [])],
    })),
    district: {
      district_id: district.district_id,
      name: district.district_name ?? district.source_name,
      high_load: Boolean(district.high_load),
      quadrants: [...(district.quadrants ?? [])],
      median_latitude: district.median_latitude,
      median_longitude: district.median_longitude,
    },
    scopeTitle: scopeTitle(scenario, district),
    cutoffLabel: `Corte ${formatDate(
      context.cutoff_at ?? data.metadata?.cutoff_at,
    )}`,
    observedCount: observedIds.length,
    comparableCount,
    reviewCount,
    agencyCount: observedAgencyCount(data, observedIds),
    geographyCoverage: context.geography_coverage ?? {
      included: 0,
      total: observedIds.length,
      pct: 0,
    },
    targetPricePerM2: formatTargetPricePerM2(scenario),
    statuses: {
      geography: geographyStatus(context, artifact.status),
      comparability: comparabilityStatus(context),
      price: priceStatus(context),
    },
    artifact,
    canonicalUrl: String(canonicalUrl ?? ""),
    announcement: String(announcement ?? ""),
    mobileNavOpen: Boolean(mobileNavOpen),
    loading: artifact.status === "loading",
  };
}

function districtOptions(model) {
  return model.districts
    .map(
      (district) => `
        <option
          value="${escapeAttribute(district.district_id)}"
          ${district.district_id === model.scenario.district_id ? "selected" : ""}
        >${escapeHtml(district.name)}</option>`,
    )
    .join("");
}

function scopeButton(model, mode, label, descriptionId = null) {
  const selected = model.scenario.scope_mode === mode;
  const disabled =
    model.loading ||
    (mode === "quadrant" &&
      (!model.district.high_load || model.district.quadrants.length === 0));
  return `
    <button
      class="scenario-segment ${selected ? "is-selected" : ""}"
      id="scenario-scope-${escapeAttribute(mode)}"
      type="button"
      data-scenario-scope="${escapeAttribute(mode)}"
      aria-pressed="${selected}"
      ${descriptionId ? `aria-describedby="${escapeAttribute(descriptionId)}"` : ""}
      ${disabled ? "disabled" : ""}
    >${escapeHtml(label)}</button>
  `;
}

function quadrantControl(model) {
  if (model.scenario.scope_mode !== "quadrant") return "";
  const quadrants = [...model.district.quadrants].sort(
    (left, right) =>
      QUADRANT_ORDER.indexOf(left.quadrant_id) -
      QUADRANT_ORDER.indexOf(right.quadrant_id),
  );
  return `
    <fieldset class="scenario-dependent" aria-describedby="scenario-quadrant-method">
      <legend>Cuadrante analítico</legend>
      <div class="scenario-segments scenario-segments--quadrants">
        ${quadrants
          .map((quadrant) => {
            const selected =
              model.scenario.quadrant_id === quadrant.quadrant_id;
            const count = quadrant.observed_project_ids?.length ?? 0;
            return `
              <button
                class="scenario-segment ${selected ? "is-selected" : ""}"
                id="scenario-quadrant-${escapeAttribute(quadrant.quadrant_id.toLowerCase())}"
                type="button"
                data-scenario-quadrant="${escapeAttribute(quadrant.quadrant_id)}"
                aria-pressed="${selected}"
                ${model.loading ? "disabled" : ""}
              >
                <span>${escapeHtml(
                  quadrant.label ??
                    QUADRANT_LABELS[quadrant.quadrant_id] ??
                    quadrant.quadrant_id,
                )}</span>
                <small>${formatNumber(count)} proyectos</small>
              </button>`;
          })
          .join("")}
      </div>
      <p id="scenario-quadrant-method">
        División creada para analizar la muestra; no representa una microzona oficial.
      </p>
    </fieldset>
  `;
}

function radiusControl(model) {
  if (model.scenario.scope_mode !== "radius") return "";
  const radii = [500, 1000, 1500];
  return `
    <fieldset class="scenario-dependent" aria-describedby="scenario-radius-origin">
      <legend>Radio desde el punto Viva</legend>
      <div class="scenario-segments scenario-segments--radius">
        ${radii
          .map((radius) => {
            const selected = model.scenario.radius_meters === radius;
            return `
              <button
                class="scenario-segment ${selected ? "is-selected" : ""}"
                id="scenario-radius-${radius}"
                type="button"
                data-scenario-radius="${radius}"
                aria-pressed="${selected}"
                ${model.loading ? "disabled" : ""}
              >${escapeHtml(formatRadius(radius))}</button>`;
          })
          .join("")}
      </div>
      <p id="scenario-radius-origin">
        Centro observado del distrito:
        ${formatNumber(model.scenario.center_latitude, 6)},
        ${formatNumber(model.scenario.center_longitude, 6)}.
      </p>
    </fieldset>
  `;
}

function dependentControl(model) {
  if (model.scenario.scope_mode === "quadrant") {
    return quadrantControl(model);
  }
  if (model.scenario.scope_mode === "radius") {
    return radiusControl(model);
  }
  return `
    <p class="scenario-dependent-note">
      El alcance incluye el distrito completo.
    </p>
  `;
}

export function renderScenarioSidebar(
  model,
  options = {},
) {
  const editorOpen = options.editorOpen ?? model.editorOpen ?? true;
  const modal = options.modal ?? model.editorModal ?? false;
  return `
    <section
      class="scenario-sidebar"
      aria-labelledby="scenario-sidebar-title"
      ${model.loading ? 'aria-busy="true"' : ""}
    >
      <div class="scenario-sidebar__heading">
        <div>
          <span>Escenario</span>
          <strong id="scenario-sidebar-title">${escapeHtml(model.scopeTitle)}</strong>
        </div>
        <span class="scenario-sidebar__count">${formatNumber(model.comparableCount)} comparables</span>
      </div>

      <button
        class="scenario-editor-trigger"
        id="scenario-editor-trigger"
        type="button"
        data-scenario-editor-open
        aria-controls="scenario-editor"
        aria-expanded="${editorOpen}"
        ${model.loading ? "disabled" : ""}
      >Cambiar escenario</button>

      <div
        class="scenario-editor"
        id="scenario-editor"
        role="dialog"
        aria-modal="${modal}"
        aria-labelledby="scenario-editor-title"
        ${editorOpen ? "" : "hidden"}
      >
          <div class="scenario-editor__heading">
            <div>
              <span>Escenario territorial</span>
              <h2 id="scenario-editor-title">Cambiar escenario</h2>
            </div>
            <button
              class="icon-button scenario-editor__close"
              id="scenario-editor-close"
              type="button"
              data-scenario-editor-close
              aria-label="Cerrar editor del escenario"
            >×</button>
          </div>

          <label class="field-control scenario-district" for="top-district">
            <span>Distrito objetivo</span>
            <select id="top-district" ${model.loading ? "disabled" : ""}>
              ${districtOptions(model)}
            </select>
          </label>

          <fieldset
            class="scenario-scope"
            aria-describedby="scenario-quadrant-availability"
          >
            <legend>Zona de análisis</legend>
            <div class="scenario-segments scenario-segments--scope">
              ${scopeButton(model, "district", "Distrito")}
              ${scopeButton(
                model,
                "quadrant",
                "Cuadrante",
                "scenario-quadrant-availability",
              )}
              ${scopeButton(model, "radius", "Radio")}
            </div>
            <p id="scenario-quadrant-availability">
              ${
                model.district.high_load && model.district.quadrants.length > 0
                  ? "Puedes analizar este distrito por cuadrantes."
                  : "Este distrito no tiene división por cuadrantes."
              }
            </p>
          </fieldset>

          ${dependentControl(model)}

          <div class="scenario-editor__actions">
            ${editorOpen ? `
              <button
                class="scenario-editor__compare"
                id="scenario-view-comparables"
                type="button"
                data-view="projects"
                data-scenario-action="view-comparables"
                data-focus-target="main-content"
                ${model.loading ? "disabled" : ""}
              >Ver comparables</button>
            ` : ""}
            <button
              class="scenario-reset"
              id="reset-scenario"
              type="button"
              data-scenario-action="reset"
              ${model.loading ? "disabled" : ""}
            >Reiniciar escenario</button>
          </div>
      </div>

      <p class="sr-only" aria-live="polite">
        ${editorOpen ? "Editor del escenario abierto." : ""}
      </p>
    </section>
  `;
}

export function renderScenarioBar(model, options = {}) {
  const editorOpen = options.editorOpen ?? model.editorOpen ?? false;
  return `
    <header
      class="topbar scenario-bar"
      aria-labelledby="scenario-view-title"
      ${model.loading ? 'aria-busy="true"' : ""}
    >
      <div class="topbar-heading scenario-bar__heading">
        <button
          class="icon-button menu-toggle"
          id="menu-toggle"
          type="button"
          aria-controls="primary-sidebar"
          aria-expanded="${model.mobileNavOpen}"
          aria-label="Abrir menú principal"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M4 7h16M4 12h16M4 17h16"></path>
          </svg>
        </button>
        <div>
          <div class="title-row">
            <h1 id="scenario-view-title">${escapeHtml(model.view.label)}</h1>
            <span class="view-context">${escapeHtml(model.view.hint)}</span>
          </div>
        </div>
      </div>

      <button
        class="scenario-bar__active"
        id="scenario-topbar-editor-trigger"
        type="button"
        data-scenario-editor-open
        aria-controls="scenario-editor"
        aria-expanded="${editorOpen}"
        aria-label="Cambiar escenario: ${escapeAttribute(model.scopeTitle)}"
      >
        <span>Escenario activo</span>
        <strong>${escapeHtml(model.scopeTitle)}</strong>
      </button>
    </header>
  `;
}

function statusMarkup(status, axis) {
  return `
    <div class="scenario-status scenario-status--${escapeAttribute(status.tone)}">
      <span class="scenario-status__mark" aria-hidden="true">${escapeHtml(status.symbol)}</span>
      <span>
        <strong>${escapeHtml(status.label)}</strong>
        <small>${escapeHtml(status.detail)}</small>
      </span>
      <span class="sr-only">Estado de ${escapeHtml(axis)}.</span>
    </div>
  `;
}

function correctionAlert(model) {
  if (model.scenarioStatus !== "invalid") return "";
  const corrections = model.corrections.length
    ? model.corrections
    : ["Ajustamos valores que no pertenecen al escenario permitido."];
  return `
    <div class="scenario-correction" id="scenario-correction" role="status">
      <div>
        <strong>Ajustamos parte del escenario compartido</strong>
        <p>Revisa los cambios aplicados antes de continuar.</p>
      </div>
      <ul>
        ${corrections.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function loadingSummary(model) {
  return `
    <section
      class="scenario-summary scenario-summary--loading"
      aria-labelledby="scenario-summary-title"
      aria-busy="true"
    >
      <div class="scenario-summary__heading">
        <div>
          <p class="scenario-summary__kicker">Lente territorial</p>
          <h2 id="scenario-summary-title">Preparando escenario geográfico</h2>
        </div>
        <span class="scenario-loading-pulse" aria-hidden="true"></span>
      </div>
      <p>
        Verificando la geometría versionada antes de habilitar el análisis.
      </p>
      <div class="scenario-skeleton" aria-hidden="true">
        <span></span><span></span><span></span><span></span>
      </div>
      <p class="sr-only" aria-live="polite" aria-atomic="true">
        ${escapeHtml(model.announcement || "Preparando escenario geográfico.")}
      </p>
    </section>
  `;
}

export function renderScenarioSummary(model) {
  if (model.loading) return loadingSummary(model);
  const coverage = model.geographyCoverage;
  return `
    <section
      class="scenario-summary"
      aria-labelledby="scenario-summary-title"
    >
      ${correctionAlert(model)}
      <div class="scenario-summary__heading">
        <div>
          <p class="scenario-summary__kicker">Lectura del escenario</p>
          <h2 id="scenario-summary-title">${escapeHtml(model.scopeTitle)}</h2>
        </div>
      </div>

      <dl class="scenario-summary__metrics">
        <div>
          <dt>Oferta observada</dt>
          <dd>${formatNumber(model.observedCount)}</dd>
        </div>
        <div>
          <dt>Proyectos comparables</dt>
          <dd>${formatNumber(model.comparableCount)}</dd>
        </div>
        <div>
          <dt>Fuera o por revisar</dt>
          <dd>${formatNumber(model.reviewCount)}</dd>
        </div>
      </dl>

      <details class="scenario-technical">
        <summary>Ver detalle técnico</summary>
        <div class="scenario-technical__body">
          <dl class="scenario-technical__facts">
            <div><dt>Corte de datos</dt><dd>${escapeHtml(model.cutoffLabel)}</dd></div>
            <div><dt>Inmobiliarias observadas</dt><dd>${formatNumber(model.agencyCount)}</dd></div>
            <div>
              <dt>Cobertura geográfica</dt>
              <dd>${formatNumber(coverage.included)}/${formatNumber(coverage.total)} · ${formatNumber(coverage.pct, 1)}%</dd>
            </div>
            <div><dt>Precio objetivo / m²</dt><dd>${escapeHtml(model.targetPricePerM2)}</dd></div>
          </dl>
          <div class="scenario-summary__statuses" aria-label="Calidad del escenario">
            ${statusMarkup(model.statuses.geography, "geografía")}
            ${statusMarkup(model.statuses.comparability, "comparabilidad")}
            ${statusMarkup(model.statuses.price, "precio")}
          </div>
          <div class="scenario-share">
            <span>URL reproducible del escenario</span>
            <output id="scenario-canonical-url">${escapeHtml(model.canonicalUrl)}</output>
          </div>
        </div>
      </details>

      <p
        class="sr-only"
        id="scenario-live"
        aria-live="polite"
        aria-atomic="true"
      >${escapeHtml(model.announcement)}</p>
    </section>
  `;
}

function bytesToHex(value) {
  const bytes =
    value instanceof Uint8Array ? value : new Uint8Array(value);
  return [...bytes]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function defaultDigest(bytes) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto SHA-256 is unavailable");
  }
  return globalThis.crypto.subtle.digest("SHA-256", bytes);
}

function artifactResult({
  status,
  url = null,
  expectedSha256 = null,
  actualSha256 = null,
  geojson = null,
  reason,
}) {
  return {
    status,
    url,
    expected_sha256: expectedSha256,
    actual_sha256: actualSha256,
    geojson: status === "valid" ? geojson : null,
    reason,
  };
}

function validateGeoJson(geojson, districts) {
  if (
    geojson?.type !== "FeatureCollection" ||
    !Array.isArray(geojson.features)
  ) {
    return false;
  }
  const expectedIds = districts
    .map((district) => Number(district.osm_relation_id))
    .filter(Number.isFinite)
    .sort((left, right) => left - right);
  const actualIds = [];
  for (const feature of geojson.features) {
    if (
      feature?.type !== "Feature" ||
      !["Polygon", "MultiPolygon"].includes(feature.geometry?.type)
    ) {
      return false;
    }
    const relationId = Number(feature.properties?.osm_id);
    if (!Number.isFinite(relationId)) return false;
    actualIds.push(relationId);
  }
  actualIds.sort((left, right) => left - right);
  return (
    actualIds.length === expectedIds.length &&
    new Set(actualIds).size === actualIds.length &&
    actualIds.every((id, index) => id === expectedIds[index])
  );
}

export async function loadBoundaryArtifact({
  geography,
  baseUrl,
  fetchImpl = globalThis.fetch,
  digestImpl = defaultDigest,
} = {}) {
  const reference = geography?.boundary_artifact_path;
  const expectedSha256 = String(
    geography?.boundary_artifact_sha256 ?? "",
  ).toLowerCase();
  if (
    typeof reference !== "string" ||
    reference.trim() === "" ||
    !/^[a-f0-9]{64}$/.test(expectedSha256)
  ) {
    return artifactResult({
      status: "missing",
      expectedSha256: expectedSha256 || null,
      reason: "reference_missing",
    });
  }

  let base;
  let artifactUrl;
  try {
    base = new URL(String(baseUrl));
    artifactUrl = new URL(reference, base);
  } catch {
    return artifactResult({
      status: "missing",
      expectedSha256,
      reason: "reference_invalid",
    });
  }
  if (
    !["http:", "https:"].includes(base.protocol) ||
    artifactUrl.origin !== base.origin
  ) {
    return artifactResult({
      status: "missing",
      url: artifactUrl.href,
      expectedSha256,
      reason: "reference_not_same_origin",
    });
  }
  if (typeof fetchImpl !== "function") {
    return artifactResult({
      status: "missing",
      url: artifactUrl.href,
      expectedSha256,
      reason: "fetch_unavailable",
    });
  }

  let response;
  try {
    response = await fetchImpl(artifactUrl.href, {
      cache: "no-store",
      credentials: "same-origin",
      redirect: "error",
    });
  } catch {
    return artifactResult({
      status: "missing",
      url: artifactUrl.href,
      expectedSha256,
      reason: "fetch_failed",
    });
  }
  if (!response?.ok || typeof response.arrayBuffer !== "function") {
    return artifactResult({
      status: "missing",
      url: artifactUrl.href,
      expectedSha256,
      reason: "response_unavailable",
    });
  }

  let bytes;
  let actualSha256;
  try {
    bytes = await response.arrayBuffer();
    actualSha256 = bytesToHex(await digestImpl(bytes));
  } catch {
    return artifactResult({
      status: "parse_error",
      url: artifactUrl.href,
      expectedSha256,
      reason: "digest_failed",
    });
  }
  if (actualSha256 !== expectedSha256) {
    return artifactResult({
      status: "hash_mismatch",
      url: artifactUrl.href,
      expectedSha256,
      actualSha256,
      reason: "hash_mismatch",
    });
  }

  let geojson;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    geojson = JSON.parse(text);
  } catch {
    return artifactResult({
      status: "parse_error",
      url: artifactUrl.href,
      expectedSha256,
      actualSha256,
      reason: "content_invalid",
    });
  }
  if (!validateGeoJson(geojson, geography.districts ?? [])) {
    return artifactResult({
      status: "parse_error",
      url: artifactUrl.href,
      expectedSha256,
      actualSha256,
      reason: "geojson_contract_invalid",
    });
  }
  return artifactResult({
    status: "valid",
    url: artifactUrl.href,
    expectedSha256,
    actualSha256,
    geojson,
    reason: null,
  });
}
