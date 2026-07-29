import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import { views } from "../public/js/config.js";

const dataUrl = new URL(
  "../public/demo-data/viva-platform-demo.json",
  import.meta.url
);
const dataBytes = await fs.readFile(dataUrl);
const data = JSON.parse(dataBytes.toString("utf8"));
const boundaryUrl = new URL(
  "../public/demo-data/district-boundaries.geojson",
  import.meta.url
);
const boundaryBytes = await fs.readFile(boundaryUrl);
const boundaries = JSON.parse(boundaryBytes.toString("utf8"));
const manifest = JSON.parse(
  await fs.readFile(
    new URL("../../datos_relevantes/geography/source-manifest.json", import.meta.url),
    "utf8"
  )
);
const coverageReport = JSON.parse(
  await fs.readFile(
    new URL(
      "../../datos_relevantes/demo-pilot/coverage-report.json",
      import.meta.url
    ),
    "utf8"
  )
);
const hash = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");
const logicalBytes = (value) =>
  Buffer.from(value.toString("utf8").replace(/\r\n?/g, "\n"), "utf8");
const logicalDataBytes = logicalBytes(dataBytes);
const logicalBoundaryBytes = logicalBytes(boundaryBytes);

assert.equal(data.metadata.contract_version, "2.1.0");
assert.equal(data.metadata.dataset_id, "dataset:viva-platform-demo-2026-07-28");
assert.equal(data.metadata.generated_at, "2026-07-28T01:24:28Z");
assert.equal(data.metadata.cutoff_at, "2026-07-28T01:24:28Z");
assert.ok(data.metadata.input_fingerprints.length >= 20);
assert.equal(data.metadata.publication.contains_contact_pii, false);
assert.equal(data.metadata.publication.raw_payloads_included, false);
assert.equal(data.metadata.publication.restricted_assets_included, false);

assert.equal(data.projects.length, 714, "legacy projection must remain at 714");
assert.equal(data.metadata.counts.projects, data.projects.length);
assert.equal(data.model.projects.length, 676);
assert.equal(data.metadata.counts.model_projects, data.model.projects.length);
assert.equal(data.metadata.counts.unresolved_legacy_projects, 42);
assert.deepEqual(data.scenario_catalogs.typologies, [
  "all",
  "casa",
  "departamento",
  "lote",
  "oficina"
]);
assert.deepEqual(data.scenario_defaults, {
  version: 1,
  district_id: "150122",
  scope_mode: "district",
  quadrant_id: null,
  center_latitude: null,
  center_longitude: null,
  radius_meters: null,
  typology: "all",
  bedrooms: "all",
  target_area_m2: null,
  target_price_pen: null,
  delivery_year: "all",
  visualization: "geographic",
  source: "default"
});
assert.equal(boundaries.type, "FeatureCollection");
assert.equal(boundaries.features.length, 7);
assert.equal(data.geography.crs, "EPSG:4326");
assert.equal(
  data.geography.boundary_artifact_path,
  "demo-data/district-boundaries.geojson"
);
assert.equal(data.geography.districts.length, 7);
assert.equal(data.geography.assignments.length, 433);
assert.equal(
  hash(logicalBoundaryBytes),
  data.geography.boundary_artifact_sha256
);
assert.equal(
  hash(logicalBoundaryBytes),
  manifest.derived.public_geojson_sha256
);
assert.equal(
  logicalBoundaryBytes.length,
  manifest.derived.public_geojson_bytes
);
assert.equal(
  hash(logicalDataBytes),
  coverageReport.source_artifact.sha256
);
assert.equal(
  logicalDataBytes.length,
  coverageReport.source_artifact.byte_length
);
assert.equal(
  hash(logicalBoundaryBytes),
  coverageReport.geography_coverage.public_artifact.sha256
);
assert.equal(
  logicalBoundaryBytes.length,
  coverageReport.geography_coverage.public_artifact.byte_length
);
const mirafloresGeography = data.geography.districts.find(
  (district) => district.district_id === "150122"
);
assert.deepEqual(
  [
    mirafloresGeography.observed_project_count,
    mirafloresGeography.coordinate_valid_count,
    mirafloresGeography.polygon_valid_count,
    mirafloresGeography.authoritative_project_count,
    mirafloresGeography.unreconciled_project_count
  ],
  [90, 90, 90, 85, 5]
);
assert.deepEqual(
  mirafloresGeography.quadrants.map(
    (quadrant) => quadrant.observed_project_ids.length
  ),
  [40, 5, 5, 40]
);

const requiredUpperSections = [
  "executive",
  "rankings",
  "sourceScope",
  "scopeSummary",
  "matching",
  "coverage",
  "quality",
  "assistant",
  "pipeline",
  "deployment"
];
for (const section of requiredUpperSections) {
  assert.ok(Object.hasOwn(data, section), `${section} must remain available`);
}

const expectedRoutes = [
  "dashboard",
  "projects",
  "market",
  "compare",
  "trust",
  "assistant",
  "activity"
];
assert.deepEqual(
  views.map((view) => view.id),
  expectedRoutes,
  "the seven existing routes must remain registered"
);

const legacyIds = new Set();
for (const [index, project] of data.projects.entries()) {
  assert.equal(typeof project.id, "string", `projects[${index}].id`);
  assert.ok(project.id);
  assert.equal(legacyIds.has(project.id), false, `duplicate ${project.id}`);
  legacyIds.add(project.id);
  assert.ok(["PEN", "USD", "unknown"].includes(project.currency));
  assert.ok(Array.isArray(project.amenities));
  assert.ok(Array.isArray(project.financing_banks));
  assert.ok(Array.isArray(project.missing_required_fields));
  for (const forbidden of [
    "project_contact",
    "project_email",
    "project_phone",
    "project_whatsapp"
  ]) {
    assert.equal(
      Object.hasOwn(project, forbidden),
      false,
      `${forbidden} must not be public`
    );
  }
}

assert.equal(data.deployment.static_data_path, "demo-data/viva-platform-demo.json");
assert.equal(data.deployment.github_pages_ready, true);

console.log(
  `Data contract OK: ${data.projects.length} legacy, ${data.model.projects.length} authoritative, ${views.length} routes.`
);
