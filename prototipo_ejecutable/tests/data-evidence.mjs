import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CT_G_TRANSCRIPTION_BINDINGS,
  DEFAULT_REPOSITORY_ROOT,
  VERSIONED_EVIDENCE_FILES,
  assessPublicEvidenceAccess,
  buildEvidenceBundle,
  findPrivacyViolations,
  readEvidenceBundle,
  removeSingleTerminalNewline,
  serializeEvidenceBundle,
  sha256,
  validateEvidenceBundle
} from "../scripts/data/evidence.js";

const TEST_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const PROTOTYPE_ROOT = resolve(TEST_DIRECTORY, "..");
const REPOSITORY_ROOT = resolve(PROTOTYPE_ROOT, "..");
const FIXTURE_DIRECTORY = join(
  REPOSITORY_ROOT,
  "datos_relevantes",
  "demo-pilot",
  "fixtures"
);
const EVIDENCE_DIRECTORY = join(
  REPOSITORY_ROOT,
  "datos_relevantes",
  "demo-pilot",
  "evidence"
);
const FIXTURE_NAMES = [
  "ct-a.json",
  "ct-b.json",
  "ct-d.json",
  "ct-e.json",
  "ct-g.json"
];
const COLLECTION_IDS = {
  sources: "source_id",
  observations: "observation_id",
  documents: "document_id",
  evidence: "evidence_id"
};
const FORBIDDEN_IMAGE_EXTENSIONS = new Set([
  ".avif",
  ".bmp",
  ".gif",
  ".heic",
  ".jpeg",
  ".jpg",
  ".png",
  ".tif",
  ".tiff",
  ".webp"
]);

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function indexBy(records, idField) {
  return new Map(records.map((record) => [record[idField], record]));
}

function clone(value) {
  return structuredClone(value);
}

function expectedFixtureUnion(fixtures, collectionName, idField) {
  const byId = new Map();
  for (const fixture of fixtures) {
    for (const record of fixture.input[collectionName]) {
      const existing = byId.get(record[idField]);
      if (existing) {
        assert.deepEqual(
          record,
          existing,
          `${record[idField]} differs between fixture definitions`
        );
      } else {
        byId.set(record[idField], record);
      }
    }
  }
  return [...byId.values()].sort((left, right) =>
    compareStrings(left[idField], right[idField])
  );
}

function assertIncludesError(errors, pattern, message) {
  assert.ok(errors.some((error) => pattern.test(error)), message);
}

assert.equal(
  DEFAULT_REPOSITORY_ROOT,
  REPOSITORY_ROOT,
  "default repository root must resolve independently of process.cwd()"
);

const fixtures = FIXTURE_NAMES.map((name) =>
  readJson(join(FIXTURE_DIRECTORY, name))
);
const rawBundle = readEvidenceBundle({ repositoryRoot: REPOSITORY_ROOT });
const errors = validateEvidenceBundle(rawBundle, {
  repositoryRoot: REPOSITORY_ROOT
});
assert.deepEqual(errors, [], `evidence bundle must validate:\n${errors.join("\n")}`);

for (const [collectionName, idField] of Object.entries(COLLECTION_IDS)) {
  const fixtureBaseline = expectedFixtureUnion(fixtures, collectionName, idField);
  const actualById = indexBy(rawBundle[collectionName], idField);
  for (const record of fixtureBaseline) {
    assert.ok(
      actualById.has(record[idField]),
      `${record[idField]} from the CT-A/B/D/E/G baseline must remain addressable`
    );
  }
  const ids = rawBundle[collectionName].map((record) => record[idField]);
  assert.equal(
    new Set(ids).size,
    ids.length,
    `${collectionName} IDs must be unique`
  );
  assert.deepEqual(
    ids,
    [...ids].sort(compareStrings),
    `${collectionName} must be ordered by ${idField}`
  );
}
assert.deepEqual(
  {
    sources: rawBundle.sources.length,
    observations: rawBundle.observations.length,
    documents: rawBundle.documents.length,
    evidence: rawBundle.evidence.length,
    assets: rawBundle.manifest.assets.length
  },
  { sources: 10, observations: 30, documents: 19, evidence: 19, assets: 15 }
);

const sources = indexBy(rawBundle.sources, "source_id");
const observations = indexBy(rawBundle.observations, "observation_id");
const documents = indexBy(rawBundle.documents, "document_id");
const evidence = indexBy(rawBundle.evidence, "evidence_id");

for (const observation of rawBundle.observations) {
  assert.ok(
    sources.has(observation.source_id),
    `${observation.observation_id} must reference an existing source`
  );
  for (const evidenceId of observation.evidence_ids) {
    assert.equal(
      evidence.get(evidenceId)?.observation_id,
      observation.observation_id,
      `${observation.observation_id} must own ${evidenceId}`
    );
  }
}
for (const document of rawBundle.documents) {
  assert.ok(
    sources.has(document.source_id),
    `${document.document_id} must reference an existing source`
  );
}
for (const record of rawBundle.evidence) {
  assert.ok(
    observations.has(record.observation_id),
    `${record.evidence_id} must reference an existing observation`
  );
  assert.ok(
    record.document_id === null || documents.has(record.document_id),
    `${record.evidence_id} must reference an existing document`
  );
}

const countertopEvidence = evidence.get("evidence:ct-d-countertop-fragment");
const countertopDocument = documents.get("document:ct-d-authorized");
const countertopRelativePath =
  VERSIONED_EVIDENCE_FILES["evidence:ct-d-countertop-fragment"];
const countertopPath = join(
  REPOSITORY_ROOT,
  ...countertopRelativePath.split("/")
);
assert.ok(existsSync(countertopPath), "available CT-D evidence file must exist");
const countertopContent = removeSingleTerminalNewline(
  readFileSync(countertopPath, "utf8")
);
assert.equal(
  countertopContent,
  "Cubierta de cocina: cuarzo.",
  "CT-D authorized fragment must be reproducible"
);
assert.equal(
  sha256(countertopContent),
  countertopEvidence.sha256,
  "CT-D evidence hash must match versioned fragment content"
);
assert.equal(
  sha256(countertopContent),
  countertopDocument.sha256,
  "CT-D document hash must match versioned fragment content"
);
assert.equal(countertopEvidence.publish_permission, "authorized");
assert.equal(countertopEvidence.availability, "available");

for (const documentId of [
  "document:ct-d-restricted",
  "document:pardo-coast-card",
  "document:pardo-coast-plan"
]) {
  const document = documents.get(documentId);
  assert.equal(
    document.public_asset_path,
    null,
    `${documentId} must not expose a public asset path`
  );
}
assert.equal(documents.get("document:ct-d-restricted").availability, "restricted");
assert.equal(
  evidence.get("evidence:ct-d-restricted-metadata").fragment,
  null,
  "restricted CT-D metadata must not expose a fragment"
);
assert.equal(
  VERSIONED_EVIDENCE_FILES["evidence:ct-d-restricted-metadata"],
  undefined,
  "restricted CT-D evidence must not map to a versioned asset"
);
assert.equal(
  documents.get("document:pardo-coast-card").availability,
  "unavailable",
  "missing CT-G card asset must remain unavailable"
);
assert.equal(
  VERSIONED_EVIDENCE_FILES["evidence:pardo-coast-card-metadata"],
  undefined,
  "unavailable CT-G card must not map to a fabricated file"
);
assert.equal(
  documents.get("document:pardo-coast-plan").availability,
  "restricted",
  "CT-G plan must remain restricted"
);
assert.equal(
  VERSIONED_EVIDENCE_FILES["evidence:pardo-coast-plan-metadata"],
  undefined,
  "restricted CT-G plan must not map to a versioned asset"
);

assert.equal(rawBundle.transcriptions.case_id, "CT-G");
assert.equal(rawBundle.transcriptions.artifact_role, "structured_transcription_only");
assert.equal(rawBundle.transcriptions.source_assets_included, false);
assert.deepEqual(
  rawBundle.transcriptions.records.map((record) => record.observation_id),
  ["observation:pardo-coast-card", "observation:pardo-coast-plan"],
  "CT-G transcriptions must be deterministically ordered"
);
const cardTranscription = rawBundle.transcriptions.records[0];
const planTranscription = rawBundle.transcriptions.records[1];
assert.deepEqual(
  rawBundle.transcriptions.records.map(
    ({ observation_id, evidence_id, document_id }) => ({
      observation_id,
      evidence_id,
      document_id
    })
  ),
  CT_G_TRANSCRIPTION_BINDINGS,
  "CT-G transcription binding set must be exact"
);
assert.equal(cardTranscription.transcription.published_area_original, "104.15 m²");
assert.equal(cardTranscription.transcription.floor_label_original, "Piso 1");
assert.equal(planTranscription.transcription.area_label_original, "Área Total 53.37 m2");
assert.equal(planTranscription.transcription.unit_range_original, "Dep. 807 AL 1007");
for (const transcription of rawBundle.transcriptions.records) {
  assert.equal(transcription.public_asset_path, null);
  assert.equal(
    transcription.source_sha256,
    documents.get(transcription.document_id).sha256,
    "CT-G transcription must preserve document source hash"
  );
  assert.equal(
    transcription.source_sha256,
    evidence.get(transcription.evidence_id).sha256,
    "CT-G transcription must preserve evidence source hash"
  );
}

const evidenceDirectoryFiles = readdirSync(EVIDENCE_DIRECTORY, {
  withFileTypes: true
});
assert.ok(
  evidenceDirectoryFiles.every((entry) => entry.isFile()),
  "evidence directory must not contain opaque nested assets"
);
assert.ok(
  evidenceDirectoryFiles.every(
    (entry) => !FORBIDDEN_IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase())
  ),
  "CT-G source images must not be copied into the repository"
);

assert.deepEqual(
  findPrivacyViolations(rawBundle),
  [],
  "catalogs and transcriptions must not contain contact PII, local paths or raw payloads"
);
for (const entry of evidenceDirectoryFiles) {
  const content = readFileSync(join(EVIDENCE_DIRECTORY, entry.name), "utf8");
  const privacyValue =
    extname(entry.name).toLowerCase() === ".json" ? JSON.parse(content) : content;
  assert.deepEqual(
    findPrivacyViolations(privacyValue),
    [],
    `${entry.name} must pass the privacy scan`
  );
}

for (const badValue of [
  { project_email: "persona@example.com" },
  { project_phone: "987 654 321" },
  { project_whatsapp: "+51 987 654 321" },
  { raw_payload: { hidden: true } },
  { reference: "C:\\Users\\Demo\\AppData\\Local\\Temp\\asset.png" },
  { reference: "/Users/demo/asset.png" },
  { reference: "outputs/private/raw.json" }
]) {
  assert.ok(
    findPrivacyViolations(badValue).length > 0,
    `privacy scanner must reject ${JSON.stringify(badValue)}`
  );
}

const missingReferenceBundle = clone(rawBundle);
missingReferenceBundle.observations[0].source_id = "source:missing";
assertIncludesError(
  validateEvidenceBundle(missingReferenceBundle, {
    repositoryRoot: REPOSITORY_ROOT
  }),
  /references missing source/,
  "validator must reject broken references"
);

const fabricatedAvailabilityBundle = clone(rawBundle);
fabricatedAvailabilityBundle.evidence.find(
  (record) => record.evidence_id === "evidence:pardo-coast-card-metadata"
).availability = "available";
assertIncludesError(
  validateEvidenceBundle(fabricatedAvailabilityBundle, {
    repositoryRoot: REPOSITORY_ROOT
  }),
  /available but has no versioned file/,
  "validator must reject available status without a real versioned file"
);

const exposedRestrictedBundle = clone(rawBundle);
exposedRestrictedBundle.documents.find(
  (document) => document.document_id === "document:pardo-coast-plan"
).public_asset_path = "assets/evidence/pardo-coast-plan.jpg";
assertIncludesError(
  validateEvidenceBundle(exposedRestrictedBundle, {
    repositoryRoot: REPOSITORY_ROOT
  }),
  /cannot publish an asset/,
  "validator must reject a public path for restricted evidence"
);

const missingPublicAssetBundle = clone(rawBundle);
missingPublicAssetBundle.documents.find(
  (document) => document.document_id === "document:f3-area-match-card"
).public_asset_path = "assets/evidence/missing.webp";
assertIncludesError(
  validateEvidenceBundle(missingPublicAssetBundle, {
    repositoryRoot: REPOSITORY_ROOT
  }),
  /public asset does not resolve to versioned content/,
  "authorized available public path must fail when the versioned file is missing"
);

assertIncludesError(
  validateEvidenceBundle(rawBundle, {
    repositoryRoot: REPOSITORY_ROOT,
    readPublicAsset: () => Buffer.from("contenido alterado")
  }),
  /public asset hash mismatch/,
  "resolved public asset must match the document hash"
);

const publicFragmentBundle = clone(rawBundle);
publicFragmentBundle.evidence.find(
  (record) => record.evidence_id === "evidence:ct-d-restricted-metadata"
).fragment = "contenido restringido";
assertIncludesError(
  validateEvidenceBundle(publicFragmentBundle, {
    repositoryRoot: REPOSITORY_ROOT
  }),
  /cannot expose a fragment/,
  "validator must reject a fragment without authorization"
);

const permissionEscalationBundle = clone(rawBundle);
permissionEscalationBundle.evidence.find(
  (record) => record.evidence_id === "evidence:ct-d-restricted-metadata"
).publish_permission = "authorized";
assertIncludesError(
  validateEvidenceBundle(permissionEscalationBundle, {
    repositoryRoot: REPOSITORY_ROOT
  }),
  /publish permission is less restrictive/,
  "evidence must not escalate a restricted document to authorized"
);

const availabilityEscalationBundle = clone(rawBundle);
const availabilityEscalation = availabilityEscalationBundle.evidence.find(
  (record) => record.evidence_id === "evidence:ct-d-restricted-metadata"
);
availabilityEscalation.availability = "available";
availabilityEscalation.fragment = "contenido no publicable";
assertIncludesError(
  validateEvidenceBundle(availabilityEscalationBundle, {
    repositoryRoot: REPOSITORY_ROOT
  }),
  /availability is less restrictive/,
  "evidence must not escalate restricted document availability"
);
assertIncludesError(
  validateEvidenceBundle(availabilityEscalationBundle, {
    repositoryRoot: REPOSITORY_ROOT
  }),
  /fragment is not publicable/,
  "fragment needs authorized and available evidence plus document"
);

const pendingEscalationBundle = clone(rawBundle);
const pendingEscalationEvidence = pendingEscalationBundle.evidence.find(
  (record) => record.evidence_id === "evidence:pardo-coast-card-metadata"
);
pendingEscalationEvidence.publish_permission = "authorized";
pendingEscalationEvidence.availability = "available";
pendingEscalationEvidence.fragment = "transcripción indebidamente publicable";
assertIncludesError(
  validateEvidenceBundle(pendingEscalationBundle, {
    repositoryRoot: REPOSITORY_ROOT
  }),
  /publish permission is less restrictive/,
  "pending document evidence must not escalate to authorized"
);
assertIncludesError(
  validateEvidenceBundle(pendingEscalationBundle, {
    repositoryRoot: REPOSITORY_ROOT
  }),
  /availability is less restrictive/,
  "unavailable document evidence must not escalate to available"
);
assertIncludesError(
  validateEvidenceBundle(pendingEscalationBundle, {
    repositoryRoot: REPOSITORY_ROOT
  }),
  /fragment is not publicable/,
  "pending/unavailable document must never expose a fragment"
);

const pendingPublicPathBundle = clone(rawBundle);
pendingPublicPathBundle.documents.find(
  (document) => document.document_id === "document:pardo-coast-card"
).public_asset_path = "assets/evidence/ct-d-countertop-fragment.txt";
assertIncludesError(
  validateEvidenceBundle(pendingPublicPathBundle, {
    repositoryRoot: REPOSITORY_ROOT
  }),
  /cannot publish an asset/,
  "pending document must never expose a public path"
);

const fragmentHashMismatchBundle = clone(rawBundle);
fragmentHashMismatchBundle.evidence.find(
  (record) => record.evidence_id === "evidence:ct-d-countertop-fragment"
).fragment = "Cubierta de cocina: granito.";
assertIncludesError(
  validateEvidenceBundle(fragmentHashMismatchBundle, {
    repositoryRoot: REPOSITORY_ROOT
  }),
  /fragment hash mismatch/,
  "non-null fragment must verify its own SHA-256"
);

const transcriptionEvidenceObservationMismatch = clone(rawBundle);
transcriptionEvidenceObservationMismatch.evidence.find(
  (record) => record.evidence_id === "evidence:pardo-coast-card-metadata"
).observation_id = "observation:pardo-coast-plan";
assertIncludesError(
  validateEvidenceBundle(transcriptionEvidenceObservationMismatch, {
    repositoryRoot: REPOSITORY_ROOT
  }),
  /transcription evidence observation mismatch/,
  "CT-G evidence observation must match its transcription"
);

const transcriptionEvidenceDocumentMismatch = clone(rawBundle);
transcriptionEvidenceDocumentMismatch.evidence.find(
  (record) => record.evidence_id === "evidence:pardo-coast-card-metadata"
).document_id = "document:pardo-coast-plan";
assertIncludesError(
  validateEvidenceBundle(transcriptionEvidenceDocumentMismatch, {
    repositoryRoot: REPOSITORY_ROOT
  }),
  /transcription evidence document mismatch/,
  "CT-G evidence document must match its transcription"
);

const transcriptionObservationLinkMismatch = clone(rawBundle);
transcriptionObservationLinkMismatch.observations.find(
  (observation) => observation.observation_id === "observation:pardo-coast-card"
).evidence_ids = [];
assertIncludesError(
  validateEvidenceBundle(transcriptionObservationLinkMismatch, {
    repositoryRoot: REPOSITORY_ROOT
  }),
  /transcription evidence is not linked/,
  "CT-G observation must link its transcription evidence"
);

const duplicateTranscriptionIds = clone(rawBundle);
duplicateTranscriptionIds.transcriptions.records[1].evidence_id =
  duplicateTranscriptionIds.transcriptions.records[0].evidence_id;
assertIncludesError(
  validateEvidenceBundle(duplicateTranscriptionIds, {
    repositoryRoot: REPOSITORY_ROOT
  }),
  /transcription IDs must be unique/,
  "CT-G transcription IDs must be unique"
);

const missingTranscriptionBinding = clone(rawBundle);
missingTranscriptionBinding.transcriptions.records.pop();
assertIncludesError(
  validateEvidenceBundle(missingTranscriptionBinding, {
    repositoryRoot: REPOSITORY_ROOT
  }),
  /transcription binding set is not exact/,
  "CT-G transcription set must not omit an expected binding"
);

const extraTranscriptionBinding = clone(rawBundle);
extraTranscriptionBinding.transcriptions.records.push({
  ...clone(extraTranscriptionBinding.transcriptions.records[0]),
  observation_id: "observation:pardo-coast-conflict-derived",
  evidence_id: "evidence:extra",
  document_id: "document:extra"
});
assertIncludesError(
  validateEvidenceBundle(extraTranscriptionBinding, {
    repositoryRoot: REPOSITORY_ROOT
  }),
  /transcription binding set is not exact/,
  "CT-G transcription set must not include an extra binding"
);

const extraCtGEvidence = clone(rawBundle);
extraCtGEvidence.evidence.push({
  ...clone(extraCtGEvidence.evidence[2]),
  evidence_id: "evidence:pardo-coast-extra-metadata"
});
extraCtGEvidence.evidence.sort((left, right) =>
  left.evidence_id.localeCompare(right.evidence_id)
);
assertIncludesError(
  validateEvidenceBundle(extraCtGEvidence, {
    repositoryRoot: REPOSITORY_ROOT
  }),
  /CT-G evidence set is not exact/,
  "CT-G evidence catalog must not silently accept an extra record"
);

const transcriptionCapturedAtMismatch = clone(rawBundle);
transcriptionCapturedAtMismatch.transcriptions.records[0].captured_at =
  "2026-07-27T20:24:00-05:00";
assertIncludesError(
  validateEvidenceBundle(transcriptionCapturedAtMismatch, {
    repositoryRoot: REPOSITORY_ROOT
  }),
  /transcription captured_at mismatch/,
  "CT-G transcription captured_at must match observation, evidence and document"
);

const cardObservation = observations.get("observation:pardo-coast-card");
const cardEvidence = evidence.get("evidence:pardo-coast-card-metadata");
const cardDocument = documents.get("document:pardo-coast-card");
assert.equal(
  cardObservation.evidence_status,
  "available",
  "available observation status means the linked metadata record exists"
);
const unavailableCardAccess = assessPublicEvidenceAccess({
  observation: cardObservation,
  evidenceRecord: cardEvidence,
  document: cardDocument
});
assert.equal(
  unavailableCardAccess.openable,
  false,
  "linked CT-G metadata must not make the unavailable pending asset openable"
);
assert.ok(unavailableCardAccess.reasons.includes("PUBLICATION_NOT_AUTHORIZED"));
assert.ok(unavailableCardAccess.reasons.includes("ASSET_NOT_AVAILABLE"));
assert.ok(unavailableCardAccess.reasons.includes("PUBLIC_ASSET_PATH_MISSING"));

const openableDocument = {
  ...countertopDocument,
  public_asset_path: "assets/evidence/ct-d-countertop-fragment.txt"
};
assert.deepEqual(
  assessPublicEvidenceAccess(
    {
      observation: observations.get("observation:ct-d-countertop"),
      evidenceRecord: countertopEvidence,
      document: openableDocument
    },
    {
      repositoryRoot: REPOSITORY_ROOT,
      readPublicAsset: () => Buffer.from("Cubierta de cocina: cuarzo.")
    }
  ),
  { openable: true, reasons: [] },
  "opening requires linked, authorized, available, real and hash-valid content"
);
const badHashAccess = assessPublicEvidenceAccess(
  {
    observation: observations.get("observation:ct-d-countertop"),
    evidenceRecord: countertopEvidence,
    document: openableDocument
  },
  {
    repositoryRoot: REPOSITORY_ROOT,
    readPublicAsset: () => Buffer.from("contenido alterado")
  }
);
assert.equal(badHashAccess.openable, false);
assert.ok(badHashAccess.reasons.includes("PUBLIC_ASSET_HASH_MISMATCH"));
let unsafeReaderCalled = false;
const unsafePathAccess = assessPublicEvidenceAccess(
  {
    observation: observations.get("observation:ct-d-countertop"),
    evidenceRecord: countertopEvidence,
    document: {
      ...openableDocument,
      public_asset_path: "assets/evidence/../restricted.txt"
    }
  },
  {
    repositoryRoot: REPOSITORY_ROOT,
    readPublicAsset: () => {
      unsafeReaderCalled = true;
      return Buffer.from("Cubierta de cocina: cuarzo.");
    }
  }
);
assert.equal(unsafePathAccess.openable, false);
assert.ok(unsafePathAccess.reasons.includes("PUBLIC_ASSET_NOT_FOUND"));
assert.equal(
  unsafeReaderCalled,
  false,
  "unsafe logical paths must be rejected before invoking a reader callback"
);

const firstBuild = buildEvidenceBundle({ repositoryRoot: REPOSITORY_ROOT });
const secondBuild = buildEvidenceBundle({ repositoryRoot: REPOSITORY_ROOT });
assert.deepEqual(firstBuild, secondBuild, "two evidence builds must be identical");
assert.equal(
  serializeEvidenceBundle(firstBuild),
  serializeEvidenceBundle(secondBuild),
  "serialized evidence output must be byte-for-byte deterministic"
);

const visualEvidence = evidence.get("evidence:f3-area-match-card");
const visualDocument = documents.get(visualEvidence.document_id);
const visualAssetPath = join(
  PROTOTYPE_ROOT,
  "public",
  ...visualDocument.public_asset_path.split("/")
);
assert.deepEqual(
  assessPublicEvidenceAccess(
    {
      observation: observations.get(visualEvidence.observation_id),
      evidenceRecord: visualEvidence,
      document: visualDocument
    },
    {
      repositoryRoot: REPOSITORY_ROOT,
      readPublicAsset: () => readFileSync(visualAssetPath)
    }
  ),
  { openable: true, reasons: [] },
  "visual evidence must use the raw WebP hash, not the descriptive fragment hash"
);
const descriptiveFragment = clone(rawBundle);
descriptiveFragment.evidence.find(
  (record) => record.evidence_id === visualEvidence.evidence_id
).fragment += " Descripción accesible adicional.";
assert.deepEqual(
  validateEvidenceBundle(descriptiveFragment, {
    repositoryRoot: REPOSITORY_ROOT
  }),
  [],
  "an image_region description is not the content addressed by sha256"
);
const alteredAssetHash = clone(rawBundle);
alteredAssetHash.manifest.assets[0].sha256 = "a".repeat(64);
assertIncludesError(
  validateEvidenceBundle(alteredAssetHash, {
    repositoryRoot: REPOSITORY_ROOT
  }),
  /raw binary hash mismatch|does not match its published document/,
  "manifest mutations must fail raw binary/document parity"
);
const orphanManifest = clone(rawBundle);
orphanManifest.manifest.assets.pop();
assertIncludesError(
  validateEvidenceBundle(orphanManifest, {
    repositoryRoot: REPOSITORY_ROOT
  }),
  /exactly cover published documents|orphan or unmanifested/,
  "unmanifested public WebP files must fail"
);

const implementationSource = readFileSync(
  join(PROTOTYPE_ROOT, "scripts", "data", "evidence.js"),
  "utf8"
);
assert.doesNotMatch(
  implementationSource,
  /\bfetch\s*\(|node:https?|https?\.request\s*\(/,
  "evidence implementation must not perform network calls"
);

console.log(
  `Data evidence contract OK: ${rawBundle.sources.length} sources, ` +
    `${rawBundle.observations.length} observations, ${rawBundle.documents.length} documents, ` +
    `${rawBundle.evidence.length} evidence records and ${rawBundle.manifest.assets.length} visual assets; ` +
    "fixture baseline, raw binary/text hashes, permissions, privacy and deterministic order verified."
);
