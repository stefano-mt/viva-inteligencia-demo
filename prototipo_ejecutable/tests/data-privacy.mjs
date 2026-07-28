import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { validatePrivacy } from "../scripts/data/validate.js";

const data = JSON.parse(
  await fs.readFile(
    new URL("../public/demo-data/viva-platform-demo.json", import.meta.url),
    "utf8"
  )
);
const geography = JSON.parse(
  await fs.readFile(
    new URL("../public/demo-data/district-boundaries.geojson", import.meta.url),
    "utf8"
  )
);

assert.deepEqual(validatePrivacy(data), [], "public root must be privacy-clean");
assert.deepEqual(
  validatePrivacy(geography),
  [],
  "public GeoJSON must be privacy-clean"
);
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

console.log("Privacy integration OK: recursive public policy and negatives pass.");
