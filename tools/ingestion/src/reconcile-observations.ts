import { createHash } from "node:crypto";
import { parseCsvDocument } from "./nexo-authorized-import.js";
import type { ObservationField, ObservationFieldName, WebObservation } from "./official-web-refresh.js";

export const RECONCILIATION_SCHEMA_VERSION = "1.0.0" as const;

export interface NexoProjectReference {
  projectId: string;
  agencyName: string;
  projectName: string;
  district: string;
  address?: string;
  capturedAt?: string;
  sourceUrl?: string;
  values: Record<string, string>;
}

export interface MatchCandidate {
  projectId: string;
  projectName: string;
  agencyName: string;
  district: string;
  score: number;
  signals: {
    externalIdExact: boolean;
    agencyExact: boolean;
    projectName: number;
    district: number;
    address: number | null;
  };
}

export type MatchStatus = "auto_matched" | "review_required" | "unmatched";

export interface MatchDecision {
  observationId: string;
  sourceId: string;
  sourceUrl: string;
  status: MatchStatus;
  matchedProjectId?: string;
  reasonCodes: string[];
  candidates: MatchCandidate[];
}

export type ComparisonStatus =
  | "same"
  | "different"
  | "only_nexo"
  | "only_official_web"
  | "not_comparable";

export interface ProvenancedValue {
  source: "nexo" | "official_web";
  originalValue: string | number | string[];
  normalizedValue: string | number | string[];
  unit?: string;
  sourceUrl?: string;
  observedAt?: string;
  locator?: string;
  confidence?: ObservationField["confidence"];
  reviewStatus?: ObservationField["reviewStatus"];
}

export interface FieldComparison {
  field: ObservationFieldName;
  status: ComparisonStatus;
  nexo?: ProvenancedValue;
  officialWeb?: ProvenancedValue;
}

export interface ReconciledProjectObservation {
  projectId: string;
  observationId: string;
  sourceId: string;
  sourceUrl: string;
  capturedAt: string;
  contentSha256: string;
  extraction?: NonNullable<WebObservation["extraction"]>;
  comparisons: FieldComparison[];
}

export interface ReconciliationDocument {
  schemaVersion: typeof RECONCILIATION_SCHEMA_VERSION;
  generatedAt: string;
  sourceRunId: string;
  sourceManifestReference?: string;
  sourceManifestSha256?: string;
  aliasCatalogReference?: string;
  counts: {
    nexoProjects: number;
    webObservations: number;
    autoMatched: number;
    reviewRequired: number;
    unmatched: number;
    reconciled: number;
    differences: number;
  };
  matches: MatchDecision[];
  reconciliations: ReconciledProjectObservation[];
  sha256: string;
}

export interface ReconcileOptions {
  sourceRunId: string;
  generatedAt?: string;
  sourceManifestReference?: string;
  sourceManifestSha256?: string;
  agencyAliases?: Record<string, string>;
  aliasCatalogReference?: string;
}

const DEFAULT_AGENCY_ALIASES: Record<string, string> = {
  "grupo t c": "grupo t y c",
  "grupo t y c": "grupo t y c",
  "grupo tyc": "grupo t y c",
  "grupo toratto": "toratto grupo inmobiliario",
};

const NEXO_FIELD_MAP: Partial<Record<ObservationFieldName, string[]>> = {
  project_name: ["project_name"],
  agency_name: ["agency_name"],
  address: ["address"],
  published_price: ["price_min", "list_price_avg"],
  currency: ["currency"],
  area: ["total_area", "total_area_min", "area_min"],
  bedrooms: ["bedrooms", "bedrooms_min"],
  bathrooms: ["bathrooms_min"],
  amenities: ["amenities"],
  availability: ["unit_status", "project_phase"],
  delivery_date: ["delivery_date", "delivery_year"],
  typologies: ["typology"],
  financing_banks: ["financing_banks"],
  published_at: ["update_date", "captured_at"],
};

const NUMERIC_FIELDS = new Set<ObservationFieldName>([
  "published_price",
  "area",
  "bedrooms",
  "bathrooms",
]);

const LIST_FIELDS = new Set<ObservationFieldName>([
  "amenities",
  "typologies",
  "financing_banks",
]);

const COMPARISON_FIELD_ORDER: ObservationFieldName[] = [
  "project_name",
  "agency_name",
  "address",
  "published_price",
  "currency",
  "area",
  "bedrooms",
  "bathrooms",
  "typologies",
  "amenities",
  "financing_banks",
  "availability",
  "delivery_date",
  "published_at",
];

export function nexoProjectsFromCsv(csv: string): NexoProjectReference[] {
  const document = parseCsvDocument(csv);
  const required = ["project_id", "agency_name", "project_name", "district"];
  for (const field of required) {
    if (!document.headers.includes(field)) throw new Error(`RECONCILIATION_NEXO_SCHEMA_INVALID: Falta ${field}.`);
  }
  const seen = new Set<string>();
  return document.rows.map((row, index) => {
    const projectId = requiredValue(row, "project_id", index);
    if (seen.has(projectId)) throw new Error(`RECONCILIATION_NEXO_DUPLICATE: project_id ${projectId} repetido.`);
    seen.add(projectId);
    const address = optionalValue(row, "address");
    const capturedAt = optionalValue(row, "captured_at");
    const sourceUrl = optionalValue(row, "source_url");
    return {
      projectId,
      agencyName: requiredValue(row, "agency_name", index),
      projectName: requiredValue(row, "project_name", index),
      district: requiredValue(row, "district", index),
      ...(address ? { address } : {}),
      ...(capturedAt ? { capturedAt } : {}),
      ...(sourceUrl ? { sourceUrl } : {}),
      values: { ...row },
    };
  });
}

export function matchWebObservation(
  observation: WebObservation,
  projects: NexoProjectReference[],
  agencyAliases?: Record<string, string>,
): MatchDecision {
  return matchWebObservationWithAliases(observation, projects, canonicalAliasMap(agencyAliases));
}

function matchWebObservationWithAliases(
  observation: WebObservation,
  projects: NexoProjectReference[],
  canonicalAliases: Map<string, string>,
): MatchDecision {
  const curatedAgency = observation.agency;
  const extractedAgency = fieldText(observation, "agency_name");
  const webName = fieldText(observation, "project_name");
  const webDistrict = observation.district;
  const webAddress = fieldText(observation, "address");
  const agencyConflict = Boolean(curatedAgency && extractedAgency)
    && canonicalAgency(curatedAgency ?? "", canonicalAliases) !== canonicalAgency(extractedAgency ?? "", canonicalAliases);
  const webAgency = curatedAgency ?? extractedAgency;
  const agencyKey = canonicalAgency(webAgency ?? "", canonicalAliases);

  if (!agencyKey) return decision(observation, "review_required", ["WEB_AGENCY_MISSING"], []);

  const sameAgency = projects.filter(
    (project) => canonicalAgency(project.agencyName, canonicalAliases) === agencyKey,
  );
  if (!sameAgency.length) return decision(observation, "unmatched", ["AGENCY_NOT_FOUND_IN_NEXO"], []);

  const candidates = sameAgency
    .map((project) => scoreCandidate(observation, project, webName, webDistrict, webAddress))
    .sort((left, right) => right.score - left.score || left.projectId.localeCompare(right.projectId))
    .slice(0, 5);
  const top = candidates[0];
  if (!top) return decision(observation, "unmatched", ["NO_PROJECT_CANDIDATE"], []);
  const runnerUp = candidates[1];
  const uniqueMargin = top.score - (runnerUp?.score ?? 0);

  if (agencyConflict) {
    return decision(observation, "review_required", ["TARGET_AGENCY_CONFLICT"], candidates);
  }

  const targetNameConflict = Boolean(observation.expectedProjectName && webName)
    && similarity(observation.expectedProjectName ?? "", webName ?? "") < 0.8;
  if (targetNameConflict) {
    return decision(observation, "review_required", ["TARGET_PROJECT_NAME_CONFLICT"], candidates);
  }

  if (top.signals.externalIdExact && top.signals.agencyExact) {
    const highConfidenceHint = observation.matchClass === "match_high" && observation.requiresHumanReview === false;
    const currentNameConsistent = Boolean(webName) && top.signals.projectName >= 0.8;
    const currentDistrictConsistent = !webDistrict || top.signals.district === 1;
    if (highConfidenceHint && currentNameConsistent && currentDistrictConsistent) {
      return decision(observation, "auto_matched", ["HIGH_CONFIDENCE_ID_NAME_AGENCY"], candidates, top.projectId);
    }
    const reasons = ["EXTERNAL_ID_REQUIRES_REVIEW"];
    if (!highConfidenceHint) reasons.push("LINKAGE_HINT_NOT_HIGH_CONFIDENCE");
    if (!currentNameConsistent) reasons.push("CURRENT_PROJECT_NAME_NOT_CONFIRMED");
    if (!currentDistrictConsistent) reasons.push("DISTRICT_NOT_CONFIRMED");
    return decision(observation, "review_required", reasons, candidates);
  }

  const exactNameAndDistrict = top.signals.projectName === 1 && top.signals.district === 1;
  const strongAddress = top.signals.address === null || top.signals.address >= 0.62;
  if (observation.requiresHumanReview !== true
    && exactNameAndDistrict
    && strongAddress
    && top.score >= 0.88
    && uniqueMargin >= 0.12) {
    return decision(observation, "auto_matched", ["NAME_DISTRICT_UNIQUE"], candidates, top.projectId);
  }

  if (top.score >= 0.58) {
    const reasons = ["HUMAN_REVIEW_REQUIRED"];
    if (!webName) reasons.push("WEB_PROJECT_NAME_MISSING");
    if (top.signals.district !== 1) reasons.push("DISTRICT_NOT_CONFIRMED");
    if (uniqueMargin < 0.12) reasons.push("AMBIGUOUS_CANDIDATES");
    return decision(observation, "review_required", reasons, candidates);
  }

  return decision(observation, "unmatched", ["PROJECT_SIMILARITY_TOO_LOW"], candidates);
}

export function reconcileOfficialWebObservations(
  projects: NexoProjectReference[],
  observations: WebObservation[],
  options: ReconcileOptions,
): ReconciliationDocument {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  assertUniqueReferences(projects, observations);
  const canonicalAliases = canonicalAliasMap(options.agencyAliases);
  const matches = observations.map((observation) =>
    matchWebObservationWithAliases(observation, projects, canonicalAliases));
  const projectsById = new Map(projects.map((project) => [project.projectId, project]));
  const observationsById = new Map(observations.map((observation) => [observation.observationId, observation]));
  const reconciliations: ReconciledProjectObservation[] = [];

  for (const match of matches) {
    if (match.status !== "auto_matched" || !match.matchedProjectId) continue;
    const project = projectsById.get(match.matchedProjectId);
    const observation = observationsById.get(match.observationId);
    if (!project || !observation) throw new Error("RECONCILIATION_INTERNAL_REFERENCE_INVALID");
    reconciliations.push({
      projectId: project.projectId,
      observationId: observation.observationId,
      sourceId: observation.sourceId,
      sourceUrl: observation.sourceUrl,
      capturedAt: observation.capturedAt,
      contentSha256: observation.contentSha256,
      ...(observation.extraction ? {
        extraction: {
          attempts: observation.extraction.attempts.map((attempt) => ({ ...attempt, issueCodes: [...attempt.issueCodes] })),
          issueCodes: [...observation.extraction.issueCodes],
        },
      } : {}),
      comparisons: compareFieldsWithAliases(project, observation, canonicalAliases),
    });
  }

  const payload = {
    schemaVersion: RECONCILIATION_SCHEMA_VERSION,
    generatedAt,
    sourceRunId: options.sourceRunId,
    ...(options.sourceManifestReference ? { sourceManifestReference: options.sourceManifestReference } : {}),
    ...(options.sourceManifestSha256 ? { sourceManifestSha256: options.sourceManifestSha256 } : {}),
    ...(options.aliasCatalogReference ? { aliasCatalogReference: options.aliasCatalogReference } : {}),
    counts: {
      nexoProjects: projects.length,
      webObservations: observations.length,
      autoMatched: matches.filter((match) => match.status === "auto_matched").length,
      reviewRequired: matches.filter((match) => match.status === "review_required").length,
      unmatched: matches.filter((match) => match.status === "unmatched").length,
      reconciled: reconciliations.length,
      differences: reconciliations.reduce(
        (sum, item) => sum + item.comparisons.filter((comparison) => comparison.status === "different").length,
        0,
      ),
    },
    matches,
    reconciliations,
  };
  return {
    ...payload,
    sha256: createHash("sha256").update(stableStringify(payload)).digest("hex"),
  };
}

export function compareFields(
  project: NexoProjectReference,
  observation: WebObservation,
  agencyAliases?: Record<string, string>,
): FieldComparison[] {
  return compareFieldsWithAliases(project, observation, canonicalAliasMap(agencyAliases));
}

function compareFieldsWithAliases(
  project: NexoProjectReference,
  observation: WebObservation,
  canonicalAliases: Map<string, string>,
): FieldComparison[] {
  const webFields = new Map<ObservationFieldName, ObservationField>();
  for (const field of observation.fields) {
    if (webFields.has(field.field)) {
      throw new Error(`RECONCILIATION_DUPLICATE_FIELD:${observation.observationId}:${field.field}`);
    }
    webFields.set(field.field, field);
  }
  return COMPARISON_FIELD_ORDER.flatMap<FieldComparison>((fieldName): FieldComparison[] => {
    const webField = webFields.get(fieldName);
    const nexoValue = findNexoValue(project, fieldName);
    if (!webField && !nexoValue) return [];
    if (!webField && nexoValue) {
      return [{ field: fieldName, status: "only_nexo", nexo: nexoProvenance(project, fieldName, nexoValue) }];
    }
    if (!webField) return [];
    const officialWeb = webProvenance(observation, webField);
    if (!nexoValue) return [{ field: fieldName, status: "only_official_web", officialWeb }];
    const nexo = nexoProvenance(project, fieldName, nexoValue);
    if (!unitsComparable(project, observation, webField)
      || !valuesComparable(fieldName, nexo.normalizedValue, officialWeb.normalizedValue)) {
      return [{ field: fieldName, status: "not_comparable", nexo, officialWeb }];
    }
    return [{
      field: fieldName,
      status: valuesEqual(fieldName, nexo.normalizedValue, officialWeb.normalizedValue, canonicalAliases) ? "same" : "different",
      nexo,
      officialWeb,
    }];
  });
}

function assertUniqueReferences(projects: NexoProjectReference[], observations: WebObservation[]): void {
  const projectIds = new Set<string>();
  for (const project of projects) {
    if (projectIds.has(project.projectId)) {
      throw new Error(`RECONCILIATION_DUPLICATE_PROJECT_ID:${project.projectId}`);
    }
    projectIds.add(project.projectId);
  }
  const observationIds = new Set<string>();
  for (const observation of observations) {
    if (observationIds.has(observation.observationId)) {
      throw new Error(`RECONCILIATION_DUPLICATE_OBSERVATION_ID:${observation.observationId}`);
    }
    observationIds.add(observation.observationId);
  }
}

function unitsComparable(
  project: NexoProjectReference,
  observation: WebObservation,
  field: ObservationField,
): boolean {
  if (field.field === "published_price") {
    const nexoCurrency = normalizeCurrency(project.values.currency ?? "");
    const webCurrencyField = observation.fields.find((candidate) => candidate.field === "currency");
    const webCurrency = normalizeCurrency(String(webCurrencyField?.normalizedValue ?? field.unit ?? ""));
    return Boolean(nexoCurrency) && nexoCurrency === webCurrency;
  }
  if (field.field === "area") {
    if (!field.unit) return false;
    return ["m2", "m 2", "metro cuadrado", "metros cuadrados"].includes(normalizeText(field.unit));
  }
  return true;
}

function scoreCandidate(
  observation: WebObservation,
  project: NexoProjectReference,
  webName: string | undefined,
  webDistrict: string | undefined,
  webAddress: string | undefined,
): MatchCandidate {
  const externalIdExact = Boolean(observation.projectExternalId)
    && normalizeIdentifier(observation.projectExternalId ?? "") === normalizeIdentifier(project.projectId);
  const projectName = similarity(webName ?? "", project.projectName);
  const district = webDistrict ? similarity(webDistrict, project.district) : 0;
  const address = webAddress && project.address ? similarity(webAddress, project.address) : null;
  const score = externalIdExact
    ? 1
    : address === null
      ? (projectName * 0.75) + (district * 0.25)
      : (projectName * 0.55) + (district * 0.2) + (address * 0.25);
  return {
    projectId: project.projectId,
    projectName: project.projectName,
    agencyName: project.agencyName,
    district: project.district,
    score: round(score),
    signals: {
      externalIdExact,
      agencyExact: true,
      projectName: round(projectName),
      district: round(district),
      address: address === null ? null : round(address),
    },
  };
}

function decision(
  observation: WebObservation,
  status: MatchStatus,
  reasonCodes: string[],
  candidates: MatchCandidate[],
  matchedProjectId?: string,
): MatchDecision {
  return {
    observationId: observation.observationId,
    sourceId: observation.sourceId,
    sourceUrl: observation.sourceUrl,
    status,
    ...(matchedProjectId ? { matchedProjectId } : {}),
    reasonCodes,
    candidates,
  };
}

function findNexoValue(project: NexoProjectReference, field: ObservationFieldName): { key: string; value: string } | undefined {
  for (const key of NEXO_FIELD_MAP[field] ?? []) {
    const value = project.values[key]?.trim();
    if (value) return { key, value };
  }
  return undefined;
}

function nexoProvenance(
  project: NexoProjectReference,
  field: ObservationFieldName,
  value: { key: string; value: string },
): ProvenancedValue {
  const normalizedValue = normalizeFieldValue(field, value.value);
  return {
    source: "nexo",
    originalValue: value.value,
    normalizedValue,
    ...(field === "published_price" && project.values.currency ? { unit: project.values.currency } : {}),
    ...(field === "area" ? { unit: "m2" } : {}),
    ...(project.sourceUrl ? { sourceUrl: project.sourceUrl } : {}),
    ...(project.capturedAt ? { observedAt: project.capturedAt } : {}),
    locator: `csv:${value.key}`,
  };
}

function webProvenance(observation: WebObservation, field: ObservationField): ProvenancedValue {
  return {
    source: "official_web",
    originalValue: field.originalValue,
    normalizedValue: normalizeFieldValue(field.field, field.normalizedValue),
    ...(field.unit ? { unit: field.unit } : {}),
    sourceUrl: observation.sourceUrl,
    observedAt: observation.capturedAt,
    locator: field.locator,
    confidence: field.confidence,
    reviewStatus: field.reviewStatus,
  };
}

function normalizeFieldValue(
  field: ObservationFieldName,
  value: string | number | string[],
): string | number | string[] {
  if (NUMERIC_FIELDS.has(field)) {
    if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
    if (Array.isArray(value)) return value.map((item) => normalizeText(String(item)));
    const number = parseUnambiguousNumber(value);
    return number ?? normalizeText(value);
  }
  if (LIST_FIELDS.has(field)) {
    return normalizeList(value);
  }
  if (field === "currency") return normalizeCurrency(String(value));
  if (Array.isArray(value)) return value.map((item) => normalizeText(String(item))).filter(Boolean).sort();
  return normalizeText(String(value));
}

function valuesComparable(
  field: ObservationFieldName,
  left: string | number | string[],
  right: string | number | string[],
): boolean {
  if (NUMERIC_FIELDS.has(field)) return typeof left === "number" && typeof right === "number";
  return Array.isArray(left) === Array.isArray(right);
}

function valuesEqual(
  field: ObservationFieldName,
  left: string | number | string[],
  right: string | number | string[],
  canonicalAliases: Map<string, string>,
): boolean {
  if (typeof left === "number" && typeof right === "number") {
    const tolerance = field === "area" ? 0.05 : 0;
    return Math.abs(left - right) <= tolerance;
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    const normalizedLeft = left.map((value) => normalizeText(String(value))).sort();
    const normalizedRight = right.map((value) => normalizeText(String(value))).sort();
    return stableStringify(normalizedLeft) === stableStringify(normalizedRight);
  }
  if (field === "agency_name") {
    return canonicalAgency(String(left), canonicalAliases) === canonicalAgency(String(right), canonicalAliases);
  }
  if (field === "currency") return normalizeCurrency(String(left)) === normalizeCurrency(String(right));
  return normalizeText(String(left)) === normalizeText(String(right));
}

function fieldText(observation: WebObservation, field: ObservationFieldName): string | undefined {
  const value = observation.fields.find((candidate) => candidate.field === field)?.normalizedValue;
  if (typeof value === "string" && value.trim()) return value;
  return undefined;
}

function canonicalAliasMap(customAliases?: Record<string, string>): Map<string, string> {
  const direct = new Map<string, string>();
  for (const [alias, canonical] of [
    ...Object.entries(DEFAULT_AGENCY_ALIASES),
    ...Object.entries(customAliases ?? {}),
  ]) {
    const normalizedAlias = normalizeText(alias);
    const normalizedCanonical = normalizeText(canonical);
    if (!normalizedAlias || !normalizedCanonical) throw new Error("RECONCILIATION_ALIAS_INVALID");
    const existing = direct.get(normalizedAlias);
    if (existing && existing !== normalizedCanonical) {
      throw new Error(`RECONCILIATION_ALIAS_COLLISION:${normalizedAlias}`);
    }
    direct.set(normalizedAlias, normalizedCanonical);
  }
  const resolved = new Map<string, string>();
  for (const alias of direct.keys()) resolved.set(alias, resolveAlias(alias, direct));
  return resolved;
}

function canonicalAgency(value: string, aliases: Map<string, string>): string {
  const normalized = normalizeText(value);
  return aliases.get(normalized) ?? normalized;
}

function resolveAlias(alias: string, aliases: Map<string, string>): string {
  const visited = new Set<string>();
  let current = alias;
  while (aliases.has(current)) {
    if (visited.has(current)) throw new Error(`RECONCILIATION_ALIAS_CYCLE:${alias}`);
    visited.add(current);
    const next = aliases.get(current);
    if (!next || next === current) return current;
    current = next;
  }
  return current;
}

function similarity(left: string, right: string): number {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);
  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 1;
  const leftTokens = new Set(normalizedLeft.split(" ").filter(Boolean));
  const rightTokens = new Set(normalizedRight.split(" ").filter(Boolean));
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union ? intersection / union : 0;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("es-PE")
    .replace(/&/gu, " y ")
    .replace(/[^a-z0-9]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function normalizeIdentifier(value: string): string {
  return value.toLocaleLowerCase("es-PE").replace(/[^a-z0-9]/gu, "");
}

function parseUnambiguousNumber(value: string): number | undefined {
  const withoutKnownUnits = value
    .replace(/(?:PEN|USD|US\$|S\/\.?)/giu, " ")
    .replace(/\bm\s*(?:2\b|²)/giu, " ")
    .replace(/\b(?:metros? cuadrados?|dormitorios?|habitaciones?|baños?)\b/giu, " ");
  const tokens = withoutKnownUnits.match(/-?\d+(?:[.,]\d+)*/gu) ?? [];
  if (tokens.length !== 1) return undefined;
  const cleaned = tokens[0] ?? "";
  if (!cleaned) return undefined;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let canonical = cleaned;
  if (lastComma >= 0 && lastDot >= 0) {
    canonical = lastComma > lastDot
      ? cleaned.replaceAll(".", "").replace(",", ".")
      : cleaned.replaceAll(",", "");
  } else if (lastComma >= 0) {
    const decimals = cleaned.length - lastComma - 1;
    canonical = decimals === 3 ? cleaned.replaceAll(",", "") : cleaned.replace(",", ".");
  } else if (lastDot >= 0) {
    const decimals = cleaned.length - lastDot - 1;
    canonical = decimals === 3 ? cleaned.replaceAll(".", "") : cleaned;
  }
  const parsed = Number(canonical);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeCurrency(value: string): string {
  const compact = value.normalize("NFKD").replace(/[\u0300-\u036f]/gu, "")
    .trim().toLocaleUpperCase("es-PE").replace(/\s+/gu, "");
  if (["PEN", "S/", "S/.", "SOL", "SOLES"].includes(compact)) return "PEN";
  if (["USD", "US$", "DOLAR", "DOLARES"].includes(compact)) return "USD";
  return normalizeText(value).toLocaleUpperCase("es-PE");
}

function normalizeList(value: string | number | string[]): string[] {
  const entries = Array.isArray(value) ? value.map(String) : [String(value)];
  const normalized = entries.flatMap((entry) => {
    const primary = entry.split(/\s*(?:\||;|\r?\n|•|·)\s*/u);
    return primary.flatMap((item) => item.includes(",") ? item.split(/\s*,\s*/u) : [item]);
  }).map(normalizeText).filter(Boolean);
  return [...new Set(normalized)].sort();
}

function requiredValue(row: Record<string, string>, field: string, index: number): string {
  const value = row[field]?.trim();
  if (!value) throw new Error(`RECONCILIATION_NEXO_ROW_INVALID: ${field} vacío en fila ${index + 2}.`);
  return value;
}

function optionalValue(row: Record<string, string>, field: string): string | undefined {
  const value = row[field]?.trim();
  return value || undefined;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
