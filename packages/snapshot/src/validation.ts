import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import Ajv2020Import from "ajv/dist/2020.js";
import addFormatsImport from "ajv-formats";
import type { JsonObject, SnapshotData } from "@viva/domain";
import type { LoadedSnapshot } from "./types.js";

const FORBIDDEN_PII_KEYS = new Set([
  "project_contact",
  "project_email",
  "project_phone",
  "project_whatsapp",
  "contact_email",
  "contact_phone",
  "contact_name",
]);
const LOCAL_PATH = /(?:[a-z]:\\|\\users\\|\/users\/|file:\/\/)/iu;
const Ajv2020 = ((Ajv2020Import as unknown as { default?: unknown }).default ??
  Ajv2020Import) as new (options: Record<string, unknown>) => {
    compile(schema: unknown): {
      (data: unknown): boolean;
      errors?: unknown[] | null;
    };
  };
const addFormats = ((addFormatsImport as unknown as { default?: unknown }).default ??
  addFormatsImport) as (ajv: unknown) => void;

export class SnapshotValidationError extends Error {
  readonly code = "SNAPSHOT_INVALID";
  constructor(message: string, readonly details: unknown[] = []) {
    super(message);
    this.name = "SnapshotValidationError";
  }
}

export async function loadAndValidateSnapshot(options: {
  snapshotPath: string;
  schemaPath: string;
  expectedChecksum?: string;
}): Promise<LoadedSnapshot> {
  const [buffer, schemaText] = await Promise.all([
    fs.readFile(options.snapshotPath),
    fs.readFile(options.schemaPath, "utf8"),
  ]);
  const checksum = createHash("sha256").update(buffer).digest("hex");
  if (options.expectedChecksum && checksum !== options.expectedChecksum.toLowerCase()) {
    throw new SnapshotValidationError("El checksum del snapshot no coincide.", [
      { expected: options.expectedChecksum.toLowerCase(), actual: checksum },
    ]);
  }

  let data: SnapshotData;
  let schema: JsonObject;
  try {
    data = JSON.parse(buffer.toString("utf8")) as SnapshotData;
    schema = JSON.parse(schemaText) as JsonObject;
  } catch (error) {
    throw new SnapshotValidationError("El snapshot o su schema no es JSON válido.", [
      error instanceof Error ? error.message : String(error),
    ]);
  }

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(data)) {
    throw new SnapshotValidationError(
      "El snapshot no satisface el contrato público 2.4.",
      (validate.errors ?? []).slice(0, 100),
    );
  }
  validateSemantics(data);
  const boundaryArtifact = String(data.geography.boundary_artifact_path ?? "");
  const boundaryPath = path.join(path.dirname(options.snapshotPath), path.basename(boundaryArtifact));
  let boundaryBuffer: Buffer;
  let boundaryGeoJson: JsonObject;
  try {
    boundaryBuffer = await fs.readFile(boundaryPath);
    boundaryGeoJson = JSON.parse(boundaryBuffer.toString("utf8")) as JsonObject;
  } catch (error) {
    throw new SnapshotValidationError("La geometría distrital no está disponible o no es JSON válido.", [
      error instanceof Error ? error.message : String(error),
    ]);
  }
  const boundaryChecksum = createHash("sha256").update(boundaryBuffer).digest("hex");
  if (boundaryChecksum !== data.geography.boundary_artifact_sha256) {
    throw new SnapshotValidationError("El checksum de la geometría distrital no coincide.", [
      { expected: data.geography.boundary_artifact_sha256, actual: boundaryChecksum },
    ]);
  }
  if (boundaryGeoJson.type !== "FeatureCollection" || !Array.isArray(boundaryGeoJson.features)) {
    throw new SnapshotValidationError("La geometría distrital no es una colección GeoJSON válida.");
  }
  scanPrivacy(boundaryGeoJson, "$.boundaryGeoJson", new WeakSet<object>());
  return {
    data,
    boundaryGeoJson,
    checksum,
    byteLength: buffer.byteLength,
    sourcePath: options.snapshotPath,
  };
}

export function validateSemantics(data: SnapshotData): void {
  if (data.metadata.contract_version !== "2.4.0") {
    throw new SnapshotValidationError("La API requiere el contrato 2.4.0.");
  }
  const publication = data.metadata.publication as JsonObject | undefined;
  if (
    publication?.is_public_artifact !== true ||
    publication?.contains_contact_pii !== false ||
    publication?.raw_payloads_included !== false ||
    publication?.restricted_assets_included !== false
  ) {
    throw new SnapshotValidationError("El snapshot no cumple la política de publicación pública.");
  }
  if (!Array.isArray(data.projects) || data.projects.length === 0) {
    throw new SnapshotValidationError("El snapshot no contiene proyectos consultables.");
  }
  const modelProjects = data.model.projects;
  assertUnique(modelProjects.map(({ project_id }) => project_id), "model.projects.project_id");
  assertUnique(
    data.projects.map((project) => String(project.id ?? "")),
    "projects.id",
  );
  const counts = data.metadata.counts as JsonObject | undefined;
  if (counts?.projects !== data.projects.length || counts?.model_projects !== modelProjects.length) {
    throw new SnapshotValidationError("Los conteos de proyectos no coinciden con las colecciones.");
  }
  scanPrivacy(data, "$", new WeakSet<object>());
}

function assertUnique(values: string[], path: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (!value || seen.has(value)) {
      throw new SnapshotValidationError(`La colección ${path} contiene IDs vacíos o duplicados.`, [value]);
    }
    seen.add(value);
  }
}

function scanPrivacy(value: unknown, path: string, seen: WeakSet<object>): void {
  if (typeof value === "string") {
    if (LOCAL_PATH.test(value)) {
      throw new SnapshotValidationError("El snapshot contiene una ruta local no publicable.", [path]);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacy(item, `${path}[${index}]`, seen));
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    if (FORBIDDEN_PII_KEYS.has(key.toLowerCase())) {
      throw new SnapshotValidationError("El snapshot contiene un campo de PII prohibido.", [
        `${path}.${key}`,
      ]);
    }
    scanPrivacy(item, `${path}.${key}`, seen);
  }
}
