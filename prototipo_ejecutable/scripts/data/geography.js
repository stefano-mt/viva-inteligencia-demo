export const EARTH_RADIUS_METERS = 6_371_008.8;
export const POINT_EPSILON_DEGREES = 1e-10;
export const DEFAULT_SIMPLIFICATION_TOLERANCE_DEGREES = 0.00005;
export const QUADRANT_ORDER = Object.freeze(["NW", "NE", "SW", "SE"]);
export const QUADRANT_LABELS = Object.freeze({
  NW: "Noroeste",
  NE: "Noreste",
  SW: "Suroeste",
  SE: "Sureste"
});
export const QUADRANT_METHOD =
  "district_valid_point_coordinate_medians_v1";
const EXCLUSION_STAGE_ORDER = Object.freeze({
  scope: 0,
  geography: 1,
  reconciliation: 2,
  product: 3,
  price: 4
});
const EXCLUSION_REASON_ORDER = Object.freeze({
  outside_scope: 0,
  district_mismatch: 1,
  outside_district_polygon: 2,
  invalid_coordinates: 3,
  not_reconciled: 4
});

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort(compareText);
}

export function normalizeDistrictName(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function createDistrictIndex(sourceManifest) {
  const districts = sourceManifest?.districts;
  if (!Array.isArray(districts) || districts.length === 0) {
    throw new Error("Source manifest must declare at least one district");
  }

  const byId = new Map();
  const byAlias = new Map();
  for (const district of districts) {
    const districtId = String(district.district_id ?? "").trim();
    if (!/^\d{6}$/.test(districtId)) {
      throw new Error(`Invalid district_id in source manifest: ${districtId}`);
    }
    if (byId.has(districtId)) {
      throw new Error(`Duplicate district_id in source manifest: ${districtId}`);
    }

    const normalized = {
      district_id: districtId,
      ui_name: String(district.ui_name ?? "").trim(),
      source_name: String(district.source_name ?? "").trim(),
      osm_relation_id: Number(district.osm_relation_id)
    };
    if (
      !normalized.ui_name ||
      !normalized.source_name ||
      !Number.isInteger(normalized.osm_relation_id) ||
      normalized.osm_relation_id <= 0
    ) {
      throw new Error(`Incomplete district mapping for ${districtId}`);
    }
    byId.set(districtId, normalized);

    const aliases = [
      districtId,
      normalized.ui_name,
      normalized.source_name,
      ...(Array.isArray(district.aliases) ? district.aliases : [])
    ];
    for (const alias of aliases) {
      const key = normalizeDistrictName(alias);
      if (!key) continue;
      const existing = byAlias.get(key);
      if (existing && existing.district_id !== districtId) {
        throw new Error(
          `District alias ${JSON.stringify(alias)} maps to multiple UBIGEO values`
        );
      }
      byAlias.set(key, normalized);
    }
  }

  return Object.freeze({
    byId,
    byAlias,
    resolve(value) {
      const direct = byId.get(String(value ?? "").trim());
      return direct ?? byAlias.get(normalizeDistrictName(value)) ?? null;
    }
  });
}

export function isValidCoordinate(latitude, longitude) {
  const lat = finiteNumber(latitude);
  const lon = finiteNumber(longitude);
  if (lat === null || lon === null) return false;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return false;
  return !(lat === 0 && lon === 0);
}

export function normalizeCoordinates(record) {
  const latitude = finiteNumber(
    record?.latitude ?? record?.location?.latitude
  );
  const longitude = finiteNumber(
    record?.longitude ?? record?.location?.longitude
  );
  return isValidCoordinate(latitude, longitude)
    ? Object.freeze({ latitude, longitude })
    : null;
}

export function observedProjectId(project) {
  const id = String(project?.observed_project_id ?? project?.id ?? "").trim();
  if (!id) throw new Error("Observed project requires a stable id");
  if (id.startsWith("observed:")) return id;
  return `observed:nexo-${id}`;
}

export function expectedAuthoritativeProjectId(project) {
  const id = String(project?.id ?? "").trim();
  if (!id) return null;
  return `project:nexo-${id}`;
}

export function reconcileObservedProject(project, authoritativeIds) {
  const expectedId = expectedAuthoritativeProjectId(project);
  return expectedId && authoritativeIds.has(expectedId) ? expectedId : null;
}

function pointSegmentDistanceDegrees(point, start, end) {
  const [px, py] = point;
  const [ax, ay] = start;
  const [bx, by] = end;
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  const projection = Math.max(
    0,
    Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))
  );
  return Math.hypot(px - (ax + projection * dx), py - (ay + projection * dy));
}

export function pointOnSegment(
  point,
  start,
  end,
  epsilon = POINT_EPSILON_DEGREES
) {
  return pointSegmentDistanceDegrees(point, start, end) <= epsilon;
}

export function classifyPointInRing(
  point,
  ring,
  epsilon = POINT_EPSILON_DEGREES
) {
  if (!Array.isArray(ring) || ring.length < 4) return "outside";
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const currentPoint = ring[index];
    const previousPoint = ring[previous];
    if (pointOnSegment(point, previousPoint, currentPoint, epsilon)) {
      return "boundary";
    }

    const [x, y] = point;
    const [xi, yi] = currentPoint;
    const [xj, yj] = previousPoint;
    const crosses =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside ? "inside" : "outside";
}

export function pointInPolygonCoordinates(
  point,
  polygonCoordinates,
  epsilon = POINT_EPSILON_DEGREES
) {
  if (!Array.isArray(polygonCoordinates) || polygonCoordinates.length === 0) {
    return false;
  }
  const outer = classifyPointInRing(point, polygonCoordinates[0], epsilon);
  if (outer === "outside") return false;
  if (outer === "boundary") return true;

  for (const hole of polygonCoordinates.slice(1)) {
    const classification = classifyPointInRing(point, hole, epsilon);
    if (classification === "inside" || classification === "boundary") {
      return false;
    }
  }
  return true;
}

export function pointInGeometry(
  point,
  geometry,
  epsilon = POINT_EPSILON_DEGREES
) {
  if (!Array.isArray(point) || point.length < 2 || !geometry) return false;
  if (geometry.type === "Polygon") {
    return pointInPolygonCoordinates(point, geometry.coordinates, epsilon);
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygon) =>
      pointInPolygonCoordinates(point, polygon, epsilon)
    );
  }
  throw new Error(`Unsupported boundary geometry: ${geometry.type}`);
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
    !isValidCoordinate(latitudeA, longitudeA) ||
    !isValidCoordinate(latitudeB, longitudeB)
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

export function isWithinRadius(
  latitude,
  longitude,
  centerLatitude,
  centerLongitude,
  radiusMeters
) {
  const radius = finiteNumber(radiusMeters);
  if (radius === null || radius < 0) return false;
  const distance = haversineDistanceMeters(
    latitude,
    longitude,
    centerLatitude,
    centerLongitude
  );
  return distance !== null && distance <= radius;
}

export function median(values) {
  const ordered = values
    .map(finiteNumber)
    .filter((value) => value !== null)
    .sort((left, right) => left - right);
  if (ordered.length === 0) return null;
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 1
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
}

export function quadrantForPoint(
  latitude,
  longitude,
  medianLatitude,
  medianLongitude
) {
  if (
    !isValidCoordinate(latitude, longitude) ||
    !Number.isFinite(medianLatitude) ||
    !Number.isFinite(medianLongitude)
  ) {
    return null;
  }
  const north = latitude >= medianLatitude;
  const west = longitude < medianLongitude;
  return `${north ? "N" : "S"}${west ? "W" : "E"}`;
}

export function rankHighLoadDistricts(
  projects,
  { sourceManifest, limit = 7 } = {}
) {
  const districtIndex = createDistrictIndex(sourceManifest);
  const groups = new Map();
  for (const project of projects) {
    if (!normalizeCoordinates(project)) continue;
    const district = districtIndex.resolve(
      project?.district ?? project?.location?.district
    );
    const rawName = String(
      project?.district ?? project?.location?.district ?? ""
    ).trim();
    const key = district?.district_id ?? normalizeDistrictName(rawName);
    if (!key) continue;
    const current = groups.get(key) ?? {
      district_id: district?.district_id ?? null,
      district_name: district?.ui_name ?? rawName,
      source_name: district?.source_name ?? rawName,
      osm_relation_id: district?.osm_relation_id ?? null,
      normalized_name: normalizeDistrictName(rawName),
      observed_project_count: 0
    };
    current.observed_project_count += 1;
    groups.set(key, current);
  }
  return [...groups.values()]
    .sort(
      (left, right) =>
        right.observed_project_count - left.observed_project_count ||
        compareText(
          left.district_id ?? left.normalized_name,
          right.district_id ?? right.normalized_name
        )
    )
    .slice(0, limit);
}

function featureRelationId(feature) {
  return Number(
    feature?.properties?.osm_relation_id ?? feature?.properties?.osm_id
  );
}

function boundaryFeatureIndex(featureCollection) {
  if (
    featureCollection?.type !== "FeatureCollection" ||
    !Array.isArray(featureCollection.features)
  ) {
    throw new Error("Boundary source must be a GeoJSON FeatureCollection");
  }
  const index = new Map();
  for (const feature of featureCollection.features) {
    const relationId = featureRelationId(feature);
    if (!Number.isInteger(relationId) || relationId <= 0) {
      throw new Error("Every boundary feature must identify an OSM relation");
    }
    if (index.has(relationId)) {
      throw new Error(`Duplicate boundary relation: ${relationId}`);
    }
    if (!["Polygon", "MultiPolygon"].includes(feature?.geometry?.type)) {
      throw new Error(
        `Boundary relation ${relationId} is not Polygon/MultiPolygon`
      );
    }
    index.set(relationId, feature);
  }
  return index;
}

export function buildGeographyModel({
  observedProjects,
  authoritativeProjects,
  boundaryFeatureCollection,
  sourceManifest,
  highLoadLimit = 7,
  boundaryArtifactPath = "datos_relevantes/geography/district-boundaries-source.geojson",
  boundaryArtifactSha256 = sourceManifest?.source?.source_sha256 ?? null
}) {
  if (!Array.isArray(observedProjects) || !Array.isArray(authoritativeProjects)) {
    throw new Error("Observed and authoritative projects must be arrays");
  }
  const districtIndex = createDistrictIndex(sourceManifest);
  const features = boundaryFeatureIndex(boundaryFeatureCollection);
  const authoritativeIds = new Set(
    authoritativeProjects.map((project) => project.project_id)
  );
  const ranked = rankHighLoadDistricts(observedProjects, {
    sourceManifest,
    limit: highLoadLimit
  });
  if (ranked.length !== highLoadLimit) {
    throw new Error(
      `Expected ${highLoadLimit} high-load districts; found ${ranked.length}`
    );
  }
  for (const district of ranked) {
    if (!district.district_id || !district.osm_relation_id) {
      throw new Error(
        `High-load district is not reconciled to UBIGEO/OSM: ${district.district_name}`
      );
    }
  }

  const districts = [];
  const assignments = [];
  const exclusions = [];

  for (const rankedDistrict of ranked) {
    const district = districtIndex.resolve(rankedDistrict.district_id);
    const boundary = features.get(district.osm_relation_id);
    if (!boundary) {
      throw new Error(
        `Missing boundary relation ${district.osm_relation_id} for ${district.ui_name}`
      );
    }
    const observed = observedProjects
      .filter((project) => {
        const resolved = districtIndex.resolve(project.district);
        return resolved?.district_id === district.district_id;
      })
      .sort((left, right) =>
        compareText(observedProjectId(left), observedProjectId(right))
      );

    const staged = observed.map((project) => {
      const observedId = observedProjectId(project);
      const coordinates = normalizeCoordinates(project);
      const coordinateValid = coordinates !== null;
      const polygonValid =
        coordinateValid &&
        pointInGeometry(
          [coordinates.longitude, coordinates.latitude],
          boundary.geometry
        );
      const authoritativeProjectId = reconcileObservedProject(
        project,
        authoritativeIds
      );
      return {
        project,
        observedId,
        authoritativeProjectId,
        coordinates,
        coordinateValid,
        polygonValid
      };
    });

    const polygonPoints = staged.filter((item) => item.polygonValid);
    const medianLatitude = median(
      polygonPoints.map((item) => item.coordinates.latitude)
    );
    const medianLongitude = median(
      polygonPoints.map((item) => item.coordinates.longitude)
    );
    const quadrants = new Map(
      QUADRANT_ORDER.map((quadrantId) => [
        quadrantId,
        {
          quadrant_id: quadrantId,
          label: QUADRANT_LABELS[quadrantId],
          observed_project_ids: [],
          authoritative_project_ids: []
        }
      ])
    );

    for (const item of staged) {
      const quadrantId = item.polygonValid
        ? quadrantForPoint(
            item.coordinates.latitude,
            item.coordinates.longitude,
            medianLatitude,
            medianLongitude
          )
        : null;
      assignments.push({
        observed_project_id: item.observedId,
        authoritative_project_id: item.authoritativeProjectId,
        district_id: district.district_id,
        latitude: item.coordinates?.latitude ?? null,
        longitude: item.coordinates?.longitude ?? null,
        coordinate_valid: item.coordinateValid,
        polygon_valid: item.polygonValid,
        quadrant_id: quadrantId,
        reconciliation_status: item.authoritativeProjectId
          ? "matched"
          : "unreconciled"
      });

      if (quadrantId) {
        const quadrant = quadrants.get(quadrantId);
        quadrant.observed_project_ids.push(item.observedId);
        if (item.authoritativeProjectId) {
          quadrant.authoritative_project_ids.push(
            item.authoritativeProjectId
          );
        }
      }

      if (!item.coordinateValid) {
        exclusions.push({
          project_id: item.observedId,
          stage: "geography",
          reason: "invalid_coordinates",
          visible_as_coverage: true
        });
      } else if (!item.polygonValid) {
        exclusions.push({
          project_id: item.observedId,
          stage: "geography",
          reason: "outside_district_polygon",
          visible_as_coverage: true
        });
      } else if (!item.authoritativeProjectId) {
        exclusions.push({
          project_id: item.observedId,
          stage: "reconciliation",
          reason: "not_reconciled",
          visible_as_coverage: true
        });
      }
    }

    const districtQuadrants = QUADRANT_ORDER.map((quadrantId) => {
      const quadrant = quadrants.get(quadrantId);
      quadrant.observed_project_ids = uniqueSorted(
        quadrant.observed_project_ids
      );
      quadrant.authoritative_project_ids = uniqueSorted(
        quadrant.authoritative_project_ids
      );
      return quadrant;
    });
    const authoritativeCount = staged.filter(
      (item) => item.authoritativeProjectId
    ).length;
    districts.push({
      district_id: district.district_id,
      district_name: district.ui_name,
      source_name: district.source_name,
      osm_relation_id: district.osm_relation_id,
      high_load: true,
      observed_project_count: staged.length,
      authoritative_project_count: authoritativeCount,
      unreconciled_project_count: staged.length - authoritativeCount,
      coordinate_valid_count: staged.filter((item) => item.coordinateValid)
        .length,
      polygon_valid_count: polygonPoints.length,
      median_latitude: medianLatitude,
      median_longitude: medianLongitude,
      quadrants: districtQuadrants
    });
  }

  assignments.sort((left, right) =>
    compareText(left.observed_project_id, right.observed_project_id)
  );
  exclusions.sort(
    (left, right) =>
      EXCLUSION_STAGE_ORDER[left.stage] - EXCLUSION_STAGE_ORDER[right.stage] ||
      compareText(left.project_id, right.project_id) ||
      compareText(left.reason, right.reason)
  );

  return {
    source_id:
      sourceManifest?.source_id ??
      sourceManifest?.snapshot_id ??
      "osm-lima-high-load-districts",
    crs: "EPSG:4326",
    boundary_artifact_path: boundaryArtifactPath,
    boundary_artifact_sha256: boundaryArtifactSha256,
    quadrant_method: QUADRANT_METHOD,
    districts,
    assignments,
    exclusions
  };
}

function assignmentInsideScope(assignment, scenario) {
  if (assignment.district_id !== scenario.district_id) return false;
  if (scenario.scope_mode === "district") return true;
  if (!assignment.coordinate_valid) return true;
  if (scenario.scope_mode === "quadrant") {
    return assignment.quadrant_id === scenario.quadrant_id;
  }
  if (scenario.scope_mode === "radius") {
    return isWithinRadius(
      assignment.latitude,
      assignment.longitude,
      scenario.center_latitude,
      scenario.center_longitude,
      scenario.radius_meters
    );
  }
  throw new Error(`Unsupported scope_mode: ${scenario.scope_mode}`);
}

export function evaluateScenarioScope({
  assignments,
  scenario,
  priceEligibleProjectIds = null
}) {
  const ordered = [...assignments].sort((left, right) =>
    compareText(left.observed_project_id, right.observed_project_id)
  );
  const inDistrict = ordered.filter(
    (assignment) => assignment.district_id === scenario.district_id
  );
  const inScope = inDistrict.filter((assignment) =>
    assignmentInsideScope(assignment, scenario)
  );
  const observedScopeIds = inScope.map(
    (assignment) => assignment.observed_project_id
  );
  const geographyValid = inScope.filter(
    (assignment) =>
      assignment.coordinate_valid && assignment.polygon_valid
  );
  const comparable = geographyValid
    .filter(
      (assignment) =>
        assignment.reconciliation_status === "matched" &&
        assignment.authoritative_project_id
    )
    .map((assignment) => assignment.authoritative_project_id);
  const priceEligible =
    priceEligibleProjectIds === null
      ? comparable
      : comparable.filter((projectId) => priceEligibleProjectIds.has(projectId));
  const coverageOnly = inScope
    .filter(
      (assignment) =>
        !assignment.coordinate_valid ||
        !assignment.polygon_valid ||
        assignment.reconciliation_status !== "matched"
    )
    .map((assignment) => assignment.observed_project_id);

  const exclusions = [];
  for (const assignment of inDistrict) {
    if (!assignment.coordinate_valid) {
      exclusions.push([
        assignment.observed_project_id,
        "invalid_coordinates"
      ]);
    } else if (!assignment.polygon_valid) {
      exclusions.push([
        assignment.observed_project_id,
        "outside_district_polygon"
      ]);
    } else if (!assignmentInsideScope(assignment, scenario)) {
      exclusions.push([assignment.observed_project_id, "outside_scope"]);
    } else if (
      assignment.reconciliation_status !== "matched" ||
      !assignment.authoritative_project_id
    ) {
      exclusions.push([assignment.observed_project_id, "not_reconciled"]);
    }
  }
  exclusions.sort(
    (left, right) =>
      (EXCLUSION_REASON_ORDER[left[1]] ?? Number.MAX_SAFE_INTEGER) -
        (EXCLUSION_REASON_ORDER[right[1]] ?? Number.MAX_SAFE_INTEGER) ||
      compareText(left[0], right[0]) ||
      compareText(left[1], right[1])
  );

  const consumerIds = uniqueSorted(comparable);
  return {
    observed_scope_project_ids: uniqueSorted(observedScopeIds),
    geography_valid_project_ids: uniqueSorted(
      geographyValid.map((assignment) => assignment.observed_project_id)
    ),
    comparable_project_ids: consumerIds,
    price_reference_project_ids: uniqueSorted(priceEligible),
    consumer_project_ids: {
      map: consumerIds,
      market_reading: consumerIds,
      comparator: consumerIds,
      assistant: consumerIds
    },
    coverage_only_project_ids: uniqueSorted(coverageOnly),
    reset: {
      scope_mode: "district",
      observed_project_count: inDistrict.length,
      authoritative_project_count: inDistrict.filter(
        (assignment) => assignment.authoritative_project_id
      ).length
    },
    exclusions
  };
}

function simplifyOpenLine(points, tolerance) {
  if (points.length <= 2) return points.map((point) => [...point]);
  let maximumDistance = -1;
  let splitIndex = -1;
  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = pointSegmentDistanceDegrees(
      points[index],
      points[0],
      points[points.length - 1]
    );
    if (distance > maximumDistance) {
      maximumDistance = distance;
      splitIndex = index;
    }
  }
  if (maximumDistance <= tolerance) {
    return [[...points[0]], [...points[points.length - 1]]];
  }
  const left = simplifyOpenLine(points.slice(0, splitIndex + 1), tolerance);
  const right = simplifyOpenLine(points.slice(splitIndex), tolerance);
  return [...left.slice(0, -1), ...right];
}

export function simplifyRing(ring, tolerance) {
  if (!Array.isArray(ring) || ring.length < 4) {
    throw new Error("A linear ring requires at least four coordinates");
  }
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new Error("Simplification tolerance must be a non-negative number");
  }
  const core = ring.slice(0, -1);
  if (tolerance === 0 || core.length <= 3) {
    return [...core.map((point) => [...point]), [...core[0]]];
  }
  let oppositeIndex = 1;
  let greatestDistance = -1;
  for (let index = 1; index < core.length; index += 1) {
    const distance = Math.hypot(
      core[index][0] - core[0][0],
      core[index][1] - core[0][1]
    );
    if (distance > greatestDistance) {
      greatestDistance = distance;
      oppositeIndex = index;
    }
  }
  const firstArc = simplifyOpenLine(
    core.slice(0, oppositeIndex + 1),
    tolerance
  );
  const secondArc = simplifyOpenLine(
    [...core.slice(oppositeIndex), core[0]],
    tolerance
  );
  const simplified = [...firstArc, ...secondArc.slice(1)];
  return simplified.length >= 4
    ? simplified
    : [...core.map((point) => [...point]), [...core[0]]];
}

export function simplifyGeometry(
  geometry,
  tolerance = DEFAULT_SIMPLIFICATION_TOLERANCE_DEGREES
) {
  if (geometry.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geometry.coordinates.map((ring) =>
        simplifyRing(ring, tolerance)
      )
    };
  }
  if (geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geometry.coordinates.map((polygon) =>
        polygon.map((ring) => simplifyRing(ring, tolerance))
      )
    };
  }
  throw new Error(`Unsupported geometry for simplification: ${geometry.type}`);
}

function featureSortKey(feature) {
  const relationId = featureRelationId(feature);
  return `${String(relationId).padStart(12, "0")}:${String(
    feature?.properties?.district_id ?? ""
  )}`;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort(compareText)
        .map((key) => [key, canonicalize(value[key])])
    );
  }
  return value;
}

export function simplifyFeatureCollection(
  featureCollection,
  tolerance = DEFAULT_SIMPLIFICATION_TOLERANCE_DEGREES
) {
  boundaryFeatureIndex(featureCollection);
  return {
    type: "FeatureCollection",
    ...Object.fromEntries(
      Object.entries(featureCollection)
        .filter(([key]) => !["type", "features"].includes(key))
        .map(([key, value]) => [key, structuredClone(value)])
    ),
    features: [...featureCollection.features]
      .sort((left, right) =>
        compareText(featureSortKey(left), featureSortKey(right))
      )
      .map((feature) => ({
        type: "Feature",
        properties: structuredClone(feature.properties ?? {}),
        geometry: simplifyGeometry(feature.geometry, tolerance)
      }))
  };
}

export function stableSerializeGeoJson(featureCollection) {
  const ordered = {
    ...structuredClone(featureCollection),
    features: [...featureCollection.features].sort((left, right) =>
      compareText(featureSortKey(left), featureSortKey(right))
    )
  };
  return `${JSON.stringify(canonicalize(ordered), null, 2)}\n`;
}
