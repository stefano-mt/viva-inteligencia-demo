import {
  addCandidate,
  firstObject,
  formatAddress,
  isObject,
  inferPriceCurrency,
  projectEntityKey,
  stringArray,
  stringValue,
  valueAt,
} from "./shared.js";
import type { ExtractionContext, ExtractionIssue, FieldCandidate, WebExtractor } from "./types.js";

const SCRIPT_MARKERS = /(?:__NEXT_DATA__|__NUXT__|__INITIAL_STATE__|projectData|proyectoData|application\/json)/iu;
const PROJECT_TYPE_PATTERN = /(?:project|proyecto|development|realestate)/iu;

export const embeddedJsonExtractor: WebExtractor = {
  id: "embedded-project-json-v1",
  archetype: "embedded_json",
  priority: 350,
  applies: (html) => SCRIPT_MARKERS.test(html),
  extract(html, context) {
    const { payloads, issues } = parsePayloads(html);
    const found: Array<{ object: Record<string, unknown>; path: string }> = [];
    for (const [index, payload] of payloads.entries()) collectProjectObjects(payload, `$payload[${index}]`, found, 0, new Set());
    const selected = selectObjects(found, context);
    const candidates: FieldCandidate[] = [];
    for (const [index, entry] of selected.entries()) addProjectObject(candidates, entry.object, `${entry.path}#${index}`);
    return { candidates, issues };
  },
};

function addProjectObject(candidates: FieldCandidate[], object: Record<string, unknown>, path: string): void {
  const name = valueAt(object, ["projectName", "nombreProyecto", "project_name", "name", "nombre", "title"]);
  if (typeof name !== "string" || !name.trim()) return;
  const entityKey = projectEntityKey(name);
  addCandidate(candidates, input("project_name", name, `${path}.name`, entityKey));
  addCandidate(candidates, input("agency_name", valueAt(object, ["agencyName", "inmobiliaria", "developer", "brand"]), `${path}.agency`, entityKey));
  addCandidate(candidates, input("address", formatAddress(valueAt(object, ["address", "direccion", "ubicacion"])), `${path}.address`, entityKey));

  const areaValue = valueAt(object, ["totalArea", "areaTotal", "total_area", "area", "areaFrom", "areaDesde"]);
  addCandidate(candidates, input("area", isObject(areaValue) ? valueAt(areaValue, ["value", "valor", "amount"]) : areaValue, `${path}.area`, entityKey, stringValue(isObject(areaValue) ? valueAt(areaValue, ["unit", "unitText", "unidad"]) : undefined)));
  addCandidate(candidates, input("bedrooms", valueAt(object, ["bedrooms", "dormitorios", "numberOfBedrooms"]), `${path}.bedrooms`, entityKey));
  addCandidate(candidates, input("bathrooms", valueAt(object, ["bathrooms", "banos", "baños", "numberOfBathrooms"]), `${path}.bathrooms`, entityKey));
  addCandidate(candidates, input("amenities", stringArray(valueAt(object, ["amenities", "areasComunes", "areas_comunes", "caracteristicas"])), `${path}.amenities`, entityKey));
  addCandidate(candidates, input("typologies", stringArray(valueAt(object, ["typologies", "tipologias", "unitTypes"])), `${path}.typologies`, entityKey));
  addCandidate(candidates, input("financing_banks", stringArray(valueAt(object, ["financingBanks", "bancos", "financiamiento"])), `${path}.financingBanks`, entityKey));
  addCandidate(candidates, input("availability", valueAt(object, ["availability", "status", "estado", "unitStatus"]), `${path}.availability`, entityKey));
  addCandidate(candidates, input("delivery_date", valueAt(object, ["deliveryDate", "fechaEntrega", "completionDate"]), `${path}.deliveryDate`, entityKey));
  addCandidate(candidates, input("published_at", valueAt(object, ["publishedAt", "datePublished", "updatedAt"]), `${path}.publishedAt`, entityKey));

  const offers = firstObject(valueAt(object, ["offers", "offer", "oferta"]));
  const price = offers
    ? valueAt(offers, ["price", "lowPrice", "publishedPrice", "precioDesde"])
    : valueAt(object, ["publishedPrice", "published_price", "priceFrom", "precioDesde", "precio_desde"]);
  const currency = stringValue(offers
    ? valueAt(offers, ["priceCurrency", "currency", "moneda"])
    : valueAt(object, ["priceCurrency", "currency", "moneda"])) ?? inferPriceCurrency(price);
  const offerKey = entityKey;
  addCandidate(candidates, input("published_price", price, offers ? `${path}.offers.price` : `${path}.publishedPrice`, offerKey, currency));
  addCandidate(candidates, input("currency", currency, offers ? `${path}.offers.priceCurrency` : `${path}.currency`, offerKey));
}

function input(
  field: Parameters<typeof addCandidate>[1]["field"],
  value: unknown,
  locator: string,
  entityKey: string,
  unit?: string,
): Parameters<typeof addCandidate>[1] {
  return {
    field,
    value,
    locator,
    confidence: "structured",
    extractorId: embeddedJsonExtractor.id,
    archetype: embeddedJsonExtractor.archetype,
    priority: embeddedJsonExtractor.priority,
    entityKey,
    projectAssociation: "explicit",
    ...(unit ? { unit } : {}),
  };
}

function parsePayloads(html: string): { payloads: unknown[]; issues: ExtractionIssue[] } {
  const payloads: unknown[] = [];
  const issues: ExtractionIssue[] = [];
  const rawPayloads: Array<{ raw: string; locator: string }> = [];
  let scriptIndex = 0;
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/giu)) {
    const attributes = match[1] ?? "";
    const body = match[2]?.trim() ?? "";
    const locator = `script[${scriptIndex}]`;
    scriptIndex += 1;
    if (!body || body.length > 500_000) continue;
    if (/type\s*=\s*["']application\/json["']/iu.test(attributes)) rawPayloads.push({ raw: body, locator });
    for (const marker of ["__NEXT_DATA__", "__NUXT__", "__INITIAL_STATE__", "projectData", "proyectoData"]) {
      const markerIndex = body.indexOf(marker);
      if (markerIndex < 0) continue;
      const objectStart = findJsonStart(body, markerIndex + marker.length);
      if (objectStart < 0) continue;
      const raw = extractBalancedJson(body, objectStart);
      if (raw) rawPayloads.push({ raw, locator: `${locator}:${marker}` });
    }
  }
  for (const entry of rawPayloads) {
    try {
      payloads.push(JSON.parse(entry.raw) as unknown);
    } catch {
      issues.push({ code: "STRUCTURED_PAYLOAD_INVALID", extractorId: embeddedJsonExtractor.id, locator: entry.locator });
    }
  }
  return { payloads, issues };
}

function findJsonStart(value: string, offset: number): number {
  const object = value.indexOf("{", offset);
  const array = value.indexOf("[", offset);
  if (object < 0) return array;
  if (array < 0) return object;
  return Math.min(object, array);
}

function extractBalancedJson(value: string, start: number): string | undefined {
  const opening = value[start];
  if (opening !== "{" && opening !== "[") return undefined;
  const stack: string[] = [opening];
  let quoted = false;
  let escaped = false;
  for (let index = start + 1; index < value.length; index += 1) {
    const character = value[index] ?? "";
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === "{" || character === "[") stack.push(character);
    else if (character === "}" || character === "]") {
      const expected = character === "}" ? "{" : "[";
      if (stack.pop() !== expected) return undefined;
      if (stack.length === 0) return value.slice(start, index + 1);
    }
  }
  return undefined;
}

function collectProjectObjects(
  value: unknown,
  path: string,
  result: Array<{ object: Record<string, unknown>; path: string }>,
  depth: number,
  seen: Set<object>,
): void {
  if (depth > 10 || result.length >= 200) return;
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) collectProjectObjects(item, `${path}[${index}]`, result, depth + 1, seen);
    return;
  }
  if (!isObject(value) || seen.has(value)) return;
  seen.add(value);
  if (looksLikeProject(value)) result.push({ object: value, path });
  for (const [key, nested] of Object.entries(value)) {
    if (["email", "phone", "telefono", "whatsapp", "contact"].includes(key.toLocaleLowerCase("en-US"))) continue;
    if (Array.isArray(nested) || isObject(nested)) collectProjectObjects(nested, `${path}.${key}`, result, depth + 1, seen);
  }
}

function looksLikeProject(value: Record<string, unknown>): boolean {
  const name = valueAt(value, ["projectName", "nombreProyecto", "project_name", "name", "nombre", "title"]);
  if (typeof name !== "string" || !name.trim()) return false;
  const type = valueAt(value, ["type", "@type", "entityType", "tipo"]);
  if (typeof type === "string" && PROJECT_TYPE_PATTERN.test(type)) return true;
  const markerKeys = [
    "address", "direccion", "totalArea", "areaTotal", "total_area", "bedrooms", "dormitorios",
    "offers", "publishedPrice", "precioDesde", "deliveryDate", "fechaEntrega", "typologies", "tipologias",
  ];
  return markerKeys.some((key) => value[key] !== undefined);
}

function selectObjects(
  found: Array<{ object: Record<string, unknown>; path: string }>,
  context: ExtractionContext,
): Array<{ object: Record<string, unknown>; path: string }> {
  const externalId = context.projectExternalId?.trim().toLocaleLowerCase("en-US");
  if (!externalId) return found;
  const exact = found.filter(({ object }) => ["id", "projectId", "project_id", "externalId", "codigo"]
    .some((key) => String(object[key] ?? "").trim().toLocaleLowerCase("en-US") === externalId));
  return exact.length > 0 ? exact : found;
}
