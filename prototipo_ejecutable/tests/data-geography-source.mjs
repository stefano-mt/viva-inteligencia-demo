import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import {
  createDistrictIndex,
  stableSerializeGeoJson
} from "../scripts/data/geography.js";

const manifestUrl = new URL(
  "../../datos_relevantes/geography/source-manifest.json",
  import.meta.url
);
const sourceUrl = new URL(
  "../../datos_relevantes/geography/district-boundaries-source.geojson",
  import.meta.url
);
const manifest = JSON.parse(await fs.readFile(manifestUrl, "utf8"));
const sourceBytes = await fs.readFile(sourceUrl);
const source = JSON.parse(sourceBytes.toString("utf8"));

assert.equal(manifest.source.provider, "Nominatim");
assert.equal(manifest.source.crs, "EPSG:4326");
assert.equal(manifest.source.feature_count, 7);
assert.equal(manifest.runtime_policy.external_cartographic_requests, 0);
assert.equal(manifest.license.identifier, "ODbL-1.0");
assert.equal(manifest.license.share_alike, true);
assert.match(manifest.license.attribution, /OpenStreetMap contributors/);
assert.equal(
  crypto.createHash("sha256").update(sourceBytes).digest("hex"),
  manifest.source.source_sha256,
  "versioned source bytes must match the approved manifest"
);
assert.equal(sourceBytes.length, manifest.source.source_bytes);

assert.equal(source.type, "FeatureCollection");
assert.equal(source.features.length, 7);
const expected = new Map(
  manifest.districts.map((district) => [
    district.osm_relation_id,
    district.source_name
  ])
);
for (const feature of source.features) {
  assert.equal(feature.properties.osm_type, "relation");
  assert.ok(expected.has(feature.properties.osm_id));
  assert.equal(
    feature.properties.name,
    expected.get(feature.properties.osm_id)
  );
  assert.ok(["Polygon", "MultiPolygon"].includes(feature.geometry.type));
  assert.ok(feature.geometry.coordinates.length > 0);
}
assert.equal(
  new Set(source.features.map((feature) => feature.properties.osm_id)).size,
  7
);

const districtIndex = createDistrictIndex(manifest);
assert.equal(districtIndex.resolve("Jesus Maria").district_id, "150113");
assert.equal(districtIndex.resolve("Jesús María").district_id, "150113");
assert.equal(districtIndex.resolve("Cercado de lima").source_name, "Lima");
assert.equal(districtIndex.resolve("150122").osm_relation_id, 1944770);

for (const feature of source.features) {
  const polygons =
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
  for (const polygon of polygons) {
    assert.ok(polygon.length >= 1);
    for (const ring of polygon) {
      assert.ok(ring.length >= 4);
      assert.deepEqual(
        ring[0],
        ring.at(-1),
        `relation ${feature.properties.osm_id} must contain closed rings`
      );
    }
  }
}

const reversed = {
  ...source,
  features: [...source.features].reverse()
};
assert.equal(
  stableSerializeGeoJson(source),
  stableSerializeGeoJson(reversed),
  "stable GeoJSON serialization must not depend on feature order"
);

const serializedSource = JSON.stringify(source);
assert.doesNotMatch(serializedSource, /[A-Za-z]:\\\\|\/Users\/|\/home\//);
assert.doesNotMatch(
  serializedSource,
  /"email"|"phone"|"whatsapp"|"contact"/i
);

console.log(
  `Geography source OK: ${source.features.length}/7 OSM relations, SHA-256 ${manifest.source.source_sha256}.`
);
