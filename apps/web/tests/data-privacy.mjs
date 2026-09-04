import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validatePrivacy } from "../../../tools/data/src/data/validate.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const prototypeRoot = path.resolve(testDirectory, "..");
const repositoryRoot = path.resolve(prototypeRoot, "..", "..");

const data = JSON.parse(
  await fs.readFile(
    new URL("../../../data/generated/viva-platform-demo.json", import.meta.url),
    "utf8"
  )
);
const geography = JSON.parse(
  await fs.readFile(
    new URL("../../../data/generated/district-boundaries.geojson", import.meta.url),
    "utf8"
  )
);
const coverageReport = JSON.parse(
  await fs.readFile(
    path.join(
      repositoryRoot,
      "data/source",
      "demo-pilot",
      "coverage-report.json"
    ),
    "utf8"
  )
);
const evidenceManifest = JSON.parse(
  await fs.readFile(
    path.join(
      repositoryRoot,
      "data/source",
      "demo-pilot",
      "evidence-manifest.json"
    ),
    "utf8"
  )
);

assert.deepEqual(validatePrivacy(data), [], "public root must be privacy-clean");
assert.deepEqual(
  validatePrivacy(data.benchmark),
  [],
  "public benchmark must be privacy-clean"
);
assert.deepEqual(
  validatePrivacy(geography),
  [],
  "public GeoJSON must be privacy-clean"
);
assert.deepEqual(
  validatePrivacy(coverageReport),
  [],
  "derived coverage report must be privacy-clean"
);
assert.deepEqual(
  validatePrivacy(evidenceManifest),
  [],
  "authorized manifest metadata must be privacy-clean"
);
assert.equal(data.metadata.contract_version, "2.4.0");
assert.doesNotMatch(
  JSON.stringify(geography),
  /[A-Za-z]:\\\\|\/Users\/|\/home\/|\"email\"|\"phone\"|\"whatsapp\"|\"contact\"/i
);
assert.deepEqual(data.metadata.publication, {
  is_public_artifact: true,
  contains_contact_pii: false,
  raw_payloads_included: false,
  restricted_assets_included: false,
  policy_version: "public-demo-v1"
});

for (const project of data.projects) {
  for (const forbidden of [
    "project_contact",
    "project_email",
    "project_phone",
    "project_whatsapp"
  ]) {
    assert.equal(Object.hasOwn(project, forbidden), false);
  }
}
for (const document of data.model.documents) {
  if (
    document.publish_permission !== "authorized" ||
    document.availability !== "available"
  ) {
    assert.equal(document.public_asset_path, null);
  }
}
for (const evidence of data.model.evidence) {
  if (
    evidence.publish_permission !== "authorized" ||
    evidence.availability !== "available"
  ) {
    assert.equal(evidence.fragment, null);
  }
}

const evidenceById = new Map(
  data.model.evidence.map((evidence) => [evidence.evidence_id, evidence])
);
for (const entry of data.benchmark.fact_index) {
  for (const evidenceId of entry.pairing_evidence_ids) {
    const evidence = evidenceById.get(evidenceId);
    assert.equal(evidence?.publish_permission, "authorized");
    assert.equal(evidence?.availability, "available");
  }
}

assert.deepEqual(data.inspector.assets, evidenceManifest.assets);
assert.equal(data.inspector.assets.length, 15);
const forbiddenCtGHashes = new Set([
  "41ab273c521fcc66025653e8cfe44f894afb01b2f1b9be72847dcf87db2f2c4b",
  "3c108732cc1f9c0dbd884ed3d171a0abacffc96d9e80a95d994dc1d1a43bd60a"
]);
for (const asset of data.inspector.assets) {
  assert.equal(path.isAbsolute(asset.logical_path), false);
  assert.doesNotMatch(asset.logical_path, /\\|\.\.|^[A-Za-z]:/);
  assert.equal(forbiddenCtGHashes.has(asset.sha256), false);
  const bytes = await fs.readFile(
    path.join(prototypeRoot, "public", ...asset.logical_path.split("/"))
  );
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    asset.sha256,
    "privacy checks must preserve raw authorized binary bytes"
  );
}
for (const documentId of [
  "document:pardo-coast-card",
  "document:pardo-coast-plan"
]) {
  assert.equal(
    data.inspector.assets.some((asset) => asset.document_id === documentId),
    false,
    "restricted CT-G originals must not enter the public asset manifest"
  );
}

for (const [value, expectedCode] of [
  [{ project_email: "persona@example.com" }, "PRIVACY_FORBIDDEN_KEY"],
  [{ note: "+51 987 654 321" }, "PRIVACY_PHONE"],
  [{ path: "C:\\Users\\Demo\\file.json" }, "PRIVACY_LOCAL_PATH"],
  [{ path: "/home/demo/file.json" }, "PRIVACY_LOCAL_PATH"],
  [{ path: "\\\\server\\share\\file.json" }, "PRIVACY_LOCAL_PATH"],
  [{ raw_payload: { secret: true } }, "PRIVACY_FORBIDDEN_KEY"]
]) {
  assert.ok(
    validatePrivacy(value).some((error) => error.code === expectedCode),
    expectedCode
  );
}

console.log(
  "Privacy integration OK: payload/benchmark/report/manifest, 15 authorized binaries, CT-G denylist and negatives pass."
);
