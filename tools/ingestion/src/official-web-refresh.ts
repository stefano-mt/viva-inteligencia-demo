import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  extractProjectObservations,
  type ExtractorArchetype,
  type ExtractorAttempt,
  type ObservationField,
  type ObservationFieldName,
} from "./extractors/index.js";
import {
  evaluateSource,
  type PilotAccessReview,
  type PolicyDecision,
  type SourceCandidate,
} from "./policy.js";

export type { ExtractorArchetype, ObservationField, ObservationFieldName } from "./extractors/index.js";

const DEFAULT_USER_AGENT = "VivaInteligenciaBatch/1.0";
const BLOCK_PAGE_PATTERNS = [
  /cf-chl-/iu,
  /challenge-platform/iu,
  /verify you are human/iu,
  /captcha-container/iu,
];

export interface CollectionTarget {
  url: string;
  resolvedUrl?: string;
  district?: string;
  agency?: string;
  projectExternalId?: string;
  projectName?: string;
  matchClass?: "match_high" | "match_medium" | "match_low" | "unmatched_web";
  requiresHumanReview?: boolean;
  demoScope?: boolean;
}

export interface SourceAccessReview extends PilotAccessReview {
  reference: string;
  reviewedAt: string;
  technicalStatus: "pass" | "blocked";
  legalStatus: "pending" | "approved" | "blocked";
  operationalStatus: "pending" | "approved" | "blocked";
  robotsUrl: string;
  robotsContentSha256: string;
  routeRobotsStatus: "allow" | "deny";
  reviewedPaths: string[];
  termsReferences: string[];
  decision: "blocked_pending_review_and_authorization" | "approved" | "blocked";
}

export interface SourceCollectionConfig {
  targets?: CollectionTarget[];
  userAgent?: string;
  allowedHosts?: string[];
  timeoutMs?: number;
  minIntervalMs?: number;
  maxResponseBytes?: number;
  extractorArchetypes?: ExtractorArchetype[];
}

export interface RegistrySource extends SourceCandidate {
  label: string;
  purpose?: string;
  url?: string;
  district?: string;
  agency?: string;
  projectExternalId?: string;
  targets?: CollectionTarget[];
  candidateTargets?: CollectionTarget[];
  accessReview?: SourceAccessReview;
  collection?: SourceCollectionConfig;
}

export interface SourceRegistry {
  registryVersion: string;
  sources: RegistrySource[];
}

export interface BatchFilters {
  districts?: string[];
  agencies?: string[];
  sourceIds?: string[];
}

export interface BatchOptions {
  registry: SourceRegistry;
  registryReference: string;
  dryRun: boolean;
  filters?: BatchFilters;
  concurrency?: number;
  timeoutMs?: number;
  minIntervalMs?: number;
  maxResponseBytes?: number;
  runId?: string;
  pilot?: {
    productOwnerAuthorizationReference: string;
    targetUrl: string;
  };
}

export interface BatchDependencies {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  sleep?: (milliseconds: number) => Promise<void>;
}

export interface WebObservation {
  observationId: string;
  sourceId: string;
  sourceUrl: string;
  capturedAt: string;
  contentSha256: string;
  district?: string;
  agency?: string;
  projectExternalId?: string;
  expectedProjectName?: string;
  matchClass?: CollectionTarget["matchClass"];
  requiresHumanReview?: boolean;
  fields: ObservationField[];
  extraction?: {
    attempts: ExtractorAttempt[];
    issueCodes: string[];
  };
}

export interface SourceObservationGroup {
  sourceId: string;
  label: string;
  sourceClass: RegistrySource["sourceClass"];
  observations: WebObservation[];
}

export interface StagingDocument {
  schemaVersion: "1.0.0" | "pilot-1.0.0";
  runId: string;
  generatedAt: string;
  registryVersion: string;
  mode: "dry-run" | "controlled-collection" | "technical-pilot";
  publishable?: false;
  pilotAuthorizationReference?: string;
  sourceObservations: SourceObservationGroup[];
}

export type TargetStatus =
  | "planned"
  | "policy_blocked"
  | "collected"
  | "collected_empty"
  | "robots_blocked"
  | "failed";

export interface TargetAudit {
  sourceId: string;
  url: string;
  district?: string;
  agency?: string;
  projectExternalId?: string;
  expectedProjectName?: string;
  matchClass?: CollectionTarget["matchClass"];
  requiresHumanReview?: boolean;
  status: TargetStatus;
  code?: string;
  httpStatus?: number;
  contentSha256?: string;
  fieldCount: number;
  extractorArchetypes?: ExtractorArchetype[];
  extractionIssueCodes?: string[];
}

export interface SourceAudit {
  sourceId: string;
  decision: PolicyDecision;
  selectedTargets: number;
}

export interface BatchManifest {
  manifestVersion: "1.0.0" | "pilot-1.0.0";
  runId: string;
  generatedAt: string;
  registryReference: string;
  registrySha256: string;
  registryVersion: string;
  mode: "dry-run" | "controlled-collection" | "technical-pilot";
  publishable?: false;
  pilotAuthorizationReference?: string;
  filters: Required<BatchFilters>;
  controls: {
    policyGateBeforeNetwork: true;
    robotsEnforced: true;
    retries: 0;
    concurrency: number;
    timeoutMs: number;
    minIntervalMs: number;
    maxResponseBytes: number;
  };
  counts: {
    selectedSources: number;
    selectedTargets: number;
    eligibleTargets: number;
    policyBlockedTargets: number;
    plannedTargets: number;
    collectedTargets: number;
    robotsBlockedTargets: number;
    failedTargets: number;
    networkRequests: number;
    redirectsFollowed: number;
    observations: number;
    observationFields: number;
    extractionIssues: number;
  };
  sources: SourceAudit[];
  targets: TargetAudit[];
  stagingSha256: string;
}

export interface BatchResult {
  staging: StagingDocument;
  manifest: BatchManifest;
}

interface SelectedTarget {
  source: RegistrySource;
  target: CollectionTarget;
  decision: PolicyDecision;
}

interface RequestControls {
  timeoutMs: number;
  minIntervalMs: number;
  maxResponseBytes: number;
  userAgent: string;
  allowedHosts: Set<string>;
  reviewedPaths?: Set<string>;
}

interface RobotsRules {
  allows(pathname: string): boolean;
}

interface MutableCounters {
  networkRequests: number;
  redirectsFollowed: number;
  extractionIssues: number;
}

export async function readSourceRegistry(registryPath: string): Promise<SourceRegistry> {
  const raw = JSON.parse(await readFile(registryPath, "utf8")) as unknown;
  if (!isObject(raw) || typeof raw.registryVersion !== "string" || !Array.isArray(raw.sources)) {
    throw new Error("INGESTION_REGISTRY_INVALID: El registro no contiene registryVersion y sources válidos.");
  }
  validateRegistrySources(raw.sources);
  return raw as unknown as SourceRegistry;
}

export async function runOfficialWebBatch(
  options: BatchOptions,
  dependencies: BatchDependencies = {},
): Promise<BatchResult> {
  validateOptions(options);
  const fetchImpl = dependencies.fetchImpl ?? globalThis.fetch;
  const now = dependencies.now ?? (() => new Date());
  const sleep = dependencies.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const generatedAt = now().toISOString();
  const runId = options.runId ?? randomUUID();
  const filters = normalizeFilters(options.filters);
  const concurrency = boundedInteger(options.concurrency ?? 2, 1, 8, "concurrency");
  const timeoutMs = boundedInteger(options.timeoutMs ?? 10_000, 100, 60_000, "timeoutMs");
  const minIntervalMs = boundedInteger(options.minIntervalMs ?? 1_000, 0, 60_000, "minIntervalMs");
  const maxResponseBytes = boundedInteger(options.maxResponseBytes ?? 1_000_000, 1_024, 5_000_000, "maxResponseBytes");
  const selectedSources = options.registry.sources.filter(
    (source) => source.sourceClass === "official_project_website" && matchesFilter(source.sourceId, filters.sourceIds),
  );
  if (options.pilot && selectedSources.length !== 1) {
    throw new Error("INGESTION_PILOT_SCOPE_INVALID: El piloto exige seleccionar exactamente una fuente oficial.");
  }
  const sourceAudits: SourceAudit[] = [];
  const selectedTargets: SelectedTarget[] = [];

  for (const source of selectedSources) {
    // This decision is deliberately evaluated before targets are queued and before fetch is reachable.
    const decision = evaluateSource(source, options.pilot ? "pilot_collect" : "collect", {
      ...(options.pilot
        ? { productOwnerAuthorizationReference: options.pilot.productOwnerAuthorizationReference }
        : {}),
    });
    const targets = (options.pilot
      ? normalizePilotTarget(source, options.pilot.targetUrl)
      : normalizeTargets(source)).filter((target) => targetMatchesFilters(target, filters));
    sourceAudits.push({ sourceId: source.sourceId, decision, selectedTargets: targets.length });
    for (const target of targets) selectedTargets.push({ source, target, decision });
  }

  const audits: TargetAudit[] = [];
  const observationsBySource = new Map<string, WebObservation[]>();
  const counters: MutableCounters = { networkRequests: 0, redirectsFollowed: 0, extractionIssues: 0 };
  const limiter = new HostRateLimiter(sleep);
  const robotsCache = new Map<string, Promise<RobotsRules>>();

  const collectable: SelectedTarget[] = [];
  for (const selected of selectedTargets) {
    const auditBase = targetAuditBase(selected);
    if (!selected.decision.allowed) {
      audits.push({ ...auditBase, status: "policy_blocked", code: selected.decision.code, fieldCount: 0 });
    } else if (options.dryRun) {
      audits.push({ ...auditBase, status: "planned", code: "DRY_RUN", fieldCount: 0 });
    } else {
      collectable.push(selected);
    }
  }

  if (!options.dryRun && collectable.length > 0) {
    if (typeof fetchImpl !== "function") throw new Error("INGESTION_FETCH_UNAVAILABLE: No existe una implementación fetch.");
    await mapWithConcurrency(collectable, concurrency, async (selected) => {
      const auditBase = targetAuditBase(selected);
      try {
        const targetUrl = validateTargetUrl(selected.target.url);
        const controls = controlsForSource(
          selected.source,
          { timeoutMs, minIntervalMs, maxResponseBytes },
          targetUrl,
        );
        const robotsKey = `${targetUrl.origin}\n${controls.userAgent}\n${controls.minIntervalMs}`;
        let robotsPromise = robotsCache.get(robotsKey);
        if (!robotsPromise) {
          robotsPromise = loadRobotsRules(targetUrl, controls, fetchImpl, limiter, counters);
          robotsCache.set(robotsKey, robotsPromise);
        }
        const robots = await robotsPromise;
        if (!robots.allows(`${targetUrl.pathname}${targetUrl.search}`)) {
          audits.push({ ...auditBase, status: "robots_blocked", code: "ROBOTS_DISALLOW", fieldCount: 0 });
          return;
        }

        const response = await controlledFetch(targetUrl, controls, fetchImpl, limiter, counters);
        assertAllowedResponse(response, targetUrl, controls.allowedHosts);
        const html = await readBoundedText(response, controls.maxResponseBytes, controls.timeoutMs);
        if (BLOCK_PAGE_PATTERNS.some((pattern) => pattern.test(html))) {
          throw controlledError("TECHNICAL_BLOCK_DETECTED", response.status);
        }
        const contentSha256 = sha256(html);
        const sourceUrl = auditUrl(targetUrl);
        const extraction = extractProjectObservations(html, {
          sourceId: selected.source.sourceId,
          sourceUrl,
          ...(selected.target.agency ? { agency: cleanAuditLabel(selected.target.agency) } : {}),
          ...(selected.target.projectExternalId ? { projectExternalId: cleanAuditLabel(selected.target.projectExternalId) } : {}),
          ...(selected.source.collection?.extractorArchetypes
            ? { preferredArchetypes: selected.source.collection.extractorArchetypes }
            : {}),
        });
        const fields = extraction.fields;
        counters.extractionIssues += extraction.issues.length;
        const observation: WebObservation = {
          observationId: sha256(`${selected.source.sourceId}\n${sourceUrl}\n${generatedAt}\n${contentSha256}`),
          sourceId: selected.source.sourceId,
          sourceUrl,
          capturedAt: generatedAt,
          contentSha256,
          fields,
          extraction: {
            attempts: extraction.attempts,
            issueCodes: [...new Set(extraction.issues.map((issue) => issue.code))].sort(),
          },
          ...(selected.target.district ? { district: cleanAuditLabel(selected.target.district) } : {}),
          ...(selected.target.agency ? { agency: cleanAuditLabel(selected.target.agency) } : {}),
          ...(selected.target.projectExternalId ? { projectExternalId: cleanAuditLabel(selected.target.projectExternalId) } : {}),
          ...(selected.target.projectName ? { expectedProjectName: cleanAuditLabel(selected.target.projectName) } : {}),
          ...(selected.target.matchClass ? { matchClass: selected.target.matchClass } : {}),
          ...(selected.target.requiresHumanReview !== undefined
            ? { requiresHumanReview: selected.target.requiresHumanReview }
            : {}),
        };
        const current = observationsBySource.get(selected.source.sourceId) ?? [];
        current.push(observation);
        observationsBySource.set(selected.source.sourceId, current);
        audits.push({
          ...auditBase,
          status: fields.length > 0 ? "collected" : "collected_empty",
          code: fields.length > 0 ? "COLLECTED" : "NO_STRUCTURED_FIELDS",
          httpStatus: response.status,
          contentSha256,
          fieldCount: fields.length,
          extractorArchetypes: extraction.attempts
            .filter((attempt) => attempt.applicable)
            .map((attempt) => attempt.archetype),
          extractionIssueCodes: [...new Set(extraction.issues.map((issue) => issue.code))].sort(),
        });
      } catch (error) {
        const failure = toSafeFailure(error);
        audits.push({ ...auditBase, status: "failed", ...failure, fieldCount: 0 });
      }
    });
  }

  const sourceObservations = selectedSources.map((source) => ({
    sourceId: source.sourceId,
    label: cleanAuditLabel(source.label),
    sourceClass: source.sourceClass,
    observations: (observationsBySource.get(source.sourceId) ?? []).sort((left, right) => left.sourceUrl.localeCompare(right.sourceUrl)),
  }));
  const mode = options.dryRun ? "dry-run" : options.pilot ? "technical-pilot" : "controlled-collection";
  const staging: StagingDocument = {
    schemaVersion: options.pilot ? "pilot-1.0.0" : "1.0.0",
    runId,
    generatedAt,
    registryVersion: options.registry.registryVersion,
    mode,
    ...(options.pilot ? {
      publishable: false as const,
      pilotAuthorizationReference: cleanAuditLabel(options.pilot.productOwnerAuthorizationReference),
    } : {}),
    sourceObservations,
  };
  const stagingText = serializeJson(staging);
  const eligibleTargets = selectedTargets.filter((entry) => entry.decision.allowed).length;
  const policyBlockedTargets = audits.filter((audit) => audit.status === "policy_blocked").length;
  const plannedTargets = audits.filter((audit) => audit.status === "planned").length;
  const collectedTargets = audits.filter((audit) => audit.status === "collected" || audit.status === "collected_empty").length;
  const robotsBlockedTargets = audits.filter((audit) => audit.status === "robots_blocked").length;
  const failedTargets = audits.filter((audit) => audit.status === "failed").length;
  const observationCount = sourceObservations.reduce((total, group) => total + group.observations.length, 0);
  const observationFieldCount = sourceObservations.reduce(
    (total, group) => total + group.observations.reduce((subtotal, observation) => subtotal + observation.fields.length, 0),
    0,
  );
  const manifest: BatchManifest = {
    manifestVersion: options.pilot ? "pilot-1.0.0" : "1.0.0",
    runId,
    generatedAt,
    registryReference: normalizeRegistryReference(options.registryReference),
    registrySha256: canonicalJsonSha256(options.registry),
    registryVersion: options.registry.registryVersion,
    mode: staging.mode,
    ...(options.pilot ? {
      publishable: false as const,
      pilotAuthorizationReference: cleanAuditLabel(options.pilot.productOwnerAuthorizationReference),
    } : {}),
    filters,
    controls: {
      policyGateBeforeNetwork: true,
      robotsEnforced: true,
      retries: 0,
      concurrency,
      timeoutMs,
      minIntervalMs,
      maxResponseBytes,
    },
    counts: {
      selectedSources: selectedSources.length,
      selectedTargets: selectedTargets.length,
      eligibleTargets,
      policyBlockedTargets,
      plannedTargets,
      collectedTargets,
      robotsBlockedTargets,
      failedTargets,
      networkRequests: counters.networkRequests,
      redirectsFollowed: counters.redirectsFollowed,
      observations: observationCount,
      observationFields: observationFieldCount,
      extractionIssues: counters.extractionIssues,
    },
    sources: sourceAudits,
    targets: audits.sort((left, right) => `${left.sourceId}:${left.url}`.localeCompare(`${right.sourceId}:${right.url}`)),
    stagingSha256: sha256(stagingText),
  };
  return { staging, manifest };
}

export async function writeBatchArtifacts(
  result: BatchResult,
  outputPath: string,
  manifestPath: string,
): Promise<void> {
  assertPublicationBoundary(result);
  if (path.resolve(outputPath) === path.resolve(manifestPath)) {
    throw new Error("INGESTION_OUTPUT_INVALID: Staging y manifiesto requieren rutas diferentes.");
  }
  await Promise.all([
    mkdir(path.dirname(outputPath), { recursive: true }),
    mkdir(path.dirname(manifestPath), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(outputPath, serializeJson(result.staging), "utf8"),
    writeFile(manifestPath, serializeJson(result.manifest), "utf8"),
  ]);
}

function assertPublicationBoundary(result: BatchResult): void {
  const pilot = result.staging.mode === "technical-pilot" || result.manifest.mode === "technical-pilot";
  if (pilot) {
    if (result.staging.mode !== "technical-pilot"
      || result.manifest.mode !== "technical-pilot"
      || result.staging.schemaVersion !== "pilot-1.0.0"
      || result.manifest.manifestVersion !== "pilot-1.0.0"
      || result.staging.publishable !== false
      || result.manifest.publishable !== false
      || !result.staging.pilotAuthorizationReference
      || result.staging.pilotAuthorizationReference !== result.manifest.pilotAuthorizationReference) {
      throw new Error("INGESTION_PILOT_OUTPUT_INVALID: El piloto debe quedar inequívocamente marcado como no publicable.");
    }
    return;
  }
  if (result.staging.schemaVersion !== "1.0.0"
    || result.manifest.manifestVersion !== "1.0.0"
    || result.staging.publishable !== undefined
    || result.manifest.publishable !== undefined
    || result.staging.pilotAuthorizationReference !== undefined
    || result.manifest.pilotAuthorizationReference !== undefined) {
    throw new Error("INGESTION_OUTPUT_INVALID: Una corrida productiva no puede declarar metadatos de piloto.");
  }
}

export function extractStructuredObservations(html: string): ObservationField[] {
  return extractProjectObservations(html).fields;
}

function validateRegistrySource(value: unknown, index: number): asserts value is RegistrySource {
  if (!isObject(value)) throw new Error(`INGESTION_REGISTRY_INVALID: Fuente ${index + 1} inválida.`);
  const requiredStrings = ["sourceId", "sourceClass", "label", "reviewStatus", "robotsStatus"];
  if (requiredStrings.some((field) => typeof value[field] !== "string" || !String(value[field]).trim())) {
    throw new Error(`INGESTION_REGISTRY_INVALID: Fuente ${index + 1} incompleta.`);
  }
  if (typeof value.officialDomainConfirmed !== "boolean") {
    throw new Error(`INGESTION_REGISTRY_INVALID: Fuente ${index + 1} no declara officialDomainConfirmed.`);
  }
  if (!["authorized_feed", "official_project_website", "public_aggregator"].includes(String(value.sourceClass))) {
    throw new Error(`INGESTION_REGISTRY_INVALID: sourceClass inválido en fuente ${index + 1}.`);
  }
  if (!["approved", "pending", "blocked"].includes(String(value.reviewStatus))) {
    throw new Error(`INGESTION_REGISTRY_INVALID: reviewStatus inválido en fuente ${index + 1}.`);
  }
  if (!["allow", "deny", "unknown", "not_applicable"].includes(String(value.robotsStatus))) {
    throw new Error(`INGESTION_REGISTRY_INVALID: robotsStatus inválido en fuente ${index + 1}.`);
  }
  if (value.url !== undefined) {
    if (typeof value.url !== "string" || !value.url.trim()) {
      throw new Error(`INGESTION_REGISTRY_INVALID: url inválida en fuente ${index + 1}.`);
    }
    validateTargetUrl(value.url);
  }
  const sourceId = String(value.sourceId).trim();
  validateAccessReview(value.accessReview, index);
  validatePilotAuthorization(value.pilotAuthorization, value.accessReview, index);
  validateTargetList(value.targets, index, sourceId, "targets");
  validateTargetList(value.candidateTargets, index, sourceId, "candidateTargets");
  if (value.collection !== undefined) {
    if (!isObject(value.collection)) {
      throw new Error(`INGESTION_REGISTRY_INVALID: collection inválida en fuente ${index + 1}.`);
    }
    const archetypes = value.collection.extractorArchetypes;
    if (archetypes !== undefined && (
      !Array.isArray(archetypes)
      || archetypes.length === 0
      || archetypes.some((item) => !["wordpress", "json_ld", "embedded_json", "html"].includes(String(item)))
    )) {
      throw new Error(`INGESTION_REGISTRY_INVALID: extractorArchetypes inválido en fuente ${index + 1}.`);
    }
    const allowedHosts = value.collection.allowedHosts;
    if (allowedHosts !== undefined) {
      if (!Array.isArray(allowedHosts) || allowedHosts.some((host) => typeof host !== "string" || !host.trim())) {
        throw new Error(`INGESTION_REGISTRY_INVALID: allowedHosts inválido en fuente ${index + 1}.`);
      }
      for (const host of allowedHosts) validateHost(String(host));
    }
    validateTargetList(value.collection.targets, index, sourceId, "collection.targets");
    validateExecutableTargetsAgainstReview(value.collection.targets, value.accessReview, index);
  }
}

function validateAccessReview(value: unknown, sourceIndex: number): void {
  if (value === undefined) return;
  if (!isObject(value)) {
    throw new Error(`INGESTION_REGISTRY_INVALID: accessReview inválido en fuente ${sourceIndex + 1}.`);
  }
  for (const field of [
    "reference", "reviewedAt", "technicalStatus", "legalStatus", "operationalStatus",
    "robotsUrl", "robotsContentSha256", "routeRobotsStatus", "decision",
  ] as const) {
    if (typeof value[field] !== "string" || !value[field].trim() || containsPii(value[field])) {
      throw new Error(`INGESTION_REGISTRY_INVALID: accessReview.${field} inválido en fuente ${sourceIndex + 1}.`);
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(String(value.reviewedAt))) {
    throw new Error(`INGESTION_REGISTRY_INVALID: accessReview.reviewedAt inválido en fuente ${sourceIndex + 1}.`);
  }
  if (!/^[a-f0-9]{64}$/u.test(String(value.robotsContentSha256))) {
    throw new Error(`INGESTION_REGISTRY_INVALID: accessReview.robotsContentSha256 inválido en fuente ${sourceIndex + 1}.`);
  }
  if (!["pass", "blocked"].includes(String(value.technicalStatus))
    || !["pending", "approved", "blocked"].includes(String(value.legalStatus))
    || !["pending", "approved", "blocked"].includes(String(value.operationalStatus))
    || !["allow", "deny"].includes(String(value.routeRobotsStatus))
    || !["blocked_pending_review_and_authorization", "approved", "blocked"].includes(String(value.decision))) {
    throw new Error(`INGESTION_REGISTRY_INVALID: estados de accessReview inválidos en fuente ${sourceIndex + 1}.`);
  }
  validateTargetUrl(String(value.robotsUrl));
  if (!Array.isArray(value.reviewedPaths) || value.reviewedPaths.length === 0
    || value.reviewedPaths.some((entry) => typeof entry !== "string" || !isReviewedPath(entry))) {
    throw new Error(`INGESTION_REGISTRY_INVALID: accessReview.reviewedPaths inválido en fuente ${sourceIndex + 1}.`);
  }
  if (!Array.isArray(value.termsReferences)
    || value.termsReferences.some((entry) => typeof entry !== "string" || !entry.trim())) {
    throw new Error(`INGESTION_REGISTRY_INVALID: accessReview.termsReferences inválido en fuente ${sourceIndex + 1}.`);
  }
  for (const reference of value.termsReferences) validateTargetUrl(reference);
}

function validatePilotAuthorization(value: unknown, review: unknown, sourceIndex: number): void {
  if (value === undefined) return;
  if (!isObject(value) || !isObject(review)) {
    throw new Error(`INGESTION_REGISTRY_INVALID: pilotAuthorization requiere accessReview en fuente ${sourceIndex + 1}.`);
  }
  for (const field of ["reference", "approvedAt", "approvedByRole", "status", "purpose"] as const) {
    if (typeof value[field] !== "string" || !value[field].trim() || containsPii(value[field])) {
      throw new Error(`INGESTION_REGISTRY_INVALID: pilotAuthorization.${field} inválido en fuente ${sourceIndex + 1}.`);
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(String(value.approvedAt))
    || value.approvedByRole !== "product_owner"
    || !["approved", "revoked"].includes(String(value.status))
    || value.purpose !== "technical_feasibility"
    || !Array.isArray(value.allowedPaths)
    || value.allowedPaths.length === 0
    || value.allowedPaths.some((entry) => typeof entry !== "string" || !isReviewedPath(entry))) {
    throw new Error(`INGESTION_REGISTRY_INVALID: pilotAuthorization inválido en fuente ${sourceIndex + 1}.`);
  }
  const reviewedPaths = new Set(Array.isArray(review.reviewedPaths) ? review.reviewedPaths : []);
  if (value.allowedPaths.some((entry) => !reviewedPaths.has(entry))) {
    throw new Error(`INGESTION_REGISTRY_PILOT_PATH_NOT_REVIEWED:${sourceIndex + 1}`);
  }
}

function validateExecutableTargetsAgainstReview(
  targets: unknown,
  review: unknown,
  sourceIndex: number,
): void {
  if (!Array.isArray(targets) || targets.length === 0 || review === undefined) return;
  if (!isObject(review) || !Array.isArray(review.reviewedPaths)) {
    throw new Error(`INGESTION_REGISTRY_INVALID: falta accessReview válido en fuente ${sourceIndex + 1}.`);
  }
  const reviewedPaths = new Set(review.reviewedPaths);
  for (const [targetIndex, target] of targets.entries()) {
    if (!isObject(target) || typeof target.url !== "string") continue;
    const pathname = validateTargetUrl(target.url).pathname;
    if (!reviewedPaths.has(pathname)) {
      throw new Error(
        `INGESTION_REGISTRY_TARGET_PATH_NOT_REVIEWED:${sourceIndex + 1}:collection.targets:${targetIndex}`,
      );
    }
  }
}

function isReviewedPath(value: string): boolean {
  return value.startsWith("/")
    && !value.includes("://")
    && !value.includes("?")
    && !value.includes("#")
    && !containsPii(value);
}

function validateRegistrySources(sources: unknown[]): void {
  const sourceIds = new Set<string>();
  for (const [index, source] of sources.entries()) {
    validateRegistrySource(source, index);
    const sourceId = normalizeForMatch(source.sourceId);
    if (sourceIds.has(sourceId)) {
      throw new Error(`INGESTION_REGISTRY_DUPLICATE_SOURCE_ID:${sourceId}`);
    }
    sourceIds.add(sourceId);
  }
}

function validateTargetList(value: unknown, sourceIndex: number, sourceId: string, label: string): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    throw new Error(`INGESTION_REGISTRY_INVALID: ${label} inválido en fuente ${sourceIndex + 1}.`);
  }
  const allowedMatchClasses = new Set(["match_high", "match_medium", "match_low", "unmatched_web"]);
  const targetUrls = new Set<string>();
  for (const [targetIndex, target] of value.entries()) {
    if (!isObject(target) || typeof target.url !== "string" || !target.url.trim()) {
      throw new Error(
        `INGESTION_REGISTRY_INVALID: ${label}[${targetIndex}] inválido en fuente ${sourceIndex + 1}.`,
      );
    }
    const normalizedTargetUrl = canonicalExecutableUrl(target.url);
    if (targetUrls.has(normalizedTargetUrl)) {
      throw new Error(`INGESTION_REGISTRY_DUPLICATE_TARGET_URL:${sourceId}:${label}:${targetIndex}`);
    }
    targetUrls.add(normalizedTargetUrl);
    if (target.resolvedUrl !== undefined) {
      if (typeof target.resolvedUrl !== "string" || !target.resolvedUrl.trim()) {
        throw new Error(
          `INGESTION_REGISTRY_INVALID: ${label}[${targetIndex}].resolvedUrl inválido en fuente ${sourceIndex + 1}.`,
        );
      }
      canonicalExecutableUrl(target.resolvedUrl);
    }
    for (const field of ["district", "agency", "projectExternalId", "projectName"] as const) {
      if (target[field] !== undefined && (typeof target[field] !== "string" || !target[field].trim())) {
        throw new Error(
          `INGESTION_REGISTRY_INVALID: ${label}[${targetIndex}].${field} inválido en fuente ${sourceIndex + 1}.`,
        );
      }
    }
    if (target.matchClass !== undefined && !allowedMatchClasses.has(String(target.matchClass))) {
      throw new Error(
        `INGESTION_REGISTRY_INVALID: ${label}[${targetIndex}].matchClass inválido en fuente ${sourceIndex + 1}.`,
      );
    }
    for (const field of ["requiresHumanReview", "demoScope"] as const) {
      if (target[field] !== undefined && typeof target[field] !== "boolean") {
        throw new Error(
          `INGESTION_REGISTRY_INVALID: ${label}[${targetIndex}].${field} inválido en fuente ${sourceIndex + 1}.`,
        );
      }
    }
    if (target.matchClass !== undefined
      && target.matchClass !== "match_high"
      && target.requiresHumanReview === false) {
      throw new Error(
        `INGESTION_REGISTRY_INVALID: ${label}[${targetIndex}] no puede omitir revisión humana con ${target.matchClass}.`,
      );
    }
  }
}

function validateOptions(options: BatchOptions): void {
  if (!options.registry || !Array.isArray(options.registry.sources)) {
    throw new Error("INGESTION_REGISTRY_INVALID: Falta el registro de fuentes.");
  }
  validateRegistrySources(options.registry.sources);
  if (!options.registryReference.trim()) throw new Error("INGESTION_REGISTRY_INVALID: Falta una referencia relativa del registro.");
  if (options.pilot) {
    if (options.dryRun) {
      throw new Error("INGESTION_PILOT_MODE_INVALID: --pilot requiere una ejecución explícita.");
    }
    if (!options.pilot.productOwnerAuthorizationReference?.trim()
      || containsPii(options.pilot.productOwnerAuthorizationReference)) {
      throw new Error("INGESTION_PILOT_AUTHORIZATION_REQUIRED: Falta la referencia explícita del Product Owner.");
    }
    canonicalExecutableUrl(options.pilot.targetUrl);
    const sourceIds = normalizeFilterValues(options.filters?.sourceIds);
    if (sourceIds.length !== 1) {
      throw new Error("INGESTION_PILOT_SCOPE_INVALID: El piloto exige --source exactamente una vez.");
    }
  }
}

function normalizeFilters(filters: BatchFilters | undefined): Required<BatchFilters> {
  return {
    districts: normalizeFilterValues(filters?.districts),
    agencies: normalizeFilterValues(filters?.agencies),
    sourceIds: normalizeFilterValues(filters?.sourceIds),
  };
}

function normalizeFilterValues(values: string[] | undefined): string[] {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function matchesFilter(value: string | undefined, filters: string[]): boolean {
  if (filters.length === 0) return true;
  const normalized = normalizeForMatch(value ?? "");
  return filters.some((filter) => normalizeForMatch(filter) === normalized);
}

function targetMatchesFilters(target: CollectionTarget, filters: Required<BatchFilters>): boolean {
  return matchesFilter(target.district, filters.districts) && matchesFilter(target.agency, filters.agencies);
}

function normalizeForMatch(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLocaleLowerCase("es-PE");
}

function normalizeTargets(source: RegistrySource): CollectionTarget[] {
  const targets = source.collection?.targets;
  return Array.isArray(targets)
    ? targets.map((target) => ({ ...target, url: canonicalExecutableUrl(target.url) }))
    : [];
}

function normalizePilotTarget(source: RegistrySource, requestedUrl: string): CollectionTarget[] {
  const requested = canonicalExecutableUrl(requestedUrl);
  const candidates = source.candidateTargets ?? [];
  const matches = candidates.flatMap((target) => {
    const urls = [target.url, target.resolvedUrl].filter((value): value is string => Boolean(value));
    return urls.some((value) => canonicalExecutableUrl(value) === requested)
      ? [{ ...target, url: requested }]
      : [];
  });
  if (matches.length !== 1) {
    throw new Error("INGESTION_PILOT_TARGET_INVALID: La ruta debe coincidir con un único target candidato registrado.");
  }
  const pathname = validateTargetUrl(requested).pathname;
  const reviewed = new Set(source.accessReview?.reviewedPaths ?? []);
  const authorized = new Set(source.pilotAuthorization?.allowedPaths ?? []);
  if (!reviewed.has(pathname) || !authorized.has(pathname)) {
    throw new Error("INGESTION_PILOT_TARGET_NOT_AUTHORIZED: La ruta exacta no está revisada y autorizada para el piloto.");
  }
  return matches;
}

function targetAuditBase(selected: SelectedTarget): Omit<TargetAudit, "status" | "fieldCount"> {
  return {
    sourceId: selected.source.sourceId,
    url: safePublicUrl(selected.target.url),
    ...(selected.target.district ? { district: cleanAuditLabel(selected.target.district) } : {}),
    ...(selected.target.agency ? { agency: cleanAuditLabel(selected.target.agency) } : {}),
    ...(selected.target.projectExternalId ? { projectExternalId: cleanAuditLabel(selected.target.projectExternalId) } : {}),
    ...(selected.target.projectName ? { expectedProjectName: cleanAuditLabel(selected.target.projectName) } : {}),
    ...(selected.target.matchClass ? { matchClass: selected.target.matchClass } : {}),
    ...(selected.target.requiresHumanReview !== undefined
      ? { requiresHumanReview: selected.target.requiresHumanReview }
      : {}),
  };
}

function controlsForSource(
  source: RegistrySource,
  defaults: Pick<RequestControls, "timeoutMs" | "minIntervalMs" | "maxResponseBytes">,
  target: URL,
): RequestControls {
  const config = source.collection;
  const userAgent = config?.userAgent?.trim() || DEFAULT_USER_AGENT;
  const allowedHosts = new Set<string>();
  for (const host of config?.allowedHosts ?? []) allowedHosts.add(validateHost(host));
  if (allowedHosts.size === 0 && source.officialDomainConfirmed && source.url) {
    allowedHosts.add(validateHost(validateTargetUrl(source.url).hostname));
  }
  if (allowedHosts.size === 0) throw controlledError("TARGET_HOST_ALLOWLIST_MISSING");
  if (!allowedHosts.has(target.hostname.toLocaleLowerCase("en-US"))) {
    throw controlledError("TARGET_HOST_NOT_ALLOWLISTED");
  }
  return {
    userAgent,
    allowedHosts,
    ...(source.accessReview ? { reviewedPaths: new Set(source.accessReview.reviewedPaths) } : {}),
    timeoutMs: Math.min(defaults.timeoutMs, positiveSetting(config?.timeoutMs, defaults.timeoutMs)),
    minIntervalMs: Math.max(defaults.minIntervalMs, nonNegativeSetting(config?.minIntervalMs, defaults.minIntervalMs)),
    maxResponseBytes: Math.min(defaults.maxResponseBytes, positiveSetting(config?.maxResponseBytes, defaults.maxResponseBytes)),
  };
}

async function loadRobotsRules(
  target: URL,
  controls: RequestControls,
  fetchImpl: typeof fetch,
  limiter: HostRateLimiter,
  counters: MutableCounters,
): Promise<RobotsRules> {
  const robotsUrl = new URL("/robots.txt", target.origin);
  const response = await controlledFetch(robotsUrl, controls, fetchImpl, limiter, counters, false);
  assertAllowedRedirect(response, robotsUrl, controls.allowedHosts);
  if (response.status === 404 || response.status === 410) return { allows: () => true };
  if (!response.ok) throw controlledError(`ROBOTS_HTTP_${response.status}`, response.status);
  const text = await readBoundedText(response, Math.min(controls.maxResponseBytes, 256_000), controls.timeoutMs);
  return compileRobotsRules(text, controls.userAgent);
}

async function controlledFetch(
  url: URL,
  controls: RequestControls,
  fetchImpl: typeof fetch,
  limiter: HostRateLimiter,
  counters: MutableCounters,
  enforceReviewedPath = true,
): Promise<Response> {
  let currentUrl = url;
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    if (enforceReviewedPath) assertReviewedPath(currentUrl, controls.reviewedPaths);
    const response = await singleControlledFetch(currentUrl, controls, fetchImpl, limiter, counters);
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location) throw controlledError("REDIRECT_LOCATION_MISSING", response.status);
    if (redirects === 3) throw controlledError("REDIRECT_LIMIT_EXCEEDED", response.status);
    const redirectUrl = new URL(location, currentUrl);
    if (!["http:", "https:"].includes(redirectUrl.protocol)) throw controlledError("REDIRECT_PROTOCOL_BLOCKED", response.status);
    const nextUrl = new URL(canonicalExecutableUrl(redirectUrl.href));
    if (!controls.allowedHosts.has(nextUrl.hostname.toLocaleLowerCase("en-US"))) {
      throw controlledError("REDIRECT_HOST_BLOCKED", response.status);
    }
    if (enforceReviewedPath) assertReviewedPath(nextUrl, controls.reviewedPaths);
    counters.redirectsFollowed += 1;
    currentUrl = nextUrl;
  }
  throw controlledError("REDIRECT_LIMIT_EXCEEDED");
}

function assertReviewedPath(url: URL, reviewedPaths: Set<string> | undefined): void {
  if (reviewedPaths && !reviewedPaths.has(url.pathname)) {
    throw controlledError("TARGET_PATH_NOT_REVIEWED");
  }
}

async function singleControlledFetch(
  url: URL,
  controls: RequestControls,
  fetchImpl: typeof fetch,
  limiter: HostRateLimiter,
  counters: MutableCounters,
): Promise<Response> {
  return limiter.run(url.origin, controls.minIntervalMs, async () => {
    counters.networkRequests += 1;
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        reject(controlledError("REQUEST_TIMEOUT"));
      }, controls.timeoutMs);
    });
    try {
      return await Promise.race([
        fetchImpl(url, {
          method: "GET",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            accept: "text/html,application/xhtml+xml,text/plain;q=0.8",
            "user-agent": controls.userAgent,
          },
        }),
        timeoutPromise,
      ]);
    } catch (error) {
      if (isControlledError(error)) throw error;
      throw controlledError(error instanceof DOMException && error.name === "AbortError" ? "REQUEST_TIMEOUT" : "NETWORK_FAILURE");
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  });
}

function assertAllowedResponse(response: Response, requested: URL, allowedHosts: Set<string>): void {
  assertAllowedRedirect(response, requested, allowedHosts);
  if ([401, 403, 407, 429].includes(response.status)) {
    throw controlledError(`ACCESS_BLOCKED_${response.status}`, response.status);
  }
  if (!response.ok) throw controlledError(`HTTP_${response.status}`, response.status);
  const contentType = response.headers.get("content-type")?.toLocaleLowerCase("en-US") ?? "";
  if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    throw controlledError("UNSUPPORTED_CONTENT_TYPE", response.status);
  }
}

function assertAllowedRedirect(response: Response, requested: URL, allowedHosts: Set<string>): void {
  const finalUrl = response.url ? new URL(response.url) : requested;
  if (finalUrl.protocol !== "https:" && finalUrl.protocol !== "http:") throw controlledError("REDIRECT_PROTOCOL_BLOCKED");
  if (!allowedHosts.has(finalUrl.hostname.toLocaleLowerCase("en-US"))) throw controlledError("REDIRECT_HOST_BLOCKED");
}

async function readBoundedText(response: Response, maximum: number, timeoutMs: number): Promise<string> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const bodyPromise = readBoundedBody(response, maximum);
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      void response.body?.cancel().catch(() => undefined);
      reject(controlledError("RESPONSE_TIMEOUT", response.status));
    }, timeoutMs);
  });
  try {
    return await Promise.race([bodyPromise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function readBoundedBody(response: Response, maximum: number): Promise<string> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maximum) throw controlledError("RESPONSE_TOO_LARGE", response.status);
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maximum) throw controlledError("RESPONSE_TOO_LARGE", response.status);
    return new TextDecoder().decode(bytes);
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maximum) {
      await reader.cancel();
      throw controlledError("RESPONSE_TOO_LARGE", response.status);
    }
    chunks.push(value);
  }
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(combined);
}

export function compileRobotsRules(text: string, userAgent: string): RobotsRules {
  const namedAgent = userAgent.split("/")[0]?.trim().toLocaleLowerCase("en-US") ?? "";
  const groups: Array<{ agents: string[]; rules: Array<{ allow: boolean; path: string }> }> = [];
  let current: { agents: string[]; rules: Array<{ allow: boolean; path: string }> } | undefined;
  let sawRules = false;
  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.replace(/#.*$/u, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const directive = line.slice(0, separator).trim().toLocaleLowerCase("en-US");
    const value = line.slice(separator + 1).trim();
    if (directive === "user-agent") {
      if (!current || sawRules) {
        current = { agents: [], rules: [] };
        groups.push(current);
        sawRules = false;
      }
      current.agents.push(value.toLocaleLowerCase("en-US"));
    } else if ((directive === "allow" || directive === "disallow") && current) {
      if (value) current.rules.push({ allow: directive === "allow", path: value });
      sawRules = true;
    }
  }
  const exact = groups.filter((group) => group.agents.includes(namedAgent));
  const applicable = exact.length > 0 ? exact : groups.filter((group) => group.agents.includes("*"));
  const rules = applicable.flatMap((group) => group.rules);
  return {
    allows(pathname) {
      const matching = rules
        .filter((rule) => robotsPathMatches(pathname, rule.path))
        .sort((left, right) => right.path.length - left.path.length || Number(right.allow) - Number(left.allow));
      return matching[0]?.allow ?? true;
    },
  };
}

function robotsPathMatches(pathname: string, rule: string): boolean {
  const anchored = rule.endsWith("$");
  const raw = anchored ? rule.slice(0, -1) : rule;
  const pattern = raw.split("*").map(escapeRegex).join(".*");
  return new RegExp(`^${pattern}${anchored ? "$" : ""}`, "u").test(pathname);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function containsPii(value: string): boolean {
  const normalized = value.normalize("NFKD").replace(/\p{Diacritic}/gu, "");
  return /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/u.test(normalized)
    || /(?:\+?51[\s.-]*)?(?:9\d{2}[\s.-]*\d{3}[\s.-]*\d{3})/u.test(normalized)
    || /(?:tel(?:e?fono)?|whatsapp|contacto)\s*:?\s*\+?\d/iu.test(normalized);
}

function validateTargetUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw controlledError("TARGET_URL_INVALID");
  }
  if (!["http:", "https:"].includes(url.protocol)) throw controlledError("TARGET_PROTOCOL_BLOCKED");
  if (url.username || url.password) throw controlledError("TARGET_CREDENTIALS_BLOCKED");
  url.hash = "";
  return url;
}

function canonicalExecutableUrl(value: string): string {
  const url = validateTargetUrl(value);
  url.search = "";
  const canonical = url.href;
  const auditable = auditUrl(url);
  if (canonical !== auditable) throw controlledError("TARGET_PATH_PII_BLOCKED");
  return auditable;
}

function safePublicUrl(value: string): string {
  try {
    return auditUrl(validateTargetUrl(value));
  } catch {
    return "invalid-target";
  }
}

function auditUrl(value: URL): string {
  const clean = new URL(value.href);
  clean.search = "";
  clean.hash = "";
  try {
    if (containsPii(decodeURIComponent(clean.pathname))) clean.pathname = "/redacted-path";
  } catch {
    clean.pathname = "/redacted-path";
  }
  return clean.href;
}

function validateHost(value: string): string {
  const host = value.trim().toLocaleLowerCase("en-US");
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(host)) {
    throw controlledError("ALLOWED_HOST_INVALID");
  }
  return host;
}

function cleanAuditLabel(value: string): string {
  const clean = value.replace(/[\r\n\t]/gu, " ").replace(/\s+/gu, " ").trim().slice(0, 160);
  return containsPii(clean) ? "redacted" : clean;
}

function normalizeRegistryReference(value: string): string {
  const normalized = value.replaceAll("\\", "/").replace(/^\/+/, "");
  return normalized.includes(":") || normalized.startsWith("../") ? path.basename(normalized) : normalized;
}

function positiveSetting(value: number | undefined, fallback: number): number {
  return value === undefined ? fallback : boundedInteger(value, 1, 60_000_000, "source setting");
}

function nonNegativeSetting(value: number | undefined, fallback: number): number {
  return value === undefined ? fallback : boundedInteger(value, 0, 60_000_000, "source setting");
}

function boundedInteger(value: number, minimum: number, maximum: number, label: string): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`INGESTION_OPTION_INVALID: ${label} debe estar entre ${minimum} y ${maximum}.`);
  }
  return value;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function canonicalJsonSha256(value: unknown): string {
  return sha256(canonicalJson(value));
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => entry === undefined ? "null" : canonicalJson(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(",")}}`;
  }
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error("INGESTION_CANONICAL_JSON_INVALID");
  return serialized;
}

function serializeJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

class HostRateLimiter {
  private readonly tails = new Map<string, Promise<unknown>>();
  private readonly nextAllowedAt = new Map<string, number>();

  constructor(private readonly sleep: (milliseconds: number) => Promise<void>) {}

  async run<T>(origin: string, intervalMs: number, operation: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(origin) ?? Promise.resolve();
    let release: (() => void) | undefined;
    const tail = new Promise<void>((resolve) => { release = resolve; });
    this.tails.set(origin, previous.catch(() => undefined).then(() => tail));
    await previous.catch(() => undefined);
    try {
      const wait = Math.max(0, (this.nextAllowedAt.get(origin) ?? 0) - Date.now());
      if (wait > 0) await this.sleep(wait);
      this.nextAllowedAt.set(origin, Date.now() + intervalMs);
      return await operation();
    } finally {
      release?.();
    }
  }
}

async function mapWithConcurrency<T>(
  values: T[],
  concurrency: number,
  operation: (value: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < values.length) {
      const index = next;
      next += 1;
      const value = values[index];
      if (value !== undefined) await operation(value);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
}

interface ControlledError extends Error {
  code: string;
  httpStatus?: number;
}

function controlledError(code: string, httpStatus?: number): ControlledError {
  const error = new Error(code) as ControlledError;
  error.code = code;
  if (httpStatus !== undefined) error.httpStatus = httpStatus;
  return error;
}

function isControlledError(error: unknown): error is ControlledError {
  return error instanceof Error && "code" in error && typeof (error as ControlledError).code === "string";
}

function toSafeFailure(error: unknown): Pick<TargetAudit, "code" | "httpStatus"> {
  if (isControlledError(error)) {
    return { code: error.code, ...(error.httpStatus !== undefined ? { httpStatus: error.httpStatus } : {}) };
  }
  return { code: "INTERNAL_COLLECTION_FAILURE" };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
