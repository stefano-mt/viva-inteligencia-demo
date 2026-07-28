import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildGeographicMapModel,
  renderGeographicMap,
} from "../public/js/views/geographic-map.js";
import {
  buildPositioningMapModel,
  renderPositioningMap,
} from "../public/js/views/positioning-map.js";
import {
  state,
  updateBoundaryArtifact,
} from "../public/js/state.js";

const projectDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const data = JSON.parse(
  await fs.readFile(
    path.join(
      projectDir,
      "public",
      "demo-data",
      "viva-platform-demo.json",
    ),
    "utf8",
  ),
);
const boundaryGeoJson = JSON.parse(
  await fs.readFile(
    path.join(
      projectDir,
      "public",
      "demo-data",
      "district-boundaries.geojson",
    ),
    "utf8",
  ),
);

state.data = data;
updateBoundaryArtifact({
  status: "valid",
  geojson: boundaryGeoJson,
  url: "demo-data/district-boundaries.geojson",
});
const context = structuredClone(state.scenarioContext);
const contextBeforeRender = JSON.stringify(context);
const geographyBeforeRender = JSON.stringify(data.geography);
const boundariesBeforeRender = JSON.stringify(boundaryGeoJson);
const miraflores = data.geography.districts.find(
  ({ district_id: districtId }) =>
    districtId === context.scenario.district_id,
);
assert.ok(miraflores);
assert.match(
  renderGeographicMap({}),
  /Preparando escenario geográfico/,
);
assert.match(
  renderPositioningMap({}),
  /Preparando posicionamiento área\/precio/,
);

const geographic = buildGeographicMapModel({
  scenarioContext: context,
  data,
  boundaryGeoJson,
  selectedProjectId: "1988",
});
assert.equal(geographic.status, "ready");
assert.equal(geographic.geometry.relation_id, 1944770);
assert.equal(
  geographic.geometry.projection,
  "local-equirectangular-meters",
);
assert.equal(geographic.points.length, 90);
assert.equal(geographic.comparable_project_count, 85);
assert.equal(geographic.unreconciled_project_count, 5);
assert.equal(
  geographic.selected_point.observed_project_id,
  "observed:nexo-1988",
);
assert.equal(new Set(geographic.point_ids).size, geographic.point_ids.length);
assert.ok(geographic.geometry.path.startsWith("M "));
assert.ok(geographic.geometry.scale_bar.meters > 0);
assert.ok(geographic.geometry.quadrants.cells.length === 4);

for (const selectedProjectId of [
  "1988",
  "observed:nexo-1988",
  "project:nexo-1988",
]) {
  assert.equal(
    buildGeographicMapModel({
      scenarioContext: context,
      data,
      boundaryGeoJson,
      selectedProjectId,
    }).selected_point.observed_project_id,
    "observed:nexo-1988",
    `La selección debe aceptar el ID ${selectedProjectId}`,
  );
}

const geographicHtml = renderGeographicMap({
  scenarioContext: context,
  data,
  boundaryGeoJson,
  selectedProjectId: "project:nexo-1988",
});
assert.deepEqual(
  attributeValues(geographicHtml, "data-geo-point-id"),
  geographic.point_ids,
);
assert.deepEqual(
  optionValues(geographicHtml, "geo-project-select"),
  geographic.point_ids,
);
assert.doesNotMatch(geographicHtml, /tabindex="0"/);
assert.equal(
  (geographicHtml.match(/tabindex="-1"/g) ?? []).length,
  geographic.points.length,
);
assert.match(geographicHtml, /© OpenStreetMap contributors/);
assert.match(geographicHtml, /ODbL 1\.0/);
assert.match(geographicHtml, /Cuadrantes analíticos no oficiales/);
assertSafeMarkup(geographicHtml);
assert.equal(
  renderGeographicMap({
    scenarioContext: context,
    data,
    boundaryGeoJson,
    selectedProjectId: "project:nexo-1988",
  }),
  geographicHtml,
  "El renderer geográfico debe ser determinista",
);

const renamedBoundary = {
  type: "FeatureCollection",
  features: [
    {
      ...boundaryGeoJson.features.find(
        (feature) =>
          Number(feature.properties?.osm_id) ===
          miraflores.osm_relation_id,
      ),
      properties: {
        ...boundaryGeoJson.features.find(
          (feature) =>
            Number(feature.properties?.osm_id) ===
            miraflores.osm_relation_id,
        ).properties,
        name: "Nombre deliberadamente distinto",
      },
    },
  ],
};
assert.equal(
  buildGeographicMapModel({
    scenarioContext: context,
    data,
    boundaryGeoJson: renamedBoundary,
  }).status,
  "ready",
  "La unión geográfica debe usar relation id, no el nombre",
);

const sameNameWrongRelation = structuredClone(renamedBoundary);
sameNameWrongRelation.features[0].properties.osm_id = 999999;
assert.equal(
  buildGeographicMapModel({
    scenarioContext: context,
    data,
    boundaryGeoJson: sameNameWrongRelation,
  }).status,
  "geometry-unavailable",
  "Un nombre coincidente no puede sustituir el relation id",
);

const reversedData = {
  ...data,
  projects: [...data.projects].reverse(),
  geography: {
    ...data.geography,
    assignments: [...data.geography.assignments].reverse(),
  },
};
const reversedBoundary = {
  ...boundaryGeoJson,
  features: [...boundaryGeoJson.features].reverse(),
};
const reversedModel = buildGeographicMapModel({
  scenarioContext: context,
  data: reversedData,
  boundaryGeoJson: reversedBoundary,
  selectedProjectId: "1988",
});
assert.deepEqual(reversedModel.point_ids, geographic.point_ids);
assert.equal(reversedModel.geometry.path, geographic.geometry.path);

const emptyRadiusContext = {
  ...structuredClone(context),
  scenario: {
    ...context.scenario,
    scope_mode: "radius",
    center_latitude: miraflores.median_latitude,
    center_longitude: miraflores.median_longitude,
    radius_meters: 1000,
  },
  scope_text: "Miraflores · Radio de 1 km",
  observed_scope_project_ids: [],
  geography_valid_project_ids: [],
  display_project_ids: [],
  comparable_project_ids: [],
  price_reference_project_ids: [],
  comparable_scores: [],
  geography_status: "ready",
  comparability_status: "insufficient",
  price_status: "insufficient",
};
const emptyRadius = buildGeographicMapModel({
  scenarioContext: emptyRadiusContext,
  data,
  boundaryGeoJson,
});
assert.equal(emptyRadius.status, "empty-radius");
assert.equal(emptyRadius.points.length, 0);
assert.ok(emptyRadius.target);
assert.ok(emptyRadius.radius);
assert.ok(
  Math.abs(
    emptyRadius.radius.radius_px -
      emptyRadius.radius.radius_meters *
        emptyRadius.geometry.meters_to_pixels,
  ) < 1e-9,
  "El círculo usa la misma proyección métrica uniforme del mapa",
);
const emptyRadiusHtml = renderGeographicMap({
  scenarioContext: emptyRadiusContext,
  data,
  boundaryGeoJson,
});
assert.match(emptyRadiusHtml, /0 comparables dentro de 1 km/);
assert.match(emptyRadiusHtml, /data-scenario-radius="1500"/);
assert.match(emptyRadiusHtml, /data-scenario-scope="district"/);
assert.match(emptyRadiusHtml, /class="geo-radius-circle"/);
assert.match(emptyRadiusHtml, /class="geo-target"/);
assert.match(emptyRadiusHtml, /class="geo-scale"/);
assert.match(emptyRadiusHtml, /class="geo-north"/);
assert.doesNotMatch(emptyRadiusHtml, /data-geo-point-id=/);
assertSafeMarkup(emptyRadiusHtml);

const referenceLatitude =
  emptyRadius.geometry.reference_latitude;
const oneHundredMetersLatitude =
  (100 / 6_371_008.8) * (180 / Math.PI);
const oneHundredMetersLongitude =
  oneHundredMetersLatitude /
  Math.cos((referenceLatitude * Math.PI) / 180);
const center = emptyRadius.geometry.project(
  miraflores.median_longitude,
  miraflores.median_latitude,
);
const north = emptyRadius.geometry.project(
  miraflores.median_longitude,
  miraflores.median_latitude + oneHundredMetersLatitude,
);
const east = emptyRadius.geometry.project(
  miraflores.median_longitude + oneHundredMetersLongitude,
  miraflores.median_latitude,
);
assert.ok(
  Math.abs(Math.abs(north.y - center.y) - Math.abs(east.x - center.x)) <
    0.001,
  "Cien metros deben tener la misma escala horizontal y vertical",
);

const unavailable = buildGeographicMapModel({
  scenarioContext: {
    ...context,
    geography_valid_project_ids: [],
    geography_status: "unavailable",
  },
  data,
  boundaryGeoJson: null,
});
assert.equal(unavailable.status, "geometry-unavailable");
assert.equal(unavailable.points.length, 90);
assert.ok(
  unavailable.points.every(
    (point) =>
      point.comparison_status === "geography-unavailable" &&
      point.comparison_label ===
        "Geografía no disponible o no verificada" &&
      point.geography_invalid === false,
  ),
);
const unavailableHtml = renderGeographicMap({
  scenarioContext: {
    ...context,
    geography_valid_project_ids: [],
    geography_status: "unavailable",
  },
  data,
  boundaryGeoJson: null,
});
assert.match(unavailableHtml, /Geografía no disponible/);
assert.doesNotMatch(unavailableHtml, /<svg/);
assert.equal(
  optionValues(unavailableHtml, "geo-project-select").length,
  90,
);
assert.equal(
  (
    unavailableHtml.match(
      /Geografía no disponible o no verificada/g,
    ) ?? []
  ).length,
  92,
);
assert.doesNotMatch(unavailableHtml, /fuera del límite/i);
assert.doesNotMatch(unavailableHtml, /is-geography-invalid/);

const partialObservedId = context.display_project_ids[0];
const partialContext = {
  ...structuredClone(context),
  geography_valid_project_ids:
    context.geography_valid_project_ids.filter(
      (projectId) => projectId !== partialObservedId,
    ),
  comparable_project_ids: context.comparable_project_ids.filter(
    (projectId) =>
      projectId !==
      `project:nexo-${partialObservedId.slice(
        "observed:nexo-".length,
      )}`,
  ),
  geography_status: "partial",
  excluded_projects: [
    ...context.excluded_projects,
    {
      project_id: partialObservedId,
      stage: "geography",
      reason: "outside_district_polygon",
      origin: "territorial",
    },
  ],
};
const partialModel = buildGeographicMapModel({
  scenarioContext: partialContext,
  data,
  boundaryGeoJson,
  selectedProjectId: partialObservedId,
});
assert.equal(
  partialModel.selected_point.comparison_status,
  "geography-invalid",
);
const partialHtml = renderGeographicMap({
  scenarioContext: partialContext,
  data,
  boundaryGeoJson,
  selectedProjectId: partialObservedId,
});
assert.match(partialHtml, /Geografía fuera del límite validado/);
assert.match(partialHtml, /no alimenta acciones analíticas/);
assert.doesNotMatch(
  partialHtml,
  /Abrir en comparables|Ver por qué es comparable/,
);

const invalidHtml = renderGeographicMap({
  scenarioContext: {
    ...context,
    scenario_status: "invalid",
  },
  data,
  boundaryGeoJson,
});
assert.match(invalidHtml, /Escenario compartido corregido/);

const multipolygon = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        osm_type: "relation",
        osm_id: miraflores.osm_relation_id,
      },
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [-77.06, -12.15],
              [-77.0, -12.15],
              [-77.0, -12.09],
              [-77.06, -12.09],
              [-77.06, -12.15],
            ],
            [
              [-77.04, -12.13],
              [-77.03, -12.13],
              [-77.03, -12.12],
              [-77.04, -12.12],
              [-77.04, -12.13],
            ],
          ],
          [
            [
              [-77.08, -12.12],
              [-77.07, -12.12],
              [-77.07, -12.11],
              [-77.08, -12.11],
              [-77.08, -12.12],
            ],
          ],
        ],
      },
    },
  ],
};
const multipolygonModel = buildGeographicMapModel({
  scenarioContext: context,
  data,
  boundaryGeoJson: multipolygon,
});
assert.ok(
  (multipolygonModel.geometry.path.match(/\bM\b/g) ?? []).length >= 3,
  "Polygon, hueco y segunda isla deben conservar subpaths",
);
assert.match(
  renderGeographicMap({
    scenarioContext: context,
    data,
    boundaryGeoJson: multipolygon,
  }),
  /fill-rule="evenodd"/,
);

const firstObservedId = context.display_project_ids[0];
const firstLegacyId = firstObservedId.slice("observed:nexo-".length);
const maliciousData = {
  ...data,
  projects: [
    {
      ...data.projects.find(
        (project) => String(project.id) === firstLegacyId,
      ),
      project_name: '<script>alert("x")</script>',
      agency_name: 'Agencia "prueba" & socios',
    },
  ],
};
const maliciousContext = {
  ...context,
  observed_scope_project_ids: [firstObservedId],
  display_project_ids: [firstObservedId],
  geography_valid_project_ids: [firstObservedId],
  comparable_project_ids: [],
  comparable_scores: [],
  excluded_projects: [
    {
      project_id: `project:nexo-${firstLegacyId}`,
      reason: "not_reconciled",
      origin: "analytical",
    },
  ],
};
const maliciousHtml = renderGeographicMap({
  scenarioContext: maliciousContext,
  data: maliciousData,
  boundaryGeoJson,
  selectedProjectId: firstObservedId,
});
assert.doesNotMatch(maliciousHtml, /<script>/);
assert.match(maliciousHtml, /&lt;script&gt;/);
assert.match(maliciousHtml, /Agencia &quot;prueba&quot; &amp; socios/);
assert.doesNotMatch(
  maliciousHtml,
  /Abrir en comparables|Ver por qué es comparable/,
  "Un observado no reconciliado no debe ofrecer acciones analíticas",
);

const zeroAssignmentData = {
  ...data,
  geography: {
    ...data.geography,
    assignments: data.geography.assignments.map((assignment) =>
      assignment.observed_project_id === firstObservedId
        ? {
            ...assignment,
            latitude: 0,
            longitude: 0,
            coordinate_valid: false,
          }
        : assignment,
    ),
  },
};
const zeroContext = {
  ...maliciousContext,
  geography_status: "ready",
};
const zeroModel = buildGeographicMapModel({
  scenarioContext: zeroContext,
  data: zeroAssignmentData,
  boundaryGeoJson,
});
assert.equal(zeroModel.points.length, 0);
assert.equal(zeroModel.missing_coordinate_count, 1);
assert.doesNotMatch(
  renderGeographicMap({
    scenarioContext: zeroContext,
    data: zeroAssignmentData,
    boundaryGeoJson,
  }),
  /translate\(0 0\)/,
);

const positioning = buildPositioningMapModel({
  scenarioContext: context,
  data,
  selectedProjectId: "project:nexo-1988",
});
assert.equal(positioning.status, "ready");
assert.equal(positioning.points.length, 85);
assert.equal(positioning.omitted_metric_count, 0);
assert.equal(positioning.source_comparable_ids.length, 85);
assert.equal(
  positioning.selected_point.observed_project_id,
  "observed:nexo-1988",
);
assert.ok(positioning.x_ticks.length >= 2);
assert.ok(positioning.y_ticks.length >= 2);
assert.ok(positioning.median);
assert.equal(positioning.target, null);
assert.ok(
  positioning.points.every((point) => point.comparable),
  "El posicionamiento solo admite acciones sobre comparables",
);

const positioningHtml = renderPositioningMap({
  scenarioContext: context,
  data,
  selectedProjectId: "observed:nexo-1988",
});
assert.deepEqual(
  attributeValues(positioningHtml, "data-positioning-point-id"),
  positioning.point_ids,
);
assert.deepEqual(
  optionValues(positioningHtml, "positioning-project-select"),
  positioning.point_ids,
);
assert.match(positioningHtml, /Área total publicada \(m²\)/);
assert.match(
  positioningHtml,
  /Precio de lista publicado \(S\/ por m²\)/,
);
assert.match(positioningHtml, /Mediana/);
assert.match(positioningHtml, /Ver tabla accesible de 85 comparables/);
assert.doesNotMatch(positioningHtml, /tabindex="0"/);
assertSafeMarkup(positioningHtml);
assert.equal(
  renderPositioningMap({
    scenarioContext: context,
    data,
    selectedProjectId: "observed:nexo-1988",
  }),
  positioningHtml,
  "El renderer de posicionamiento debe ser determinista",
);

const integratedPanelsHtml =
  renderGeographicMap({
    scenarioContext: context,
    data,
    boundaryGeoJson,
    showVisualizationControl: true,
  }) +
  renderPositioningMap({
    scenarioContext: context,
    data,
    showVisualizationControl: false,
  });
assert.equal(
  (
    integratedPanelsHtml.match(
      /data-scenario-visualization=/g,
    ) ?? []
  ).length,
  2,
  "Dashboard puede montar ambos paneles con un solo control de visualización",
);
assert.match(
  integratedPanelsHtml,
  /class="geo-panel"[\s\S]*?data-visualization-active="true"/,
);
assert.match(
  integratedPanelsHtml,
  /class="positioning-panel"[\s\S]*?data-visualization-active="false"/,
);
const positioningActiveContext = {
  ...structuredClone(context),
  scenario: {
    ...context.scenario,
    visualization: "positioning",
  },
};
const positioningActivePanels =
  renderGeographicMap({
    scenarioContext: positioningActiveContext,
    data,
    boundaryGeoJson,
    showVisualizationControl: true,
  }) +
  renderPositioningMap({
    scenarioContext: positioningActiveContext,
    data,
    showVisualizationControl: false,
  });
assert.match(
  positioningActivePanels,
  /class="geo-panel"[\s\S]*?data-visualization-active="false"/,
);
assert.match(
  positioningActivePanels,
  /class="positioning-panel"[\s\S]*?data-visualization-active="true"/,
);
assert.match(positioningActivePanels, /Mapa del escenario/);
assert.match(positioningActivePanels, /Posicionamiento área\/precio/);

const targetContext = {
  ...structuredClone(context),
  scenario: {
    ...context.scenario,
    target_area_m2: 80,
    target_price_pen: 800000,
  },
};
const targetPositioning = buildPositioningMapModel({
  scenarioContext: targetContext,
  data,
  selectedProjectId: "1988",
});
assert.ok(targetPositioning.target);
assert.equal(targetPositioning.target.area, 80);
assert.equal(targetPositioning.target.price_per_m2, 10000);
assert.match(
  renderPositioningMap({
    scenarioContext: targetContext,
    data,
    selectedProjectId: "1988",
  }),
  /Escenario Viva simulado/,
);

const missingMetricData = {
  ...data,
  projects: data.projects.map((project) =>
    String(project.id) === "1988"
      ? {
          ...project,
          total_area: null,
          price_per_m2_list: null,
        }
      : project,
  ),
};
const missingMetric = buildPositioningMapModel({
  scenarioContext: context,
  data: missingMetricData,
  selectedProjectId: "1988",
});
assert.equal(missingMetric.points.length, 84);
assert.equal(missingMetric.omitted_metric_count, 1);
assert.equal(missingMetric.selected_point, null);
const missingMetricHtml = renderPositioningMap({
  scenarioContext: context,
  data: missingMetricData,
  selectedProjectId: "1988",
});
assert.match(
  missingMetricHtml,
  /no tiene métricas compatibles para este análisis/,
);
assertSafeMarkup(missingMetricHtml);

const emptyPositioningContext = {
  ...structuredClone(context),
  comparable_project_ids: [],
  comparable_scores: [],
  price_reference_project_ids: [],
  price_status: "insufficient",
};
const emptyPositioningHtml = renderPositioningMap({
  scenarioContext: emptyPositioningContext,
  data,
});
assert.match(
  emptyPositioningHtml,
  /No hay comparables con área y precio\/m² compatibles/,
);
assert.match(emptyPositioningHtml, /Referencia de precio insuficiente/);
assert.doesNotMatch(emptyPositioningHtml, /data-positioning-point-id=/);
assertSafeMarkup(emptyPositioningHtml);

for (const sourcePath of [
  path.join(
    projectDir,
    "public",
    "js",
    "views",
    "geographic-map.js",
  ),
  path.join(
    projectDir,
    "public",
    "js",
    "views",
    "positioning-map.js",
  ),
]) {
  const source = await fs.readFile(sourcePath, "utf8");
  assert.doesNotMatch(source, /from\s+["'][^"']*state\.js["']/);
  assert.doesNotMatch(source, /from\s+["'][^"']*controller\.js["']/);
  assert.doesNotMatch(source, /\bwindow\./);
  assert.doesNotMatch(source, /\bdocument\./);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
}
assert.equal(JSON.stringify(context), contextBeforeRender);
assert.equal(JSON.stringify(data.geography), geographyBeforeRender);
assert.equal(JSON.stringify(boundaryGeoJson), boundariesBeforeRender);

console.log(
  "Geographic map OK: relation-id join, 90/85 IDs, uniform metric projection, accessible selection, honest states and positioning axes.",
);

function attributeValues(html, attribute) {
  return [
    ...html.matchAll(new RegExp(`${attribute}="([^"]+)"`, "g")),
  ].map((match) => decodeEntities(match[1]));
}

function optionValues(html, selectId) {
  const select = html.match(
    new RegExp(
      `<select id="${selectId}"[\\s\\S]*?<\\/select>`,
      "i",
    ),
  )?.[0];
  if (!select) return [];
  return [...select.matchAll(/<option[\s\S]*?value="([^"]+)"/g)].map(
    (match) => decodeEntities(match[1]),
  );
}

function decodeEntities(value) {
  return String(value)
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function assertSafeMarkup(html) {
  assert.doesNotMatch(html, /\bNaN\b/);
  assert.doesNotMatch(html, /\bInfinity\b/);
  assert.doesNotMatch(html, /\bundefined\b/);
}
