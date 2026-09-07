import { createHash } from "node:crypto";
import type { SourceCandidate } from "./policy.js";
import { evaluateSource } from "./policy.js";

export const NEXO_CONTACT_FIELDS = [
  "project_contact",
  "project_email",
  "project_phone",
  "project_whatsapp",
] as const;

export interface CsvDocument {
  headers: string[];
  rows: Array<Record<string, string>>;
}

export interface FieldChange {
  projectId: string;
  field: string;
  previousValue: string;
  nextValue: string;
}

export interface NexoMergeResult {
  csv: string;
  report: {
    baselineRows: number;
    incomingRows: number;
    outputRows: number;
    inserted: number;
    updated: number;
    unchanged: number;
    retainedFromBaseline: number;
    piiValuesRemoved: number;
    changes: FieldChange[];
    sha256: string;
  };
}

export function assertAuthorizedNexoFeed(candidate: SourceCandidate): void {
  const decision = evaluateSource(candidate, "collect");
  if (!decision.allowed) {
    throw new Error(`NEXO_IMPORT_NOT_AUTHORIZED:${decision.code}:${decision.reason}`);
  }
  if (candidate.sourceId !== "nexo-authorized-feed" || candidate.sourceClass !== "authorized_feed") {
    throw new Error("NEXO_IMPORT_NOT_AUTHORIZED:INVALID_SOURCE:El importador solo acepta el feed autorizado registrado.");
  }
}

export function parseCsvDocument(text: string): CsvDocument {
  const matrix: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index] ?? "";
    const next = text[index + 1] ?? "";
    if (quoted) {
      if (character === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === ",") { row.push(field); field = ""; }
    else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      matrix.push(row);
      row = [];
      field = "";
    } else field += character;
  }

  if (quoted) throw new Error("NEXO_CSV_INVALID: Campo entre comillas sin cierre.");
  if (field !== "" || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    matrix.push(row);
  }
  while (matrix.length && matrix.at(-1)?.every((value) => value === "")) matrix.pop();
  const headers = matrix.shift() ?? [];
  if (!headers.length || headers.some((header) => !header.trim())) throw new Error("NEXO_CSV_INVALID: Encabezados vacíos.");
  if (new Set(headers).size !== headers.length) throw new Error("NEXO_CSV_INVALID: Encabezados duplicados.");
  const rows = matrix.map((values, index) => {
    if (values.length !== headers.length) {
      throw new Error(`NEXO_CSV_INVALID: La fila ${index + 2} tiene ${values.length} campos; se esperaban ${headers.length}.`);
    }
    return Object.fromEntries(headers.map((header, column) => [header, values[column] ?? ""]));
  });
  return { headers, rows };
}

export function mergeAuthorizedNexoCsv(baselineText: string, incomingText: string): NexoMergeResult {
  const baseline = parseCsvDocument(baselineText);
  const incoming = parseCsvDocument(incomingText);
  assertSameSchema(baseline.headers, incoming.headers);
  if (!baseline.headers.includes("project_id")) throw new Error("NEXO_SCHEMA_INVALID: Falta project_id.");

  const baselineById = uniqueRows(baseline.rows, "baseline");
  const incomingById = uniqueRows(incoming.rows, "entrada");
  const changes: FieldChange[] = [];
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  let piiValuesRemoved = 0;
  const outputRows: Array<Record<string, string>> = [];

  for (const baselineRow of baseline.rows) {
    const projectId = baselineRow.project_id ?? "";
    const incomingRow = incomingById.get(projectId);
    if (!incomingRow) {
      const sanitized = sanitizeContactFields(baselineRow);
      piiValuesRemoved += sanitized.removed;
      outputRows.push(sanitized.row);
      continue;
    }
    const merged = mergeRow(baselineRow, incomingRow, baseline.headers, changes);
    piiValuesRemoved += merged.removed;
    outputRows.push(merged.row);
    if (merged.changed) updated += 1;
    else unchanged += 1;
  }

  for (const [projectId, incomingRow] of incomingById) {
    if (baselineById.has(projectId)) continue;
    const sanitized = sanitizeContactFields(incomingRow);
    piiValuesRemoved += sanitized.removed;
    outputRows.push(sanitized.row);
    inserted += 1;
  }

  const csv = serializeCsv({ headers: baseline.headers, rows: outputRows });
  return {
    csv,
    report: {
      baselineRows: baseline.rows.length,
      incomingRows: incoming.rows.length,
      outputRows: outputRows.length,
      inserted,
      updated,
      unchanged,
      retainedFromBaseline: baseline.rows.length - updated - unchanged,
      piiValuesRemoved,
      changes,
      sha256: createHash("sha256").update(csv).digest("hex"),
    },
  };
}

function assertSameSchema(expected: string[], actual: string[]): void {
  if (expected.length !== actual.length || expected.some((header, index) => header !== actual[index])) {
    throw new Error("NEXO_SCHEMA_MISMATCH: El export autorizado debe conservar exactamente las columnas y el orden del esquema vigente.");
  }
}

function uniqueRows(rows: Array<Record<string, string>>, label: string): Map<string, Record<string, string>> {
  const result = new Map<string, Record<string, string>>();
  rows.forEach((row, index) => {
    const projectId = row.project_id?.trim() ?? "";
    if (!projectId) throw new Error(`NEXO_ROW_INVALID: project_id vacío en ${label}, fila ${index + 2}.`);
    if (result.has(projectId)) throw new Error(`NEXO_ROW_DUPLICATE: project_id ${projectId} repetido en ${label}.`);
    result.set(projectId, row);
  });
  return result;
}

function mergeRow(
  baseline: Record<string, string>,
  incoming: Record<string, string>,
  headers: string[],
  changes: FieldChange[],
): { row: Record<string, string>; changed: boolean; removed: number } {
  const projectId = baseline.project_id ?? "";
  let changed = false;
  const row: Record<string, string> = {};
  for (const header of headers) {
    const previousValue = baseline[header] ?? "";
    const candidate = incoming[header]?.trim() ? incoming[header] ?? "" : previousValue;
    row[header] = candidate;
    if (candidate !== previousValue) {
      changed = true;
      changes.push({ projectId, field: header, previousValue, nextValue: candidate });
    }
  }
  const sanitized = sanitizeContactFields(row);
  return { row: sanitized.row, changed, removed: sanitized.removed };
}

function sanitizeContactFields(source: Record<string, string>): { row: Record<string, string>; removed: number } {
  const row = { ...source };
  let removed = 0;
  for (const field of NEXO_CONTACT_FIELDS) {
    if (row[field]?.trim()) removed += 1;
    if (field in row) row[field] = "";
  }
  return { row, removed };
}

function serializeCsv(document: CsvDocument): string {
  const escape = (value: string) => /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
  const lines = [document.headers.map(escape).join(",")];
  for (const row of document.rows) lines.push(document.headers.map((header) => escape(row[header] ?? "")).join(","));
  return `${lines.join("\n")}\n`;
}
