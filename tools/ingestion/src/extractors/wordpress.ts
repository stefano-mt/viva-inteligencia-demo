import { addCandidate, cleanText, parseAttributes } from "./shared.js";
import type { FieldCandidate, ObservationFieldName, WebExtractor } from "./types.js";

const WORDPRESS_MARKER = /(?:<meta\b[^>]*name\s*=\s*["']generator["'][^>]*wordpress|\/wp-content\/|\/wp-includes\/|\bwp-json\b)/iu;

export const wordpressExtractor: WebExtractor = {
  id: "wordpress-project-html-v1",
  archetype: "wordpress",
  priority: 200,
  applies: (html) => WORDPRESS_MARKER.test(html),
  extract(html) {
    const candidates: FieldCandidate[] = [];
    const entityKey = "wordpress:entry";
    add(candidates, "project_name", extractClassText(html, ["entry-title", "project-title", "proyecto-title"]), "wordpress:entry-title", entityKey);

    for (const item of extractDataFields(html)) {
      const field = DATA_FIELD_MAP.get(item.key);
      if (field) add(candidates, field, item.value, `wordpress:data-field=${item.key}`, entityKey, item.unit);
    }
    for (const item of extractDefinitionPairs(html)) {
      const field = labelToField(item.label);
      if (field) add(candidates, field, item.value, `wordpress:definition:${cleanText(item.label, 50)}`, entityKey);
    }

    // WordPress themes frequently repeat prices in cards, sliders and promotions. Price remains
    // the responsibility of JSON-LD or project-scoped embedded JSON extractors.
    return { candidates };
  },
};

const DATA_FIELD_MAP = new Map<string, ObservationFieldName>([
  ["project-name", "project_name"],
  ["project_name", "project_name"],
  ["address", "address"],
  ["direccion", "address"],
  ["total-area", "area"],
  ["area-total", "area"],
  ["bedrooms", "bedrooms"],
  ["dormitorios", "bedrooms"],
  ["bathrooms", "bathrooms"],
  ["banos", "bathrooms"],
  ["availability", "availability"],
  ["estado", "availability"],
  ["delivery-date", "delivery_date"],
  ["fecha-entrega", "delivery_date"],
  ["amenities", "amenities"],
  ["areas-comunes", "amenities"],
  ["typologies", "typologies"],
  ["tipologias", "typologies"],
  ["financing-banks", "financing_banks"],
  ["bancos", "financing_banks"],
]);

function add(
  candidates: FieldCandidate[],
  field: ObservationFieldName,
  value: unknown,
  locator: string,
  entityKey: string,
  unit?: string,
): void {
  addCandidate(candidates, {
    field,
    value,
    locator,
    confidence: "labeled_html",
    extractorId: wordpressExtractor.id,
    archetype: wordpressExtractor.archetype,
    priority: wordpressExtractor.priority,
    entityKey,
    projectAssociation: "page",
    ...(unit ? { unit } : {}),
  });
}

function extractClassText(html: string, classNames: string[]): string | undefined {
  for (const className of classNames) {
    const expression = new RegExp(`<[^>]+class\\s*=\\s*["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, "iu");
    const value = expression.exec(html)?.[1];
    if (value) return cleanText(value);
  }
  return undefined;
}

function extractDataFields(html: string): Array<{ key: string; value: string; unit?: string }> {
  const result: Array<{ key: string; value: string; unit?: string }> = [];
  for (const tag of html.match(/<[a-z][^>]*\bdata-(?:project-)?field\s*=\s*(?:"[^"]+"|'[^']+')[^>]*>/giu) ?? []) {
    const attributes = parseAttributes(tag);
    const key = (attributes.get("data-project-field") ?? attributes.get("data-field"))?.toLocaleLowerCase("en-US");
    const value = attributes.get("data-value") ?? attributes.get("content") ?? attributes.get("value");
    const unit = attributes.get("data-unit");
    if (key && value) result.push({ key, value, ...(unit ? { unit } : {}) });
  }
  return result;
}

function extractDefinitionPairs(html: string): Array<{ label: string; value: string }> {
  const result: Array<{ label: string; value: string }> = [];
  const expression = /<dt\b[^>]*>([\s\S]*?)<\/dt>\s*<dd\b[^>]*>([\s\S]*?)<\/dd>/giu;
  for (const match of html.matchAll(expression)) {
    const label = cleanText(match[1] ?? "");
    const value = cleanText(match[2] ?? "");
    if (label && value) result.push({ label, value });
  }
  return result;
}

function labelToField(label: string): ObservationFieldName | undefined {
  const normalized = label.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es-PE");
  if (/^(?:direccion|ubicacion)$/u.test(normalized)) return "address";
  if (/^(?:area total|desde|area)$/u.test(normalized)) return "area";
  if (/^(?:dormitorios|habitaciones)$/u.test(normalized)) return "bedrooms";
  if (/^banos$/u.test(normalized)) return "bathrooms";
  if (/^(?:entrega|fecha de entrega)$/u.test(normalized)) return "delivery_date";
  if (/^(?:estado|disponibilidad)$/u.test(normalized)) return "availability";
  if (/^(?:areas comunes|amenities)$/u.test(normalized)) return "amenities";
  if (/^tipologias$/u.test(normalized)) return "typologies";
  if (/^(?:bancos|financiamiento)$/u.test(normalized)) return "financing_banks";
  return undefined;
}
