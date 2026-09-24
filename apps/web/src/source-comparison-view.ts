export type CommercialSourceStatus = "same" | "additional" | "review";

export interface CommercialSourceRow {
  field: string;
  label?: string;
  status: CommercialSourceStatus;
  nexoValue: unknown;
  officialValue: unknown;
  message?: string;
}

export interface CommercialSourceSummary {
  same: number;
  additional: number;
  review: number;
}

type UnknownRecord = Record<string, unknown>;

export function readSourceComparisonRows(value: unknown): CommercialSourceRow[] {
  if (!isRecord(value) || !Array.isArray(value.rows)) return [];
  return value.rows.flatMap((candidate) => {
    if (!isRecord(candidate) || typeof candidate.field !== "string" || !candidate.field.trim()) return [];
    const nexoValue = candidate.nexoValue ?? candidate.nexo_value ?? sourceOriginal(candidate.nexo) ?? null;
    const officialValue = candidate.officialValue ?? candidate.official_value ?? sourceOriginal(candidate.official) ?? null;
    if (String(candidate.status ?? "").toLowerCase() === "unavailable" && !hasDisplayValue(nexoValue) && !hasDisplayValue(officialValue)) return [];
    const label = typeof candidate.label === "string" && candidate.label.trim() ? candidate.label : null;
    const message = typeof candidate.message === "string" && candidate.message.trim() ? candidate.message : null;
    return [{
      field: candidate.field,
      ...(label ? { label } : {}),
      ...(message ? { message } : {}),
      status: commercialSourceStatus(candidate.status, nexoValue, officialValue),
      nexoValue,
      officialValue,
    }];
  });
}

export function commercialSourceStatus(status: unknown, nexoValue: unknown, officialValue: unknown): CommercialSourceStatus {
  const key = String(status ?? "").trim().toLowerCase().replaceAll("-", "_");
  if (["same", "match", "matched", "coincident", "coincides", "equivalent"].includes(key)) return "same";
  if (["additional", "addition", "enriched", "official_only", "web_only", "nexo_only", "single"].includes(key)) return "additional";
  if (["review", "different", "difference", "conflict", "mismatch", "inconsistent"].includes(key)) return "review";

  const hasNexo = hasDisplayValue(nexoValue);
  const hasOfficial = hasDisplayValue(officialValue);
  if (hasNexo !== hasOfficial) return "additional";
  if (!hasNexo && !hasOfficial) return "additional";
  return comparisonKey(nexoValue) === comparisonKey(officialValue) ? "same" : "review";
}

export function commercialSourceLabel(status: CommercialSourceStatus): string {
  if (status === "same") return "Coincide";
  if (status === "additional") return "Aporta información";
  return "Revisar";
}

export function commercialSourceMessage(row: CommercialSourceRow): string {
  if (row.message) return row.message;
  if (row.status === "same") return "El dato se presenta igual en ambos canales.";
  if (row.status === "review") return "Los canales muestran valores distintos. Confirma cuál está vigente.";
  if (!hasDisplayValue(row.nexoValue) && hasDisplayValue(row.officialValue)) return "La web oficial añade este dato.";
  if (hasDisplayValue(row.nexoValue) && !hasDisplayValue(row.officialValue)) return "Este dato aparece solo en Nexo.";
  return "La web oficial amplía la información disponible.";
}

/** Keep each official page independent, especially when pages describe different units. */
export function readSourceComparisonPairs(value: unknown): UnknownRecord[] {
  if (!isRecord(value)) return [];
  if (Array.isArray(value.comparisons)) {
    const pairs = value.comparisons.filter(isRecord);
    if (pairs.length) return pairs;
  }
  return [value];
}

/** A published limit is not an exact quantity, even if a normalized number is available. */
export function qualifiedSourceText(value: unknown): string | null {
  const candidates = isRecord(value)
    ? [value.displayValue, value.display_value, value.originalValue, value.original_value, value.value]
    : [value];
  return candidates.find((candidate): candidate is string => typeof candidate === "string"
    && /\b(?:hasta|desde|a partir de|m[aá]ximo|m[ií]nimo|ambientes?|ambs?\b)/iu.test(candidate)) ?? null;
}

/** Delivery precision belongs to the publication: a year must not become January 1. */
export function formatPublishedSourceDate(value: unknown): string | null {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const text = String(value).trim();
  if (/^\d{4}$/u.test(text)) return text;
  if (/^\d{4}-\d{2}$/u.test(text)) {
    const date = new Date(`${text}-01T00:00:00.000Z`);
    return Number.isNaN(date.valueOf()) ? text : new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  }
  if (/^\d{4}-\d{2}-\d{2}(?:T|$)/u.test(text)) {
    const date = new Date(`${text.slice(0, 10)}T00:00:00.000Z`);
    return Number.isNaN(date.valueOf()) ? text : new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
  }
  return text;
}

export function summarizeCommercialSources(rows: CommercialSourceRow[]): CommercialSourceSummary {
  return rows.reduce<CommercialSourceSummary>((summary, row) => {
    summary[row.status] += 1;
    return summary;
  }, { same: 0, additional: 0, review: 0 });
}

export function hasDisplayValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.some(hasDisplayValue);
  if (isRecord(value)) return Object.values(value).some(hasDisplayValue);
  return String(value).trim() !== "";
}

export function compactCommercialSourceValue(value: string, maximumLength = 120): string {
  const normalized = value.replace(/\s+/gu, " ").trim();
  const characters = Array.from(normalized);
  if (characters.length <= maximumLength) return normalized;
  return `${characters.slice(0, Math.max(1, maximumLength - 1)).join("").trimEnd()}…`;
}

function comparisonKey(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(comparisonKey).sort().join("|");
  }
  if (isRecord(value)) {
    return JSON.stringify(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
  }
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/giu, " ")
    .trim()
    .toLowerCase();
}

function sourceOriginal(value: unknown): unknown {
  if (!isRecord(value)) return null;
  return value.original ?? value.originalValue ?? value.original_value ?? value.normalized ?? null;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
