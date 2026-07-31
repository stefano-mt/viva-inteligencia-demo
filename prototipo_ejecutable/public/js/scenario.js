export const SCENARIO_VERSION = 1;
export const EARTH_RADIUS_METERS = 6_371_008.8;
export const SUPPORTED_PUBLIC_CONTRACT_VERSIONS = Object.freeze([
  "2.1.0",
  "2.2.0",
  "2.3.0"
]);
export const SCENARIO_QUERY_ORDER = Object.freeze([
  "sv",
  "district",
  "scope",
  "quadrant",
  "lat",
  "lon",
  "radius",
  "typology",
  "bedrooms",
  "area",
  "price",
  "delivery",
  "viz"
]);

const PRODUCT_FIELDS = Object.freeze([
  "typology",
  "bedrooms",
  "target_area_m2",
  "target_price_pen",
  "delivery_year",
  "visualization"
]);
const KNOWN_PARAMETERS = new Set(SCENARIO_QUERY_ORDER);
const GEOGRAPHY_ARTIFACT_STATUSES = new Set([
  "valid",
  "missing",
  "hash_mismatch",
  "parse_error"
]);
const EXCLUSION_STAGE_ORDER = Object.freeze({
  scope: 0,
  geography: 1
});

function clone(value) {
  return structuredClone(value);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort(compareText);
}

function strictNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    (typeof value === "string" && !/^-?(?:\d+\.?\d*|\.\d+)$/.test(value))
  ) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function strictInteger(value) {
  const parsed = strictNumber(value);
  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}

function coordinatesInRange(latitude, longitude) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function validCoordinatePair(latitude, longitude) {
  return (
    coordinatesInRange(latitude, longitude) &&
    !(latitude === 0 && longitude === 0)
  );
}

function correction(code, field, recovery) {
  return Object.freeze({ code, field, recovery });
}

function createState(scenario, corrections = []) {
  return {
    scenario,
    scenario_status: corrections.length ? "invalid" : "valid",
    corrections
  };
}

function districtMap(environment) {
  return new Map(
    environment.geography.districts.map((district) => [
      district.district_id,
      district
    ])
  );
}

function assertCatalog(name, actual, expected = null) {
  if (!Array.isArray(actual) || actual.length === 0) {
    throw new Error(`Scenario catalog ${name} is missing or empty`);
  }
  if (expected && JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Scenario catalog ${name} does not match the supported F2 contract`
    );
  }
}

export function createScenarioEnvironment(data) {
  const contractVersion = data?.metadata?.contract_version;
  if (!SUPPORTED_PUBLIC_CONTRACT_VERSIONS.includes(contractVersion)) {
    throw new Error(
      "Scenario domain requires public contract 2.1.0 or 2.2.0"
    );
  }
  const catalogs = clone(data.scenario_catalogs);
  const defaults = clone(data.scenario_defaults);
  const geography = clone(data.geography);
  if (!catalogs || !defaults || !geography) {
    throw new Error(
      "The supported F2 contract must include scenario_catalogs, scenario_defaults and geography"
    );
  }
  assertCatalog("typologies", catalogs.typologies, [
    "all",
    "casa",
    "departamento",
    "lote",
    "oficina"
  ]);
  assertCatalog("bedrooms", catalogs.bedrooms);
  assertCatalog("delivery_years", catalogs.delivery_years);
  assertCatalog("scope_modes", catalogs.scope_modes, [
    "district",
    "quadrant",
    "radius"
  ]);
  assertCatalog("quadrants", catalogs.quadrants, ["NW", "NE", "SW", "SE"]);
  assertCatalog("radius_meters", catalogs.radius_meters, [500, 1000, 1500]);
  assertCatalog("visualizations", catalogs.visualizations, [
    "geographic",
    "positioning"
  ]);
  if (
    defaults.version !== SCENARIO_VERSION ||
    defaults.source !== "default" ||
    !Array.isArray(geography.districts) ||
    !Array.isArray(geography.assignments)
  ) {
    throw new Error(
      "Scenario defaults or geography do not match the supported F2 contract"
    );
  }
  const districtIds = new Set(
    geography.districts.map((district) => district.district_id)
  );
  if (!districtIds.has(defaults.district_id)) {
    throw new Error("Default district is not present in geography");
  }
  return Object.freeze({ catalogs, defaults, geography });
}

export function createScenarioState(environment) {
  return createState(clone(environment.defaults));
}

export function normalizeTypologySlug(value) {
  return String(value ?? "")
    .trim()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeProductField(field, value, environment) {
  const { catalogs, defaults } = environment;
  if (field === "typology") {
    const normalized = normalizeTypologySlug(value);
    return catalogs.typologies.includes(normalized)
      ? { value: normalized }
      : {
          value: defaults.typology,
          issue: correction("INVALID_TYPOLOGY", field, "field_default")
        };
  }
  if (field === "bedrooms") {
    const normalized =
      value === "all" ? "all" : strictInteger(value);
    return catalogs.bedrooms.includes(normalized)
      ? { value: normalized }
      : {
          value: defaults.bedrooms,
          issue: correction("INVALID_BEDROOMS", field, "field_default")
        };
  }
  if (field === "delivery_year") {
    const normalized =
      value === "all" ? "all" : strictInteger(value);
    return catalogs.delivery_years.includes(normalized)
      ? { value: normalized }
      : {
          value: defaults.delivery_year,
          issue: correction("INVALID_DELIVERY_YEAR", field, "field_default")
        };
  }
  if (field === "visualization") {
    return catalogs.visualizations.includes(value)
      ? { value }
      : {
          value: defaults.visualization,
          issue: correction("INVALID_VISUALIZATION", field, "field_default")
        };
  }
  if (field === "target_area_m2") {
    if (value === null) return { value: null };
    const normalized = strictNumber(value);
    return normalized !== null && normalized > 0 && normalized <= 10_000
      ? { value: normalized }
      : {
          value: defaults.target_area_m2,
          issue: correction("INVALID_TARGET_AREA", field, "field_default")
        };
  }
  if (field === "target_price_pen") {
    if (value === null) return { value: null };
    const normalized = strictNumber(value);
    return normalized !== null &&
      normalized > 0 &&
      normalized <= 1_000_000_000
      ? { value: normalized }
      : {
          value: defaults.target_price_pen,
          issue: correction("INVALID_TARGET_PRICE", field, "field_default")
        };
  }
  throw new Error(`Unsupported scenario product field: ${field}`);
}

function districtSupportsQuadrant(district, quadrantId) {
  return (
    Array.isArray(district?.quadrants) &&
    district.quadrants.some(
      (quadrant) => quadrant.quadrant_id === quadrantId
    )
  );
}

export function validateScenario(
  candidate,
  environment,
  { source = "interaction" } = {}
) {
  const issues = [];
  const defaults = environment.defaults;
  const districts = districtMap(environment);
  const version = strictInteger(candidate?.version);
  const districtId = String(candidate?.district_id ?? "");
  if (version !== SCENARIO_VERSION) {
    return createState(
      { ...clone(defaults), source },
      [correction("INVALID_VERSION", "version", "full_default")]
    );
  }
  if (!districts.has(districtId)) {
    return createState(
      { ...clone(defaults), source },
      [correction("INVALID_DISTRICT", "district_id", "full_default")]
    );
  }

  const scenario = {
    ...clone(defaults),
    version: SCENARIO_VERSION,
    district_id: districtId,
    source
  };
  for (const field of PRODUCT_FIELDS) {
    const value = Object.hasOwn(candidate ?? {}, field)
      ? candidate[field]
      : defaults[field];
    const result = normalizeProductField(
      field,
      value,
      environment
    );
    scenario[field] = result.value;
    if (result.issue) issues.push(result.issue);
  }

  const requestedScope = candidate?.scope_mode ?? defaults.scope_mode;
  if (!environment.catalogs.scope_modes.includes(requestedScope)) {
    issues.push(correction("INVALID_SCOPE", "scope_mode", "district"));
    scenario.scope_mode = "district";
  } else {
    scenario.scope_mode = requestedScope;
  }

  scenario.quadrant_id = null;
  scenario.center_latitude = null;
  scenario.center_longitude = null;
  scenario.radius_meters = null;
  if (scenario.scope_mode === "quadrant") {
    const quadrantId = candidate?.quadrant_id;
    if (
      environment.catalogs.quadrants.includes(quadrantId) &&
      districtSupportsQuadrant(districts.get(districtId), quadrantId)
    ) {
      scenario.quadrant_id = quadrantId;
    } else {
      scenario.scope_mode = "district";
      issues.push(
        correction("INVALID_QUADRANT", "quadrant_id", "district")
      );
    }
  } else if (scenario.scope_mode === "radius") {
    const latitude = strictNumber(candidate?.center_latitude);
    const longitude = strictNumber(candidate?.center_longitude);
    const radius = strictInteger(candidate?.radius_meters);
    if (
      validCoordinatePair(latitude, longitude) &&
      environment.catalogs.radius_meters.includes(radius)
    ) {
      scenario.center_latitude = latitude;
      scenario.center_longitude = longitude;
      scenario.radius_meters = radius;
    } else {
      scenario.scope_mode = "district";
      issues.push(
        correction("INVALID_RADIUS_SCOPE", "scope_mode", "district")
      );
    }
  }

  return createState(scenario, issues);
}

function asUrl(urlLike) {
  if (urlLike instanceof URL) return new URL(urlLike.href);
  const raw = String(urlLike ?? "");
  if (raw.startsWith("?") || raw.startsWith("#")) {
    return new URL(`/${raw}`, "https://scenario.invalid");
  }
  return new URL(raw || "/", "https://scenario.invalid");
}

function parameterIssues(parameters) {
  const issues = [];
  for (const key of new Set(parameters.keys())) {
    if (!KNOWN_PARAMETERS.has(key)) {
      issues.push(correction("UNKNOWN_PARAMETER", key, "removed"));
    } else if (parameters.getAll(key).length > 1) {
      issues.push(correction("DUPLICATE_PARAMETER", key, "first_value"));
    }
  }
  return issues;
}

export function parseScenarioUrl(urlLike, environment) {
  const url = asUrl(urlLike);
  const parameters = url.searchParams;
  if ([...parameters.keys()].length === 0) {
    const state = createScenarioState(environment);
    return { ...state, canonical_search: "" };
  }

  const prefixIssues = parameterIssues(parameters);
  if (parameters.get("sv") !== String(SCENARIO_VERSION)) {
    const state = createState(
      { ...clone(environment.defaults), source: "url" },
      [
        ...prefixIssues,
        correction("INVALID_VERSION", "sv", "full_default")
      ]
    );
    return { ...state, canonical_search: "" };
  }

  const districtId =
    parameters.get("district") ?? environment.defaults.district_id;
  if (!districtMap(environment).has(districtId)) {
    const state = createState(
      { ...clone(environment.defaults), source: "url" },
      [
        ...prefixIssues,
        correction("INVALID_DISTRICT", "district", "full_default")
      ]
    );
    return { ...state, canonical_search: "" };
  }

  const candidate = {
    ...clone(environment.defaults),
    version: SCENARIO_VERSION,
    district_id: districtId,
    source: "url"
  };
  const parameterToField = {
    typology: "typology",
    bedrooms: "bedrooms",
    area: "target_area_m2",
    price: "target_price_pen",
    delivery: "delivery_year",
    viz: "visualization"
  };
  const parserIssues = [...prefixIssues];
  for (const [parameter, field] of Object.entries(parameterToField)) {
    if (!parameters.has(parameter)) continue;
    const raw = parameters.get(parameter);
    const result = normalizeProductField(field, raw, environment);
    candidate[field] = result.value;
    if (result.issue) parserIssues.push(result.issue);
  }

  const scope = parameters.get("scope") ?? environment.defaults.scope_mode;
  if (!environment.catalogs.scope_modes.includes(scope)) {
    candidate.scope_mode = "district";
    parserIssues.push(correction("INVALID_SCOPE", "scope", "district"));
  } else {
    candidate.scope_mode = scope;
  }

  if (candidate.scope_mode === "quadrant") {
    const quadrantId = parameters.get("quadrant");
    if (
      environment.catalogs.quadrants.includes(quadrantId) &&
      districtSupportsQuadrant(
        districtMap(environment).get(districtId),
        quadrantId
      )
    ) {
      candidate.quadrant_id = quadrantId;
    } else {
      candidate.scope_mode = "district";
      candidate.quadrant_id = null;
      parserIssues.push(
        correction("INVALID_QUADRANT", "quadrant", "district")
      );
    }
  } else if (candidate.scope_mode === "radius") {
    const latitude = strictNumber(parameters.get("lat"));
    const longitude = strictNumber(parameters.get("lon"));
    const radius = strictInteger(parameters.get("radius"));
    if (
      validCoordinatePair(latitude, longitude) &&
      environment.catalogs.radius_meters.includes(radius)
    ) {
      candidate.center_latitude = latitude;
      candidate.center_longitude = longitude;
      candidate.radius_meters = radius;
    } else {
      candidate.scope_mode = "district";
      candidate.center_latitude = null;
      candidate.center_longitude = null;
      candidate.radius_meters = null;
      parserIssues.push(
        correction("INVALID_RADIUS_SCOPE", "scope", "district")
      );
    }
  }

  const territorialParameters = ["quadrant", "lat", "lon", "radius"];
  const applicable =
    candidate.scope_mode === "quadrant"
      ? new Set(["quadrant"])
      : candidate.scope_mode === "radius"
        ? new Set(["lat", "lon", "radius"])
        : new Set();
  for (const parameter of territorialParameters) {
    if (parameters.has(parameter) && !applicable.has(parameter)) {
      parserIssues.push(
        correction("NON_APPLICABLE_PARAMETER", parameter, "removed")
      );
    }
  }

  const validated = validateScenario(candidate, environment, {
    source: "url"
  });
  const corrections = [...parserIssues, ...validated.corrections];
  const state = createState(validated.scenario, corrections);
  const query = serializeScenarioQuery(state.scenario, environment);
  return {
    ...state,
    canonical_search: query ? `?${query}` : ""
  };
}

function sameValue(left, right) {
  return Object.is(left, right);
}

function formatCoordinate(value) {
  return Number(value).toFixed(6);
}

function formatScalar(value) {
  return String(value);
}

export function serializeScenarioQuery(scenario, environment) {
  const validated = validateScenario(scenario, environment, {
    source: scenario?.source ?? "interaction"
  });
  if (validated.scenario_status === "invalid") {
    throw new Error("Cannot serialize an invalid scenario");
  }
  const normalized = validated.scenario;
  const defaults = environment.defaults;
  const changed =
    normalized.district_id !== defaults.district_id ||
    normalized.scope_mode !== defaults.scope_mode ||
    PRODUCT_FIELDS.some(
      (field) => !sameValue(normalized[field], defaults[field])
    );
  if (!changed) return "";

  const parameters = new URLSearchParams();
  parameters.set("sv", String(SCENARIO_VERSION));
  if (normalized.district_id !== defaults.district_id) {
    parameters.set("district", normalized.district_id);
  }
  if (normalized.scope_mode !== defaults.scope_mode) {
    parameters.set("scope", normalized.scope_mode);
  }
  if (normalized.scope_mode === "quadrant") {
    parameters.set("quadrant", normalized.quadrant_id);
  }
  if (normalized.scope_mode === "radius") {
    parameters.set("lat", formatCoordinate(normalized.center_latitude));
    parameters.set("lon", formatCoordinate(normalized.center_longitude));
    parameters.set("radius", formatScalar(normalized.radius_meters));
  }
  const fieldToParameter = {
    typology: "typology",
    bedrooms: "bedrooms",
    target_area_m2: "area",
    target_price_pen: "price",
    delivery_year: "delivery",
    visualization: "viz"
  };
  for (const field of PRODUCT_FIELDS) {
    if (!sameValue(normalized[field], defaults[field])) {
      parameters.set(fieldToParameter[field], formatScalar(normalized[field]));
    }
  }
  return parameters.toString();
}

export function canonicalizeScenarioUrl(urlLike, environment) {
  const url = asUrl(urlLike);
  const parsed = parseScenarioUrl(url, environment);
  return {
    ...parsed,
    canonical_url: `${url.pathname}${parsed.canonical_search}${url.hash}`
  };
}

function validInteractionOrPrevious(previousState, candidate, environment) {
  const validated = validateScenario(candidate, environment, {
    source: "interaction"
  });
  if (validated.scenario_status === "invalid") {
    return createState(clone(previousState.scenario), validated.corrections);
  }
  return validated;
}

export function reduceScenarioState(state, action, environment) {
  if (!state?.scenario || !action?.type) {
    throw new Error("Scenario reducer requires state and action type");
  }
  if (action.type === "PARSE_URL") {
    return parseScenarioUrl(action.url, environment);
  }
  if (action.type === "RESET") {
    return createScenarioState(environment);
  }
  if (action.type === "DISMISS_CORRECTIONS") {
    return createState(clone(state.scenario));
  }
  if (action.type === "SET_TERRITORY") {
    const patch = action.patch ?? {};
    const candidate = { ...clone(state.scenario), ...clone(patch) };
    if (
      patch.district_id &&
      patch.district_id !== state.scenario.district_id &&
      patch.scope_mode === undefined
    ) {
      candidate.scope_mode = "district";
    }
    if (candidate.scope_mode === "district") {
      candidate.quadrant_id = null;
      candidate.center_latitude = null;
      candidate.center_longitude = null;
      candidate.radius_meters = null;
    } else if (candidate.scope_mode === "quadrant") {
      candidate.center_latitude = null;
      candidate.center_longitude = null;
      candidate.radius_meters = null;
    } else if (candidate.scope_mode === "radius") {
      candidate.quadrant_id = null;
    }
    return validInteractionOrPrevious(state, candidate, environment);
  }
  if (action.type === "APPLY_PRODUCT_FILTERS") {
    const patch = action.patch ?? {};
    const unsupported = Object.keys(patch).filter(
      (field) => !PRODUCT_FIELDS.includes(field)
    );
    if (unsupported.length) {
      return createState(clone(state.scenario), [
        correction("UNSUPPORTED_PRODUCT_FIELD", unsupported[0], "rejected")
      ]);
    }
    const candidate = { ...clone(state.scenario), ...clone(patch) };
    return validInteractionOrPrevious(state, candidate, environment);
  }
  throw new Error(`Unsupported scenario action: ${action.type}`);
}

function radians(degrees) {
  return (degrees * Math.PI) / 180;
}

export function haversineDistanceMeters(
  latitudeA,
  longitudeA,
  latitudeB,
  longitudeB
) {
  if (
    !coordinatesInRange(latitudeA, longitudeA) ||
    !coordinatesInRange(latitudeB, longitudeB)
  ) {
    return null;
  }
  const latitudeDelta = radians(latitudeB - latitudeA);
  const longitudeDelta = radians(longitudeB - longitudeA);
  const latitudeARadians = radians(latitudeA);
  const latitudeBRadians = radians(latitudeB);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeARadians) *
      Math.cos(latitudeBRadians) *
      Math.sin(longitudeDelta / 2) ** 2;
  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.asin(Math.min(1, Math.sqrt(haversine)))
  );
}

function sortExclusions(exclusions) {
  return exclusions.sort(
    (left, right) =>
      EXCLUSION_STAGE_ORDER[left.stage] -
        EXCLUSION_STAGE_ORDER[right.stage] ||
      compareText(left.project_id, right.project_id) ||
      compareText(left.reason, right.reason)
  );
}

export function buildTerritorialContext({
  scenarioState,
  geography,
  boundaryArtifactStatus = "valid"
}) {
  if (!scenarioState?.scenario) {
    throw new Error("Territorial context requires scenarioState");
  }
  if (
    !geography ||
    !Array.isArray(geography.assignments) ||
    !GEOGRAPHY_ARTIFACT_STATUSES.has(boundaryArtifactStatus)
  ) {
    throw new Error("Territorial context received invalid geography inputs");
  }
  const scenario = scenarioState.scenario;
  const districtAssignments = geography.assignments
    .filter((assignment) => assignment.district_id === scenario.district_id)
    .sort((left, right) =>
      compareText(
        left.observed_project_id,
        right.observed_project_id
      )
    );
  const distances = {};
  if (scenario.scope_mode === "radius") {
    for (const assignment of districtAssignments) {
      if (!assignment.coordinate_valid) continue;
      const distance = haversineDistanceMeters(
        assignment.latitude,
        assignment.longitude,
        scenario.center_latitude,
        scenario.center_longitude
      );
      if (distance !== null) {
        distances[assignment.observed_project_id] = distance;
      }
    }
  }

  function assignmentInScope(assignment) {
    if (scenario.scope_mode === "district") return true;
    if (scenario.scope_mode === "quadrant") {
      return assignment.quadrant_id === scenario.quadrant_id;
    }
    if (!assignment.coordinate_valid) return true;
    return (
      distances[assignment.observed_project_id] <= scenario.radius_meters
    );
  }

  const inScope = districtAssignments.filter(assignmentInScope);
  const observedScopeIds = uniqueSorted(
    inScope.map((assignment) => assignment.observed_project_id)
  );
  const artifactUsable = boundaryArtifactStatus === "valid";
  const geographyValidAssignments = artifactUsable
    ? inScope.filter(
        (assignment) =>
          assignment.coordinate_valid && assignment.polygon_valid
      )
    : [];
  const geographyValidIds = uniqueSorted(
    geographyValidAssignments.map(
      (assignment) => assignment.observed_project_id
    )
  );

  const exclusions = [];
  for (const assignment of districtAssignments) {
    if (!assignmentInScope(assignment)) {
      exclusions.push({
        project_id: assignment.observed_project_id,
        stage: "scope",
        reason: "outside_scope",
        visible_as_coverage: false
      });
    } else if (!assignment.coordinate_valid) {
      exclusions.push({
        project_id: assignment.observed_project_id,
        stage: "geography",
        reason: "invalid_coordinates",
        visible_as_coverage: true
      });
    } else if (!artifactUsable && assignmentInScope(assignment)) {
      exclusions.push({
        project_id: assignment.observed_project_id,
        stage: "geography",
        reason: "insufficient_evidence",
        visible_as_coverage: true
      });
    } else if (!assignment.polygon_valid) {
      exclusions.push({
        project_id: assignment.observed_project_id,
        stage: "geography",
        reason: "outside_district_polygon",
        visible_as_coverage: true
      });
    }
  }

  const geographyStatus = !artifactUsable
    ? "unavailable"
    : observedScopeIds.length > 0 &&
        geographyValidIds.length < observedScopeIds.length
      ? "partial"
      : "ready";
  return {
    scenario: clone(scenario),
    scope: {
      district_id: scenario.district_id,
      scope_mode: scenario.scope_mode,
      quadrant_id: scenario.quadrant_id,
      center_latitude: scenario.center_latitude,
      center_longitude: scenario.center_longitude,
      radius_meters: scenario.radius_meters,
      observed_project_count: observedScopeIds.length,
      geography_valid_project_count: geographyValidIds.length
    },
    observed_scope_project_ids: observedScopeIds,
    geography_valid_project_ids: geographyValidIds,
    distance_meters_by_observed_project_id: distances,
    exclusions: sortExclusions(exclusions),
    scenario_status: scenarioState.scenario_status,
    geography_status: geographyStatus
  };
}
