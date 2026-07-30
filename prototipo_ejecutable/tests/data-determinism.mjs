import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  binaryInputSha256,
  buildDemoData,
  canonicalizeLogicalEol,
  discoverRequiredInputPaths,
  logicalInputSha256,
  sha256
} from "../scripts/build-demo-data.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const prototypeRoot = path.resolve(testDirectory, "..");
const repositoryRoot = path.resolve(prototypeRoot, "..");
const versionedOutputPath = path.join(
  prototypeRoot,
  "public",
  "demo-data",
  "viva-platform-demo.json"
);
const versionedGeoJsonPath = path.join(
  prototypeRoot,
  "public",
  "demo-data",
  "district-boundaries.geojson"
);
const versionedCoveragePath = path.join(
  repositoryRoot,
  "datos_relevantes",
  "demo-pilot",
  "coverage-report.json"
);

const first = await buildDemoData({ repositoryRoot, write: false });
const second = await buildDemoData({ repositoryRoot, write: false });
assert.equal(first.serialized, second.serialized);
assert.equal(first.sha256, second.sha256);
assert.equal(first.geoJsonSerialized, second.geoJsonSerialized);
assert.equal(first.geoJsonSha256, second.geoJsonSha256);
assert.equal(first.coverageReportSerialized, second.coverageReportSerialized);
assert.equal(first.coverageReportSha256, second.coverageReportSha256);
assert.equal(
  canonicalizeLogicalEol(await fs.readFile(versionedOutputPath)),
  first.serialized,
  "versioned output must equal the generator after logical EOL normalization"
);
assert.equal(
  canonicalizeLogicalEol(await fs.readFile(versionedGeoJsonPath)),
  first.geoJsonSerialized,
  "versioned GeoJSON must equal the unsimplified generator after logical EOL normalization"
);
assert.equal(
  canonicalizeLogicalEol(await fs.readFile(versionedCoveragePath)),
  first.coverageReportSerialized,
  "versioned coverage report must equal the deterministic writer"
);
assert.equal(first.geoJsonBytes, 46650);
assert.equal(
  first.payload.geography.boundary_artifact_sha256,
  first.geoJsonSha256
);

const buildSource = await fs.readFile(
  path.join(prototypeRoot, "scripts", "build-demo-data.js"),
  "utf8"
);
assert.equal(/\bnew\s+Date\b|\bDate\b/.test(buildSource), false);
assert.equal(
  /\bfetch\s*\(|node:https|node:http|https\.request|http\.request/.test(
    buildSource
  ),
  false
);

const fingerprintByPath = new Map(
  first.payload.metadata.input_fingerprints.map((fingerprint) => [
    fingerprint.path,
    fingerprint.sha256
  ])
);
const requiredInputPaths = await discoverRequiredInputPaths(repositoryRoot);
assert.deepEqual(
  [...fingerprintByPath.keys()],
  requiredInputPaths,
  "every required input must be fingerprinted once"
);
assert.equal(requiredInputPaths.length, 48);
assert.equal(fingerprintByPath.size, 48);
for (const logicalPath of requiredInputPaths) {
  const content = await fs.readFile(
    path.join(repositoryRoot, ...logicalPath.split("/"))
  );
  assert.equal(
    fingerprintByPath.get(logicalPath),
    logicalPath.endsWith(".webp")
      ? binaryInputSha256(content)
      : logicalInputSha256(content),
    logicalPath
  );
}

const temporaryRoot = await fs.mkdtemp(
  path.join(os.tmpdir(), "viva-p1-07-")
);
try {
  for (const logicalPath of requiredInputPaths) {
    const source = path.join(repositoryRoot, ...logicalPath.split("/"));
    const target = path.join(temporaryRoot, ...logicalPath.split("/"));
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(source, target);
  }
  const hashesBefore = new Map();
  for (const logicalPath of requiredInputPaths) {
    hashesBefore.set(
      logicalPath,
      sha256(
        await fs.readFile(
          path.join(temporaryRoot, ...logicalPath.split("/"))
        )
      )
    );
  }

  const temporaryOutput = path.join(temporaryRoot, "build", "demo.json");
  const temporaryBuild = await buildDemoData({
    repositoryRoot: temporaryRoot,
    outputPath: temporaryOutput
  });
  assert.equal(
    await fs.readFile(temporaryOutput, "utf8"),
    temporaryBuild.serialized
  );
  assert.equal(temporaryBuild.serialized, first.serialized);
  assert.equal(temporaryBuild.geoJsonSerialized, first.geoJsonSerialized);
  assert.equal(
    temporaryBuild.coverageReportSerialized,
    first.coverageReportSerialized
  );
  for (const logicalPath of requiredInputPaths) {
    assert.equal(
      sha256(
        await fs.readFile(
          path.join(temporaryRoot, ...logicalPath.split("/"))
        )
      ),
      hashesBefore.get(logicalPath),
      `build must not alter ${logicalPath}`
    );
  }

  const missingPath = path.join(
    temporaryRoot,
    "datos_relevantes",
    "demo-pilot",
    "events.json"
  );
  const validEvents = await fs.readFile(missingPath);
  await fs.rm(missingPath);
  await assert.rejects(
    buildDemoData({
      repositoryRoot: temporaryRoot,
      outputPath: path.join(temporaryRoot, "build", "missing.json")
    }),
    /Required input is missing or unreadable: datos_relevantes\/demo-pilot\/events\.json/
  );
  await fs.writeFile(missingPath, validEvents);

  const corruptPath = path.join(
    temporaryRoot,
    "datos_relevantes",
    "demo-pilot",
    "issues.json"
  );
  const validIssues = await fs.readFile(corruptPath);
  await fs.writeFile(corruptPath, "{invalid-json", "utf8");
  await assert.rejects(
    buildDemoData({
      repositoryRoot: temporaryRoot,
      outputPath: path.join(temporaryRoot, "build", "corrupt.json")
    }),
    /Invalid JSON in datos_relevantes\/demo-pilot\/issues\.json/
  );
  await fs.writeFile(corruptPath, validIssues);

  const eolPath = path.join(
    temporaryRoot,
    "datos_relevantes",
    "demo-pilot",
    "events.json"
  );
  const logicalEvents = canonicalizeLogicalEol(await fs.readFile(eolPath));
  await fs.writeFile(eolPath, logicalEvents.replace(/\n/g, "\r\n"), "utf8");
  const crossPlatformBuild = await buildDemoData({
    repositoryRoot: temporaryRoot,
    write: false
  });
  assert.equal(
    crossPlatformBuild.serialized,
    first.serialized,
    "logical LF/CRLF differences must not change fingerprints or payload bytes"
  );
  assert.equal(crossPlatformBuild.geoJsonSha256, first.geoJsonSha256);
  assert.equal(
    crossPlatformBuild.coverageReportSerialized,
    first.coverageReportSerialized
  );

  const webpLogicalPath = requiredInputPaths.find((logicalPath) =>
    logicalPath.endsWith(".webp")
  );
  const webpPath = path.join(
    temporaryRoot,
    ...webpLogicalPath.split("/")
  );
  const validWebp = await fs.readFile(webpPath);
  const corruptWebp = Buffer.from(validWebp);
  corruptWebp[corruptWebp.length - 1] ^= 0xff;
  await fs.writeFile(webpPath, corruptWebp);
  await assert.rejects(
    buildDemoData({
      repositoryRoot: temporaryRoot,
      write: false
    }),
    /raw binary hash mismatch|public asset hash mismatch/
  );
  await fs.writeFile(webpPath, validWebp);

  await assert.rejects(
    buildDemoData({
      repositoryRoot: temporaryRoot,
      outputPath: corruptPath
    }),
    /Output path cannot overwrite an input/
  );
  await assert.rejects(
    buildDemoData({
      repositoryRoot: temporaryRoot,
      outputPath: webpPath
    }),
    /Output path cannot overwrite an input/
  );
} finally {
  await fs.rm(temporaryRoot, { recursive: true, force: true });
}

console.log(
  `Determinism OK: JSON ${first.sha256}, report ${first.coverageReportSha256}, ` +
    `GeoJSON ${first.geoJsonSha256}, 48 sorted text/binary inputs.`
);
