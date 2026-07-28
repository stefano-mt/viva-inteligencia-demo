import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  REQUIRED_INPUT_PATHS,
  buildDemoData,
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

const first = await buildDemoData({ repositoryRoot, write: false });
const second = await buildDemoData({ repositoryRoot, write: false });
assert.equal(first.serialized, second.serialized);
assert.equal(first.sha256, second.sha256);
assert.equal(
  await fs.readFile(versionedOutputPath, "utf8"),
  first.serialized,
  "versioned output must equal generator output byte for byte"
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
assert.deepEqual(
  [...fingerprintByPath.keys()],
  [...REQUIRED_INPUT_PATHS],
  "every required input must be fingerprinted once"
);
for (const logicalPath of REQUIRED_INPUT_PATHS) {
  const content = await fs.readFile(
    path.join(repositoryRoot, ...logicalPath.split("/"))
  );
  assert.equal(fingerprintByPath.get(logicalPath), sha256(content), logicalPath);
}

const temporaryRoot = await fs.mkdtemp(
  path.join(os.tmpdir(), "viva-p1-07-")
);
try {
  for (const logicalPath of REQUIRED_INPUT_PATHS) {
    const source = path.join(repositoryRoot, ...logicalPath.split("/"));
    const target = path.join(temporaryRoot, ...logicalPath.split("/"));
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(source, target);
  }
  const hashesBefore = new Map();
  for (const logicalPath of REQUIRED_INPUT_PATHS) {
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
  for (const logicalPath of REQUIRED_INPUT_PATHS) {
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

  await assert.rejects(
    buildDemoData({
      repositoryRoot: temporaryRoot,
      outputPath: corruptPath
    }),
    /Output path cannot overwrite an input/
  );
} finally {
  await fs.rm(temporaryRoot, { recursive: true, force: true });
}

console.log(`Determinism OK: ${first.sha256}, strict missing/corrupt inputs.`);
