import type {
  ExtractorArchetype,
  FieldCandidate,
  ObservationConfidence,
  ObservationFieldName,
} from "./types.js";

const EMAIL_PATTERN = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/u;
const MOBILE_PATTERN = /(?:\+?51[\s.-]*)?(?:9\d{2}[\s.-]*\d{3}[\s.-]*\d{3})/u;
const CONTACT_PATTERN = /(?:tel(?:e?fono)?|whatsapp|contacto)\s*[:：]?\s*\+?\d/iu;

export interface CandidateInput {
  field: ObservationFieldName;
  value: unknown;
  locator: string;
  confidence: ObservationConfidence;
  extractorId: string;
  archetype: ExtractorArchetype;
  priority: number;
  entityKey: string;
  projectAssociation: FieldCandidate["projectAssociation"];
  unit?: string;
}

export function candidate(input: CandidateInput): FieldCandidate | undefined {
  const safe = input.field === "published_price"
    ? normalizePublishedPrice(input.value)
    : normalizeObservationValue(input.value);
  if (safe === undefined) return undefined;
  return {
    field: input.field,
    originalValue: safe,
    normalizedValue: typeof safe === "string" ? safe.trim() : safe,
    ...(input.unit ? { unit: cleanText(input.unit, 30) } : {}),
    locator: cleanText(input.locator, 180),
    confidence: input.confidence,
    reviewStatus: "unreviewed",
    extractorId: input.extractorId,
    archetype: input.archetype,
    priority: input.priority,
    entityKey: cleanText(input.entityKey, 180),
    projectAssociation: input.projectAssociation,
  };
}

export function projectEntityKey(name: string): string {
  return `project:${name.normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/giu, " ").trim().toLocaleLowerCase("es-PE")}`;
}

export function inferPriceCurrency(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (/\bPEN\b|S\//iu.test(value)) return "PEN";
  if (/\bUSD\b|US\$/iu.test(value)) return "USD";
  return undefined;
}

export function addCandidate(result: FieldCandidate[], input: CandidateInput): void {
  const item = candidate(input);
  if (item) result.push(item);
}

export function normalizeObservationValue(value: unknown): string | number | string[] | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const decoded = cleanText(value, 300);
    if (!decoded || containsPii(decoded)) return undefined;
    const numeric = parseUnambiguousNumber(decoded);
    return numeric ?? decoded;
  }
  if (Array.isArray(value)) {
    const safe = value
      .map((entry) => normalizeObservationValue(entry))
      .filter((entry): entry is string => typeof entry === "string");
    return safe.length > 0 ? [...new Set(safe)].slice(0, 50) : undefined;
  }
  return undefined;
}

export function parseUnambiguousNumber(value: string): number | undefined {
  const compact = value.trim().replace(/\s/gu, "");
  if (/^-?\d+(?:\.\d+)?$/u.test(compact)) return Number(compact);
  if (/^-?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/u.test(compact)) return Number(compact.replaceAll(",", ""));
  return undefined;
}

function normalizePublishedPrice(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  if (typeof value !== "string" || containsPii(value)) return undefined;
  let compact = decodeHtml(value).trim().replace(/^(?:PEN|USD|S\/|US\$)\s*/iu, "")
    .replace(/\s*(?:PEN|USD)$/iu, "").replace(/\s/gu, "");
  if (/^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/u.test(compact)) compact = compact.replaceAll(",", "");
  else if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/u.test(compact)) compact = compact.replaceAll(".", "").replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/u.test(compact)) return undefined;
  const result = Number(compact);
  return Number.isFinite(result) ? result : undefined;
}

export function cleanText(value: string, maximum = 300): string {
  return decodeHtml(stripTags(value)).replace(/\s+/gu, " ").trim().slice(0, maximum);
}

export function containsPii(value: string): boolean {
  return EMAIL_PATTERN.test(value) || MOBILE_PATTERN.test(value) || CONTACT_PATTERN.test(value);
}

export function decodeHtml(value: string): string {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

export function stripTags(value: string): string {
  return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]+>/gu, " ");
}

export function parseAttributes(tag: string): Map<string, string> {
  const attributes = new Map<string, string>();
  const expression = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gu;
  for (const match of tag.matchAll(expression)) {
    const key = match[1]?.toLocaleLowerCase("en-US");
    const value = match[2] ?? match[3] ?? match[4];
    if (key && value !== undefined) attributes.set(key, value);
  }
  return attributes;
}

export function firstObject(value: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(value)) return value.find(isObject);
  return isObject(value) ? value : undefined;
}

export function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function valueAt(object: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (object[key] !== undefined && object[key] !== null && object[key] !== "") return object[key];
  }
  return undefined;
}

export function stringArray(value: unknown): string[] | undefined {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const strings = values.flatMap((entry) => {
    if (typeof entry === "string") return [entry];
    if (isObject(entry)) {
      const nested = valueAt(entry, ["name", "nombre", "title", "label"]);
      return typeof nested === "string" ? [nested] : [];
    }
    return [];
  }).map((entry) => cleanText(entry)).filter((entry) => entry && !containsPii(entry));
  return strings.length > 0 ? [...new Set(strings)] : undefined;
}

export function formatAddress(value: unknown): string | undefined {
  if (typeof value === "string") return cleanText(value);
  const address = firstObject(value);
  if (!address) return undefined;
  const parts = [
    valueAt(address, ["streetAddress", "street", "direccion"]),
    valueAt(address, ["addressLocality", "district", "distrito"]),
    valueAt(address, ["addressRegion", "region"]),
  ].filter((part): part is string => typeof part === "string");
  return parts.length > 0 ? cleanText(parts.join(", ")) : undefined;
}

export function stableValueKey(value: string | number | string[]): string {
  if (Array.isArray(value)) return JSON.stringify([...value].map(normalizeComparableString).sort());
  return typeof value === "string" ? normalizeComparableString(value) : String(value);
}

function normalizeComparableString(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLocaleLowerCase("es-PE");
}
