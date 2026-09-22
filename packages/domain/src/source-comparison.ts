export type SourceComparisonStatus =
  | "match"
  | "additional"
  | "review"
  | "nexo_only"
  | "official_only"
  | "unavailable";

export type ProjectSourceComparisonStatus =
  | "compared"
  | "linked_only"
  | "nexo_only"
  | "unavailable";

export type ProjectSourceField =
  | "projectName"
  | "address"
  | "typology"
  | "bedrooms"
  | "totalArea"
  | "unitStatus"
  | "unitCount"
  | "listPrice"
  | "deliveryDate"
  | "amenities"
  | "financingBanks";

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface ProjectSourceObservation {
  id: string;
  name?: string | null;
  type?: string | null;
  observedData?: Record<string, unknown> | null;
}

export interface NormalizedNumericRange {
  min: number;
  max: number;
  unit: string | null;
}

export interface NumericRangeOptions {
  min?: unknown;
  max?: unknown;
  unit?: unknown;
}

export interface ProjectSourceFieldValue {
  original: JsonValue;
  normalized: JsonValue;
}

export interface ProjectSourceComparisonRow {
  field: ProjectSourceField;
  label: string;
  status: SourceComparisonStatus;
  nexo: ProjectSourceFieldValue | null;
  official: ProjectSourceFieldValue | null;
}

export interface ProjectSourceReference {
  id: string;
  name: string | null;
}

export interface ProjectSourceComparison {
  status: ProjectSourceComparisonStatus;
  sources: {
    nexo: ProjectSourceReference | null;
    official: ProjectSourceReference | null;
  };
  summary: Record<SourceComparisonStatus, number>;
  rows: ProjectSourceComparisonRow[];
}

export type ProjectSourceValueKind = "text" | "address" | "range" | "date" | "list";

export interface CompareProjectSourceValuesOptions {
  nexoRange?: NumericRangeOptions;
  officialRange?: NumericRangeOptions;
}

interface FieldDefinition {
  field: ProjectSourceField;
  label: string;
  kind: ProjectSourceValueKind;
  minKey?: string;
  maxKey?: string;
  unit?: string;
}

const FIELDS: FieldDefinition[] = [
  { field: "projectName", label: "Proyecto", kind: "text" },
  { field: "address", label: "Dirección", kind: "address" },
  { field: "typology", label: "Tipo de inmueble", kind: "text" },
  {
    field: "bedrooms",
    label: "Dormitorios",
    kind: "range",
    minKey: "bedroomsMin",
    maxKey: "bedroomsMax",
    unit: "count",
  },
  {
    field: "totalArea",
    label: "Área total",
    kind: "range",
    minKey: "totalAreaMin",
    maxKey: "totalAreaMax",
    unit: "m2",
  },
  { field: "unitStatus", label: "Estado del proyecto", kind: "text" },
  { field: "unitCount", label: "Unidades", kind: "range", unit: "count" },
  {
    field: "listPrice",
    label: "Precio publicado",
    kind: "range",
    minKey: "listPriceMin",
    maxKey: "listPriceMax",
  },
  { field: "deliveryDate", label: "Entrega", kind: "date" },
  { field: "amenities", label: "Áreas comunes", kind: "list" },
  { field: "financingBanks", label: "Financiamiento", kind: "list" },
];

const EMPTY_SUMMARY: Record<SourceComparisonStatus, number> = {
  match: 0,
  additional: 0,
  review: 0,
  nexo_only: 0,
  official_only: 0,
  unavailable: 0,
};

/**
 * Produces a stable, comparison-oriented representation of a Peruvian address.
 * It deliberately does not geocode or infer missing address components.
 */
export function normalizePeruvianAddress(value: unknown): string | null {
  if (!hasValue(value)) return null;
  const addressWithoutNumberMarkers = String(value)
    .replace(/\b(?:nro|num|n[uú]mero|no|n)\.?\s*(?:[º°#])?/giu, " ")
    .replace(/#/gu, " ");
  const text = normalizedText(addressWithoutNumberMarkers);
  if (!text) return null;

  return text
    .replace(/\b(?:av|avda|aven)\b/gu, "avenida")
    .replace(/\b(?:ca|cl)\b/gu, "calle")
    .replace(/\b(?:jr)\b/gu, "jiron")
    .replace(/\b(?:nro|num|numero|no)\b/gu, " ")
    .replace(/\b(?:dpto|depto)\b/gu, "departamento")
    .replace(/\b(?:int)\b/gu, "interior")
    .replace(/\s+/gu, " ")
    .trim() || null;
}

export const normalizeProjectAddress = normalizePeruvianAddress;
export const parseNumericRange = normalizeNumericRange;

/**
 * Normalizes positive numeric values and ranges without changing their source
 * representation. Explicit min/max fields take precedence over a display value.
 */
export function normalizeNumericRange(
  value: unknown,
  options: NumericRangeOptions = {},
): NormalizedNumericRange | null {
  const explicitMin = firstNumber(options.min, options.unit);
  const explicitMax = firstNumber(options.max, options.unit);
  const values = numbersFromUnknown(value, options.unit);
  const bounds = [
    ...(explicitMin == null ? [] : [explicitMin]),
    ...(explicitMax == null ? [] : [explicitMax]),
  ];
  const candidates = explicitMin != null && explicitMax != null
    ? bounds
    : [...bounds, ...values];
  if (candidates.length === 0) return null;

  return {
    min: Math.min(...candidates),
    max: Math.max(...candidates),
    unit: normalizeUnit(options.unit) ?? inferUnit(value),
  };
}

export function buildProjectSourceComparison(
  sources: ProjectSourceObservation[],
): ProjectSourceComparison {
  const nexoSource = sources.find(isNexoSource) ?? null;
  const officialCandidates = sources.filter(isOfficialWebsiteSource);
  const officialSource = officialCandidates.find((source) => hasObservedData(source.observedData))
    ?? officialCandidates[0]
    ?? null;
  const nexoData = hasObservedData(nexoSource?.observedData) ? nexoSource.observedData : null;
  const officialData = hasObservedData(officialSource?.observedData)
    ? officialSource.observedData
    : null;
  const status = comparisonStatus(nexoData, officialSource, officialData);
  const rows = status === "compared"
    ? FIELDS.map((definition) => compareField(definition, nexoData, officialData))
    : [];
  const summary = { ...EMPTY_SUMMARY };
  for (const row of rows) summary[row.status] += 1;

  return {
    status,
    sources: {
      nexo: sourceReference(nexoSource),
      official: sourceReference(officialSource),
    },
    summary,
    rows,
  };
}

/**
 * Applies the same semantic comparison used by project cards to two standalone
 * values. It is suitable for ingestion reconciliation without importing any
 * browser, server or persistence concern.
 */
export function compareProjectSourceValues(
  kind: ProjectSourceValueKind,
  nexoValue: unknown,
  officialValue: unknown,
  options: CompareProjectSourceValuesOptions = {},
): SourceComparisonStatus {
  const nexo = standaloneValue(kind, nexoValue, options.nexoRange);
  const official = standaloneValue(kind, officialValue, options.officialRange);
  if (!nexo && !official) return "unavailable";
  if (nexo && !official) return "nexo_only";
  if (!nexo && official) return "official_only";
  return comparePresentValues(kind, nexo!, official!);
}

function compareField(
  definition: FieldDefinition,
  nexoData: Record<string, unknown> | null,
  officialData: Record<string, unknown> | null,
): ProjectSourceComparisonRow {
  const nexo = fieldValue(definition, nexoData);
  const official = fieldValue(definition, officialData);
  let status: SourceComparisonStatus;

  if (!nexo && !official) status = "unavailable";
  else if (nexo && !official) status = "nexo_only";
  else if (!nexo && official) status = "official_only";
  else status = comparePresentValues(definition.kind, nexo!, official!);

  return {
    field: definition.field,
    label: definition.label,
    status,
    nexo,
    official,
  };
}

function fieldValue(
  definition: FieldDefinition,
  data: Record<string, unknown> | null,
): ProjectSourceFieldValue | null {
  if (!data) return null;
  const raw = data[definition.field];

  if (definition.kind === "range") {
    const min = definition.minKey ? data[definition.minKey] : undefined;
    const max = definition.maxKey ? data[definition.maxKey] : undefined;
    const unit = definition.field === "listPrice"
      ? data.currency
      : definition.unit;
    const normalized = normalizeNumericRange(raw, { min, max, unit });
    if (!normalized) return null;
    return {
      original: originalRangeValue(raw, min, max),
      normalized: toJsonValue(normalized),
    };
  }

  if (!hasValue(raw)) return null;
  const original = toJsonValue(raw);
  if (definition.kind === "address") {
    const normalized = normalizePeruvianAddress(raw);
    return normalized ? { original, normalized } : null;
  }
  if (definition.kind === "list") {
    const normalized = normalizeList(raw);
    return normalized.length > 0 ? { original, normalized } : null;
  }
  if (definition.kind === "date") {
    const normalized = normalizeDate(raw);
    return normalized ? { original, normalized: toJsonValue(normalized) } : null;
  }
  const normalized = normalizedText(raw);
  return normalized ? { original, normalized } : null;
}

function comparePresentValues(
  kind: ProjectSourceValueKind,
  nexo: ProjectSourceFieldValue,
  official: ProjectSourceFieldValue,
): SourceComparisonStatus {
  if (kind === "range") {
    return compareRanges(
      nexo.normalized as unknown as NormalizedNumericRange,
      official.normalized as unknown as NormalizedNumericRange,
    );
  }
  if (kind === "list") {
    return arraysEqual(nexo.normalized, official.normalized) ? "match" : "additional";
  }
  if (kind === "date") return compareDates(nexo.normalized, official.normalized);
  return nexo.normalized === official.normalized ? "match" : "review";
}

function standaloneValue(
  kind: ProjectSourceValueKind,
  value: unknown,
  rangeOptions: NumericRangeOptions | undefined,
): ProjectSourceFieldValue | null {
  if (!hasValue(value)) return null;
  const original = toJsonValue(value);
  if (kind === "range") {
    const normalized = normalizeNumericRange(value, rangeOptions);
    return normalized ? { original, normalized: toJsonValue(normalized) } : null;
  }
  if (kind === "address") {
    const normalized = normalizePeruvianAddress(value);
    return normalized ? { original, normalized } : null;
  }
  if (kind === "list") {
    const normalized = normalizeList(value);
    return normalized.length > 0 ? { original, normalized } : null;
  }
  if (kind === "date") {
    return { original, normalized: toJsonValue(normalizeDate(value)) };
  }
  const normalized = normalizedText(value);
  return normalized ? { original, normalized } : null;
}

function compareRanges(
  nexo: NormalizedNumericRange,
  official: NormalizedNumericRange,
): SourceComparisonStatus {
  if (nexo.unit && official.unit && nexo.unit !== official.unit) return "review";
  if (sameNumber(nexo.min, official.min) && sameNumber(nexo.max, official.max)) return "match";
  const overlaps = nexo.min <= official.max && official.min <= nexo.max;
  if (!overlaps) return "review";
  const nexoPoint = sameNumber(nexo.min, nexo.max);
  const officialPoint = sameNumber(official.min, official.max);
  if ((nexoPoint || officialPoint)
    && (contains(nexo, official.min) || contains(official, nexo.min))) {
    return "match";
  }
  return "additional";
}

function compareDates(nexoValue: JsonValue, officialValue: JsonValue): SourceComparisonStatus {
  const nexo = nexoValue as { precision: string; value: string; year: number | null };
  const official = officialValue as { precision: string; value: string; year: number | null };
  if (nexo.precision === "unparsed" || official.precision === "unparsed") return "review";
  if (nexo.value === official.value) return "match";
  if (nexo.year !== official.year) return "review";
  return nexo.precision === official.precision ? "review" : "additional";
}

function comparisonStatus(
  nexoData: Record<string, unknown> | null,
  officialSource: ProjectSourceObservation | null,
  officialData: Record<string, unknown> | null,
): ProjectSourceComparisonStatus {
  if (nexoData && officialData) return "compared";
  if (nexoData && officialSource) return "linked_only";
  if (nexoData) return "nexo_only";
  return "unavailable";
}

function sourceReference(source: ProjectSourceObservation | null): ProjectSourceReference | null {
  if (!source) return null;
  return { id: source.id, name: source.name ?? null };
}

function isNexoSource(source: ProjectSourceObservation): boolean {
  const id = normalizedText(source.id) ?? "";
  const name = normalizedText(source.name) ?? "";
  return id === "source nexo" || id.includes("nexo") || name.includes("nexo");
}

function isOfficialWebsiteSource(source: ProjectSourceObservation): boolean {
  const type = normalizedText(source.type) ?? "";
  const id = normalizedText(source.id) ?? "";
  return type === "agency website"
    || type === "official website"
    || id.startsWith("source web");
}

function hasObservedData(value: Record<string, unknown> | null | undefined): value is Record<string, unknown> {
  return value != null && Object.values(value).some(hasValue);
}

function hasValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasValue);
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "object") return Object.values(value).some(hasValue);
  return true;
}

function normalizedText(value: unknown): string | null {
  if (!hasValue(value)) return null;
  const text = String(value)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[º°#]/gu, " numero ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return text || null;
}

function normalizeList(value: unknown): JsonValue[] {
  const items = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[;,|]/gu)
      : [value];
  return [...new Set(items
    .map((item) => normalizedText(item))
    .filter((item): item is string => item != null))]
    .sort((left, right) => left.localeCompare(right, "es"));
}

function normalizeDate(value: unknown): {
  precision: "day" | "month" | "year" | "unparsed";
  value: string;
  year: number | null;
} {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    const iso = value.toISOString().slice(0, 10);
    return { precision: "day", value: iso, year: value.getUTCFullYear() };
  }
  const text = String(value ?? "").trim();
  const yearOnly = text.match(/^(?:entrega\s+)?((?:19|20)\d{2})$/iu);
  if (yearOnly) return { precision: "year", value: yearOnly[1]!, year: Number(yearOnly[1]) };
  const yearMonth = text.match(/^((?:19|20)\d{2})-(0[1-9]|1[0-2])$/u);
  if (yearMonth) return { precision: "month", value: yearMonth[0], year: Number(yearMonth[1]) };
  const isoDate = text.match(/^((?:19|20)\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/u);
  if (isoDate) return { precision: "day", value: isoDate[0], year: Number(isoDate[1]) };
  const localDate = text.match(/^(0?[1-9]|[12]\d|3[01])[/-](0?[1-9]|1[0-2])[/-]((?:19|20)\d{2})$/u);
  if (localDate) {
    const [, day, month, year] = localDate;
    return {
      precision: "day",
      value: `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`,
      year: Number(year),
    };
  }
  const monthYear = normalizedText(text)?.match(
    /^(?:entrega )?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre) ((?:19|20)\d{2})$/u,
  );
  if (monthYear) {
    const monthNames = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    ];
    const normalizedMonth = monthYear[1] === "setiembre" ? "septiembre" : monthYear[1]!;
    const month = monthNames.indexOf(normalizedMonth) + 1;
    return {
      precision: "month",
      value: `${monthYear[2]}-${String(month).padStart(2, "0")}`,
      year: Number(monthYear[2]),
    };
  }
  return {
    precision: "unparsed",
    value: normalizedText(value) ?? "",
    year: null,
  };
}

function originalRangeValue(value: unknown, min: unknown, max: unknown): JsonValue {
  if (!hasValue(min) && !hasValue(max)) return toJsonValue(value);
  return {
    value: hasValue(value) ? toJsonValue(value) : null,
    min: hasValue(min) ? toJsonValue(min) : null,
    max: hasValue(max) ? toJsonValue(max) : null,
  };
}

function numbersFromUnknown(value: unknown, unit: unknown): number[] {
  if (typeof value === "number") return Number.isFinite(value) ? [value] : [];
  if (Array.isArray(value)) return value.flatMap((item) => numbersFromUnknown(item, unit));
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferred = [record.min, record.max, record.from, record.to, record.value]
      .flatMap((item) => numbersFromUnknown(item, unit));
    return preferred;
  }
  if (typeof value !== "string") return [];
  const cleaned = value
    .replace(/m(?:2|²)/giu, " ")
    .replace(/\b(?:pen|usd|dormitorios?|habitaciones?|unidades?)\b/giu, " ")
    .replace(/s\//giu, " ")
    .replace(/(?<=\d)\s*[-–—]\s*(?=\d)/gu, " a ");
  return [...cleaned.matchAll(/\d+(?:[.,]\d+)*/gu)]
    .map((match) => parseLocalizedNumber(match[0]!, normalizeUnit(unit) ?? inferUnit(value)))
    .filter((number): number is number => number != null);
}

function firstNumber(value: unknown, unit: unknown): number | null {
  return numbersFromUnknown(value, unit)[0] ?? null;
}

function parseLocalizedNumber(value: string, unit: string | null): number | null {
  const compact = value.replace(/\s+/gu, "");
  const comma = compact.lastIndexOf(",");
  const dot = compact.lastIndexOf(".");
  let normalized = compact;

  if (comma >= 0 && dot >= 0) {
    const decimalSeparator = comma > dot ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    normalized = compact.split(thousandsSeparator).join("").replace(decimalSeparator, ".");
  } else if (comma >= 0) {
    const fractionLength = compact.length - comma - 1;
    normalized = fractionLength === 3 && unit !== "m2"
      ? compact.replace(/,/gu, "")
      : compact.replace(",", ".");
  } else if (dot >= 0 && unit === "PEN") {
    const fractionLength = compact.length - dot - 1;
    if (fractionLength === 3) normalized = compact.replace(/\./gu, "");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeUnit(value: unknown): string | null {
  const unit = normalizedText(value);
  if (!unit) return null;
  if (["s", "sol", "soles", "pen"].includes(unit)) return "PEN";
  if (["usd", "dolar", "dolares"].includes(unit)) return "USD";
  if (["m2", "m 2", "metro cuadrado", "metros cuadrados"].includes(unit)) return "m2";
  if (["count", "cantidad", "unidad", "unidades"].includes(unit)) return "count";
  return unit;
}

function inferUnit(value: unknown): string | null {
  const text = String(value ?? "").toLowerCase();
  if (/s\/|\bpen\b|\bsol(?:es)?\b/u.test(text)) return "PEN";
  if (/\busd\b|\bd[oó]lar(?:es)?\b|\$/u.test(text)) return "USD";
  if (/m(?:2|²)/u.test(text)) return "m2";
  if (/dormitorios?|habitaciones?|unidades?/u.test(text)) return "count";
  return null;
}

function contains(range: NormalizedNumericRange, value: number): boolean {
  return value >= range.min && value <= range.max;
}

function sameNumber(left: number, right: number): boolean {
  return Math.abs(left - right) <= 1e-9;
}

function arraysEqual(left: JsonValue, right: JsonValue): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function toJsonValue(value: unknown): JsonValue {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return Number.isNaN(value.valueOf()) ? null : value.toISOString();
  if (Array.isArray(value)) return value.map(toJsonValue);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, toJsonValue(item)]));
  }
  return String(value);
}
