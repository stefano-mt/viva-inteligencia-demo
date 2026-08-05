import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, "../..");
const readJson = async (relativePath) =>
  JSON.parse(await fs.readFile(path.join(repositoryRoot, relativePath), "utf8"));
const data = await readJson(
  "prototipo_ejecutable/public/demo-data/viva-platform-demo.json"
);

for (const collection of [
  "sources",
  "observations",
  "documents",
  "evidence"
]) {
  const source = await readJson(`datos_relevantes/demo-pilot/${collection}.json`);
  if (collection === "observations") {
    const sourceIds = new Set(
      source.map((record) => record.observation_id)
    );
    const retainedSourceRecords = data.model.observations.filter((record) =>
      sourceIds.has(record.observation_id)
    );
    const addedRecords = data.model.observations.filter(
      (record) => !sourceIds.has(record.observation_id)
    );
    assert.deepEqual(
      retainedSourceRecords,
      source,
      "observations must preserve the complete P1-04 catalog"
    );
    const benchmarkRecords = addedRecords.filter((record) =>
      record.observation_id.startsWith("observation:benchmark-nexo-")
    );
    const historyRecords = addedRecords.filter((record) =>
      record.observation_id.startsWith("observation:history-nexo-")
    );
    assert.equal(benchmarkRecords.length, 397);
    assert.equal(historyRecords.length, 72);
    assert.ok(
      addedRecords.length === benchmarkRecords.length + historyRecords.length,
      "every observation added after P1-04 must belong to F4 benchmark or F5 history"
    );
    continue;
  }
  if (["documents", "evidence"].includes(collection)) {
    const idField = collection === "documents" ? "document_id" : "evidence_id";
    const sourceIds = new Set(source.map((record) => record[idField]));
    assert.deepEqual(
      data.model[collection].filter((record) => sourceIds.has(record[idField])),
      source,
      `${collection} must preserve the complete P1-04 catalog`
    );
    const addedRecords = data.model[collection].filter(
      (record) => !sourceIds.has(record[idField])
    );
    assert.equal(addedRecords.length, collection === "documents" ? 1 : 72);
    assert.ok(
      addedRecords.every((record) => record[idField].startsWith(`${collection === "documents" ? "document" : "evidence"}:history-`)),
      `${collection} additions must belong to the F5 history namespace`
    );
    continue;
  }
  assert.deepEqual(
    data.model[collection],
    source,
    `${collection} must remain the P1-04 catalog`
  );
}

const documents = new Map(
  data.model.documents.map((document) => [document.document_id, document])
);
const observations = new Map(
  data.model.observations.map((observation) => [
    observation.observation_id,
    observation
  ])
);
for (const document of data.model.documents) {
  if (
    document.publish_permission !== "authorized" ||
    document.availability !== "available"
  ) {
    assert.equal(document.public_asset_path, null, document.document_id);
  }
}
for (const evidence of data.model.evidence) {
  const document = documents.get(evidence.document_id);
  assert.ok(document);
  assert.equal(document.sha256, evidence.sha256);
  assert.equal(
    observations
      .get(evidence.observation_id)
      .evidence_ids.includes(evidence.evidence_id),
    true
  );
  if (
    evidence.publish_permission !== "authorized" ||
    evidence.availability !== "available"
  ) {
    assert.equal(evidence.fragment, null, evidence.evidence_id);
  }
}

const countertop = data.model.evidence.find(
  (evidence) =>
    evidence.evidence_id === "evidence:ct-d-countertop-fragment"
);
assert.equal(countertop.fragment, "Cubierta de cocina: cuarzo.");
assert.equal(
  createHash("sha256").update(countertop.fragment).digest("hex"),
  countertop.sha256
);
for (const documentId of [
  "document:pardo-coast-card",
  "document:pardo-coast-plan",
  "document:ct-d-restricted"
]) {
  assert.equal(documents.get(documentId).public_asset_path, null);
}

console.log(
  `Evidence integration OK: ${data.model.sources.length} sources, 30 preserved + 397 benchmark + 72 history observations, ${data.model.evidence.length} evidence records.`
);
