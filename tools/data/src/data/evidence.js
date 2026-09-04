import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));

export const DEFAULT_REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, "../../../..");

export const EVIDENCE_CATALOG_PATHS = Object.freeze({
  sources: "data/source/demo-pilot/sources.json",
  observations: "data/source/demo-pilot/observations.json",
  documents: "data/source/demo-pilot/documents.json",
  evidence: "data/source/demo-pilot/evidence.json",
  manifest: "data/source/demo-pilot/evidence-manifest.json",
  transcriptions: "data/source/demo-pilot/evidence/ct-g-transcriptions.json"
});

export const VERSIONED_EVIDENCE_FILES = Object.freeze({
  "evidence:ct-d-countertop-fragment":
    "data/source/demo-pilot/evidence/ct-d-countertop-fragment.txt"
});

export const CT_G_TRANSCRIPTION_BINDINGS = Object.freeze([
  Object.freeze({
    observation_id: "observation:pardo-coast-card",
    evidence_id: "evidence:pardo-coast-card-metadata",
    document_id: "document:pardo-coast-card"
  }),
  Object.freeze({
    observation_id: "observation:pardo-coast-plan",
    evidence_id: "evidence:pardo-coast-plan-metadata",
    document_id: "document:pardo-coast-plan"
  })
]);

const PUBLIC_ASSET_PREFIX = "assets/evidence/";
const PUBLIC_DIRECTORY = "apps/web/public";
const VERSIONED_EVIDENCE_DIRECTORY =
  "data/source/demo-pilot/evidence";
const CONTROLLED_REPRESENTATION_PREFIX =
  "Representación controlada para demo; no es el documento original";
const FORBIDDEN_CT_G_ASSET_HASHES = new Set([
  "41ab273c521fcc66025653e8cfe44f894afb01b2f1b9be72847dcf87db2f2c4b",
  "3c108732cc1f9c0dbd884ed3d171a0abacffc96d9e80a95d994dc1d1a43bd60a"
]);
const TEXT_ASSET_EXTENSIONS = new Set([".json", ".md", ".txt"]);
const PERMISSION_RESTRICTION = Object.freeze({
  authorized: 0,
  pending: 1,
  restricted: 2
});
const AVAILABILITY_RESTRICTION = Object.freeze({
  available: 0,
  unavailable: 1,
  restricted: 2
});

const ID_PATTERN = /^[a-z][a-z0-9_-]*:[a-z0-9][a-z0-9._-]*$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const HTTP_URL_PATTERN = /^https?:\/\//;
const PUBLIC_ASSET_PATTERN =
  /^assets\/evidence\/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*(?:\/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)*$/;
const FORBIDDEN_KEY_PATTERN =
  /(?:^|_)(?:contact|contacto|email|e_mail|phone|telefono|teléfono|whatsapp|payload|raw_payload|rawpayload)(?:_|$)/i;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const LOCAL_PATH_PATTERN =
  /(?:(?:^|[\s"'(])(?:[A-Za-z]:[\\/]|\/Users\/|\/home\/[^/\\]+[\\/]|outputs[\\/])|AppData[\\/]|(?:^|[\\/])Temp[\\/])/i;
const PHONE_PATTERN = /\+?\d(?:[\s().-]*\d){6,}/;
const IMAGE_EXTENSIONS = new Set([
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

const RECORD_KEYS = Object.freeze({
  sources: [
    "source_id",
    "name",
    "type",
    "base_url",
    "legal_status",
    "access_mode"
  ],
  observations: [
    "observation_id",
    "source_id",
    "entity_type",
    "entity_id",
    "captured_at",
    "source_url",
    "extraction_method",
    "evidence_ids",
    "evidence_status",
    "evidence_absence_reason"
  ],
  documents: [
    "document_id",
    "source_id",
    "document_type",
    "title",
    "captured_at",
    "source_url",
    "sha256",
    "publish_permission",
    "availability",
    "public_asset_path"
  ],
  evidence: [
    "evidence_id",
    "observation_id",
    "document_id",
    "kind",
    "fragment",
    "page",
    "region",
    "captured_at",
    "sha256",
    "publish_permission",
    "availability"
  ]
});

const ID_FIELDS = Object.freeze({
  sources: "source_id",
  observations: "observation_id",
  documents: "document_id",
  evidence: "evidence_id"
});

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function absolutePath(repositoryRoot, repositoryRelativePath) {
  return join(repositoryRoot, ...repositoryRelativePath.split("/"));
}

function parseJsonFile(repositoryRoot, repositoryRelativePath, expectedType) {
  const path = absolutePath(repositoryRoot, repositoryRelativePath);
  if (!existsSync(path)) {
    throw new Error(`Required evidence input is missing: ${repositoryRelativePath}`);
  }

  let value;
  try {
    value = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(
      `Invalid JSON in ${repositoryRelativePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (expectedType === "array" && !Array.isArray(value)) {
    throw new Error(`Expected a JSON array in ${repositoryRelativePath}`);
  }
  if (
    expectedType === "object" &&
    (value === null || typeof value !== "object" || Array.isArray(value))
  ) {
    throw new Error(`Expected a JSON object in ${repositoryRelativePath}`);
  }
  return value;
}

function indexBy(records, idField) {
  return new Map(records.map((record) => [record[idField], record]));
}

function addError(errors, message) {
  errors.push(message);
}

function validateExactKeys(record, requiredKeys, context, errors) {
  if (record === null || typeof record !== "object" || Array.isArray(record)) {
    addError(errors, `${context} must be an object`);
    return;
  }

  const actual = Object.keys(record).sort(compareStrings);
  const expected = [...requiredKeys].sort(compareStrings);
  for (const key of expected) {
    if (!Object.hasOwn(record, key)) {
      addError(errors, `${context} is missing required field ${key}`);
    }
  }
  for (const key of actual) {
    if (!expected.includes(key)) {
      addError(errors, `${context} contains unsupported field ${key}`);
    }
  }
}

function validateUniqueIds(records, idField, collectionName, errors) {
  const seen = new Set();
  for (const [index, record] of records.entries()) {
    const id = record?.[idField];
    if (typeof id !== "string" || !ID_PATTERN.test(id)) {
      addError(errors, `${collectionName}[${index}].${idField} is not a namespaced ID`);
      continue;
    }
    if (seen.has(id)) {
      addError(errors, `${collectionName} contains duplicate ID ${id}`);
    }
    seen.add(id);
  }
}

function validateSorted(records, idField, collectionName, errors) {
  const ids = records.map((record) => record?.[idField]);
  const sorted = [...ids].sort(compareStrings);
  if (ids.some((id, index) => id !== sorted[index])) {
    addError(errors, `${collectionName} must be ordered by ${idField}`);
  }
}

function validateDateTime(value, context, errors) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    addError(errors, `${context} must be a valid date-time`);
  }
}

function validateNullableHttpUrl(value, context, errors) {
  if (value !== null && (typeof value !== "string" || !HTTP_URL_PATTERN.test(value))) {
    addError(errors, `${context} must be null or an HTTP(S) URL`);
  }
}

function validateSources(sources, errors) {
  const types = new Set([
    "portal",
    "agency_website",
    "document",
    "user_provided",
    "controlled_fixture",
    "internal_authorized",
    "other"
  ]);
  const legalStatuses = new Set([
    "cleared_for_demo",
    "pending_review",
    "restricted"
  ]);
  const accessModes = new Set([
    "versioned_snapshot",
    "user_provided",
    "public_reference",
    "controlled_fixture"
  ]);

  for (const [index, source] of sources.entries()) {
    const context = `sources[${index}]`;
    validateExactKeys(source, RECORD_KEYS.sources, context, errors);
    if (typeof source.name !== "string" || source.name.length === 0) {
      addError(errors, `${context}.name must be non-empty`);
    }
    if (!types.has(source.type)) addError(errors, `${context}.type is invalid`);
    if (!legalStatuses.has(source.legal_status)) {
      addError(errors, `${context}.legal_status is invalid`);
    }
    if (!accessModes.has(source.access_mode)) {
      addError(errors, `${context}.access_mode is invalid`);
    }
    validateNullableHttpUrl(source.base_url, `${context}.base_url`, errors);
  }
}

function validateObservations(observations, errors) {
  const entityTypes = new Set(["agency", "project", "typology", "document"]);
  const evidenceStatuses = new Set(["available", "unavailable", "not_applicable"]);

  for (const [index, observation] of observations.entries()) {
    const context = `observations[${index}]`;
    validateExactKeys(observation, RECORD_KEYS.observations, context, errors);
    if (!ID_PATTERN.test(observation.source_id ?? "")) {
      addError(errors, `${context}.source_id is invalid`);
    }
    if (!entityTypes.has(observation.entity_type)) {
      addError(errors, `${context}.entity_type is invalid`);
    }
    if (!ID_PATTERN.test(observation.entity_id ?? "")) {
      addError(errors, `${context}.entity_id is invalid`);
    }
    validateDateTime(observation.captured_at, `${context}.captured_at`, errors);
    validateNullableHttpUrl(observation.source_url, `${context}.source_url`, errors);
    if (
      typeof observation.extraction_method !== "string" ||
      observation.extraction_method.length === 0
    ) {
      addError(errors, `${context}.extraction_method must be non-empty`);
    }
    if (!Array.isArray(observation.evidence_ids)) {
      addError(errors, `${context}.evidence_ids must be an array`);
    } else if (new Set(observation.evidence_ids).size !== observation.evidence_ids.length) {
      addError(errors, `${context}.evidence_ids must be unique`);
    }
    if (!evidenceStatuses.has(observation.evidence_status)) {
      addError(errors, `${context}.evidence_status is invalid`);
    } else if (observation.evidence_status === "available") {
      if (!Array.isArray(observation.evidence_ids) || observation.evidence_ids.length === 0) {
        addError(errors, `${context} marked available must reference evidence`);
      }
      if (observation.evidence_absence_reason !== null) {
        addError(errors, `${context} marked available cannot have an absence reason`);
      }
    } else {
      if (Array.isArray(observation.evidence_ids) && observation.evidence_ids.length !== 0) {
        addError(errors, `${context} without available evidence cannot reference evidence`);
      }
      if (
        typeof observation.evidence_absence_reason !== "string" ||
        observation.evidence_absence_reason.length === 0
      ) {
        addError(errors, `${context} without available evidence needs an absence reason`);
      }
    }
  }
}

function validateDocuments(documents, errors) {
  const documentTypes = new Set([
    "card",
    "plan",
    "brochure",
    "specification",
    "web_page",
    "other"
  ]);
  const permissions = new Set(["authorized", "restricted", "pending"]);
  const availabilities = new Set(["available", "unavailable", "restricted"]);

  for (const [index, document] of documents.entries()) {
    const context = `documents[${index}]`;
    validateExactKeys(document, RECORD_KEYS.documents, context, errors);
    if (!ID_PATTERN.test(document.source_id ?? "")) {
      addError(errors, `${context}.source_id is invalid`);
    }
    if (!documentTypes.has(document.document_type)) {
      addError(errors, `${context}.document_type is invalid`);
    }
    if (typeof document.title !== "string" || document.title.length === 0) {
      addError(errors, `${context}.title must be non-empty`);
    }
    validateDateTime(document.captured_at, `${context}.captured_at`, errors);
    validateNullableHttpUrl(document.source_url, `${context}.source_url`, errors);
    if (!SHA256_PATTERN.test(document.sha256 ?? "")) {
      addError(errors, `${context}.sha256 is invalid`);
    }
    if (!permissions.has(document.publish_permission)) {
      addError(errors, `${context}.publish_permission is invalid`);
    }
    if (!availabilities.has(document.availability)) {
      addError(errors, `${context}.availability is invalid`);
    }
    if (
      document.public_asset_path !== null &&
      (typeof document.public_asset_path !== "string" ||
        !PUBLIC_ASSET_PATTERN.test(document.public_asset_path))
    ) {
      addError(errors, `${context}.public_asset_path is invalid`);
    }
    if (
      (document.publish_permission !== "authorized" ||
        document.availability !== "available") &&
      document.public_asset_path !== null
    ) {
      addError(
        errors,
        `${context} cannot publish an asset without authorized and available status`
      );
    }
  }
}

function validateEvidenceRecords(evidence, errors) {
  const kinds = new Set([
    "fragment",
    "transcription",
    "structured_value",
    "image_region",
    "metadata"
  ]);
  const permissions = new Set(["authorized", "restricted", "pending"]);
  const availabilities = new Set(["available", "unavailable", "restricted"]);

  for (const [index, record] of evidence.entries()) {
    const context = `evidence[${index}]`;
    validateExactKeys(record, RECORD_KEYS.evidence, context, errors);
    if (!ID_PATTERN.test(record.observation_id ?? "")) {
      addError(errors, `${context}.observation_id is invalid`);
    }
    if (record.document_id !== null && !ID_PATTERN.test(record.document_id ?? "")) {
      addError(errors, `${context}.document_id is invalid`);
    }
    if (!kinds.has(record.kind)) addError(errors, `${context}.kind is invalid`);
    validateDateTime(record.captured_at, `${context}.captured_at`, errors);
    if (!SHA256_PATTERN.test(record.sha256 ?? "")) {
      addError(errors, `${context}.sha256 is invalid`);
    }
    if (!permissions.has(record.publish_permission)) {
      addError(errors, `${context}.publish_permission is invalid`);
    }
    if (!availabilities.has(record.availability)) {
      addError(errors, `${context}.availability is invalid`);
    }
    if (record.availability === "available") {
      if (typeof record.fragment !== "string" || record.fragment.length === 0) {
        addError(errors, `${context} marked available must contain a fragment`);
      }
    }
    if (record.publish_permission !== "authorized" && record.fragment !== null) {
      addError(errors, `${context} cannot expose a fragment without authorization`);
    }
  }
}

function validateReferences(bundle, errors) {
  const sources = indexBy(bundle.sources, "source_id");
  const observations = indexBy(bundle.observations, "observation_id");
  const documents = indexBy(bundle.documents, "document_id");
  const evidence = indexBy(bundle.evidence, "evidence_id");

  for (const observation of bundle.observations) {
    if (!sources.has(observation.source_id)) {
      addError(
        errors,
        `${observation.observation_id} references missing source ${observation.source_id}`
      );
    }
    for (const evidenceId of observation.evidence_ids) {
      if (!evidence.has(evidenceId)) {
        addError(
          errors,
          `${observation.observation_id} references missing evidence ${evidenceId}`
        );
      } else if (evidence.get(evidenceId).observation_id !== observation.observation_id) {
        addError(
          errors,
          `${observation.observation_id} references evidence owned by another observation`
        );
      }
    }
  }

  for (const document of bundle.documents) {
    if (!sources.has(document.source_id)) {
      addError(
        errors,
        `${document.document_id} references missing source ${document.source_id}`
      );
    }
  }

  for (const record of bundle.evidence) {
    if (!observations.has(record.observation_id)) {
      addError(
        errors,
        `${record.evidence_id} references missing observation ${record.observation_id}`
      );
    }
    if (record.document_id !== null && !documents.has(record.document_id)) {
      addError(
        errors,
        `${record.evidence_id} references missing document ${record.document_id}`
      );
    }
  }
}

export function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

export function removeSingleTerminalNewline(content) {
  if (content.endsWith("\r\n")) return content.slice(0, -2);
  if (content.endsWith("\n")) return content.slice(0, -1);
  return content;
}

function canonicalAssetContent(logicalPath, content) {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  if (!TEXT_ASSET_EXTENSIONS.has(extname(logicalPath).toLowerCase())) return buffer;
  return removeSingleTerminalNewline(buffer.toString("utf8"));
}

function defaultPublicAssetPath(repositoryRoot, logicalPath) {
  if (
    typeof logicalPath !== "string" ||
    !logicalPath.startsWith(PUBLIC_ASSET_PREFIX) ||
    !PUBLIC_ASSET_PATTERN.test(logicalPath)
  ) {
    return null;
  }
  const publicRoot = resolve(repositoryRoot, ...PUBLIC_DIRECTORY.split("/"));
  const candidate = resolve(publicRoot, ...logicalPath.split("/"));
  if (candidate !== publicRoot && !candidate.startsWith(`${publicRoot}${sep}`)) {
    return null;
  }
  return candidate;
}

function readPublicAsset(logicalPath, { repositoryRoot, readPublicAsset: reader }) {
  if (
    typeof logicalPath !== "string" ||
    !logicalPath.startsWith(PUBLIC_ASSET_PREFIX) ||
    !PUBLIC_ASSET_PATTERN.test(logicalPath)
  ) {
    return { found: false, content: null };
  }
  if (reader) {
    try {
      const content = reader(logicalPath);
      if (
        content === null ||
        content === undefined ||
        !(
          typeof content === "string" ||
          Buffer.isBuffer(content) ||
          content instanceof Uint8Array
        )
      ) {
        return { found: false, content: null };
      }
      return { found: true, content };
    } catch {
      return { found: false, content: null };
    }
  }
  const path = defaultPublicAssetPath(repositoryRoot, logicalPath);
  if (!path || !existsSync(path)) return { found: false, content: null };
  return { found: true, content: readFileSync(path) };
}

function validatePublicAssets(bundle, repositoryRoot, options, errors) {
  for (const document of bundle.documents) {
    if (!document.public_asset_path) continue;
    if (
      document.publish_permission !== "authorized" ||
      document.availability !== "available"
    ) {
      continue;
    }
    const asset = readPublicAsset(document.public_asset_path, {
      repositoryRoot,
      readPublicAsset: options.readPublicAsset
    });
    if (!asset.found) {
      addError(
        errors,
        `${document.document_id} public asset does not resolve to versioned content`
      );
      continue;
    }
    const digest = sha256(
      canonicalAssetContent(document.public_asset_path, asset.content)
    );
    if (digest !== document.sha256) {
      addError(errors, `${document.document_id} public asset hash mismatch`);
    }
  }
}

function validateEvidenceRestriction(bundle, errors) {
  const documents = indexBy(bundle.documents, "document_id");
  for (const record of bundle.evidence) {
    const document = documents.get(record.document_id);
    if (!document) {
      if (record.fragment !== null) {
        addError(errors, `${record.evidence_id} fragment requires a linked document`);
      }
      continue;
    }
    if (
      PERMISSION_RESTRICTION[record.publish_permission] <
      PERMISSION_RESTRICTION[document.publish_permission]
    ) {
      addError(
        errors,
        `${record.evidence_id} publish permission is less restrictive than ${document.document_id}`
      );
    }
    if (
      AVAILABILITY_RESTRICTION[record.availability] <
      AVAILABILITY_RESTRICTION[document.availability]
    ) {
      addError(
        errors,
        `${record.evidence_id} availability is less restrictive than ${document.document_id}`
      );
    }
    if (record.fragment !== null) {
      if (
        record.publish_permission !== "authorized" ||
        record.availability !== "available" ||
        document.publish_permission !== "authorized" ||
        document.availability !== "available"
      ) {
        addError(
          errors,
          `${record.evidence_id} fragment is not publicable under document and evidence policy`
        );
      }
      if (
        record.kind !== "image_region" &&
        sha256(record.fragment) !== record.sha256
      ) {
        addError(errors, `${record.evidence_id} fragment hash mismatch`);
      }
    }
  }
}

// observation.evidence_status="available" means the linked evidence record
// exists. It never means the underlying asset can be opened or published.
export function assessPublicEvidenceAccess(
  { observation, evidenceRecord, document },
  {
    repositoryRoot = DEFAULT_REPOSITORY_ROOT,
    readPublicAsset: reader
  } = {}
) {
  const reasons = [];
  if (observation?.evidence_status !== "available") {
    reasons.push("EVIDENCE_RECORD_NOT_AVAILABLE");
  }
  if (!observation?.evidence_ids?.includes(evidenceRecord?.evidence_id)) {
    reasons.push("OBSERVATION_EVIDENCE_NOT_LINKED");
  }
  if (evidenceRecord?.observation_id !== observation?.observation_id) {
    reasons.push("EVIDENCE_OBSERVATION_MISMATCH");
  }
  if (evidenceRecord?.document_id !== document?.document_id) {
    reasons.push("EVIDENCE_DOCUMENT_MISMATCH");
  }
  if (
    evidenceRecord?.publish_permission !== "authorized" ||
    document?.publish_permission !== "authorized"
  ) {
    reasons.push("PUBLICATION_NOT_AUTHORIZED");
  }
  if (
    evidenceRecord?.availability !== "available" ||
    document?.availability !== "available"
  ) {
    reasons.push("ASSET_NOT_AVAILABLE");
  }
  if (!document?.public_asset_path) {
    reasons.push("PUBLIC_ASSET_PATH_MISSING");
  } else {
    const asset = readPublicAsset(document.public_asset_path, {
      repositoryRoot: resolve(repositoryRoot),
      readPublicAsset: reader
    });
    if (!asset.found) {
      reasons.push("PUBLIC_ASSET_NOT_FOUND");
    } else if (
      sha256(canonicalAssetContent(document.public_asset_path, asset.content)) !==
      document.sha256
    ) {
      reasons.push("PUBLIC_ASSET_HASH_MISMATCH");
    }
  }
  if (
    evidenceRecord?.fragment !== null &&
    evidenceRecord?.fragment !== undefined &&
    evidenceRecord?.kind !== "image_region" &&
    sha256(evidenceRecord.fragment) !== evidenceRecord.sha256
  ) {
    reasons.push("EVIDENCE_FRAGMENT_HASH_MISMATCH");
  }
  return {
    openable: reasons.length === 0,
    reasons: [...new Set(reasons)].sort()
  };
}

function validateVersionedEvidence(bundle, repositoryRoot, errors) {
  const evidence = indexBy(bundle.evidence, "evidence_id");
  const documents = indexBy(bundle.documents, "document_id");

  for (const record of bundle.evidence) {
    const repositoryRelativePath = VERSIONED_EVIDENCE_FILES[record.evidence_id];
    if (
      record.availability === "available" &&
      record.kind !== "image_region" &&
      !repositoryRelativePath
    ) {
      addError(errors, `${record.evidence_id} is available but has no versioned file`);
      continue;
    }
    if (record.availability !== "available" && repositoryRelativePath) {
      addError(
        errors,
        `${record.evidence_id} is not available but is mapped to a versioned file`
      );
      continue;
    }
    if (!repositoryRelativePath) continue;

    const path = absolutePath(repositoryRoot, repositoryRelativePath);
    if (!existsSync(path)) {
      addError(errors, `${record.evidence_id} versioned file does not exist`);
      continue;
    }
    const content = removeSingleTerminalNewline(readFileSync(path, "utf8"));
    if (content !== record.fragment) {
      addError(errors, `${record.evidence_id} versioned fragment differs from catalog`);
    }
    if (sha256(content) !== record.sha256) {
      addError(errors, `${record.evidence_id} versioned fragment hash mismatch`);
    }
    const document = documents.get(record.document_id);
    if (document && sha256(content) !== document.sha256) {
      addError(errors, `${document.document_id} versioned content hash mismatch`);
    }
  }

  for (const [evidenceId, repositoryRelativePath] of Object.entries(
    VERSIONED_EVIDENCE_FILES
  )) {
    if (!evidence.has(evidenceId)) {
      addError(errors, `Versioned evidence mapping references missing ${evidenceId}`);
    }
    if (!existsSync(absolutePath(repositoryRoot, repositoryRelativePath))) {
      addError(errors, `Versioned evidence path does not exist: ${repositoryRelativePath}`);
    }
  }
}

function parseWebpDimensions(buffer) {
  if (
    buffer.length < 30 ||
    buffer.subarray(0, 4).toString("ascii") !== "RIFF" ||
    buffer.subarray(8, 12).toString("ascii") !== "WEBP" ||
    buffer.readUInt32LE(4) + 8 !== buffer.length ||
    buffer.subarray(12, 16).toString("ascii") !== "VP8 " ||
    buffer[23] !== 0x9d ||
    buffer[24] !== 0x01 ||
    buffer[25] !== 0x2a
  ) {
    return null;
  }
  return {
    width: buffer.readUInt16LE(26) & 0x3fff,
    height: buffer.readUInt16LE(28) & 0x3fff
  };
}

function validateEvidenceManifest(bundle, repositoryRoot, options, errors) {
  const manifest = bundle.manifest;
  if (
    manifest === null ||
    typeof manifest !== "object" ||
    Array.isArray(manifest) ||
    manifest.version !== 1 ||
    !Array.isArray(manifest.assets)
  ) {
    addError(errors, "Evidence manifest header is invalid");
    return;
  }

  const assets = manifest.assets;
  validateUniqueIds(assets, "asset_id", "manifest.assets", errors);
  validateSorted(assets, "asset_id", "manifest.assets", errors);
  const documents = indexBy(bundle.documents, "document_id");
  const evidenceByDocument = new Map();
  for (const record of bundle.evidence) {
    if (!record.document_id) continue;
    const records = evidenceByDocument.get(record.document_id) ?? [];
    records.push(record);
    evidenceByDocument.set(record.document_id, records);
  }
  const publishedDocuments = bundle.documents.filter(
    (document) => document.public_asset_path !== null
  );
  const publishedDocumentIds = new Set(
    publishedDocuments.map((document) => document.document_id)
  );
  const manifestDocumentIds = assets.map((asset) => asset.document_id);
  const manifestPaths = assets.map((asset) => asset.logical_path);
  if (new Set(manifestDocumentIds).size !== assets.length) {
    addError(errors, "Evidence manifest document IDs must be unique");
  }
  if (new Set(manifestPaths).size !== assets.length) {
    addError(errors, "Evidence manifest logical paths must be unique");
  }
  if (
    publishedDocumentIds.size !== assets.length ||
    manifestDocumentIds.some((id) => !publishedDocumentIds.has(id))
  ) {
    addError(errors, "Evidence manifest must exactly cover published documents");
  }

  let totalBytes = 0;
  for (const asset of assets) {
    const context = asset.asset_id ?? "manifest asset";
    const document = documents.get(asset.document_id);
    if (!document) {
      addError(errors, `${context} references a missing document`);
      continue;
    }
    if (
      typeof asset.logical_path !== "string" ||
      !PUBLIC_ASSET_PATTERN.test(asset.logical_path) ||
      asset.logical_path.includes("\\") ||
      asset.logical_path.split("/").includes("..")
    ) {
      addError(errors, `${context} has an invalid public path`);
      continue;
    }
    if (
      asset.media_type !== "image/webp" ||
      asset.publish_permission !== "authorized" ||
      asset.provenance !== "controlled_original" ||
      typeof asset.license_note !== "string" ||
      asset.license_note.trim().length === 0
    ) {
      addError(errors, `${context} has invalid publication metadata`);
    }
    if (
      document.public_asset_path !== asset.logical_path ||
      document.sha256 !== asset.sha256 ||
      document.publish_permission !== "authorized" ||
      document.availability !== "available"
    ) {
      addError(errors, `${context} does not match its published document`);
    }
    const linkedEvidence = evidenceByDocument.get(asset.document_id) ?? [];
    if (
      linkedEvidence.length !== 1 ||
      linkedEvidence[0].kind !== "image_region" ||
      linkedEvidence[0].sha256 !== asset.sha256 ||
      linkedEvidence[0].publish_permission !== "authorized" ||
      linkedEvidence[0].availability !== "available" ||
      typeof linkedEvidence[0].fragment !== "string" ||
      !linkedEvidence[0].fragment.startsWith(CONTROLLED_REPRESENTATION_PREFIX)
    ) {
      addError(errors, `${context} does not have one valid visual evidence record`);
    }
    if (FORBIDDEN_CT_G_ASSET_HASHES.has(asset.sha256)) {
      addError(errors, `${context} uses a forbidden CT-G source hash`);
    }

    const loaded = readPublicAsset(asset.logical_path, {
      repositoryRoot,
      readPublicAsset: options.readPublicAsset
    });
    if (!loaded.found) {
      addError(errors, `${context} public asset is missing`);
      continue;
    }
    const content = Buffer.isBuffer(loaded.content)
      ? loaded.content
      : Buffer.from(loaded.content);
    const dimensions = parseWebpDimensions(content);
    totalBytes += content.length;
    if (sha256(content) !== asset.sha256) {
      addError(errors, `${context} raw binary hash mismatch`);
    }
    if (content.length !== asset.bytes || asset.bytes >= 250_000) {
      addError(errors, `${context} byte length mismatch or limit exceeded`);
    }
    if (
      !dimensions ||
      dimensions.width !== asset.width ||
      dimensions.height !== asset.height
    ) {
      addError(errors, `${context} WebP dimensions or header are invalid`);
    }
  }
  if (totalBytes >= 4_000_000) {
    addError(errors, "Evidence manifest total byte limit exceeded");
  }

  if (!options.readPublicAsset) {
    const assetDirectory = absolutePath(
      repositoryRoot,
      `${PUBLIC_DIRECTORY}/${PUBLIC_ASSET_PREFIX.slice(0, -1)}`
    );
    if (!existsSync(assetDirectory)) {
      addError(errors, "Public evidence asset directory is missing");
    } else {
      const diskNames = readdirSync(assetDirectory, { withFileTypes: true })
        .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".webp")
        .map((entry) => entry.name)
        .sort(compareStrings);
      const manifestNames = manifestPaths
        .map((logicalPath) => logicalPath.slice(PUBLIC_ASSET_PREFIX.length))
        .sort(compareStrings);
      if (
        diskNames.length !== manifestNames.length ||
        diskNames.some((name, index) => name !== manifestNames[index])
      ) {
        addError(errors, "Public evidence directory contains orphan or unmanifested WebP assets");
      }
    }
  }
}

function validateTranscriptions(bundle, errors) {
  const manifest = bundle.transcriptions;
  if (
    manifest.case_id !== "CT-G" ||
    manifest.artifact_role !== "structured_transcription_only" ||
    manifest.source_assets_included !== false ||
    !Array.isArray(manifest.records)
  ) {
    addError(errors, "CT-G transcription manifest header is invalid");
    return;
  }

  const observations = indexBy(bundle.observations, "observation_id");
  const documents = indexBy(bundle.documents, "document_id");
  const evidence = indexBy(bundle.evidence, "evidence_id");
  const recordIds = manifest.records.map((record) => record.observation_id);
  const evidenceIds = manifest.records.map((record) => record.evidence_id);
  const documentIds = manifest.records.map((record) => record.document_id);
  const sortedIds = [...recordIds].sort(compareStrings);
  if (recordIds.some((id, index) => id !== sortedIds[index])) {
    addError(errors, "CT-G transcription records must be ordered by observation_id");
  }
  if (
    new Set(recordIds).size !== recordIds.length ||
    new Set(evidenceIds).size !== evidenceIds.length ||
    new Set(documentIds).size !== documentIds.length
  ) {
    addError(errors, "CT-G transcription IDs must be unique");
  }
  const expectedBindings = CT_G_TRANSCRIPTION_BINDINGS.map((binding) =>
    JSON.stringify(binding)
  ).sort(compareStrings);
  const actualBindings = manifest.records
    .map((record) =>
      JSON.stringify({
        observation_id: record.observation_id,
        evidence_id: record.evidence_id,
        document_id: record.document_id
      })
    )
    .sort(compareStrings);
  if (
    expectedBindings.length !== actualBindings.length ||
    expectedBindings.some((binding, index) => binding !== actualBindings[index])
  ) {
    addError(errors, "CT-G transcription binding set is not exact");
  }
  const exactSets = [
    {
      label: "observations",
      actual: bundle.observations
        .map((record) => record.observation_id)
        .filter((id) => id.startsWith("observation:pardo-coast-")),
      expected: [
        "observation:pardo-coast-card",
        "observation:pardo-coast-conflict-derived",
        "observation:pardo-coast-plan"
      ]
    },
    {
      label: "documents",
      actual: bundle.documents
        .map((record) => record.document_id)
        .filter((id) => id.startsWith("document:pardo-coast-")),
      expected: CT_G_TRANSCRIPTION_BINDINGS.map((binding) => binding.document_id)
    },
    {
      label: "evidence",
      actual: bundle.evidence
        .map((record) => record.evidence_id)
        .filter((id) => id.startsWith("evidence:pardo-coast-")),
      expected: CT_G_TRANSCRIPTION_BINDINGS.map((binding) => binding.evidence_id)
    }
  ];
  for (const set of exactSets) {
    const actual = [...set.actual].sort(compareStrings);
    const expected = [...set.expected].sort(compareStrings);
    if (
      actual.length !== expected.length ||
      actual.some((id, index) => id !== expected[index])
    ) {
      addError(errors, `CT-G ${set.label} set is not exact`);
    }
  }

  for (const record of manifest.records) {
    const observation = observations.get(record.observation_id);
    const document = documents.get(record.document_id);
    const evidenceRecord = evidence.get(record.evidence_id);
    if (!observation) {
      addError(errors, `CT-G transcription references missing ${record.observation_id}`);
    }
    if (!document) {
      addError(errors, `CT-G transcription references missing ${record.document_id}`);
    }
    if (!evidenceRecord) {
      addError(errors, `CT-G transcription references missing ${record.evidence_id}`);
    }
    if (evidenceRecord && evidenceRecord.observation_id !== record.observation_id) {
      addError(
        errors,
        `CT-G transcription evidence observation mismatch for ${record.observation_id}`
      );
    }
    if (evidenceRecord && evidenceRecord.document_id !== record.document_id) {
      addError(
        errors,
        `CT-G transcription evidence document mismatch for ${record.observation_id}`
      );
    }
    if (observation && !observation.evidence_ids.includes(record.evidence_id)) {
      addError(
        errors,
        `CT-G transcription evidence is not linked by ${record.observation_id}`
      );
    }
    if (
      document &&
      evidenceRecord &&
      (record.source_sha256 !== document.sha256 ||
        record.source_sha256 !== evidenceRecord.sha256)
    ) {
      addError(errors, `CT-G transcription hash mismatch for ${record.observation_id}`);
    }
    if (
      observation &&
      evidenceRecord &&
      document &&
      (record.captured_at !== observation.captured_at ||
        record.captured_at !== evidenceRecord.captured_at ||
        record.captured_at !== document.captured_at)
    ) {
      addError(
        errors,
        `CT-G transcription captured_at mismatch for ${record.observation_id}`
      );
    }
    if (record.public_asset_path !== null) {
      addError(errors, `CT-G transcription cannot publish an asset path`);
    }
  }

  const card = manifest.records.find(
    (record) => record.observation_id === "observation:pardo-coast-card"
  );
  const plan = manifest.records.find(
    (record) => record.observation_id === "observation:pardo-coast-plan"
  );
  if (
    !card ||
    card.transcription?.published_area_original !== "104.15 m²" ||
    card.transcription?.floor_label_original !== "Piso 1"
  ) {
    addError(errors, "CT-G card transcription is incomplete");
  }
  if (
    !plan ||
    plan.transcription?.area_label_original !== "Área Total 53.37 m2" ||
    plan.transcription?.unit_range_original !== "Dep. 807 AL 1007"
  ) {
    addError(errors, "CT-G plan transcription is incomplete");
  }
}

function isPhoneLike(value) {
  if (
    HTTP_URL_PATTERN.test(value) ||
    ID_PATTERN.test(value) ||
    SHA256_PATTERN.test(value) ||
    !Number.isNaN(Date.parse(value))
  ) {
    return false;
  }
  return PHONE_PATTERN.test(value);
}

export function findPrivacyViolations(value, path = "$") {
  const violations = [];
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      violations.push(...findPrivacyViolations(item, `${path}[${index}]`));
    }
    return violations;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (FORBIDDEN_KEY_PATTERN.test(key)) {
        violations.push(`${path}.${key}: forbidden contact/raw-payload key`);
      }
      violations.push(...findPrivacyViolations(item, `${path}.${key}`));
    }
    return violations;
  }
  if (typeof value !== "string") return violations;
  if (EMAIL_PATTERN.test(value)) violations.push(`${path}: email-like value`);
  if (/whats\s*app/i.test(value)) violations.push(`${path}: WhatsApp-like value`);
  if (LOCAL_PATH_PATTERN.test(value)) violations.push(`${path}: local/output path`);
  if (isPhoneLike(value)) violations.push(`${path}: phone-like value`);
  return violations;
}

function validatePrivacy(bundle, repositoryRoot, errors) {
  errors.push(...findPrivacyViolations(bundle));
  const evidenceDirectory = absolutePath(
    repositoryRoot,
    "data/source/demo-pilot/evidence"
  );
  if (!existsSync(evidenceDirectory)) {
    addError(errors, "Versioned evidence directory is missing");
    return;
  }

  for (const entry of readdirSync(evidenceDirectory, { withFileTypes: true })) {
    if (!entry.isFile()) {
      addError(errors, "Evidence directory must not contain nested or opaque assets");
      continue;
    }
    if (IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      addError(errors, `Image asset is not authorized in evidence directory: ${entry.name}`);
      continue;
    }
    const content = readFileSync(join(evidenceDirectory, entry.name), "utf8");
    let privacyValue = content;
    if (extname(entry.name).toLowerCase() === ".json") {
      try {
        privacyValue = JSON.parse(content);
      } catch {
        addError(errors, `Invalid JSON evidence file: ${entry.name}`);
        continue;
      }
    }
    errors.push(
      ...findPrivacyViolations(
        privacyValue,
        `evidence-file:${relative(repositoryRoot, join(evidenceDirectory, entry.name))
          .split(sep)
          .join("/")}`
      )
    );
  }
}

export function readEvidenceBundle({
  repositoryRoot = DEFAULT_REPOSITORY_ROOT
} = {}) {
  const root = resolve(repositoryRoot);
  return {
    sources: parseJsonFile(root, EVIDENCE_CATALOG_PATHS.sources, "array"),
    observations: parseJsonFile(root, EVIDENCE_CATALOG_PATHS.observations, "array"),
    documents: parseJsonFile(root, EVIDENCE_CATALOG_PATHS.documents, "array"),
    evidence: parseJsonFile(root, EVIDENCE_CATALOG_PATHS.evidence, "array"),
    manifest: parseJsonFile(root, EVIDENCE_CATALOG_PATHS.manifest, "object"),
    transcriptions: parseJsonFile(
      root,
      EVIDENCE_CATALOG_PATHS.transcriptions,
      "object"
    )
  };
}

export function validateEvidenceBundle(
  bundle,
  {
    repositoryRoot = DEFAULT_REPOSITORY_ROOT,
    readPublicAsset: reader
  } = {}
) {
  const errors = [];
  for (const collectionName of Object.keys(ID_FIELDS)) {
    if (!Array.isArray(bundle?.[collectionName])) {
      addError(errors, `${collectionName} must be an array`);
      continue;
    }
    validateUniqueIds(
      bundle[collectionName],
      ID_FIELDS[collectionName],
      collectionName,
      errors
    );
    validateSorted(
      bundle[collectionName],
      ID_FIELDS[collectionName],
      collectionName,
      errors
    );
  }
  if (errors.length > 0) return [...new Set(errors)].sort(compareStrings);

  validateSources(bundle.sources, errors);
  validateObservations(bundle.observations, errors);
  validateDocuments(bundle.documents, errors);
  validateEvidenceRecords(bundle.evidence, errors);
  validateReferences(bundle, errors);
  const root = resolve(repositoryRoot);
  validateVersionedEvidence(bundle, root, errors);
  validateEvidenceRestriction(bundle, errors);
  validatePublicAssets(bundle, root, { readPublicAsset: reader }, errors);
  validateEvidenceManifest(
    bundle,
    root,
    { readPublicAsset: reader },
    errors
  );
  validateTranscriptions(bundle, errors);
  validatePrivacy(bundle, root, errors);
  return [...new Set(errors)].sort(compareStrings);
}

function cloneSorted(records, idField) {
  return records
    .map((record) => structuredClone(record))
    .sort((left, right) => compareStrings(left[idField], right[idField]));
}

export function buildEvidenceBundle(options = {}) {
  const bundle = readEvidenceBundle(options);
  const errors = validateEvidenceBundle(bundle, options);
  if (errors.length > 0) {
    throw new Error(`Evidence bundle validation failed:\n- ${errors.join("\n- ")}`);
  }

  return {
    sources: cloneSorted(bundle.sources, "source_id"),
    observations: cloneSorted(bundle.observations, "observation_id"),
    documents: cloneSorted(bundle.documents, "document_id"),
    evidence: cloneSorted(bundle.evidence, "evidence_id"),
    manifest: {
      version: bundle.manifest.version,
      assets: cloneSorted(bundle.manifest.assets, "asset_id")
    },
    transcriptions: {
      ...structuredClone(bundle.transcriptions),
      records: cloneSorted(bundle.transcriptions.records, "observation_id")
    }
  };
}

export function serializeEvidenceBundle(bundle) {
  return `${JSON.stringify(bundle, null, 2)}\n`;
}
