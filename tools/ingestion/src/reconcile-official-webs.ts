import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  canonicalJsonSha256,
  containsPii,
  readSourceRegistry,
  type BatchManifest,
  type CollectionTarget,
  type SourceAudit,
  type SourceRegistry,
  type StagingDocument,
  type TargetAudit,
  type WebObservation,
} from "./official-web-refresh.js";
import { evaluateSource } from "./policy.js";
import { nexoProjectsFromCsv, reconcileOfficialWebObservations } from "./reconcile-observations.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const ALLOWED_FIELDS = new Set([
  "project_name", "agency_name", "address", "published_price", "currency", "area", "bedrooms",
  "bathrooms", "amenities", "availability", "delivery_date", "typologies", "financing_banks", "published_at",
]);
const ALLOWED_CONFIDENCE = new Set(["structured", "metadata", "labeled_html"]);
const ALLOWED_EXTRACTION_ARCHETYPES = new Set(["wordpress", "json_ld", "embedded_json", "html"]);
const ALLOWED_EXTRACTION_ISSUES = new Set([
  "AMBIGUOUS_FIELD",
  "PRICE_NOT_PROJECT_ASSOCIATED",
  "PRICE_WITHOUT_CURRENCY",
  "STRUCTURED_PAYLOAD_INVALID",
  "EXTRACTOR_FAILURE",
]);

if (isMainModule()) await runCli();

async function runCli(): Promise<void> {
  const cli = parseArguments(process.argv.slice(2));
  const nexoPath = resolveFromRoot(cli.get("nexo") ?? "data/source/viva_minimum_dataset_latest.csv");
  const webPath = resolveFromRoot(cli.get("web") ?? "data/staging/official-web-refresh.json");
  const manifestPath = resolveFromRoot(cli.get("manifest") ?? `${webPath}.manifest.json`);
  const catalogPath = resolveFromRoot(cli.get("catalog") ?? "data/source/ingestion/agency-source-catalog.json");
  const outputPath = resolveFromRoot(cli.get("output") ?? "data/staging/official-web-reconciliation.json");
  assertStagingPath(outputPath);

  const [nexoCsv, webRaw, manifestRaw, catalogRaw] = await Promise.all([
    readFile(nexoPath, "utf8"),
    readFile(webPath, "utf8"),
    readFile(manifestPath, "utf8"),
    readFile(catalogPath, "utf8"),
  ]);
  const staging = parseStagingDocument(webRaw);
  const registryPath = resolveRegistryReference(manifestRegistryReference(manifestRaw));
  const registry = await readSourceRegistry(registryPath);
  parseManifestDocument(manifestRaw, staging, webRaw, registry);
  const agencyAliases = parseAgencyAliases(catalogRaw);
  const observations = staging.sourceObservations.flatMap((group) => group.observations);
  const manifestReference = relativeReference(manifestPath);
  const manifestSha256 = createHash("sha256").update(manifestRaw).digest("hex");
  const reconciliation = reconcileOfficialWebObservations(nexoProjectsFromCsv(nexoCsv), observations, {
    sourceRunId: staging.runId,
    generatedAt: staging.generatedAt,
    sourceManifestReference: manifestReference,
    sourceManifestSha256: manifestSha256,
    agencyAliases,
    aliasCatalogReference: relativeReference(catalogPath),
  });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(reconciliation, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    outputPath: relativeReference(outputPath),
    manifestReference,
    manifestSha256,
    sourceRunId: reconciliation.sourceRunId,
    aliasCatalogReference: reconciliation.aliasCatalogReference,
    counts: reconciliation.counts,
    sha256: reconciliation.sha256,
  }, null, 2)}\n`);
}

export function parseManifestDocument(
  raw: string,
  staging: StagingDocument,
  stagingRaw: string,
  registry: SourceRegistry,
): BatchManifest {
  const value = parseJsonObject(raw, "RECONCILIATION_WEB_MANIFEST_INVALID");
  assertExactKeys(value, [
    "manifestVersion",
    "runId",
    "generatedAt",
    "registryReference",
    "registrySha256",
    "registryVersion",
    "mode",
    "filters",
    "controls",
    "counts",
    "sources",
    "targets",
    "stagingSha256",
  ], "RECONCILIATION_WEB_MANIFEST_INVALID: Contrato superior incompleto o desconocido.");
  if (value.manifestVersion !== "1.0.0"
    || typeof value.runId !== "string"
    || !value.runId.trim()
    || value.runId !== staging.runId
    || typeof value.generatedAt !== "string"
    || !Number.isFinite(Date.parse(value.generatedAt))
    || value.generatedAt !== staging.generatedAt
    || typeof value.registryReference !== "string"
    || !isSafeRegistryReference(value.registryReference)
    || typeof value.registrySha256 !== "string"
    || !/^[a-f0-9]{64}$/u.test(value.registrySha256)
    || value.registrySha256 !== canonicalJsonSha256(registry)
    || typeof value.registryVersion !== "string"
    || value.registryVersion !== staging.registryVersion
    || value.registryVersion !== registry.registryVersion
    || value.mode !== staging.mode
    || !["dry-run", "controlled-collection"].includes(String(value.mode))
    || typeof value.stagingSha256 !== "string"
    || !/^[a-f0-9]{64}$/u.test(value.stagingSha256)) {
    manifestError("El manifiesto no corresponde al staging ni al registro vigente.");
  }
  const actualSha256 = createHash("sha256").update(stagingRaw).digest("hex");
  if (value.stagingSha256 !== actualSha256) {
    manifestError("La huella del staging web no coincide.");
  }

  const filters = parseManifestFilters(value.filters);
  const controls = parseManifestControls(value.controls);
  const counts = parseManifestCounts(value.counts);
  const registrySources = new Map(registry.sources.map((source) => [source.sourceId, source]));
  const expectedSources = registry.sources.filter(
    (source) => source.sourceClass === "official_project_website"
      && matchesManifestFilter(source.sourceId, filters.sourceIds),
  );
  const sourceAudits = parseManifestSources(value.sources, registrySources);
  if (sourceAudits.length !== expectedSources.length) {
    manifestError("La selección de fuentes no corresponde al registro y filtros declarados.");
  }

  const expectedSourceIds = new Set(expectedSources.map((source) => source.sourceId));
  for (const source of sourceAudits) {
    if (!expectedSourceIds.has(source.sourceId)) {
      manifestError(`La fuente ${source.sourceId} no pertenece a la selección declarada.`);
    }
  }
  assertStagingSources(staging, expectedSources);

  const expectedTargets = new Map<string, TargetAudit>();
  const expectedTargetCountBySource = new Map<string, number>();
  for (const source of expectedSources) {
    const selected = (source.collection?.targets ?? []).filter(
      (target) => matchesManifestFilter(target.district, filters.districts)
        && matchesManifestFilter(target.agency, filters.agencies),
    );
    expectedTargetCountBySource.set(source.sourceId, selected.length);
    for (const target of selected) {
      assertRegistryTargetHostAllowed(source, target);
      const audit = expectedTargetAudit(source.sourceId, target);
      const key = targetKey(audit.sourceId, audit.url);
      if (expectedTargets.has(key)) {
        manifestError(`El registro produce el target auditado repetido ${audit.url}.`);
      }
      expectedTargets.set(key, audit);
    }
  }
  for (const source of sourceAudits) {
    if (source.selectedTargets !== (expectedTargetCountBySource.get(source.sourceId) ?? 0)) {
      manifestError(`selectedTargets es incoherente para ${source.sourceId}.`);
    }
  }

  const targets = parseManifestTargets(value.targets, registrySources, sourceAudits);
  if (targets.length !== expectedTargets.size) {
    manifestError("La lista de targets no corresponde al registro y filtros declarados.");
  }
  for (const target of targets) {
    const expected = expectedTargets.get(targetKey(target.sourceId, target.url));
    if (!expected || !sameTargetIdentity(target, expected)) {
      manifestError(`El target ${target.sourceId}:${target.url} no coincide con el registro autorizado.`);
    }
  }

  const observations = staging.sourceObservations.flatMap((group) => group.observations);
  validateTargetObservationLinks(targets, observations, sourceAudits, staging);
  validateManifestCounts(counts, sourceAudits, targets, observations, controls, staging.mode, registrySources);
  return value as unknown as BatchManifest;
}

function parseManifestFilters(value: unknown): BatchManifest["filters"] {
  if (!isObject(value)) manifestError("filters debe ser un objeto completo.");
  assertExactKeys(value, ["districts", "agencies", "sourceIds"], "RECONCILIATION_WEB_MANIFEST_INVALID: filters incompleto.");
  const result = {
    districts: parseFilterList(value.districts, "districts"),
    agencies: parseFilterList(value.agencies, "agencies"),
    sourceIds: parseFilterList(value.sourceIds, "sourceIds"),
  };
  return result;
}

function parseFilterList(value: unknown, label: string): string[] {
  if (!Array.isArray(value)
    || value.some((item) => typeof item !== "string" || !item.trim() || item !== item.trim())) {
    manifestError(`filters.${label} debe contener textos no vacíos y normalizados.`);
  }
  if (new Set(value).size !== value.length) manifestError(`filters.${label} contiene duplicados.`);
  if (containsPii(JSON.stringify(value))) manifestError(`filters.${label} contiene datos de contacto.`);
  return value as string[];
}

function parseManifestControls(value: unknown): BatchManifest["controls"] {
  if (!isObject(value)) manifestError("controls debe ser un objeto completo.");
  assertExactKeys(value, [
    "policyGateBeforeNetwork",
    "robotsEnforced",
    "retries",
    "concurrency",
    "timeoutMs",
    "minIntervalMs",
    "maxResponseBytes",
  ], "RECONCILIATION_WEB_MANIFEST_INVALID: controls incompleto.");
  if (value.policyGateBeforeNetwork !== true
    || value.robotsEnforced !== true
    || value.retries !== 0
    || !boundedManifestInteger(value.concurrency, 1, 8)
    || !boundedManifestInteger(value.timeoutMs, 100, 60_000)
    || !boundedManifestInteger(value.minIntervalMs, 0, 60_000)
    || !boundedManifestInteger(value.maxResponseBytes, 1_024, 5_000_000)) {
    manifestError("Los controles de política, robots, reintentos o límites no son los esperados.");
  }
  return value as unknown as BatchManifest["controls"];
}

function parseManifestCounts(value: unknown): BatchManifest["counts"] {
  if (!isObject(value)) manifestError("counts debe ser un objeto completo.");
  const names = [
    "selectedSources",
    "selectedTargets",
    "eligibleTargets",
    "policyBlockedTargets",
    "plannedTargets",
    "collectedTargets",
    "robotsBlockedTargets",
    "failedTargets",
    "networkRequests",
    "redirectsFollowed",
    "observations",
    "observationFields",
    "extractionIssues",
  ] as const;
  assertExactKeys(value, names, "RECONCILIATION_WEB_MANIFEST_INVALID: counts incompleto.");
  for (const name of names) {
    if (!Number.isInteger(value[name]) || Number(value[name]) < 0) {
      manifestError(`counts.${name} debe ser un entero no negativo.`);
    }
  }
  return value as unknown as BatchManifest["counts"];
}

function parseManifestSources(
  value: unknown,
  registrySources: Map<string, SourceRegistry["sources"][number]>,
): SourceAudit[] {
  if (!Array.isArray(value)) manifestError("sources debe ser un arreglo.");
  const result: SourceAudit[] = [];
  const seen = new Set<string>();
  const decisionCodes = new Set([
    "DISCOVERY_ONLY",
    "COLLECTION_ALLOWED",
    "SOURCE_BLOCKED",
    "OFFICIAL_DOMAIN_REQUIRED",
    "ROBOTS_DENIED",
    "LEGAL_REVIEW_REQUIRED",
    "AUTHORIZATION_REQUIRED",
  ]);
  for (const [index, item] of value.entries()) {
    if (!isObject(item)) manifestError(`sources[${index}] no es un objeto.`);
    assertExactKeys(item, ["sourceId", "decision", "selectedTargets"],
      `RECONCILIATION_WEB_MANIFEST_INVALID: sources[${index}] incompleto.`);
    if (typeof item.sourceId !== "string" || !item.sourceId.trim() || item.sourceId !== item.sourceId.trim()
      || !Number.isInteger(item.selectedTargets) || Number(item.selectedTargets) < 0
      || !isObject(item.decision)) {
      manifestError(`sources[${index}] contiene valores inválidos.`);
    }
    assertExactKeys(item.decision, ["allowed", "code", "reason"],
      `RECONCILIATION_WEB_MANIFEST_INVALID: sources[${index}].decision incompleto.`);
    if (typeof item.decision.allowed !== "boolean"
      || typeof item.decision.code !== "string"
      || !decisionCodes.has(item.decision.code)
      || typeof item.decision.reason !== "string"
      || !item.decision.reason.trim()) {
      manifestError(`sources[${index}].decision es inválido.`);
    }
    if (seen.has(item.sourceId)) manifestError(`sourceId ${item.sourceId} está repetido en sources.`);
    seen.add(item.sourceId);
    const registrySource = registrySources.get(item.sourceId);
    if (!registrySource || registrySource.sourceClass !== "official_project_website") {
      manifestError(`sourceId ${item.sourceId} no existe como web oficial en el registro.`);
    }
    const expectedDecision = evaluateSource(registrySource, "collect");
    if (item.decision.allowed !== expectedDecision.allowed
      || item.decision.code !== expectedDecision.code
      || item.decision.reason !== expectedDecision.reason) {
      manifestError(`La decisión de ${item.sourceId} no coincide con el policy gate vigente.`);
    }
    result.push(item as unknown as SourceAudit);
  }
  return result;
}

function parseManifestTargets(
  value: unknown,
  registrySources: Map<string, SourceRegistry["sources"][number]>,
  sourceAudits: SourceAudit[],
): TargetAudit[] {
  if (!Array.isArray(value)) manifestError("targets debe ser un arreglo.");
  const allowedKeys = new Set([
    "sourceId", "url", "district", "agency", "projectExternalId", "expectedProjectName",
    "matchClass", "requiresHumanReview", "status", "code", "httpStatus", "contentSha256",
    "fieldCount", "extractorArchetypes", "extractionIssueCodes",
  ]);
  const statuses = new Set(["planned", "policy_blocked", "collected", "collected_empty", "robots_blocked", "failed"]);
  const decisions = new Map(sourceAudits.map((source) => [source.sourceId, source.decision]));
  const seen = new Set<string>();
  const result: TargetAudit[] = [];
  for (const [index, item] of value.entries()) {
    if (!isObject(item)
      || Object.keys(item).some((key) => !allowedKeys.has(key))
      || !Object.hasOwn(item, "sourceId")
      || !Object.hasOwn(item, "url")
      || !Object.hasOwn(item, "status")
      || !Object.hasOwn(item, "fieldCount")) {
      manifestError(`targets[${index}] no respeta el contrato.`);
    }
    if (typeof item.sourceId !== "string" || !item.sourceId.trim()
      || !registrySources.has(item.sourceId)
      || !decisions.has(item.sourceId)
      || typeof item.url !== "string"
      || !isPublicAuditUrl(item.url)
      || typeof item.status !== "string"
      || !statuses.has(item.status)
      || !Number.isInteger(item.fieldCount)
      || Number(item.fieldCount) < 0) {
      manifestError(`targets[${index}] contiene valores inválidos.`);
    }
    validateTargetOptionalFields(item, index);
    const target = item as unknown as TargetAudit;
    const key = targetKey(target.sourceId, target.url);
    if (seen.has(key)) manifestError(`El target ${key} está repetido.`);
    seen.add(key);
    validateTargetStatus(target, decisions.get(target.sourceId)!);
    result.push(target);
  }
  return result;
}

function validateTargetOptionalFields(item: Record<string, unknown>, index: number): void {
  for (const field of ["district", "agency", "projectExternalId", "expectedProjectName"] as const) {
    if (item[field] !== undefined && (typeof item[field] !== "string" || !item[field].trim())) {
      manifestError(`targets[${index}].${field} es inválido.`);
    }
  }
  if (item.matchClass !== undefined
    && !["match_high", "match_medium", "match_low", "unmatched_web"].includes(String(item.matchClass))) {
    manifestError(`targets[${index}].matchClass es inválido.`);
  }
  if (item.requiresHumanReview !== undefined && typeof item.requiresHumanReview !== "boolean") {
    manifestError(`targets[${index}].requiresHumanReview es inválido.`);
  }
  if (item.matchClass !== undefined && item.matchClass !== "match_high" && item.requiresHumanReview === false) {
    manifestError(`targets[${index}] omite revisión humana para ${String(item.matchClass)}.`);
  }
  if (item.code !== undefined && (typeof item.code !== "string" || !item.code.trim())) {
    manifestError(`targets[${index}].code es inválido.`);
  }
  if (item.httpStatus !== undefined && !boundedManifestInteger(item.httpStatus, 100, 599)) {
    manifestError(`targets[${index}].httpStatus es inválido.`);
  }
  if (item.contentSha256 !== undefined
    && (typeof item.contentSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(item.contentSha256))) {
    manifestError(`targets[${index}].contentSha256 es inválido.`);
  }
  assertOptionalEnumArray(item.extractorArchetypes, ALLOWED_EXTRACTION_ARCHETYPES,
    `targets[${index}].extractorArchetypes`);
  assertOptionalEnumArray(item.extractionIssueCodes, ALLOWED_EXTRACTION_ISSUES,
    `targets[${index}].extractionIssueCodes`);
  if (containsPii(JSON.stringify(item))) manifestError(`targets[${index}] contiene contacto.`);
}

function validateTargetStatus(target: TargetAudit, decision: SourceAudit["decision"]): void {
  const allowed = decision.allowed && decision.code === "COLLECTION_ALLOWED";
  const hasCollectionEvidence = target.httpStatus !== undefined
    || target.contentSha256 !== undefined
    || target.extractorArchetypes !== undefined
    || target.extractionIssueCodes !== undefined;
  switch (target.status) {
    case "policy_blocked":
      if (allowed || target.code !== decision.code || target.fieldCount !== 0 || hasCollectionEvidence) {
        manifestError(`Target bloqueado ${target.url} no coincide con la decisión de política.`);
      }
      return;
    case "planned":
      if (!allowed || target.code !== "DRY_RUN" || target.fieldCount !== 0 || hasCollectionEvidence) {
        manifestError(`Target planificado ${target.url} carece de COLLECTION_ALLOWED o contiene evidencia falsa.`);
      }
      return;
    case "collected":
    case "collected_empty": {
      const expectedCode = target.status === "collected" ? "COLLECTED" : "NO_STRUCTURED_FIELDS";
      const validFieldCount = target.status === "collected" ? target.fieldCount > 0 : target.fieldCount === 0;
      if (!allowed || target.code !== expectedCode || !validFieldCount
        || !boundedManifestInteger(target.httpStatus, 200, 299)
        || typeof target.contentSha256 !== "string"
        || !/^[a-f0-9]{64}$/u.test(target.contentSha256)
        || !Array.isArray(target.extractorArchetypes)
        || !Array.isArray(target.extractionIssueCodes)) {
        manifestError(`Target recolectado ${target.url} no acredita autorización y extracción completas.`);
      }
      return;
    }
    case "robots_blocked":
      if (!allowed || target.code !== "ROBOTS_DISALLOW" || target.fieldCount !== 0 || hasCollectionEvidence) {
        manifestError(`Target robots_blocked ${target.url} es incoherente.`);
      }
      return;
    case "failed":
      if (!allowed || typeof target.code !== "string" || !target.code.trim()
        || target.fieldCount !== 0 || target.contentSha256 !== undefined
        || target.extractorArchetypes !== undefined || target.extractionIssueCodes !== undefined) {
        manifestError(`Target fallido ${target.url} es incoherente.`);
      }
      return;
  }
}

function assertStagingSources(staging: StagingDocument, expectedSources: SourceRegistry["sources"]): void {
  if (staging.sourceObservations.length !== expectedSources.length) {
    manifestError("Los grupos del staging no corresponden a las fuentes seleccionadas.");
  }
  const groups = new Map(staging.sourceObservations.map((group) => [group.sourceId, group]));
  for (const source of expectedSources) {
    const group = groups.get(source.sourceId);
    if (!group
      || group.sourceClass !== "official_project_website"
      || group.label !== cleanManifestLabel(source.label)) {
      manifestError(`El grupo de staging ${source.sourceId} no corresponde al registro.`);
    }
  }
}

function expectedTargetAudit(sourceId: string, target: CollectionTarget): TargetAudit {
  return {
    sourceId,
    url: manifestAuditUrl(target.url),
    ...(target.district ? { district: cleanManifestLabel(target.district) } : {}),
    ...(target.agency ? { agency: cleanManifestLabel(target.agency) } : {}),
    ...(target.projectExternalId ? { projectExternalId: cleanManifestLabel(target.projectExternalId) } : {}),
    ...(target.projectName ? { expectedProjectName: cleanManifestLabel(target.projectName) } : {}),
    ...(target.matchClass ? { matchClass: target.matchClass } : {}),
    ...(target.requiresHumanReview !== undefined ? { requiresHumanReview: target.requiresHumanReview } : {}),
    status: "planned",
    fieldCount: 0,
  };
}

function assertRegistryTargetHostAllowed(
  source: SourceRegistry["sources"][number],
  target: CollectionTarget,
): void {
  const allowedHosts = new Set(
    (source.collection?.allowedHosts ?? []).map((host) => host.trim().toLocaleLowerCase("en-US")),
  );
  if (allowedHosts.size === 0 && source.officialDomainConfirmed && source.url) {
    allowedHosts.add(new URL(source.url).hostname.toLocaleLowerCase("en-US"));
  }
  let targetHost: string;
  try {
    targetHost = new URL(target.url).hostname.toLocaleLowerCase("en-US");
  } catch {
    manifestError(`El target registrado para ${source.sourceId} tiene una URL inválida.`);
  }
  if (allowedHosts.size === 0 || !allowedHosts.has(targetHost!)) {
    manifestError(`El host ${targetHost!} de ${source.sourceId} no está en allowedHosts vigente.`);
  }
}

function sameTargetIdentity(actual: TargetAudit, expected: TargetAudit): boolean {
  for (const field of [
    "sourceId", "url", "district", "agency", "projectExternalId", "expectedProjectName",
    "matchClass", "requiresHumanReview",
  ] as const) {
    if (actual[field] !== expected[field]) return false;
  }
  return true;
}

function validateTargetObservationLinks(
  targets: TargetAudit[],
  observations: WebObservation[],
  sourceAudits: SourceAudit[],
  staging: StagingDocument,
): void {
  const targetByKey = new Map(targets.map((target) => [targetKey(target.sourceId, target.url), target]));
  const decisionBySource = new Map(sourceAudits.map((source) => [source.sourceId, source.decision]));
  const observationKeys = new Set<string>();
  for (const observation of observations) {
    const key = targetKey(observation.sourceId, observation.sourceUrl);
    if (observationKeys.has(key)) manifestError(`Hay más de una observación para ${key}.`);
    observationKeys.add(key);
    const target = targetByKey.get(key);
    const decision = decisionBySource.get(observation.sourceId);
    if (!target || !decision || !decision.allowed || decision.code !== "COLLECTION_ALLOWED"
      || !["collected", "collected_empty"].includes(target.status)) {
      manifestError(`La observación ${observation.observationId} no proviene de un target autorizado y recolectado.`);
    }
    if (observation.capturedAt !== staging.generatedAt
      || observation.contentSha256 !== target.contentSha256
      || observation.fields.length !== target.fieldCount) {
      manifestError(`La evidencia de ${observation.observationId} no coincide con su target.`);
    }
    const expectedObservationId = createHash("sha256")
      .update(`${observation.sourceId}\n${target.url}\n${observation.capturedAt}\n${observation.contentSha256}`)
      .digest("hex");
    if (observation.observationId !== expectedObservationId) {
      manifestError(`observationId no corresponde al contenido auditado de ${target.url}.`);
    }
    for (const field of [
      "district", "agency", "projectExternalId", "expectedProjectName", "matchClass", "requiresHumanReview",
    ] as const) {
      if (observation[field] !== target[field]) {
        manifestError(`La identidad ${field} de ${observation.observationId} no coincide con su target.`);
      }
    }
    if (!observation.extraction) manifestError(`La observación ${observation.observationId} no incluye auditoría de extracción.`);
    const applicableArchetypes = observation.extraction.attempts
      .filter((attempt) => attempt.applicable)
      .map((attempt) => attempt.archetype);
    if (!sameStringArray(target.extractorArchetypes, applicableArchetypes)
      || !sameStringArray(target.extractionIssueCodes, observation.extraction.issueCodes)) {
      manifestError(`La auditoría de extracción de ${observation.observationId} no coincide con el target.`);
    }
  }
  for (const target of targets) {
    const collected = target.status === "collected" || target.status === "collected_empty";
    if (collected !== observationKeys.has(targetKey(target.sourceId, target.url))) {
      manifestError(`La correspondencia target/observación es incompleta para ${target.url}.`);
    }
  }
  if (staging.mode === "dry-run" && observations.length > 0) {
    manifestError("Un dry-run no puede contener observaciones.");
  }
}

function validateManifestCounts(
  counts: BatchManifest["counts"],
  sources: SourceAudit[],
  targets: TargetAudit[],
  observations: WebObservation[],
  controls: BatchManifest["controls"],
  mode: StagingDocument["mode"],
  registrySources: Map<string, SourceRegistry["sources"][number]>,
): void {
  const decisionBySource = new Map(sources.map((source) => [source.sourceId, source.decision]));
  const recomputed = {
    selectedSources: sources.length,
    selectedTargets: targets.length,
    eligibleTargets: targets.filter((target) => decisionBySource.get(target.sourceId)?.allowed === true).length,
    policyBlockedTargets: targets.filter((target) => target.status === "policy_blocked").length,
    plannedTargets: targets.filter((target) => target.status === "planned").length,
    collectedTargets: targets.filter((target) => target.status === "collected" || target.status === "collected_empty").length,
    robotsBlockedTargets: targets.filter((target) => target.status === "robots_blocked").length,
    failedTargets: targets.filter((target) => target.status === "failed").length,
    observations: observations.length,
    observationFields: observations.reduce((total, observation) => total + observation.fields.length, 0),
  };
  for (const [name, expected] of Object.entries(recomputed)) {
    if (counts[name as keyof typeof recomputed] !== expected) {
      manifestError(`counts.${name} no coincide: se declaró ${String(counts[name as keyof typeof recomputed])} y se recomputó ${expected}.`);
    }
  }
  const statusTotal = recomputed.policyBlockedTargets + recomputed.plannedTargets + recomputed.collectedTargets
    + recomputed.robotsBlockedTargets + recomputed.failedTargets;
  if (statusTotal !== targets.length
    || sources.reduce((total, source) => total + source.selectedTargets, 0) !== targets.length) {
    manifestError("Los targets no forman una partición coherente por estado y fuente.");
  }
  if ((mode === "dry-run" && targets.some((target) => !["planned", "policy_blocked"].includes(target.status)))
    || (mode === "controlled-collection" && targets.some((target) => target.status === "planned"))) {
    manifestError(`Los estados de target no corresponden al modo ${mode}.`);
  }

  const minimumExtractionIssues = observations.reduce(
    (total, observation) => total + (observation.extraction?.issueCodes.length ?? 0),
    0,
  );
  if (counts.extractionIssues < minimumExtractionIssues
    || (minimumExtractionIssues === 0 && counts.extractionIssues !== 0)) {
    manifestError("counts.extractionIssues no es coherente con las auditorías de extracción.");
  }

  const executedTargets = targets.filter((target) => !["planned", "policy_blocked"].includes(target.status));
  const robotsRequests = new Set(executedTargets.map((target) => robotsCacheKey(target, registrySources, controls))).size;
  const initialRequests = counts.networkRequests - counts.redirectsFollowed;
  const minimumInitialRequests = recomputed.collectedTargets + robotsRequests;
  const maximumInitialRequests = recomputed.collectedTargets + recomputed.failedTargets + robotsRequests;
  if (mode === "dry-run" || recomputed.eligibleTargets === 0) {
    if (counts.networkRequests !== 0 || counts.redirectsFollowed !== 0) {
      manifestError("Un lote sin recolección elegible debe declarar cero solicitudes y redirecciones.");
    }
  } else if (initialRequests < minimumInitialRequests
    || initialRequests > maximumInitialRequests
    || counts.redirectsFollowed > initialRequests * 3) {
    manifestError("networkRequests - redirectsFollowed no es coherente con las solicitudes iniciales y el cache de robots.");
  }
  if (!controls.policyGateBeforeNetwork || !controls.robotsEnforced || controls.retries !== 0) {
    manifestError("El manifiesto no acredita los controles fail-closed.");
  }
}

function robotsCacheKey(
  target: TargetAudit,
  registrySources: Map<string, SourceRegistry["sources"][number]>,
  controls: BatchManifest["controls"],
): string {
  const source = registrySources.get(target.sourceId);
  if (!source) manifestError(`No existe la fuente ${target.sourceId} para reconstruir el cache de robots.`);
  const userAgent = source.collection?.userAgent?.trim() || "VivaInteligenciaBatch/1.0";
  const minIntervalMs = Math.max(controls.minIntervalMs, source.collection?.minIntervalMs ?? controls.minIntervalMs);
  return `${new URL(target.url).origin}\n${userAgent}\n${minIntervalMs}`;
}

function assertOptionalEnumArray(value: unknown, allowed: Set<string>, label: string): void {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !allowed.has(item))
    || new Set(value).size !== value.length) {
    manifestError(`${label} es inválido.`);
  }
}

function sameStringArray(left: string[] | undefined, right: string[]): boolean {
  return Array.isArray(left) && left.length === right.length && left.every((item, index) => item === right[index]);
}

function matchesManifestFilter(value: string | undefined, filters: string[]): boolean {
  if (filters.length === 0) return true;
  const normalized = normalizeManifestFilter(value ?? "");
  return filters.some((filter) => normalizeManifestFilter(filter) === normalized);
}

function normalizeManifestFilter(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLocaleLowerCase("es-PE");
}

function manifestAuditUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    manifestError(`El registro contiene una URL inválida: ${value}.`);
  }
  if (!url || !["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    manifestError(`El registro contiene una URL no pública: ${value}.`);
  }
  url.search = "";
  url.hash = "";
  try {
    if (containsPii(decodeURIComponent(url.pathname))) url.pathname = "/redacted-path";
  } catch {
    url.pathname = "/redacted-path";
  }
  return url.href;
}

function isPublicAuditUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol)
      && !url.username
      && !url.password
      && !url.search
      && !url.hash
      && url.href === value;
  } catch {
    return false;
  }
}

function cleanManifestLabel(value: string): string {
  const clean = value.replace(/[\r\n\t]/gu, " ").replace(/\s+/gu, " ").trim().slice(0, 160);
  return containsPii(clean) ? "redacted" : clean;
}

function targetKey(sourceId: string, url: string): string {
  return `${sourceId}\n${url}`;
}

function boundedManifestInteger(value: unknown, minimum: number, maximum: number): boolean {
  return Number.isInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}

function assertExactKeys(value: Record<string, unknown>, expected: readonly string[], message: string): void {
  const expectedSet = new Set(expected);
  const actual = Object.keys(value);
  if (actual.length !== expected.length || actual.some((key) => !expectedSet.has(key))) {
    throw new Error(message);
  }
}

function manifestError(message: string): never {
  throw new Error(`RECONCILIATION_WEB_MANIFEST_INVALID: ${message}`);
}

export function parseStagingDocument(raw: string): StagingDocument {
  const value = parseJsonObject(raw, "RECONCILIATION_WEB_STAGING_INVALID");
  assertExactKeys(value, [
    "schemaVersion",
    "runId",
    "generatedAt",
    "registryVersion",
    "mode",
    "sourceObservations",
  ], "RECONCILIATION_WEB_STAGING_INVALID: Contrato superior incompleto o desconocido.");
  if (!isObject(value)
    || value.schemaVersion !== "1.0.0"
    || typeof value.runId !== "string"
    || typeof value.generatedAt !== "string"
    || !Number.isFinite(Date.parse(value.generatedAt))
    || typeof value.registryVersion !== "string"
    || !["dry-run", "controlled-collection"].includes(String(value.mode))
    || !Array.isArray(value.sourceObservations)) {
    throw new Error("RECONCILIATION_WEB_STAGING_INVALID: El staging web no respeta el contrato 1.0.0.");
  }
  if (containsPii(JSON.stringify([value.runId, value.registryVersion]))) {
    throw new Error("RECONCILIATION_WEB_STAGING_INVALID: Los metadatos del staging contienen contacto.");
  }
  const observationIds = new Set<string>();
  const sourceIds = new Set<string>();
  for (const [groupIndex, group] of value.sourceObservations.entries()) {
    if (!isObject(group)
      || typeof group.sourceId !== "string"
      || !group.sourceId.trim()
      || typeof group.label !== "string"
      || typeof group.sourceClass !== "string"
      || !Array.isArray(group.observations)) {
      throw new Error(`RECONCILIATION_WEB_STAGING_INVALID: Grupo ${groupIndex} inválido.`);
    }
    assertExactKeys(group, ["sourceId", "label", "sourceClass", "observations"],
      `RECONCILIATION_WEB_STAGING_INVALID: Grupo ${groupIndex} contiene propiedades desconocidas.`);
    if (containsPii(JSON.stringify([group.sourceId, group.label, group.sourceClass]))) {
      throw new Error(`RECONCILIATION_WEB_STAGING_INVALID: Grupo ${groupIndex} contiene contacto.`);
    }
    if (sourceIds.has(group.sourceId)) {
      throw new Error(`RECONCILIATION_WEB_STAGING_INVALID: sourceId ${group.sourceId} repetido.`);
    }
    sourceIds.add(group.sourceId);
    for (const [observationIndex, observation] of group.observations.entries()) {
      assertObservation(observation, groupIndex, observationIndex);
      if (observation.sourceId !== group.sourceId) {
        throw new Error(
          `RECONCILIATION_WEB_STAGING_INVALID: La observación ${groupIndex}.${observationIndex} no pertenece al grupo.`,
        );
      }
      if (observationIds.has(observation.observationId)) {
        throw new Error(
          `RECONCILIATION_WEB_STAGING_INVALID: observationId ${observation.observationId} repetido.`,
        );
      }
      observationIds.add(observation.observationId);
    }
  }
  return value as unknown as StagingDocument;
}

export function assertObservation(value: unknown, groupIndex: number, observationIndex: number): asserts value is WebObservation {
  if (!isObject(value)
    || typeof value.observationId !== "string"
    || !value.observationId.trim()
    || typeof value.sourceId !== "string"
    || !value.sourceId.trim()
    || typeof value.sourceUrl !== "string"
    || typeof value.capturedAt !== "string"
    || !Number.isFinite(Date.parse(value.capturedAt))
    || !Array.isArray(value.fields)) {
    throw new Error(
      `RECONCILIATION_WEB_STAGING_INVALID: Observación ${groupIndex}.${observationIndex} inválida.`,
    );
  }
  const observationKeys = new Set([
    "observationId", "sourceId", "sourceUrl", "capturedAt", "contentSha256", "district", "agency",
    "projectExternalId", "expectedProjectName", "matchClass", "requiresHumanReview", "fields", "extraction",
  ]);
  const requiredObservationKeys = [
    "observationId", "sourceId", "sourceUrl", "capturedAt", "contentSha256", "fields",
  ];
  if (Object.keys(value).some((key) => !observationKeys.has(key))
    || requiredObservationKeys.some((key) => !Object.hasOwn(value, key))) {
    throw new Error(
      `RECONCILIATION_WEB_STAGING_INVALID: Observación ${groupIndex}.${observationIndex} contiene propiedades desconocidas.`,
    );
  }
  if (!/^[a-f0-9]{64}$/u.test(String(value.contentSha256 ?? ""))) {
    throw new Error(`RECONCILIATION_WEB_STAGING_INVALID: Huella ${groupIndex}.${observationIndex} inválida.`);
  }
  if (!/^[a-f0-9]{64}$/u.test(value.observationId)) {
    throw new Error(`RECONCILIATION_WEB_STAGING_INVALID: observationId ${groupIndex}.${observationIndex} no es SHA-256.`);
  }
  let sourceUrl: URL;
  try {
    sourceUrl = new URL(value.sourceUrl);
  } catch {
    throw new Error(`RECONCILIATION_WEB_STAGING_INVALID: URL ${groupIndex}.${observationIndex} inválida.`);
  }
  if (!["http:", "https:"].includes(sourceUrl.protocol) || sourceUrl.username || sourceUrl.password) {
    throw new Error(`RECONCILIATION_WEB_STAGING_INVALID: URL ${groupIndex}.${observationIndex} inválida.`);
  }
  if (sourceUrl.search || sourceUrl.hash || sourceUrl.href !== value.sourceUrl) {
    throw new Error(`RECONCILIATION_WEB_STAGING_INVALID: URL auditada ${groupIndex}.${observationIndex} no está normalizada.`);
  }
  const optionalStrings = ["district", "agency", "projectExternalId", "expectedProjectName"] as const;
  for (const field of optionalStrings) {
    if (value[field] !== undefined && (typeof value[field] !== "string" || !value[field].trim())) {
      throw new Error(
        `RECONCILIATION_WEB_STAGING_INVALID: ${field} ${groupIndex}.${observationIndex} inválido.`,
      );
    }
  }
  if (value.matchClass !== undefined
    && !["match_high", "match_medium", "match_low", "unmatched_web"].includes(String(value.matchClass))) {
    throw new Error(`RECONCILIATION_WEB_STAGING_INVALID: matchClass ${groupIndex}.${observationIndex} inválido.`);
  }
  if (value.requiresHumanReview !== undefined && typeof value.requiresHumanReview !== "boolean") {
    throw new Error(
      `RECONCILIATION_WEB_STAGING_INVALID: requiresHumanReview ${groupIndex}.${observationIndex} inválido.`,
    );
  }
  if (value.matchClass !== undefined
    && value.matchClass !== "match_high"
    && value.requiresHumanReview === false) {
    throw new Error(
      `RECONCILIATION_WEB_STAGING_INVALID: revisión humana omitida para ${value.matchClass}.`,
    );
  }
  if (containsPii(JSON.stringify([
    value.sourceId,
    value.sourceUrl,
    ...optionalStrings.map((field) => value[field]),
  ]))) {
    throw new Error(`RECONCILIATION_WEB_STAGING_INVALID: Observación ${groupIndex}.${observationIndex} contiene contacto.`);
  }
  const fieldNames = new Set<string>();
  for (const [fieldIndex, field] of value.fields.entries()) {
    if (!isObject(field)
      || !ALLOWED_FIELDS.has(String(field.field))
      || !isObservationValue(field.originalValue)
      || !isObservationValue(field.normalizedValue)
      || typeof field.locator !== "string"
      || !ALLOWED_CONFIDENCE.has(String(field.confidence))
      || field.reviewStatus !== "unreviewed") {
      throw new Error(
        `RECONCILIATION_WEB_STAGING_INVALID: Campo ${groupIndex}.${observationIndex}.${fieldIndex} inválido.`,
      );
    }
    const fieldKeys = new Set(["field", "originalValue", "normalizedValue", "unit", "locator", "confidence", "reviewStatus"]);
    const requiredFieldKeys = ["field", "originalValue", "normalizedValue", "locator", "confidence", "reviewStatus"];
    if (Object.keys(field).some((key) => !fieldKeys.has(key))
      || requiredFieldKeys.some((key) => !Object.hasOwn(field, key))) {
      throw new Error(
        `RECONCILIATION_WEB_STAGING_INVALID: Campo ${groupIndex}.${observationIndex}.${fieldIndex} contiene propiedades desconocidas.`,
      );
    }
    if (fieldNames.has(String(field.field))) {
      throw new Error(
        `RECONCILIATION_WEB_STAGING_INVALID: Campo ${field.field} repetido en ${groupIndex}.${observationIndex}.`,
      );
    }
    fieldNames.add(String(field.field));
    if (field.unit !== undefined && (typeof field.unit !== "string" || !field.unit.trim())) {
      throw new Error(
        `RECONCILIATION_WEB_STAGING_INVALID: Unidad ${groupIndex}.${observationIndex}.${fieldIndex} inválida.`,
      );
    }
    if (containsPii(JSON.stringify([
      field.originalValue,
      field.normalizedValue,
      field.locator,
      field.unit,
    ]))) {
      throw new Error(
        `RECONCILIATION_WEB_STAGING_INVALID: Campo ${groupIndex}.${observationIndex}.${fieldIndex} contiene contacto.`,
      );
    }
  }
  if (value.extraction !== undefined) {
    if (!isObject(value.extraction)
      || Object.keys(value.extraction).length !== 2
      || !Object.hasOwn(value.extraction, "attempts")
      || !Object.hasOwn(value.extraction, "issueCodes")
      || !Array.isArray(value.extraction.attempts)
      || !Array.isArray(value.extraction.issueCodes)
      || value.extraction.issueCodes.some((item) => !ALLOWED_EXTRACTION_ISSUES.has(String(item)))
      || new Set(value.extraction.issueCodes).size !== value.extraction.issueCodes.length
      || value.extraction.attempts.some((attempt) => !isExtractorAttempt(attempt))
      || containsPii(JSON.stringify(value.extraction))) {
      throw new Error(
        `RECONCILIATION_WEB_STAGING_INVALID: Auditoría de extracción ${groupIndex}.${observationIndex} inválida.`,
      );
    }
  }
}

function isExtractorAttempt(value: unknown): boolean {
  if (!isObject(value)) return false;
  const allowedKeys = new Set([
    "extractorId",
    "archetype",
    "applicable",
    "candidateFields",
    "acceptedFields",
    "issueCodes",
  ]);
  return Object.keys(value).every((key) => allowedKeys.has(key))
    && typeof value.extractorId === "string"
    && Boolean(value.extractorId.trim())
    && ALLOWED_EXTRACTION_ARCHETYPES.has(String(value.archetype))
    && typeof value.applicable === "boolean"
    && Number.isInteger(value.candidateFields)
    && Number(value.candidateFields) >= 0
    && Number.isInteger(value.acceptedFields)
    && Number(value.acceptedFields) >= 0
    && Array.isArray(value.issueCodes)
    && value.issueCodes.every((item) => ALLOWED_EXTRACTION_ISSUES.has(String(item)));
}

function isObservationValue(value: unknown): boolean {
  return typeof value === "string"
    || (typeof value === "number" && Number.isFinite(value))
    || (Array.isArray(value) && value.every((item) => typeof item === "string"));
}

function parseAgencyAliases(raw: string): Record<string, string> {
  const value = JSON.parse(raw) as unknown;
  if (!isObject(value) || !Array.isArray(value.aliases)) {
    throw new Error("RECONCILIATION_ALIAS_CATALOG_INVALID: El catálogo no contiene aliases.");
  }
  const result: Record<string, string> = {};
  for (const [index, item] of value.aliases.entries()) {
    if (!isObject(item)
      || item.status !== "confirmed_duplicate_identity"
      || typeof item.canonicalName !== "string"
      || !Array.isArray(item.aliases)
      || item.aliases.some((alias) => typeof alias !== "string")) {
      throw new Error(`RECONCILIATION_ALIAS_CATALOG_INVALID: Alias ${index} no está confirmado.`);
    }
    for (const alias of item.aliases as string[]) {
      const previous = result[alias];
      if (previous && previous !== item.canonicalName) {
        throw new Error(`RECONCILIATION_ALIAS_CATALOG_INVALID: ${alias} tiene dos identidades.`);
      }
      result[alias] = item.canonicalName;
    }
  }
  return result;
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  return Boolean(entry) && path.resolve(entry!) === path.resolve(fileURLToPath(import.meta.url));
}

function manifestRegistryReference(raw: string): string {
  const value = parseJsonObject(raw, "RECONCILIATION_WEB_MANIFEST_INVALID");
  if (typeof value.registryReference !== "string" || !isSafeRegistryReference(value.registryReference)) {
    manifestError("registryReference debe apuntar al registro versionado dentro de data/source/ingestion.");
  }
  return value.registryReference;
}

function resolveRegistryReference(value: string): string {
  if (!isSafeRegistryReference(value)) {
    manifestError("registryReference debe apuntar al registro versionado dentro de data/source/ingestion.");
  }
  const normalized = value.replaceAll("\\", "/");
  const ingestionRoot = path.resolve(root, "data/source/ingestion");
  const resolved = path.resolve(root, normalized);
  const relative = path.relative(ingestionRoot, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    manifestError("registryReference queda fuera de data/source/ingestion.");
  }
  return resolved;
}

function isSafeRegistryReference(value: string): boolean {
  const normalized = value.replaceAll("\\", "/");
  return Boolean(normalized)
    && normalized === value
    && !path.isAbsolute(value)
    && !normalized.includes(":")
    && !normalized.split("/").includes("..")
    && normalized.startsWith("data/source/ingestion/")
    && normalized.endsWith(".json");
}

function parseJsonObject(raw: string, code: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    throw new Error(`${code}: JSON inválido.`);
  }
  if (!isObject(value)) throw new Error(`${code}: Se esperaba un objeto JSON.`);
  return value;
}

function parseArguments(values: string[]): Map<string, string> {
  const args = values.filter((value) => value !== "--");
  const result = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith("--") || !value || value.startsWith("--")) {
      throw new Error(
        "RECONCILIATION_ARGUMENT_INVALID: Uso: npm run ingestion:official-webs:reconcile -- "
        + "[--nexo <csv>] [--web <staging.json>] [--manifest <manifest.json>] "
        + "[--catalog <catalog.json>] [--output <staging.json>]",
      );
    }
    const normalizedKey = key.slice(2);
    if (!["nexo", "web", "manifest", "catalog", "output"].includes(normalizedKey) || result.has(normalizedKey)) {
      throw new Error(`RECONCILIATION_ARGUMENT_INVALID: Opción inválida o repetida ${key}.`);
    }
    result.set(normalizedKey, value);
  }
  return result;
}

function resolveFromRoot(value: string): string {
  return path.isAbsolute(value) ? path.resolve(value) : path.resolve(root, value);
}

function relativeReference(value: string): string {
  const relative = path.relative(root, value).replaceAll("\\", "/");
  return relative.startsWith("../") || path.isAbsolute(relative) ? path.basename(value) : relative;
}

function assertStagingPath(value: string): void {
  const staging = path.resolve(root, "data/staging");
  const relative = path.relative(staging, value);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("RECONCILIATION_OUTPUT_INVALID: --output debe quedar dentro de data/staging.");
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
