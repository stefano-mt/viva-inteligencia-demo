import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadContractSchema,
  validateRootDocument
} from "../scripts/data/validate.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const prototypeRoot = path.resolve(testDirectory, "..");
const repositoryRoot = path.resolve(prototypeRoot, "..");
const schema = loadContractSchema(
  path.join(prototypeRoot, "contracts", "demo-v2.schema.json")
);
const assetExists = (logicalPath) =>
  existsSync(path.join(prototypeRoot, "public", ...logicalPath.split("/")));

const publicData = JSON.parse(
  await fs.readFile(
    path.join(prototypeRoot, "public", "demo-data", "viva-platform-demo.json"),
    "utf8"
  )
);
const ctC = JSON.parse(
  await fs.readFile(
    path.join(
      repositoryRoot,
      "datos_relevantes",
      "demo-pilot",
      "fixtures",
      "ct-c.json"
    ),
    "utf8"
  )
);
const ctI = JSON.parse(
  await fs.readFile(
    path.join(
      repositoryRoot,
      "datos_relevantes",
      "demo-pilot",
      "fixtures",
      "ct-i.json"
    ),
    "utf8"
  )
);

const minimal20 = Object.fromEntries(
  schema.required.map((property) => [property, structuredClone(publicData[property])])
);
assert.equal(minimal20.metadata.contract_version, "2.0.0");
assert.deepEqual(
  validateRootDocument(minimal20, { schema, assetExists }),
  [],
  "reader 2.1 must continue to read a 2.0 payload without 2.1 fields"
);

const payload21 = structuredClone(minimal20);
payload21.metadata.contract_version = "2.1.0";
payload21.scenario_catalogs = structuredClone(ctC.input.scenario_catalogs);
payload21.scenario_defaults = {
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
};
payload21.geography = structuredClone(ctI.input.geography);
assert.deepEqual(
  validateRootDocument(payload21, { schema, assetExists }),
  [],
  "2.1 payload with geography and scenario contracts must pass"
);

const missingGeography = structuredClone(payload21);
delete missingGeography.geography;
assert.ok(
  validateRootDocument(missingGeography, { schema, assetExists }).some(
    (error) => error.code === "SCHEMA_REQUIRED"
  ),
  "2.1 payload must require geography"
);

const unsupportedMajor = structuredClone(payload21);
unsupportedMajor.metadata.contract_version = "3.0.0";
assert.ok(
  validateRootDocument(unsupportedMajor, { schema, assetExists }).some(
    (error) => error.code === "SCHEMA_ENUM"
  ),
  "unsupported major contract versions must fail"
);

const invalidRadiusDependencies = structuredClone(payload21);
invalidRadiusDependencies.scenario_defaults.scope_mode = "radius";
invalidRadiusDependencies.scenario_defaults.radius_meters = 500;
assert.ok(
  validateRootDocument(invalidRadiusDependencies, { schema, assetExists }).length >
    0,
  "radius scenarios without a target point must fail"
);

const invalidCatalog = structuredClone(payload21);
invalidCatalog.scenario_catalogs.typologies.push("local-comercial");
assert.ok(
  validateRootDocument(invalidCatalog, { schema, assetExists }).some(
    (error) => error.code === "SCHEMA_CONST"
  ),
  "catalog drift must fail"
);

console.log(
  "Contract compatibility OK: reader 2.1 accepts 2.0 and 2.1, rejects incomplete 2.1 and unsupported majors."
);
