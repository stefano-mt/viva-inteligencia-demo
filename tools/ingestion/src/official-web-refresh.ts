import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { evaluateSource, type PolicyDecision, type SourceCandidate } from "./policy.js";

const DEFAULT_USER_AGENT = "VivaInteligenciaBatch/1.0";
const BLOCK_PAGE_PATTERNS = [
  /cf-chl-/iu,
  /challenge-platform/iu,
  /verify you are human/iu,
  /captcha-container/iu,
];

export interface CollectionTarget {
  url: string;
  district?: string;
  agency?: string;
  projectExternalId?: string;
}

export interface SourceCollectionConfig {
  targets?: CollectionTarget[];
  userAgent?: string;
  allowedHosts?: string[];
  timeoutMs?: number;
  minIntervalMs?: number;
  maxResponseBytes?: number;
}

export interface RegistrySource extends SourceCandidate {
  label: string;
  purpose?: string;
  url?: string;
  district?: string;
  agency?: string;
  projectExternalId?: string;
  targets?: CollectionTarget[];
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
}

export interface BatchDependencies {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  sleep?: (milliseconds: number) => Promise<void>;
}

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
  | "published_at";

export interface ObservationField {
  field: ObservationFieldName;
  originalValue: string | number | string[];
  normalizedValue: string | number | string[];
  unit?: string;
  locator: string;
  confidence: "structured" | "metadata";
  reviewStatus: "unreviewed";
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
  fields: ObservationField[];
}

export interface SourceObservationGroup {
  sourceId: string;
  label: string;
  sourceClass: RegistrySource["sourceClass"];
  observations: WebObservation[];
}

export interface StagingDocument {
  schemaVersion: "1.0.0";
  runId: string;
  generatedAt: string;
  registryVersion: string;
  mode: "dry-run" | "controlled-collection";
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
  status: TargetStatus;
  code?: string;
  httpStatus?: number;
  contentSha256?: string;
  fieldCount: number;
}

export interface SourceAudit {
  sourceId: string;
  decision: PolicyDecision;
  selectedTargets: number;
}

export interface BatchManifest {
  manifestVersion: "1.0.0";
  runId: string;
  generatedAt: string;
  registryReference: string;
  registryVersion: string;
  mode: "dry-run" | "controlled-collection";
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
    observations: number;
    observationFields: number;
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
}

interface RobotsRules {
  allows(pathname: string): boolean;
}

interface MutableCounters {
  networkRequests: number;
}

export async function readSourceRegistry(registryPath: string): Promise<SourceRegistry> {
  const raw = JSON.parse(await readFile(registryPath, "utf8")) as unknown;
  if (!isObject(raw) || typeof raw.registryVersion !== "string" || !Array.isArray(raw.sources)) {
    throw new Error("INGESTION_REGISTRY_INVALID: El registro no contiene registryVersion y sources válidos.");
  }
  for (const [index, source] of raw.sources.entries()) validateRegistrySource(source, index);
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
  const sourceAudits: SourceAudit[] = [];
  const selectedTargets: SelectedTarget[] = [];

  for (const source of selectedSources) {
    // This decision is deliberately evaluated before targets are queued and before fetch is reachable.
    const decision = evaluateSource(source, "collect");
    const targets = normalizeTargets(source).filter((target) => targetMatchesFilters(target, filters));
    sourceAudits.push({ sourceId: source.sourceId, decision, selectedTargets: targets.length });
    for (const target of targets) selectedTargets.push({ source, target, decision });
  }

  const audits: TargetAudit[] = [];
  const observationsBySource = new Map<string, WebObservation[]>();
  const counters: MutableCounters = { networkRequests: 0 };
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
        const fields = extractStructuredObservations(html);
        const observation: WebObservation = {
          observationId: sha256(`${selected.source.sourceId}\n${targetUrl.href}\n${generatedAt}\n${contentSha256}`),
          sourceId: selected.source.sourceId,
          sourceUrl: auditUrl(targetUrl),
          capturedAt: generatedAt,
          contentSha256,
          fields,
          ...(selected.target.district ? { district: cleanAuditLabel(selected.target.district) } : {}),
          ...(selected.target.agency ? { agency: cleanAuditLabel(selected.target.agency) } : {}),
          ...(selected.target.projectExternalId ? { projectExternalId: cleanAuditLabel(selected.target.projectExternalId) } : {}),
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
  const staging: StagingDocument = {
    schemaVersion: "1.0.0",
    runId,
    generatedAt,
    registryVersion: options.registry.registryVersion,
    mode: options.dryRun ? "dry-run" : "controlled-collection",
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
    manifestVersion: "1.0.0",
    runId,
    generatedAt,
    registryReference: normalizeRegistryReference(options.registryReference),
    registryVersion: options.registry.registryVersion,
    mode: staging.mode,
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
      observations: observationCount,
      observationFields: observationFieldCount,
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

export function extractStructuredObservations(html: string): ObservationField[] {
  const fields = new Map<ObservationFieldName, ObservationField>();
  const add = (
    field: ObservationFieldName,
    value: unknown,
    locator: string,
    confidence: ObservationField["confidence"],
    unit?: string,
  ) => {
    if (fields.has(field)) return;
    const safe = normalizeObservationValue(value);
    if (safe === undefined) return;
    fields.set(field, {
      field,
      originalValue: safe,
      normalizedValue: typeof safe === "string" ? safe.trim() : safe,
      ...(unit ? { unit } : {}),
      locator,
      confidence,
      reviewStatus: "unreviewed",
    });
  };

  const jsonLdObjects = parseJsonLd(html);
  const projectObjects = jsonLdObjects.filter(isProjectStructuredObject);
  for (const object of projectObjects) {
    add("project_name", object.name ?? object.headline, "jsonld:name", "structured");
    const brand = object.brand;
    add("agency_name", isObject(brand) ? brand.name : brand, "jsonld:brand", "structured");
    add("address", formatAddress(object.address), "jsonld:address", "structured");
    const offers = firstObject(object.offers);
    add("published_price", offers?.price ?? offers?.lowPrice, "jsonld:offers.price", "structured", stringValue(offers?.priceCurrency));
    add("currency", offers?.priceCurrency, "jsonld:offers.priceCurrency", "structured");
    const floorSize = firstObject(object.floorSize);
    add("area", floorSize?.value, "jsonld:floorSize.value", "structured", stringValue(floorSize?.unitText ?? floorSize?.unitCode));
    add("bedrooms", object.numberOfBedrooms ?? object.numberOfRooms, "jsonld:numberOfBedrooms", "structured");
    add("bathrooms", object.numberOfBathroomsTotal, "jsonld:numberOfBathroomsTotal", "structured");
    add("amenities", extractAmenityNames(object.amenityFeature), "jsonld:amenityFeature", "structured");
    add("availability", offers?.availability, "jsonld:offers.availability", "structured");
    add("published_at", object.datePosted ?? object.datePublished, "jsonld:datePublished", "structured");
  }

  for (const object of jsonLdObjects) {
    if (!schemaTypes(object).includes("organization")) continue;
    add("agency_name", object.name, "jsonld:Organization.name", "structured");
  }

  const metadata = parseMetadata(html);
  add("project_name", metadata.get("og:title") ?? extractTitle(html), "meta:og:title", "metadata");
  add("agency_name", metadata.get("og:site_name"), "meta:og:site_name", "metadata");
  add("published_price", metadata.get("product:price:amount"), "meta:product:price:amount", "metadata", metadata.get("product:price:currency"));
  add("currency", metadata.get("product:price:currency"), "meta:product:price:currency", "metadata");
  add("availability", metadata.get("product:availability"), "meta:product:availability", "metadata");
  return [...fields.values()];
}

function validateRegistrySource(value: unknown, index: number): asserts value is RegistrySource {
  if (!isObject(value)) throw new Error(`INGESTION_REGISTRY_INVALID: Fuente ${index + 1} inválida.`);
  const requiredStrings = ["sourceId", "sourceClass", "label", "reviewStatus", "robotsStatus"];
  if (requiredStrings.some((field) => typeof value[field] !== "string")) {
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
}

function validateOptions(options: BatchOptions): void {
  if (!options.registry || !Array.isArray(options.registry.sources)) {
    throw new Error("INGESTION_REGISTRY_INVALID: Falta el registro de fuentes.");
  }
  if (!options.registryReference.trim()) throw new Error("INGESTION_REGISTRY_INVALID: Falta una referencia relativa del registro.");
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
  const candidates = source.collection?.targets ?? source.targets;
  if (Array.isArray(candidates)) return candidates.map((target) => ({ ...target }));
  if (!source.url) return [];
  return [{
    url: source.url,
    ...(source.district ? { district: source.district } : {}),
    ...(source.agency ? { agency: source.agency } : {}),
    ...(source.projectExternalId ? { projectExternalId: source.projectExternalId } : {}),
  }];
}

function targetAuditBase(selected: SelectedTarget): Omit<TargetAudit, "status" | "fieldCount"> {
  return {
    sourceId: selected.source.sourceId,
    url: safePublicUrl(selected.target.url),
    ...(selected.target.district ? { district: cleanAuditLabel(selected.target.district) } : {}),
    ...(selected.target.agency ? { agency: cleanAuditLabel(selected.target.agency) } : {}),
    ...(selected.target.projectExternalId ? { projectExternalId: cleanAuditLabel(selected.target.projectExternalId) } : {}),
  };
}

function controlsForSource(
  source: RegistrySource,
  defaults: Pick<RequestControls, "timeoutMs" | "minIntervalMs" | "maxResponseBytes">,
  target: URL,
): RequestControls {
  const config = source.collection;
  const userAgent = config?.userAgent?.trim() || DEFAULT_USER_AGENT;
  const allowedHosts = new Set([target.hostname.toLocaleLowerCase("en-US")]);
  for (const host of config?.allowedHosts ?? []) allowedHosts.add(validateHost(host));
  return {
    userAgent,
    allowedHosts,
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
  const response = await controlledFetch(robotsUrl, controls, fetchImpl, limiter, counters);
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
): Promise<Response> {
  let currentUrl = url;
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await singleControlledFetch(currentUrl, controls, fetchImpl, limiter, counters);
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location) throw controlledError("REDIRECT_LOCATION_MISSING", response.status);
    if (redirects === 3) throw controlledError("REDIRECT_LIMIT_EXCEEDED", response.status);
    const nextUrl = new URL(location, currentUrl);
    if (!["http:", "https:"].includes(nextUrl.protocol)) throw controlledError("REDIRECT_PROTOCOL_BLOCKED", response.status);
    if (!controls.allowedHosts.has(nextUrl.hostname.toLocaleLowerCase("en-US"))) {
      throw controlledError("REDIRECT_HOST_BLOCKED", response.status);
    }
    currentUrl = nextUrl;
  }
  throw controlledError("REDIRECT_LIMIT_EXCEEDED");
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

function parseJsonLd(html: string): Array<Record<string, unknown>> {
  const objects: Array<Record<string, unknown>> = [];
  const expression = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/giu;
  for (const match of html.matchAll(expression)) {
    const raw = match[1]?.trim();
    if (!raw || raw.length > 500_000) continue;
    try {
      collectObjects(JSON.parse(raw) as unknown, objects);
    } catch {
      // Invalid structured data is ignored; raw payloads and parse errors never enter staging.
    }
  }
  return objects;
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

function isProjectStructuredObject(value: Record<string, unknown>): boolean {
  const projectTypes = new Set([
    "accommodation",
    "apartment",
    "apartmentcomplex",
    "house",
    "offer",
    "place",
    "product",
    "realestatelisting",
    "residence",
    "singlefamilyresidence",
  ]);
  return schemaTypes(value).some((type) => projectTypes.has(type));
}

function schemaTypes(value: Record<string, unknown>): string[] {
  const type = value["@type"];
  const values = Array.isArray(type) ? type : type ? [type] : [];
  return values
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.toLocaleLowerCase("en-US"));
}

function parseMetadata(html: string): Map<string, string> {
  const metadata = new Map<string, string>();
  for (const tag of html.match(/<meta\b[^>]*>/giu) ?? []) {
    const attributes = parseAttributes(tag);
    const key = attributes.get("property") ?? attributes.get("name");
    const value = attributes.get("content");
    if (key && value) metadata.set(key.toLocaleLowerCase("en-US"), decodeHtml(value));
  }
  return metadata;
}

function parseAttributes(tag: string): Map<string, string> {
  const attributes = new Map<string, string>();
  const expression = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gu;
  for (const match of tag.matchAll(expression)) {
    const key = match[1]?.toLocaleLowerCase("en-US");
    const value = match[2] ?? match[3] ?? match[4];
    if (key && value !== undefined) attributes.set(key, value);
  }
  return attributes;
}

function extractTitle(html: string): string | undefined {
  const title = /<title\b[^>]*>([\s\S]*?)<\/title>/iu.exec(html)?.[1];
  return title ? decodeHtml(title.replace(/<[^>]+>/gu, " ")) : undefined;
}

function formatAddress(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  const address = firstObject(value);
  if (!address) return undefined;
  return [address.streetAddress, address.addressLocality, address.addressRegion]
    .map(stringValue)
    .filter((part): part is string => Boolean(part))
    .join(", ");
}

function extractAmenityNames(value: unknown): string[] | undefined {
  const entries = Array.isArray(value) ? value : value ? [value] : [];
  const names = entries
    .map((entry) => isObject(entry) ? stringValue(entry.name) : stringValue(entry))
    .filter((entry): entry is string => Boolean(entry));
  return names.length > 0 ? [...new Set(names)] : undefined;
}

function normalizeObservationValue(value: unknown): string | number | string[] | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const decoded = decodeHtml(value).replace(/\s+/gu, " ").trim();
    if (!decoded || decoded.length > 300 || containsPii(decoded)) return undefined;
    const numeric = decoded.replace(/[\s,]/gu, "");
    if (/^-?\d+(?:\.\d+)?$/u.test(numeric)) return Number(numeric);
    return decoded;
  }
  if (Array.isArray(value)) {
    const safe = value.map((entry) => normalizeObservationValue(entry)).filter((entry): entry is string => typeof entry === "string");
    return safe.length > 0 ? [...new Set(safe)].slice(0, 50) : undefined;
  }
  return undefined;
}

function containsPii(value: string): boolean {
  return /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/u.test(value)
    || /(?:\+?51[\s.-]*)?(?:9\d{2}[\s.-]*\d{3}[\s.-]*\d{3})/u.test(value)
    || /(?:tel(?:e?fono)?|whatsapp|contacto)\s*[:：]?\s*\+?\d/iu.test(value);
}

function decodeHtml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function firstObject(value: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(value)) return value.find(isObject);
  return isObject(value) ? value : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
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
