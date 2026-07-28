import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadContractSchema,
  validateFixture,
  validateRootDocument
} from "../scripts/data/validate.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const prototypeRoot = path.resolve(testDirectory, "..");
const repositoryRoot = path.resolve(prototypeRoot, "..");
const schema = loadContractSchema(
  path.join(prototypeRoot, "contracts", "demo-v2.schema.json")
);
const outputPath = path.join(
  prototypeRoot,
  "public",
  "demo-data",
  "viva-platform-demo.json"
);
const data = JSON.parse(await fs.readFile(outputPath, "utf8"));
const assetExists = (logicalPath) =>
  existsSync(path.join(prototypeRoot, "public", ...logicalPath.split("/")));

const rootErrors = validateRootDocument(data, { schema, assetExists });
assert.deepEqual(
  rootErrors,
  [],
  `root schema/semantics failed:\n${rootErrors
    .map((error) => `${error.code} ${error.path} ${error.message}`)
    .join("\n")}`
);

for (const name of [
  "ct-a.json",
  "ct-b.json",
  "ct-d.json",
  "ct-e.json",
  "ct-g.json",
  "ct-h.json"
]) {
  const fixturePath = path.join(
    repositoryRoot,
    "datos_relevantes",
    "demo-pilot",
    "fixtures",
    name
  );
  const fixture = JSON.parse(await fs.readFile(fixturePath, "utf8"));
  const errors = validateFixture(fixture, {
    schema,
    repositoryRoot,
    assetExists
  });
  assert.deepEqual(
    errors,
    [],
    `${name} failed:\n${errors
      .map((error) => `${error.code} ${error.path} ${error.message}`)
      .join("\n")}`
  );
}

assert.deepEqual(
  data.metadata.input_fingerprints.map((fingerprint) => fingerprint.path),
  [...data.metadata.input_fingerprints]
    .map((fingerprint) => fingerprint.path)
    .sort(),
  "input fingerprints must be ordered"
);

console.log("Schema integration OK: root v2 and CT-A/B/D/E/G/H validated.");
