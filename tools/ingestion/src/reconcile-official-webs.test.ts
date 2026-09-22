import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  canonicalJsonSha256,
  runOfficialWebBatch,
  type BatchManifest,
  type BatchResult,
  type RegistrySource,
  type SourceRegistry,
} from "./official-web-refresh.js";
import { parseManifestDocument, parseStagingDocument } from "./reconcile-official-webs.js";

const generatedAt = "2026-09-08T18:00:00.000Z";

test("acepta un manifiesto producido por el colector y ligado al registro vigente", async () => {
  const { registry, result, stagingRaw, manifestRaw } = await collectedFixture();
  const staging = parseStagingDocument(stagingRaw);

  const manifest = parseManifestDocument(manifestRaw, staging, stagingRaw, registry);

  assert.equal(manifest.sources[0]?.decision.code, "COLLECTION_ALLOWED");
  assert.equal(manifest.targets[0]?.status, "collected");
  assert.equal(manifest.counts.networkRequests, 2);
  assert.equal(manifest.counts.redirectsFollowed, 0);
});

test("acepta un lote legítimo con redirección y separa solicitudes iniciales de saltos", async () => {
  const fixture = await collectedFixture({ redirectProject: true });
  const manifest = parseManifestDocument(
    fixture.manifestRaw,
    parseStagingDocument(fixture.stagingRaw),
    fixture.stagingRaw,
    fixture.registry,
  );

  assert.equal(manifest.counts.networkRequests, 3);
  assert.equal(manifest.counts.redirectsFollowed, 1);
  assert.equal(manifest.counts.networkRequests - manifest.counts.redirectsFollowed, 2);
});

test("acepta el dry-run fail-closed de una fuente todavía no autorizada", async () => {
  const source: RegistrySource = {
    sourceId: "pending-agency",
    label: "Inmobiliaria pendiente",
    sourceClass: "official_project_website",
    officialDomainConfirmed: true,
    reviewStatus: "pending",
    robotsStatus: "unknown",
    collection: {
      targets: [{ url: "https://pending.example/proyecto" }],
      allowedHosts: ["pending.example"],
    },
  };
  const registry: SourceRegistry = { registryVersion: "test-pending-1", sources: [source] };
  const result = await runOfficialWebBatch({
    registry,
    registryReference: "data/source/ingestion/source-registry.json",
    dryRun: true,
    runId: "pending-dry-run",
  }, { now: () => new Date(generatedAt) });
  const stagingRaw = jsonText(result.staging);

  const manifest = parseManifestDocument(jsonText(result.manifest), result.staging, stagingRaw, registry);

  assert.equal(manifest.targets[0]?.status, "policy_blocked");
  assert.equal(manifest.counts.networkRequests, 0);
  assert.equal(manifest.counts.observations, 0);
});

test("rechaza controles fail-closed ausentes o debilitados", async (context) => {
  const fixture = await collectedFixture();
  const mutations: Array<[string, (manifest: Record<string, any>) => void]> = [
    ["sin controls", (manifest) => { delete manifest.controls; }],
    ["policy después de red", (manifest) => { manifest.controls.policyGateBeforeNetwork = false; }],
    ["robots no exigido", (manifest) => { manifest.controls.robotsEnforced = false; }],
    ["con reintentos", (manifest) => { manifest.controls.retries = 1; }],
  ];
  for (const [name, mutate] of mutations) {
    await context.test(name, () => {
      const manifest = cloneManifest(fixture.result.manifest);
      mutate(manifest);
      assertManifestRejected(manifest, fixture);
    });
  }
});

test("rechaza datos de contacto en cualquiera de los filtros del manifiesto", async (context) => {
  const fixture = await collectedFixture();
  const cases: Array<["sourceIds" | "districts" | "agencies", string]> = [
    ["sourceIds", "ventas@example.com"],
    ["districts", "+51 999 111 222"],
    ["agencies", "TELÉFONO：１２３"],
  ];
  for (const [filter, value] of cases) {
    await context.test(filter, () => {
      const manifest = cloneManifest(fixture.result.manifest);
      manifest.filters[filter] = [value];
      assertManifestRejected(manifest, fixture);
    });
  }
});

test("rechaza un contrato incompleto, extensiones artesanales y referencias de registro inseguras", async (context) => {
  const fixture = await collectedFixture();
  for (const field of ["registryReference", "registrySha256", "controls", "counts", "sources", "targets"] as const) {
    await context.test(`falta ${field}`, () => {
      const manifest = cloneManifest(fixture.result.manifest);
      delete manifest[field];
      assertManifestRejected(manifest, fixture);
    });
  }
  await context.test("campo artesanal", () => {
    const manifest = cloneManifest(fixture.result.manifest);
    manifest.manualApproval = true;
    assertManifestRejected(manifest, fixture);
  });
  await context.test("registryReference fuera de ingestion", () => {
    const manifest = cloneManifest(fixture.result.manifest);
    manifest.registryReference = "../../registro-manual.json";
    assertManifestRejected(manifest, fixture);
  });
});

test("recomputa todos los conteos observables y acota los no reconstruibles", async (context) => {
  const fixture = await collectedFixture();
  const countNames = [
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
  for (const name of countNames) {
    await context.test(name, () => {
      const manifest = cloneManifest(fixture.result.manifest);
      manifest.counts[name] += 1;
      assertManifestRejected(manifest, fixture);
    });
  }
});

test("liga el manifiesto al contenido exacto del registro y revalida allowedHosts", async (context) => {
  const fixture = await collectedFixture();
  await context.test("SHA de registro alterado", () => {
    const manifest = cloneManifest(fixture.result.manifest);
    manifest.registrySha256 = "b".repeat(64);
    assertManifestRejected(manifest, fixture);
  });
  await context.test("target fuera del allowlist vigente", () => {
    const registry = structuredClone(fixture.registry);
    registry.sources[0]!.collection!.allowedHosts = ["other.example"];
    const manifest = cloneManifest(fixture.result.manifest);
    manifest.registrySha256 = canonicalJsonSha256(registry);
    assert.throws(
      () => parseManifestDocument(jsonText(manifest), fixture.result.staging, fixture.stagingRaw, registry),
      /allowedHosts vigente/u,
    );
  });
});

test("staging usa claves exactas y rechaza PII o propiedades artesanales en cada nivel", async (context) => {
  const fixture = await collectedFixture();
  const mutations: Array<[string, (staging: Record<string, any>) => void]> = [
    ["nivel superior", (staging) => { staging.manualEvidence = true; }],
    ["grupo", (staging) => { staging.sourceObservations[0].operatorNote = "manual"; }],
    ["observación", (staging) => { staging.sourceObservations[0].observations[0].rawHtml = "manual"; }],
    ["extracción", (staging) => { staging.sourceObservations[0].observations[0].extraction.raw = "manual"; }],
    ["campo", (staging) => { staging.sourceObservations[0].observations[0].fields[0].approved = true; }],
    ["email usado como observationId", (staging) => {
      staging.sourceObservations[0].observations[0].observationId = "ventas@example.com";
    }],
    ["email en originalValue", (staging) => {
      staging.sourceObservations[0].observations[0].fields[0].originalValue = "ventas@example.com";
    }],
    ["móvil peruano en normalizedValue", (staging) => {
      staging.sourceObservations[0].observations[0].fields[0].normalizedValue = "+51 999 111 222";
    }],
    ["contacto etiquetado en locator", (staging) => {
      staging.sourceObservations[0].observations[0].fields[0].locator = "tel: 123";
    }],
    ["WhatsApp Unicode en unit", (staging) => {
      staging.sourceObservations[0].observations[0].fields[0].unit = "ＷｈａｔｓＡｐｐ：１２３";
    }],
    ["contacto Unicode en metadato de extracción", (staging) => {
      staging.sourceObservations[0].observations[0].extraction.attempts[0].extractorId = "contacto：１２３";
    }],
    ["teléfono Unicode en etiqueta", (staging) => {
      staging.sourceObservations[0].label = "TELÉFONO：＋５１ １２３";
    }],
    ["contacto en metadato de observación", (staging) => {
      staging.sourceObservations[0].observations[0].agency = "teléfono: 123";
    }],
  ];
  for (const [name, mutate] of mutations) {
    await context.test(name, () => {
      const staging = structuredClone(fixture.result.staging) as unknown as Record<string, any>;
      mutate(staging);
      assert.throws(() => parseStagingDocument(jsonText(staging)), /RECONCILIATION_WEB_STAGING_INVALID/u);
    });
  }
});

test("rechaza una decisión COLLECTION_ALLOWED fabricada o distinta al registro", async () => {
  const fixture = await collectedFixture();
  const manifest = cloneManifest(fixture.result.manifest);
  manifest.sources[0].decision = {
    allowed: false,
    code: "LEGAL_REVIEW_REQUIRED",
    reason: "Decisión escrita manualmente.",
  };

  assertManifestRejected(manifest, fixture);
});

test("rechaza targets ajenos al registro y observaciones sin correspondencia uno-a-uno", async (context) => {
  const fixture = await collectedFixture();
  await context.test("target no registrado", () => {
    const manifest = cloneManifest(fixture.result.manifest);
    manifest.targets[0].url = "https://agency.example/proyecto-inventado";
    assertManifestRejected(manifest, fixture);
  });
  await context.test("target duplicado", () => {
    const manifest = cloneManifest(fixture.result.manifest);
    manifest.targets.push(structuredClone(manifest.targets[0]));
    manifest.counts.selectedTargets += 1;
    assertManifestRejected(manifest, fixture);
  });
  await context.test("observación apunta a otra URL", () => {
    const staging = structuredClone(fixture.result.staging);
    staging.sourceObservations[0]!.observations[0]!.sourceUrl = "https://agency.example/otro-proyecto";
    const stagingRaw = jsonText(staging);
    const manifest = cloneManifest(fixture.result.manifest);
    manifest.stagingSha256 = sha256(stagingRaw);
    assert.throws(
      () => parseManifestDocument(jsonText(manifest), parseStagingDocument(stagingRaw), stagingRaw, fixture.registry),
      /RECONCILIATION_WEB_MANIFEST_INVALID/u,
    );
  });
  await context.test("observationId SHA-256 no corresponde a la evidencia", () => {
    const staging = structuredClone(fixture.result.staging);
    staging.sourceObservations[0]!.observations[0]!.observationId = "b".repeat(64);
    const stagingRaw = jsonText(staging);
    const manifest = cloneManifest(fixture.result.manifest);
    manifest.stagingSha256 = sha256(stagingRaw);
    assert.throws(
      () => parseManifestDocument(jsonText(manifest), parseStagingDocument(stagingRaw), stagingRaw, fixture.registry),
      /observationId no corresponde/u,
    );
  });
});

test("rechaza recolección declarada para una fuente bloqueada aunque tenga checksum válido", async () => {
  const source: RegistrySource = {
    sourceId: "blocked-agency",
    label: "Inmobiliaria bloqueada",
    sourceClass: "official_project_website",
    officialDomainConfirmed: true,
    reviewStatus: "pending",
    robotsStatus: "unknown",
    collection: {
      targets: [{ url: "https://blocked.example/proyecto" }],
      allowedHosts: ["blocked.example"],
    },
  };
  const registry: SourceRegistry = { registryVersion: "test-blocked-1", sources: [source] };
  const result = await runOfficialWebBatch({
    registry,
    registryReference: "data/source/ingestion/source-registry.json",
    dryRun: true,
    runId: "blocked-artifact",
  }, { now: () => new Date(generatedAt) });
  const stagingRaw = jsonText(result.staging);
  const manifest = cloneManifest(result.manifest);
  manifest.targets[0].status = "collected_empty";
  manifest.targets[0].code = "NO_STRUCTURED_FIELDS";
  manifest.targets[0].httpStatus = 200;
  manifest.targets[0].contentSha256 = "a".repeat(64);
  manifest.targets[0].extractorArchetypes = [];
  manifest.targets[0].extractionIssueCodes = [];
  manifest.counts.policyBlockedTargets = 0;
  manifest.counts.collectedTargets = 1;
  manifest.counts.networkRequests = 2;

  assert.throws(
    () => parseManifestDocument(jsonText(manifest), result.staging, stagingRaw, registry),
    /RECONCILIATION_WEB_MANIFEST_INVALID/u,
  );
});

async function collectedFixture(options: { redirectProject?: boolean } = {}): Promise<{
  registry: SourceRegistry;
  result: BatchResult;
  stagingRaw: string;
  manifestRaw: string;
}> {
  const source: RegistrySource = {
    sourceId: "agency-official",
    label: "Inmobiliaria Oficial",
    sourceClass: "official_project_website",
    officialDomainConfirmed: true,
    reviewStatus: "approved",
    robotsStatus: "allow",
    authorizationReference: "LEGAL-TEST-001",
    collection: {
      targets: [{
        url: "https://agency.example/proyectos/residencial-uno",
        district: "Miraflores",
        agency: "Inmobiliaria Oficial",
        projectExternalId: "NEXO-1",
        projectName: "Residencial Uno",
        matchClass: "match_high",
        requiresHumanReview: false,
      }],
      allowedHosts: ["agency.example"],
      extractorArchetypes: ["json_ld", "html"],
      minIntervalMs: 0,
    },
  };
  const registry: SourceRegistry = { registryVersion: "test-manifest-1", sources: [source] };
  const html = `<script type="application/ld+json">${JSON.stringify({
    "@type": "ApartmentComplex",
    name: "Residencial Uno",
    brand: { name: "Inmobiliaria Oficial" },
    offers: { price: "500000", priceCurrency: "PEN" },
  })}</script>`;
  const fetchImpl = (async (input: URL | RequestInfo) => {
    const url = String(input);
    if (url.endsWith("/robots.txt")) {
      return new Response("User-agent: *\nAllow: /", { status: 200, headers: { "content-type": "text/plain" } });
    }
    if (options.redirectProject && url.endsWith("/proyectos/residencial-uno")) {
      return new Response(null, { status: 302, headers: { location: "/proyectos/residencial-uno-canonical" } });
    }
    return new Response(html, { status: 200, headers: { "content-type": "text/html" } });
  }) as typeof fetch;
  const result = await runOfficialWebBatch({
    registry,
    registryReference: "data/source/ingestion/source-registry.json",
    dryRun: false,
    minIntervalMs: 0,
    runId: "manifest-valid-001",
  }, { fetchImpl, now: () => new Date(generatedAt), sleep: async () => undefined });
  const stagingRaw = jsonText(result.staging);
  return { registry, result, stagingRaw, manifestRaw: jsonText(result.manifest) };
}

function cloneManifest(manifest: BatchManifest): Record<string, any> {
  return structuredClone(manifest) as unknown as Record<string, any>;
}

function assertManifestRejected(manifest: Record<string, any>, fixture: Awaited<ReturnType<typeof collectedFixture>>): void {
  assert.throws(
    () => parseManifestDocument(jsonText(manifest), fixture.result.staging, fixture.stagingRaw, fixture.registry),
    /RECONCILIATION_WEB_MANIFEST_INVALID/u,
  );
}

function jsonText(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
