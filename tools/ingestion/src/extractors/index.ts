import { embeddedJsonExtractor } from "./embedded-json.js";
import { htmlExtractor } from "./html.js";
import { jsonLdExtractor } from "./json-ld.js";
import { officialProjectProfileExtractor } from "./official-project-profile.js";
import { stableValueKey } from "./shared.js";
import type {
  ExtractionContext,
  ExtractionIssue,
  ExtractionResult,
  ExtractorAttempt,
  FieldCandidate,
  ObservationField,
  ObservationFieldName,
  WebExtractor,
} from "./types.js";
import { wordpressExtractor } from "./wordpress.js";

export type {
  ExtractionContext,
  ExtractionIssue,
  ExtractionResult,
  ExtractorArchetype,
  ExtractorAttempt,
  ObservationConfidence,
  ObservationField,
  ObservationFieldName,
} from "./types.js";

const EXTRACTORS: WebExtractor[] = [
  officialProjectProfileExtractor,
  jsonLdExtractor,
  embeddedJsonExtractor,
  wordpressExtractor,
  htmlExtractor,
];
const FIELD_ORDER: ObservationFieldName[] = [
  "project_name", "agency_name", "address", "published_price", "currency", "area", "bedrooms",
  "bathrooms", "typologies", "amenities", "financing_banks", "availability", "delivery_date", "published_at",
];

export function extractProjectObservations(html: string, context: ExtractionContext = {}): ExtractionResult {
  const candidates: FieldCandidate[] = [];
  const issues: ExtractionIssue[] = [];
  const rawAttempts: Array<Omit<ExtractorAttempt, "acceptedFields" | "issueCodes">> = [];

  for (const extractor of EXTRACTORS) {
    const applicable = extractor.applies(html, context);
    if (!applicable) {
      rawAttempts.push({ extractorId: extractor.id, archetype: extractor.archetype, applicable: false, candidateFields: 0 });
      continue;
    }
    try {
      const output = extractor.extract(html, context);
      const preferenceBonus = context.preferredArchetypes?.includes(extractor.archetype) ? 25 : 0;
      candidates.push(...output.candidates.map((item) => ({ ...item, priority: item.priority + preferenceBonus })));
      issues.push(...(output.issues ?? []));
      rawAttempts.push({ extractorId: extractor.id, archetype: extractor.archetype, applicable: true, candidateFields: output.candidates.length });
    } catch {
      issues.push({ code: "EXTRACTOR_FAILURE", extractorId: extractor.id });
      rawAttempts.push({ extractorId: extractor.id, archetype: extractor.archetype, applicable: true, candidateFields: 0 });
    }
  }

  const accepted = new Map<ObservationFieldName, FieldCandidate>();
  for (const field of FIELD_ORDER.filter((name) => name !== "published_price" && name !== "currency")) {
    resolveOrdinaryField(field, candidates, accepted, issues);
  }
  resolvePublishedPrice(candidates, accepted, issues);

  const fields = FIELD_ORDER.flatMap((field) => {
    const item = accepted.get(field);
    return item ? [toObservationField(item)] : [];
  });
  const attempts = rawAttempts.map((attempt) => ({
    ...attempt,
    acceptedFields: [...accepted.values()].filter((item) => item.extractorId === attempt.extractorId).length,
    issueCodes: [...new Set(issues.filter((issue) => issue.extractorId === attempt.extractorId).map((issue) => issue.code))].sort(),
  }));
  return { fields, attempts, issues };
}

function resolveOrdinaryField(
  field: ObservationFieldName,
  candidates: FieldCandidate[],
  accepted: Map<ObservationFieldName, FieldCandidate>,
  issues: ExtractionIssue[],
): void {
  const matches = candidates.filter((candidate) => candidate.field === field);
  if (matches.length === 0) return;
  const maximumPriority = Math.max(...matches.map((candidate) => candidate.priority));
  const preferred = matches.filter((candidate) => candidate.priority === maximumPriority);
  const values = new Set(preferred.map((candidate) => stableValueKey(candidate.normalizedValue)));
  if (values.size !== 1) {
    for (const item of preferred) issues.push({ code: "AMBIGUOUS_FIELD", extractorId: item.extractorId, field, locator: item.locator });
    return;
  }
  const selected = preferred.sort((left, right) => left.locator.localeCompare(right.locator))[0];
  if (selected) accepted.set(field, selected);
}

function resolvePublishedPrice(
  candidates: FieldCandidate[],
  accepted: Map<ObservationFieldName, FieldCandidate>,
  issues: ExtractionIssue[],
): void {
  const allPrices = candidates.filter((candidate) => candidate.field === "published_price");
  const explicit = allPrices.filter((candidate) => candidate.projectAssociation === "explicit" && candidate.entityKey.trim());
  for (const item of allPrices.filter((candidate) => !explicit.includes(candidate))) {
    issues.push({ code: "PRICE_NOT_PROJECT_ASSOCIATED", extractorId: item.extractorId, field: "published_price", locator: item.locator });
  }
  if (explicit.length === 0) return;

  const projectKeys = new Set(explicit.map((candidate) => candidate.entityKey));
  if (projectKeys.size !== 1) {
    for (const item of explicit) issues.push({ code: "AMBIGUOUS_FIELD", extractorId: item.extractorId, field: "published_price", locator: item.locator });
    return;
  }

  // Price is intentionally stricter than descriptive fields: any distinct project-associated
  // price on the same page is ambiguous (often a typology range or a related-project card).
  const distinctPrices = new Set(explicit.map((candidate) => stableValueKey(candidate.normalizedValue)));
  if (distinctPrices.size !== 1) {
    for (const item of explicit) issues.push({ code: "AMBIGUOUS_FIELD", extractorId: item.extractorId, field: "published_price", locator: item.locator });
    return;
  }

  const maximumPriority = Math.max(...explicit.map((candidate) => candidate.priority));
  const selected = explicit.filter((candidate) => candidate.priority === maximumPriority)
    .sort((left, right) => left.locator.localeCompare(right.locator))[0];
  if (!selected) return;
  const associatedCurrencies = candidates.filter((candidate) =>
    candidate.field === "currency"
    && candidate.extractorId === selected.extractorId
    && candidate.entityKey === selected.entityKey
    && candidate.projectAssociation === "explicit");
  const currencyValues = new Set(associatedCurrencies.map((candidate) => stableValueKey(candidate.normalizedValue)));
  const unitCurrency = selected.unit?.trim();
  if (currencyValues.size === 0 && !unitCurrency) {
    issues.push({ code: "PRICE_WITHOUT_CURRENCY", extractorId: selected.extractorId, field: "published_price", locator: selected.locator });
    return;
  }
  if (currencyValues.size > 1) {
    for (const item of associatedCurrencies) issues.push({ code: "AMBIGUOUS_FIELD", extractorId: item.extractorId, field: "currency", locator: item.locator });
    return;
  }
  accepted.set("published_price", selected);
  const currency = associatedCurrencies[0];
  if (currency) accepted.set("currency", currency);
  else if (unitCurrency) {
    const { unit: _unit, ...withoutUnit } = selected;
    accepted.set("currency", {
      ...withoutUnit,
      field: "currency",
      originalValue: unitCurrency,
      normalizedValue: unitCurrency,
      locator: `${selected.locator}:currency`,
    });
  }
}

function toObservationField(candidate: FieldCandidate): ObservationField {
  return {
    field: candidate.field,
    originalValue: candidate.originalValue,
    normalizedValue: candidate.normalizedValue,
    ...(candidate.unit ? { unit: candidate.unit } : {}),
    locator: candidate.locator,
    confidence: candidate.confidence,
    reviewStatus: "unreviewed",
  };
}
