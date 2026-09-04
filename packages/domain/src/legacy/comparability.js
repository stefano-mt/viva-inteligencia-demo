const WEIGHTS = Object.freeze({
  geography: 30,
  area: 20,
  bedrooms: 15,
  typology: 10,
  delivery: 10,
  price_per_m2: 15,
});

const PRICE_METHODOLOGY =
  "Escenario estimado frente a precios de lista publicados. No representa precios reales de cierre.";

export const COMPARABILITY_WEIGHTS = WEIGHTS;

export function roundHalfAwayFromZero(value, decimals = 1) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  const magnitude = Math.round((Math.abs(value) + Number.EPSILON) * factor) / factor;
  return Object.is(value, -0) || value < 0 ? -magnitude : magnitude;
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function positiveNumber(value) {
  const number = finiteNumber(value);
  return number !== null && number > 0 ? number : null;
}

function integerNumber(value) {
  const number = finiteNumber(value);
  return number !== null && Number.isInteger(number) ? number : null;
}

function isAll(value) {
  if (value === null || value === undefined || value === "") return true;
  const normalized = String(value).trim().toLowerCase();
  return normalized === "all" || normalized === "todos" || normalized === "todas";
}

function normalizedText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function normalizeTypology(value) {
  const normalized = normalizedText(value);
  const aliases = {
    departamento: "departamento",
    departamentos: "departamento",
    depa: "departamento",
    flat: "departamento",
    casa: "casa",
    casas: "casa",
    duplex: "duplex",
    triplex: "triplex",
    loft: "loft",
  };
  return aliases[normalized] ?? normalized;
}

function scenarioValue(scenario, ...keys) {
  for (const key of keys) {
    if (scenario?.[key] !== undefined && scenario[key] !== null) return scenario[key];
  }
  return null;
}

function projectValue(project, ...keys) {
  for (const key of keys) {
    if (project?.[key] !== undefined && project[key] !== null) return project[key];
  }
  return null;
}

function unavailableComponent(key, weight, explanation, factsUsed = []) {
  return {
    key,
    maximum_weight: weight,
    available_weight: 0,
    earned_points: 0,
    explanation,
    facts_used: factsUsed,
  };
}

function availableComponent(key, weight, earnedPoints, explanation, factsUsed = []) {
  return {
    key,
    maximum_weight: weight,
    available_weight: weight,
    earned_points: roundHalfAwayFromZero(earnedPoints, 1),
    explanation,
    facts_used: factsUsed,
  };
}

function targetPricePerM2(scenario) {
  const explicit = positiveNumber(
    scenarioValue(scenario, "target_price_per_m2", "targetPricePerM2"),
  );
  if (explicit !== null) return explicit;

  const price = positiveNumber(
    scenarioValue(scenario, "target_price_pen", "targetPricePen", "target_price"),
  );
  const area = positiveNumber(
    scenarioValue(scenario, "target_area_m2", "targetAreaM2", "target_area"),
  );
  return price !== null && area !== null ? price / area : null;
}

function bedroomRange(project) {
  const exact = integerNumber(projectValue(project, "bedrooms", "bedroom_count"));
  const minimum =
    integerNumber(projectValue(project, "bedrooms_min", "bedroom_min")) ?? exact;
  const maximum =
    integerNumber(projectValue(project, "bedrooms_max", "bedroom_max")) ?? exact;
  return minimum !== null && maximum !== null && minimum <= maximum
    ? { minimum, maximum }
    : null;
}

export function calculateComparabilityScore({
  project,
  scenario,
  distanceMeters = null,
} = {}) {
  if (!project || !scenario) {
    throw new TypeError("project and scenario are required");
  }

  const components = {};
  const scopeMode = normalizedText(
    scenarioValue(scenario, "scope_mode", "scopeMode", "geography_mode"),
  );

  if (scopeMode === "radius" || scopeMode === "radio") {
    const distance = finiteNumber(distanceMeters);
    const radius = positiveNumber(
      scenarioValue(scenario, "radius_meters", "radiusMeters", "radius"),
    );
    components.geography =
      distance !== null && distance >= 0 && radius !== null
        ? availableComponent(
            "geography",
            WEIGHTS.geography,
            WEIGHTS.geography * Math.max(0, 1 - distance / radius),
            "Proximidad dentro del radio territorial precomputado.",
            ["territorialContext.distance_meters_by_observed_project_id", "scenario.radius_meters"],
          )
        : unavailableComponent(
            "geography",
            WEIGHTS.geography,
            "No existe distancia territorial precomputada compatible.",
            ["territorialContext.distance_meters_by_observed_project_id"],
          );
  } else if (
    scopeMode === "district" ||
    scopeMode === "distrito" ||
    scopeMode === "quadrant" ||
    scopeMode === "cuadrante"
  ) {
    components.geography = availableComponent(
      "geography",
      WEIGHTS.geography,
      WEIGHTS.geography,
      "El proyecto pertenece al ámbito territorial validado.",
      ["territorialContext.geography_valid_project_ids"],
    );
  } else {
    components.geography = unavailableComponent(
      "geography",
      WEIGHTS.geography,
      "El modo territorial no permite puntuar geografía.",
      ["scenario.scope_mode"],
    );
  }

  const targetArea = positiveNumber(
    scenarioValue(scenario, "target_area_m2", "targetAreaM2", "target_area"),
  );
  const projectArea = positiveNumber(projectValue(project, "total_area"));
  components.area =
    targetArea !== null && projectArea !== null
      ? availableComponent(
          "area",
          WEIGHTS.area,
          WEIGHTS.area * Math.max(0, 1 - Math.abs(projectArea - targetArea) / targetArea),
          "Similitud de área total publicada frente al área objetivo.",
          ["project.total_area", "scenario.target_area_m2"],
        )
      : unavailableComponent(
          "area",
          WEIGHTS.area,
          "Falta un área total puntual positiva; no se usa el punto medio de rangos.",
          ["project.total_area", "scenario.target_area_m2"],
        );

  const targetBedrooms = integerNumber(
    scenarioValue(scenario, "bedrooms", "target_bedrooms", "targetBedrooms"),
  );
  const range = bedroomRange(project);
  components.bedrooms =
    targetBedrooms !== null && range !== null
      ? availableComponent(
          "bedrooms",
          WEIGHTS.bedrooms,
          targetBedrooms >= range.minimum && targetBedrooms <= range.maximum
            ? WEIGHTS.bedrooms
            : 0,
          "Coincidencia del dormitorio objetivo con el valor o rango publicado.",
          ["project.bedrooms_min", "project.bedrooms_max", "scenario.bedrooms"],
        )
      : unavailableComponent(
          "bedrooms",
          WEIGHTS.bedrooms,
          "No hay dormitorios compatibles para comparar.",
          ["project.bedrooms_min", "project.bedrooms_max", "scenario.bedrooms"],
        );

  const targetTypologyRaw = scenarioValue(
    scenario,
    "typology",
    "target_typology",
    "targetTypology",
  );
  const projectTypology = normalizeTypology(projectValue(project, "typology"));
  components.typology =
    !isAll(targetTypologyRaw) && projectTypology
      ? availableComponent(
          "typology",
          WEIGHTS.typology,
          normalizeTypology(targetTypologyRaw) === projectTypology ? WEIGHTS.typology : 0,
          "Coincidencia de tipología normalizada.",
          ["project.typology", "scenario.typology"],
        )
      : unavailableComponent(
          "typology",
          WEIGHTS.typology,
          "No hay una tipología objetivo y publicada comparable.",
          ["project.typology", "scenario.typology"],
        );

  const targetDelivery = integerNumber(
    scenarioValue(scenario, "delivery_year", "target_delivery_year", "deliveryYear"),
  );
  const projectDelivery = integerNumber(
    projectValue(project, "delivery_year", "project_delivery_year"),
  );
  if (targetDelivery !== null && projectDelivery !== null) {
    const difference = Math.abs(projectDelivery - targetDelivery);
    components.delivery = availableComponent(
      "delivery",
      WEIGHTS.delivery,
      difference === 0 ? 10 : difference === 1 ? 5 : 0,
      "Cercanía del año de entrega publicado al año objetivo.",
      ["project.delivery_year", "scenario.delivery_year"],
    );
  } else {
    components.delivery = unavailableComponent(
      "delivery",
      WEIGHTS.delivery,
      "No hay años de entrega compatibles para comparar.",
      ["project.delivery_year", "scenario.delivery_year"],
    );
  }

  const targetPpm = targetPricePerM2(scenario);
  const projectPpm = positiveNumber(projectValue(project, "price_per_m2_list"));
  components.price_per_m2 =
    targetPpm !== null && projectPpm !== null
      ? availableComponent(
          "price_per_m2",
          WEIGHTS.price_per_m2,
          WEIGHTS.price_per_m2 *
            Math.max(0, 1 - Math.abs(projectPpm - targetPpm) / targetPpm),
          "Similitud del precio de lista por m² frente al escenario.",
          ["project.price_per_m2_list", "scenario.target_price_per_m2"],
        )
      : unavailableComponent(
          "price_per_m2",
          WEIGHTS.price_per_m2,
          "No hay precios de lista por m² positivos y compatibles.",
          ["project.price_per_m2_list", "scenario.target_price_per_m2"],
        );

  const componentList = Object.values(components);
  const availableWeight = componentList.reduce(
    (total, component) => total + component.available_weight,
    0,
  );
  const rawPoints = componentList.reduce(
    (total, component) => total + component.earned_points,
    0,
  );
  const score =
    availableWeight > 0 ? roundHalfAwayFromZero((rawPoints / availableWeight) * 100, 1) : 0;
  const evidenceCoverage = roundHalfAwayFromZero(availableWeight, 1) ?? 0;
  const evidenceLabel =
    evidenceCoverage < 60
      ? "Orientativa"
      : score >= 80
        ? "Alta"
        : score >= 60
          ? "Media"
          : "Baja";

  return {
    score,
    raw_points: roundHalfAwayFromZero(rawPoints, 1) ?? 0,
    available_weight: evidenceCoverage,
    evidence_coverage: evidenceCoverage,
    evidence_coverage_pct: evidenceCoverage,
    evidence_label: evidenceLabel,
    components,
  };
}

export function compareComparableScores(left, right) {
  const scoreDifference = (finiteNumber(right?.score) ?? 0) - (finiteNumber(left?.score) ?? 0);
  if (scoreDifference !== 0) return scoreDifference;

  const coverageDifference =
    (finiteNumber(right?.available_weight ?? right?.evidence_coverage_pct) ?? 0) -
    (finiteNumber(left?.available_weight ?? left?.evidence_coverage_pct) ?? 0);
  if (coverageDifference !== 0) return coverageDifference;

  const leftDistance = finiteNumber(left?.distance_meters);
  const rightDistance = finiteNumber(right?.distance_meters);
  if (leftDistance !== null && rightDistance !== null && leftDistance !== rightDistance) {
    return leftDistance - rightDistance;
  }
  if (leftDistance !== null && rightDistance === null) return -1;
  if (leftDistance === null && rightDistance !== null) return 1;

  return String(left?.project_id ?? "").localeCompare(String(right?.project_id ?? ""), "en");
}

function missingRequiredFields(project) {
  const value = projectValue(project, "missing_required_fields");
  return Array.isArray(value) ? value.map(normalizedText) : [];
}

function validSourceUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function evaluatePriceEligibility({ project, cutoffAt } = {}) {
  if (!project) throw new TypeError("project is required");
  const reasons = [];
  const listPrice = positiveNumber(projectValue(project, "list_price_avg"));
  const totalArea = positiveNumber(projectValue(project, "total_area"));
  const publishedPpm = positiveNumber(projectValue(project, "price_per_m2_list"));
  const currency = String(projectValue(project, "currency") ?? "").trim().toUpperCase();
  const sourceUrl = projectValue(project, "source_url");
  const capturedAtRaw = projectValue(project, "captured_at");
  const capturedAt = Date.parse(String(capturedAtRaw ?? ""));
  const cutoff = Date.parse(String(cutoffAt ?? ""));
  const denominator = normalizedText(
    projectValue(project, "price_per_m2_denominator", "area_denominator"),
  );

  if (currency !== "PEN") reasons.push("currency_incompatible");
  if (listPrice === null) reasons.push("list_price_unavailable");
  if (totalArea === null) reasons.push("total_area_unavailable");
  if (publishedPpm === null) reasons.push("price_per_m2_unavailable");
  if (!validSourceUrl(sourceUrl)) reasons.push("source_url_unavailable");
  if (!Number.isFinite(capturedAt)) reasons.push("captured_at_invalid");
  if (!Number.isFinite(cutoff)) reasons.push("cutoff_invalid");
  if (Number.isFinite(capturedAt) && Number.isFinite(cutoff) && capturedAt > cutoff) {
    reasons.push("captured_after_cutoff");
  }
  if (denominator && denominator !== "total" && denominator !== "total area") {
    reasons.push("price_semantics_incompatible");
  }

  if (
    missingRequiredFields(project).some(
      (field) =>
        field.includes("price") ||
        field.includes("precio") ||
        field.includes("area") ||
        field.includes("m2"),
    )
  ) {
    reasons.push("missing_price_or_area_evidence");
  }

  let expectedPricePerM2 = null;
  let relativeDifference = null;
  if (listPrice !== null && totalArea !== null && publishedPpm !== null) {
    expectedPricePerM2 = listPrice / totalArea;
    relativeDifference = Math.abs(publishedPpm - expectedPricePerM2) / expectedPricePerM2;
    if (relativeDifference > 0.005) reasons.push("price_per_m2_inconsistent");
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    expected_price_per_m2: expectedPricePerM2,
    relative_difference: relativeDifference,
  };
}

export function isEligiblePriceReference(input) {
  return evaluatePriceEligibility(input).eligible;
}

export function quantileR7(values, probability) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const p = finiteNumber(probability);
  if (p === null || p < 0 || p > 1) return null;
  const sorted = values.map(finiteNumber).filter((value) => value !== null).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0];

  const position = (sorted.length - 1) * p;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const fraction = position - lowerIndex;
  return sorted[lowerIndex] + fraction * (sorted[upperIndex] - sorted[lowerIndex]);
}

export function buildPriceDiagnosis({
  priceReferenceProjects = [],
  targetPricePerM2: targetPpmInput = null,
} = {}) {
  const values = priceReferenceProjects
    .map((project) =>
      typeof project === "number"
        ? positiveNumber(project)
        : positiveNumber(projectValue(project, "price_per_m2_list")),
    )
    .filter((value) => value !== null);
  const targetPpm = positiveNumber(targetPpmInput);
  const base = {
    reference_count: values.length,
    methodology: PRICE_METHODOLOGY,
  };

  if (values.length < 3) {
    return {
      ...base,
      status: "insufficient",
      p25: null,
      median: null,
      p75: null,
      target_price_per_m2: targetPpm,
      position: null,
      absolute_difference_from_median: null,
      relative_difference_from_median_pct: null,
    };
  }

  const p25 = quantileR7(values, 0.25);
  const median = quantileR7(values, 0.5);
  const p75 = quantileR7(values, 0.75);
  let position = null;
  if (targetPpm !== null) {
    position = targetPpm < p25 ? "Entrada" : targetPpm <= p75 ? "Alineado" : "Premium";
  }
  const absoluteDifference = targetPpm !== null ? targetPpm - median : null;
  const relativeDifference =
    absoluteDifference !== null && median > 0 ? (absoluteDifference / median) * 100 : null;

  return {
    ...base,
    status: "ready",
    p25,
    median,
    p75,
    target_price_per_m2: targetPpm,
    position,
    absolute_difference_from_median:
      absoluteDifference === null ? null : roundHalfAwayFromZero(absoluteDifference, 2),
    relative_difference_from_median_pct:
      relativeDifference === null ? null : roundHalfAwayFromZero(relativeDifference, 1),
  };
}

function observedProjectId(project) {
  const explicit = projectValue(project, "observed_project_id");
  if (typeof explicit === "string" && explicit) return explicit;
  const id = projectValue(project, "id");
  return id === null ? null : `observed:nexo-${id}`;
}

function expectedAuthoritativeProjectId(project) {
  const explicit = projectValue(project, "authoritative_project_id", "project_id");
  if (typeof explicit === "string" && explicit.startsWith("project:")) return explicit;
  const id = projectValue(project, "id");
  return id === null ? null : `project:nexo-${id}`;
}

function asSet(value) {
  if (value instanceof Set) return value;
  return new Set(Array.isArray(value) ? value : []);
}

function getDistance(distanceMap, observedId) {
  const value =
    distanceMap instanceof Map ? distanceMap.get(observedId) : distanceMap?.[observedId];
  const distance = finiteNumber(value);
  return distance !== null && distance >= 0 ? distance : null;
}

function resolveAuthoritativeId(project, observedId, territorialContext, authoritativeSet) {
  const mapping = territorialContext?.authoritative_project_id_by_observed_project_id;
  const mapped = mapping instanceof Map ? mapping.get(observedId) : mapping?.[observedId];
  if (
    typeof mapped === "string" &&
    mapped.startsWith("project:") &&
    authoritativeSet.has(mapped)
  ) {
    return mapped;
  }

  const expected = expectedAuthoritativeProjectId(project);
  if (expected && authoritativeSet.has(expected)) {
    return expected;
  }
  return null;
}

function productEligibility(project, scenario) {
  const reasons = [];
  const targetTypology = scenarioValue(
    scenario,
    "typology",
    "target_typology",
    "targetTypology",
  );
  if (
    !isAll(targetTypology) &&
    normalizeTypology(projectValue(project, "typology")) &&
    normalizeTypology(projectValue(project, "typology")) !== normalizeTypology(targetTypology)
  ) {
    reasons.push("typology_mismatch");
  }

  const targetBedrooms = scenarioValue(
    scenario,
    "bedrooms",
    "target_bedrooms",
    "targetBedrooms",
  );
  if (!isAll(targetBedrooms)) {
    const target = integerNumber(targetBedrooms);
    const range = bedroomRange(project);
    if (target !== null && range !== null && (target < range.minimum || target > range.maximum)) {
      reasons.push("bedrooms_mismatch");
    }
  }

  const targetDelivery = scenarioValue(
    scenario,
    "delivery_year",
    "target_delivery_year",
    "deliveryYear",
  );
  if (!isAll(targetDelivery)) {
    const target = integerNumber(targetDelivery);
    const actual = integerNumber(projectValue(project, "delivery_year"));
    if (target !== null && actual !== null && target !== actual) {
      reasons.push("delivery_mismatch");
    }
  }
  return reasons;
}

function exclusion(projectId, stage, reason, details = []) {
  return {
    project_id: projectId,
    stage,
    reason,
    details,
    blocked_fields: details,
    visible_as_coverage: true,
  };
}

export function buildComparabilityContext({
  territorialContext,
  scenario: scenarioInput = null,
  scenarioState = null,
  projects = [],
  cutoffAt,
  cutoff_at: cutoffAtAlias,
  authoritativeProjectIds = null,
} = {}) {
  const scenario =
    scenarioInput ?? scenarioState?.scenario ?? territorialContext?.scenario ?? null;
  const effectiveCutoffAt = cutoffAt ?? cutoffAtAlias;
  if (!territorialContext || !scenario || !Array.isArray(projects)) {
    throw new TypeError("territorialContext, scenario and projects are required");
  }

  const geographyValid = asSet(territorialContext.geography_valid_project_ids);
  const authoritativeInput =
    authoritativeProjectIds ?? territorialContext.authoritative_project_ids;
  if (!(authoritativeInput instanceof Set) && !Array.isArray(authoritativeInput)) {
    throw new TypeError(
      "authoritativeProjectIds must be an array or Set of canonical project IDs",
    );
  }
  const authoritativeSet = asSet(authoritativeInput);
  const distanceMap =
    territorialContext.distance_meters_by_observed_project_id ?? Object.create(null);
  const scored = [];
  const priceReferenceRows = [];
  const excludedProjects = [];
  const projectsByObservedId = new Map();

  for (const project of projects) {
    const observedId = observedProjectId(project);
    if (observedId && !projectsByObservedId.has(observedId)) {
      projectsByObservedId.set(observedId, project);
    }
  }

  for (const observedId of [...geographyValid].sort((left, right) =>
    String(left).localeCompare(String(right), "en"),
  )) {
    const project = projectsByObservedId.get(observedId);
    if (!project) {
      excludedProjects.push(exclusion(observedId, "reconciliation", "not_reconciled"));
      continue;
    }

    const projectId = resolveAuthoritativeId(
      project,
      observedId,
      territorialContext,
      authoritativeSet,
    );
    if (!projectId) {
      excludedProjects.push(
        exclusion(observedId, "reconciliation", "not_reconciled"),
      );
      continue;
    }

    const productReasons = productEligibility(project, scenario);
    if (productReasons.length > 0) {
      excludedProjects.push(
        exclusion(projectId, "product", productReasons[0], productReasons),
      );
      continue;
    }

    const distanceMeters = getDistance(distanceMap, observedId);
    const result = calculateComparabilityScore({
      project,
      scenario,
      distanceMeters,
    });
    const record = {
      project_id: projectId,
      observed_project_id: observedId,
      distance_meters: distanceMeters,
      ...result,
    };
    scored.push(record);

    const priceEligibility = evaluatePriceEligibility({
      project,
      cutoffAt: effectiveCutoffAt,
    });
    if (priceEligibility.eligible) {
      priceReferenceRows.push({ project_id: projectId, project });
    } else {
      const semanticReason = priceEligibility.reasons.some(
        (reason) =>
          reason === "currency_incompatible" ||
          reason === "price_semantics_incompatible" ||
          reason === "price_per_m2_inconsistent",
      );
      excludedProjects.push(
        exclusion(
          projectId,
          "price",
          semanticReason ? "price_semantics_incompatible" : "price_unavailable",
          priceEligibility.reasons,
        ),
      );
    }
  }

  scored.sort(compareComparableScores);
  const rank = new Map(scored.map((record, index) => [record.project_id, index]));
  priceReferenceRows.sort(
    (left, right) =>
      (rank.get(left.project_id) ?? Number.MAX_SAFE_INTEGER) -
        (rank.get(right.project_id) ?? Number.MAX_SAFE_INTEGER) ||
      left.project_id.localeCompare(right.project_id, "en"),
  );

  const comparableProjectIds = scored.map((record) => record.project_id);
  const evidenceCoverage =
    scored.length === 0
      ? 0
      : roundHalfAwayFromZero(
          scored.reduce((total, record) => total + record.available_weight, 0) /
            scored.length,
          1,
        );
  const comparabilityStatus =
    scored.length === 0
      ? "insufficient"
      : scored.length < 3 || evidenceCoverage < 60
        ? "orientative"
        : "ready";
  const priceDiagnosis = buildPriceDiagnosis({
    priceReferenceProjects: priceReferenceRows.map(({ project }) => project),
    targetPricePerM2: targetPricePerM2(scenario),
  });
  excludedProjects.sort(
    (left, right) =>
      String(left.project_id).localeCompare(String(right.project_id), "en") ||
      String(left.stage).localeCompare(String(right.stage), "en") ||
      String(left.reason).localeCompare(String(right.reason), "en"),
  );

  return {
    comparable_project_ids: comparableProjectIds,
    price_reference_project_ids: priceReferenceRows.map(({ project_id }) => project_id),
    comparability_status: comparabilityStatus,
    price_status: priceDiagnosis.status,
    evidence_coverage_pct: evidenceCoverage ?? 0,
    comparable_scores: scored,
    price_diagnosis: priceDiagnosis,
    excluded_projects: excludedProjects,
  };
}
