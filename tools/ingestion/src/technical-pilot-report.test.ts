import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  readSourceRegistry,
  runOfficialWebBatch,
  type BatchManifest,
} from "./official-web-refresh.js";
import type { ReconciliationDocument } from "./reconcile-observations.js";
import {
  buildTechnicalPilotReport,
  parseTechnicalPilotArtifacts,
  parseTechnicalPilotDefinition,
} from "./technical-pilot-report.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const registryPath = path.join(root, "data/source/ingestion/pilots/wave-1-demo-feasibility.json");

test("el registro aislado habilita solo dos targets de piloto y conserva bloqueada la publicación", async () => {
  const raw = await readFile(registryPath, "utf8");
  const [definition, registry] = await Promise.all([
    Promise.resolve(parseTechnicalPilotDefinition(raw)),
    readSourceRegistry(registryPath),
  ]);

  assert.equal(definition.pilot.publishable, false);
  assert.equal(definition.pilot.rawHtmlStored, false);
  assert.equal(definition.pilot.piiStored, false);
  assert.equal(definition.pilot.maximumRunsPerTarget, 2);
  assert.deepEqual(definition.pilot.runPlan, [
    { sequence: 1, phase: "calibration" },
    { sequence: 2, phase: "validation" },
  ]);
  assert.match(definition.pilot.authorizationScopeNote, /solo esta prueba técnica no publicable/u);
  assert.equal(registry.sources.length, 2);
  assert.deepEqual(registry.sources.map(({ sourceId }) => sourceId).sort(), [
    "cantabria-official-website",
    "toratto-official-website",
  ]);
  assert.ok(registry.sources.every((source) => source.reviewStatus === "pending"));
  assert.ok(registry.sources.every((source) => source.collection?.targets?.length === 0));
  assert.ok(registry.sources.every((source) => source.pilotAuthorization?.reference === definition.pilot.authorizationReference));
});

test("rechaza ampliar o alterar las dos pasadas autorizadas del piloto", async () => {
  const raw = await readFile(registryPath, "utf8");
  const wrongBudget = JSON.parse(raw) as Record<string, any>;
  wrongBudget.pilot.maximumRunsPerTarget = 3;
  assert.throws(() => parseTechnicalPilotDefinition(jsonText(wrongBudget)), /controles del piloto/u);

  const wrongOrder = JSON.parse(raw) as Record<string, any>;
  wrongOrder.pilot.runPlan.reverse();
  assert.throws(() => parseTechnicalPilotDefinition(jsonText(wrongOrder)), /controles del piloto/u);

  const expandedScope = JSON.parse(raw) as Record<string, any>;
  expandedScope.pilot.authorizationScopeNote = "Autorización general";
  assert.throws(() => parseTechnicalPilotDefinition(jsonText(expandedScope)), /controles del piloto/u);
});

test("el reporte demuestra comparación sin atribuir el precio de una campaña vencida", async () => {
  const definition = parseTechnicalPilotDefinition(await readFile(registryPath, "utf8"));
  const report = buildTechnicalPilotReport(definition, manifest(), reconciliation());

  assert.equal(report.result, "feasible");
  assert.equal(report.publishable, false);
  assert.equal(report.rawHtmlStored, false);
  assert.equal(report.piiStored, false);
  assert.deepEqual(report.reconciliation.reportedComparisons.map(({ field }) => field), ["project_name", "area"]);
  assert.deepEqual(report.reconciliation.suppressedFindings, [{
    field: "published_price",
    reason: "EXPIRED_CAMPAIGN_NOT_CURRENT_PRICE",
    observedComparisonStatus: "different",
  }]);
  assert.doesNotMatch(JSON.stringify(report.reconciliation.reportedComparisons), /580000|600000/u);
  assert.match(report.sha256, /^[a-f0-9]{64}$/u);
});

test("valida directamente los artefactos del collector piloto sin abrir la ruta productiva", async () => {
  const raw = await readFile(registryPath, "utf8");
  const definition = parseTechnicalPilotDefinition(raw);
  const registry = await readSourceRegistry(registryPath);
  const result = await runOfficialWebBatch({
    registry,
    registryReference: "data/source/ingestion/pilots/wave-1-demo-feasibility.json",
    dryRun: false,
    filters: { sourceIds: ["cantabria-official-website"] },
    concurrency: 2,
    runId: "pilot-artifact-test",
    pilot: {
      productOwnerAuthorizationReference: "USER-DEMO-FEASIBILITY-2026-09-09",
      targetUrl: "https://cantabriainmobiliaria.pe/landing-versia/",
    },
  }, {
    now: () => new Date("2026-09-09T12:00:00.000Z"),
    sleep: async () => undefined,
    fetchImpl: (async (input: URL | RequestInfo) => String(input).endsWith("/robots.txt")
      ? new Response("User-agent: *\nAllow: /", { status: 200, headers: { "content-type": "text/plain" } })
      : new Response("<title>VERSIA</title>", { status: 200, headers: { "content-type": "text/html" } })) as typeof fetch,
  });
  const stagingRaw = jsonText(result.staging);
  const manifestRaw = jsonText(result.manifest);
  const artifacts = parseTechnicalPilotArtifacts(definition, stagingRaw, manifestRaw);

  assert.equal(artifacts.staging.mode, "technical-pilot");
  assert.equal(artifacts.manifest.publishable, false);
  assert.equal(artifacts.manifest.controls.concurrency, 2);
  assert.equal(artifacts.manifest.counts.networkRequests, 2);
  assert.doesNotMatch(stagingRaw, /<title>/u, "el HTML crudo nunca se almacena");

  const excessiveConcurrency = structuredClone(result.manifest);
  excessiveConcurrency.controls.concurrency = 3;
  assert.throws(
    () => parseTechnicalPilotArtifacts(definition, stagingRaw, jsonText(excessiveConcurrency)),
    /manifiesto no coincide|debilitó controles/u,
  );

  const expandedTargets = structuredClone(result.manifest);
  expandedTargets.targets.push(structuredClone(expandedTargets.targets[0]!));
  assert.throws(
    () => parseTechnicalPilotArtifacts(definition, stagingRaw, jsonText(expandedTargets)),
    /manifiesto no coincide|debilitó controles/u,
  );

  const unsafe = structuredClone(result.staging) as unknown as Record<string, any>;
  unsafe.sourceObservations[0].observations[0].rawHtml = "<title>VERSIA</title>";
  assert.throws(
    () => parseTechnicalPilotArtifacts(definition, jsonText(unsafe), manifestRaw),
    /propiedades desconocidas|claves desconocidas|manifiesto no coincide/u,
  );
});

test("rechaza un manifiesto publicable o una corrida distinta", async () => {
  const definition = parseTechnicalPilotDefinition(await readFile(registryPath, "utf8"));
  const wrongMode = structuredClone(manifest());
  wrongMode.mode = "controlled-collection";
  assert.throws(
    () => buildTechnicalPilotReport(definition, wrongMode, reconciliation()),
    /no pertenece a un piloto no publicable/u,
  );

  const wrongRun = reconciliation();
  wrongRun.sourceRunId = "another-run";
  assert.throws(
    () => buildTechnicalPilotReport(definition, manifest(), wrongRun),
    /corridas distintas/u,
  );
});

test("rechaza contacto aunque llegue dentro de un valor aparentemente permitido", async () => {
  const definition = parseTechnicalPilotDefinition(await readFile(registryPath, "utf8"));
  const unsafe = reconciliation();
  unsafe.reconciliations[0]!.comparisons[1]!.officialWeb!.originalValue = "ventas@example.test";

  assert.throws(
    () => buildTechnicalPilotReport(definition, manifest(), unsafe),
    /contiene datos de contacto/u,
  );
});

function manifest(): BatchManifest {
  return {
    manifestVersion: "pilot-1.0.0",
    runId: "pilot-versia-001",
    generatedAt: "2026-09-09T12:00:00.000Z",
    registryReference: "data/source/ingestion/pilots/wave-1-demo-feasibility.json",
    registrySha256: "a".repeat(64),
    registryVersion: "pilot-wave-1-demo-feasibility-1.0.0",
    mode: "technical-pilot",
    publishable: false,
    pilotAuthorizationReference: "USER-DEMO-FEASIBILITY-2026-09-09",
    filters: {
      districts: [],
      agencies: [],
      sourceIds: ["cantabria-official-website"],
    },
    controls: {
      policyGateBeforeNetwork: true,
      robotsEnforced: true,
      retries: 0,
      concurrency: 1,
      timeoutMs: 10000,
      minIntervalMs: 1500,
      maxResponseBytes: 780000,
    },
    counts: {
      selectedSources: 1,
      selectedTargets: 1,
      eligibleTargets: 1,
      policyBlockedTargets: 0,
      plannedTargets: 0,
      collectedTargets: 1,
      robotsBlockedTargets: 0,
      failedTargets: 0,
      networkRequests: 2,
      redirectsFollowed: 0,
      observations: 1,
      observationFields: 3,
      extractionIssues: 0,
    },
    sources: [{
      sourceId: "cantabria-official-website",
      decision: {
        allowed: true,
        code: "PILOT_COLLECTION_ALLOWED",
        reason: "Piloto técnico puntual autorizado; su salida no es publicable.",
      },
      selectedTargets: 1,
    }],
    targets: [{
      sourceId: "cantabria-official-website",
      url: "https://cantabriainmobiliaria.pe/landing-versia/",
      district: "Miraflores",
      agency: "CANTABRIA",
      projectExternalId: "3981",
      expectedProjectName: "VERSIA",
      matchClass: "match_high",
      requiresHumanReview: false,
      status: "collected",
      code: "COLLECTED",
      httpStatus: 200,
      contentSha256: "b".repeat(64),
      fieldCount: 3,
      extractorArchetypes: ["html"],
      extractionIssueCodes: [],
    }],
    stagingSha256: "c".repeat(64),
  };
}

function reconciliation(): ReconciliationDocument {
  return {
    schemaVersion: "1.0.0",
    generatedAt: "2026-09-09T12:00:00.000Z",
    sourceRunId: "pilot-versia-001",
    counts: {
      nexoProjects: 714,
      webObservations: 1,
      autoMatched: 1,
      reviewRequired: 0,
      unmatched: 0,
      reconciled: 1,
      differences: 1,
    },
    matches: [{
      observationId: "d".repeat(64),
      sourceId: "cantabria-official-website",
      sourceUrl: "https://cantabriainmobiliaria.pe/landing-versia/",
      status: "auto_matched",
      matchedProjectId: "3981",
      reasonCodes: ["HIGH_CONFIDENCE_ID_NAME_AGENCY"],
      candidates: [],
    }],
    reconciliations: [{
      projectId: "3981",
      observationId: "d".repeat(64),
      sourceId: "cantabria-official-website",
      sourceUrl: "https://cantabriainmobiliaria.pe/landing-versia/",
      capturedAt: "2026-09-09T12:00:00.000Z",
      contentSha256: "b".repeat(64),
      comparisons: [
        {
          field: "project_name",
          status: "same",
          nexo: { source: "nexo", originalValue: "VERSIA", normalizedValue: "versia" },
          officialWeb: { source: "official_web", originalValue: "VERSIA", normalizedValue: "versia" },
        },
        {
          field: "area",
          status: "same",
          nexo: { source: "nexo", originalValue: "60", normalizedValue: 60, unit: "m2" },
          officialWeb: { source: "official_web", originalValue: 60, normalizedValue: 60, unit: "m2" },
        },
        {
          field: "published_price",
          status: "different",
          nexo: { source: "nexo", originalValue: "600000", normalizedValue: 600000, unit: "PEN" },
          officialWeb: { source: "official_web", originalValue: 580000, normalizedValue: 580000, unit: "PEN" },
        },
      ],
    }],
    sha256: "e".repeat(64),
  };
}

function jsonText(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
