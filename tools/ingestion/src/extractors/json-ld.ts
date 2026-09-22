import {
  addCandidate,
  firstObject,
  formatAddress,
  isObject,
  projectEntityKey,
  stringArray,
  stringValue,
  valueAt,
} from "./shared.js";
import type { ExtractionIssue, FieldCandidate, WebExtractor } from "./types.js";

const PROJECT_TYPES = new Set([
  "accommodation",
  "apartment",
  "apartmentcomplex",
  "house",
  "product",
  "realestatelisting",
  "residence",
  "singlefamilyresidence",
]);

export const jsonLdExtractor: WebExtractor = {
  id: "json-ld-project-v1",
  archetype: "json_ld",
  priority: 400,
  applies: (html) => /<script\b[^>]*type\s*=\s*["']application\/ld\+json["']/iu.test(html),
  extract(html) {
    const { objects, issues } = parseJsonLd(html);
    const candidates: FieldCandidate[] = [];
    for (const [index, object] of objects.entries()) {
      if (isProjectObject(object)) addProjectObject(candidates, object, index);
      if (schemaTypes(object).includes("organization")) {
        addCandidate(candidates, input("agency_name", object.name, `jsonld[${index}]:Organization.name`, `organization:${index}`, "page"));
      }
    }
    return { candidates, issues };
  },
};

function addProjectObject(candidates: FieldCandidate[], object: Record<string, unknown>, index: number): void {
  const name = valueAt(object, ["name", "headline"]);
  if (typeof name !== "string" || !name.trim()) return;
  const entityKey = projectEntityKey(name);
  const locator = (suffix: string) => `jsonld[${index}]:${suffix}`;
  addCandidate(candidates, input("project_name", name, locator("name"), entityKey, "explicit"));
  const brand = object.brand;
  addCandidate(candidates, input("agency_name", isObject(brand) ? brand.name : brand, locator("brand"), entityKey, "explicit"));
  addCandidate(candidates, input("address", formatAddress(object.address), locator("address"), entityKey, "explicit"));
  addCandidate(candidates, input("area", firstObject(object.floorSize)?.value, locator("floorSize.value"), entityKey, "explicit", stringValue(firstObject(object.floorSize)?.unitText ?? firstObject(object.floorSize)?.unitCode)));
  addCandidate(candidates, input("bedrooms", valueAt(object, ["numberOfBedrooms", "numberOfRooms"]), locator("numberOfBedrooms"), entityKey, "explicit"));
  addCandidate(candidates, input("bathrooms", object.numberOfBathroomsTotal, locator("numberOfBathroomsTotal"), entityKey, "explicit"));
  addCandidate(candidates, input("amenities", stringArray(object.amenityFeature), locator("amenityFeature"), entityKey, "explicit"));
  addCandidate(candidates, input("delivery_date", valueAt(object, ["dateAvailable", "completionDate"]), locator("dateAvailable"), entityKey, "explicit"));
  addCandidate(candidates, input("published_at", valueAt(object, ["datePosted", "datePublished"]), locator("datePublished"), entityKey, "explicit"));

  const offers = Array.isArray(object.offers) ? object.offers.filter(isObject) : firstObject(object.offers) ? [firstObject(object.offers)!] : [];
  for (const [offerIndex, offer] of offers.entries()) {
    const offerKey = entityKey;
    const currency = stringValue(valueAt(offer, ["priceCurrency", "currency"]));
    addCandidate(candidates, input("published_price", valueAt(offer, ["price", "lowPrice"]), `${locator("offers")}[${offerIndex}].price`, offerKey, "explicit", currency));
    addCandidate(candidates, input("currency", currency, `${locator("offers")}[${offerIndex}].priceCurrency`, offerKey, "explicit"));
    addCandidate(candidates, input("availability", offer.availability, `${locator("offers")}[${offerIndex}].availability`, offerKey, "explicit"));
  }
}

function input(
  field: Parameters<typeof addCandidate>[1]["field"],
  value: unknown,
  locator: string,
  entityKey: string,
  projectAssociation: "explicit" | "page",
  unit?: string,
): Parameters<typeof addCandidate>[1] {
  return {
    field,
    value,
    locator,
    confidence: "structured",
    extractorId: jsonLdExtractor.id,
    archetype: jsonLdExtractor.archetype,
    priority: jsonLdExtractor.priority,
    entityKey,
    projectAssociation,
    ...(unit ? { unit } : {}),
  };
}

function parseJsonLd(html: string): { objects: Array<Record<string, unknown>>; issues: ExtractionIssue[] } {
  const objects: Array<Record<string, unknown>> = [];
  const issues: ExtractionIssue[] = [];
  const expression = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/giu;
  let index = 0;
  for (const match of html.matchAll(expression)) {
    const raw = match[1]?.trim();
    if (!raw || raw.length > 500_000) {
      index += 1;
      continue;
    }
    try {
      collectObjects(JSON.parse(raw) as unknown, objects);
    } catch {
      issues.push({ code: "STRUCTURED_PAYLOAD_INVALID", extractorId: jsonLdExtractor.id, locator: `jsonld[${index}]` });
    }
    index += 1;
  }
  return { objects, issues };
}

function collectObjects(value: unknown, result: Array<Record<string, unknown>>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectObjects(item, result);
    return;
  }
  if (!isObject(value)) return;
  result.push(value);
  if (Array.isArray(value["@graph"])) collectObjects(value["@graph"], result);
}

function isProjectObject(value: Record<string, unknown>): boolean {
  return schemaTypes(value).some((type) => PROJECT_TYPES.has(type));
}

function schemaTypes(value: Record<string, unknown>): string[] {
  const type = value["@type"];
  const values = Array.isArray(type) ? type : type ? [type] : [];
  return values.filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.toLocaleLowerCase("en-US"));
}
