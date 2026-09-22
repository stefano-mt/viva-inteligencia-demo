export type ObservationFieldName =
  | "project_name"
  | "agency_name"
  | "address"
  | "published_price"
  | "currency"
  | "area"
  | "bedrooms"
  | "bathrooms"
  | "amenities"
  | "availability"
  | "delivery_date"
  | "typologies"
  | "financing_banks"
  | "published_at";

export type ObservationConfidence = "structured" | "metadata" | "labeled_html";
export type ExtractorArchetype = "wordpress" | "json_ld" | "embedded_json" | "html";

export interface ObservationField {
  field: ObservationFieldName;
  originalValue: string | number | string[];
  normalizedValue: string | number | string[];
  unit?: string;
  locator: string;
  confidence: ObservationConfidence;
  reviewStatus: "unreviewed";
}

export interface ExtractionContext {
  sourceId?: string;
  sourceUrl?: string;
  agency?: string;
  projectExternalId?: string;
  preferredArchetypes?: ExtractorArchetype[];
}

export interface ExtractionIssue {
  code:
    | "AMBIGUOUS_FIELD"
    | "PRICE_NOT_PROJECT_ASSOCIATED"
    | "PRICE_WITHOUT_CURRENCY"
    | "STRUCTURED_PAYLOAD_INVALID"
    | "EXTRACTOR_FAILURE";
  extractorId: string;
  field?: ObservationFieldName;
  locator?: string;
}

export interface ExtractorAttempt {
  extractorId: string;
  archetype: ExtractorArchetype;
  applicable: boolean;
  candidateFields: number;
  acceptedFields: number;
  issueCodes: string[];
}

export interface ExtractionResult {
  fields: ObservationField[];
  attempts: ExtractorAttempt[];
  issues: ExtractionIssue[];
}

export interface FieldCandidate extends ObservationField {
  extractorId: string;
  archetype: ExtractorArchetype;
  priority: number;
  entityKey: string;
  projectAssociation: "explicit" | "page" | "unknown";
}

export interface ExtractorOutput {
  candidates: FieldCandidate[];
  issues?: ExtractionIssue[];
}

export interface WebExtractor {
  id: string;
  archetype: ExtractorArchetype;
  priority: number;
  applies(html: string, context: ExtractionContext): boolean;
  extract(html: string, context: ExtractionContext): ExtractorOutput;
}
