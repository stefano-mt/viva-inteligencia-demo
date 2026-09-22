import { addCandidate, cleanText, parseAttributes } from "./shared.js";
import type { FieldCandidate, ObservationFieldName, WebExtractor } from "./types.js";

export const htmlExtractor: WebExtractor = {
  id: "semantic-html-project-v1",
  archetype: "html",
  priority: 100,
  applies: (html) => /<(?:html|main|article|h1|meta|title)\b/iu.test(html),
  extract(html) {
    const candidates: FieldCandidate[] = [];
    const metadata = parseMetadata(html);
    const entityKey = "html:page-project";
    add(candidates, "project_name", metadata.get("og:title") ?? extractFirstText(html, "h1") ?? extractFirstText(html, "title"), "html:page-title", entityKey, "metadata");
    add(candidates, "agency_name", metadata.get("og:site_name"), "meta:og:site_name", entityKey, "metadata");

    for (const item of extractItemprops(html)) {
      const mapping = ITEMPROP_FIELDS.get(item.property);
      if (!mapping) continue;
      add(candidates, mapping.field, item.value, `html:itemprop=${item.property}`, entityKey, "labeled_html", mapping.unit);
    }

    // Generic HTML deliberately does not parse visually adjacent prices. Without a project-scoped
    // structured object, banners, crossed-out prices and related projects are indistinguishable.
    return { candidates };
  },
};

const ITEMPROP_FIELDS = new Map<string, { field: ObservationFieldName; unit?: string }>([
  ["address", { field: "address" }],
  ["streetaddress", { field: "address" }],
  ["floorsize", { field: "area" }],
  ["numberofbedrooms", { field: "bedrooms" }],
  ["numberofbathroomstotal", { field: "bathrooms" }],
  ["dateavailable", { field: "delivery_date" }],
  ["availability", { field: "availability" }],
]);

function add(
  candidates: FieldCandidate[],
  field: ObservationFieldName,
  value: unknown,
  locator: string,
  entityKey: string,
  confidence: "metadata" | "labeled_html",
  unit?: string,
): void {
  addCandidate(candidates, {
    field,
    value,
    locator,
    confidence,
    extractorId: htmlExtractor.id,
    archetype: htmlExtractor.archetype,
    priority: htmlExtractor.priority,
    entityKey,
    projectAssociation: "page",
    ...(unit ? { unit } : {}),
  });
}

function parseMetadata(html: string): Map<string, string> {
  const metadata = new Map<string, string>();
  for (const tag of html.match(/<meta\b[^>]*>/giu) ?? []) {
    const attributes = parseAttributes(tag);
    const key = attributes.get("property") ?? attributes.get("name");
    const value = attributes.get("content");
    if (key && value) metadata.set(key.toLocaleLowerCase("en-US"), cleanText(value));
  }
  return metadata;
}

function extractFirstText(html: string, tagName: string): string | undefined {
  const match = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "iu").exec(html);
  return match?.[1] ? cleanText(match[1]) : undefined;
}

function extractItemprops(html: string): Array<{ property: string; value: string }> {
  const result: Array<{ property: string; value: string }> = [];
  const expression = /<([a-z][\w-]*)\b([^>]*\bitemprop\s*=\s*(?:"([^"]+)"|'([^']+)')[^>]*)>([\s\S]*?)<\/\1>/giu;
  for (const match of html.matchAll(expression)) {
    const attributes = parseAttributes(`<x ${match[2] ?? ""}>`);
    const property = (match[3] ?? match[4] ?? "").toLocaleLowerCase("en-US");
    const value = attributes.get("content") ?? attributes.get("value") ?? cleanText(match[5] ?? "");
    if (property && value) result.push({ property, value });
  }
  for (const tag of html.match(/<meta\b[^>]*\bitemprop\s*=\s*(?:"[^"]+"|'[^']+')[^>]*>/giu) ?? []) {
    const attributes = parseAttributes(tag);
    const property = attributes.get("itemprop")?.toLocaleLowerCase("en-US");
    const value = attributes.get("content");
    if (property && value) result.push({ property, value });
  }
  return result;
}
