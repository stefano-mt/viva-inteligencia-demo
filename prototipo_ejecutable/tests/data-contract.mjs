import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { views } from "../public/js/config.js";

const dataUrl = new URL(
  "../public/demo-data/viva-platform-demo.json",
  import.meta.url
);
const data = JSON.parse(await fs.readFile(dataUrl, "utf8"));

assert.equal(data.metadata.contract_version, "2.0.0");
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
