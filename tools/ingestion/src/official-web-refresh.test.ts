import assert from "node:assert/strict";
import test from "node:test";
import {
  compileRobotsRules,
  extractStructuredObservations,
  runOfficialWebBatch,
  type CollectionTarget,
  type RegistrySource,
  type SourceRegistry,
} from "./official-web-refresh.js";

const fixedNow = () => new Date("2026-09-08T15:00:00.000Z");

test("dry-run evaluates collection policy before network and honors source, district and agency filters", async () => {
  let fetchCalls = 0;
  const result = await runOfficialWebBatch({
    registry: registry([
      allowedSource("agency-a", [
        { url: "https://agency-a.example/proyecto-uno", district: "Miraflores", agency: "Inmobiliaria Ágil", projectExternalId: "A-1" },
        { url: "https://agency-a.example/proyecto-dos", district: "San Isidro", agency: "Inmobiliaria Ágil", projectExternalId: "A-2" },
      ]),
      {
        ...allowedSource("blocked-source", [{ url: "https://blocked.example/proyecto", district: "Miraflores", agency: "Otra" }]),
        reviewStatus: "blocked",
      },
    ]),
    registryReference: "data/source/ingestion/source-registry.json",
    dryRun: true,
    filters: { sourceIds: ["agency-a"], districts: ["miraflores"], agencies: ["inmobiliaria agil"] },
    runId: "dry-run-001",
  }, {
    now: fixedNow,
    fetchImpl: (async () => { fetchCalls += 1; return response("never"); }) as typeof fetch,
  });

  assert.equal(fetchCalls, 0);
  assert.equal(result.manifest.counts.networkRequests, 0);
  assert.equal(result.manifest.counts.selectedSources, 1);
  assert.equal(result.manifest.counts.selectedTargets, 1);
  assert.equal(result.manifest.sources[0]?.decision.code, "COLLECTION_ALLOWED");
  assert.equal(result.manifest.targets[0]?.status, "planned");
  assert.deepEqual(result.staging.sourceObservations[0]?.observations, []);
});

test("blocked sources never reach robots or project fetch", async () => {
  let fetchCalls = 0;
  const source = { ...allowedSource("blocked", [{ url: "https://blocked.example/project" }]), reviewStatus: "blocked" as const };
  const result = await runOfficialWebBatch({
    registry: registry([source]),
    registryReference: "source-registry.json",
    dryRun: false,
    runId: "blocked-001",
  }, {
    now: fixedNow,
    fetchImpl: (async () => { fetchCalls += 1; return response("never"); }) as typeof fetch,
  });

  assert.equal(fetchCalls, 0);
  assert.equal(result.manifest.targets[0]?.status, "policy_blocked");
  assert.equal(result.manifest.targets[0]?.code, "SOURCE_BLOCKED");
});

test("collects whitelisted structured fields per source after robots and strips PII", async () => {
  const calls: string[] = [];
  const waits: number[] = [];
  const html = `<!doctype html><html><head>
    <meta property="og:title" content="Proyecto de respaldo">
    <meta property="og:description" content="Contacto ventas@example.test +51 999 111 222">
    <script type="application/ld+json">${JSON.stringify({
      "@type": "ApartmentComplex",
      name: "Residencial Uno",
      brand: { name: "Inmobiliaria Uno" },
      address: { streetAddress: "Av. Demo 123", addressLocality: "Miraflores" },
      offers: { price: "759480", priceCurrency: "PEN", availability: "InStock" },
      floorSize: { value: 92.3, unitText: "m²" },
      numberOfBedrooms: 3,
      amenityFeature: [{ name: "Piscina" }, { name: "Terraza" }],
      email: "ventas@example.test",
      telephone: "+51 999 111 222"
    })}</script>
  </head></html>`;
  const fetchImpl = (async (input: URL | RequestInfo) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith("/robots.txt")) return response("User-agent: *\nAllow: /", 200, "text/plain");
    return response(html);
  }) as typeof fetch;

  const result = await runOfficialWebBatch({
    registry: registry([allowedSource("agency-one", [{
      url: "https://agency-one.example/projects/residencial-uno?email=ops@example.test",
      district: "Miraflores",
      agency: "Inmobiliaria Uno",
      projectExternalId: "NEXO-10",
    }])]),
    registryReference: "data/source/ingestion/source-registry.json",
    dryRun: false,
    runId: "collection-001",
    minIntervalMs: 1_000,
  }, { now: fixedNow, fetchImpl, sleep: async (milliseconds) => { waits.push(milliseconds); } });

  assert.deepEqual(calls, [
    "https://agency-one.example/robots.txt",
    "https://agency-one.example/projects/residencial-uno?email=ops@example.test",
  ]);
  assert.ok(waits.some((wait) => wait > 0), "robots y ficha deben respetar el intervalo por host");
  assert.equal(result.manifest.counts.networkRequests, 2);
  assert.equal(result.manifest.counts.collectedTargets, 1);
  const group = result.staging.sourceObservations[0];
  assert.equal(group?.sourceId, "agency-one");
  assert.equal(group?.observations.length, 1);
  const fields = group?.observations[0]?.fields ?? [];
  assert.equal(fields.find((field) => field.field === "project_name")?.normalizedValue, "Residencial Uno");
  assert.equal(fields.find((field) => field.field === "published_price")?.normalizedValue, 759480);
  assert.equal(fields.find((field) => field.field === "area")?.normalizedValue, 92.3);
  assert.deepEqual(fields.find((field) => field.field === "amenities")?.normalizedValue, ["Piscina", "Terraza"]);
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /ventas@example\.test/u);
  assert.doesNotMatch(serialized, /999 111 222/u);
  assert.doesNotMatch(serialized, /ops@example\.test/u);
  assert.equal(group?.observations[0]?.sourceUrl, "https://agency-one.example/projects/residencial-uno");
  assert.match(result.manifest.stagingSha256, /^[a-f0-9]{64}$/u);
});

test("robots disallow stops the page request and records an auditable result", async () => {
  const calls: string[] = [];
  const fetchImpl = (async (input: URL | RequestInfo) => {
    calls.push(String(input));
    return response("User-agent: *\nDisallow: /private\nAllow: /private/public", 200, "text/plain");
  }) as typeof fetch;
  const result = await runOfficialWebBatch({
    registry: registry([allowedSource("agency-private", [{ url: "https://private.example/private/project" }])]),
    registryReference: "source-registry.json",
    dryRun: false,
    runId: "robots-001",
    minIntervalMs: 0,
  }, { now: fixedNow, fetchImpl });

  assert.deepEqual(calls, ["https://private.example/robots.txt"]);
  assert.equal(result.manifest.targets[0]?.status, "robots_blocked");
  assert.equal(result.manifest.targets[0]?.code, "ROBOTS_DISALLOW");
  assert.equal(result.manifest.counts.networkRequests, 1);
});

test("does not retry a technical block", async () => {
  const calls: string[] = [];
  const fetchImpl = (async (input: URL | RequestInfo) => {
    const url = String(input);
    calls.push(url);
    return url.endsWith("/robots.txt")
      ? response("User-agent: *\nAllow: /", 200, "text/plain")
      : response("Forbidden", 403);
  }) as typeof fetch;
  const result = await runOfficialWebBatch({
    registry: registry([allowedSource("agency-block", [{ url: "https://blocked-tech.example/project" }])]),
    registryReference: "source-registry.json",
    dryRun: false,
    runId: "block-001",
    minIntervalMs: 0,
  }, { now: fixedNow, fetchImpl });

  assert.equal(calls.length, 2);
  assert.equal(result.manifest.controls.retries, 0);
  assert.equal(result.manifest.targets[0]?.status, "failed");
  assert.equal(result.manifest.targets[0]?.code, "ACCESS_BLOCKED_403");
  assert.equal(result.manifest.targets[0]?.httpStatus, 403);
});

test("blocks a redirect to a host that is not explicitly allowlisted", async () => {
  const calls: string[] = [];
  const fetchImpl = (async (input: URL | RequestInfo) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith("/robots.txt")) return response("User-agent: *\nAllow: /", 200, "text/plain");
    return new Response("", { status: 302, headers: { location: "https://unapproved.example/project" } });
  }) as typeof fetch;
  const result = await runOfficialWebBatch({
    registry: registry([allowedSource("agency-redirect", [{ url: "https://approved.example/project" }])]),
    registryReference: "source-registry.json",
    dryRun: false,
    runId: "redirect-001",
    minIntervalMs: 0,
  }, { now: fixedNow, fetchImpl });

  assert.deepEqual(calls, ["https://approved.example/robots.txt", "https://approved.example/project"]);
  assert.equal(result.manifest.targets[0]?.status, "failed");
  assert.equal(result.manifest.targets[0]?.code, "REDIRECT_HOST_BLOCKED");
});

test("robots applies the longest rule and lets a named agent override wildcard", () => {
  const rules = compileRobotsRules(`
    User-agent: *
    Disallow: /
    User-agent: VivaInteligenciaBatch
    Disallow: /private
    Allow: /private/public
  `, "VivaInteligenciaBatch/1.0");
  assert.equal(rules.allows("/catalog"), true);
  assert.equal(rules.allows("/private/secret"), false);
  assert.equal(rules.allows("/private/public/project"), true);
});

test("extractor ignores unstructured descriptions and contact data", () => {
  const fields = extractStructuredObservations(`
    <title>Proyecto Seguro</title>
    <meta name="description" content="Escribe a persona@example.test o llama al 999 111 222">
    <meta property="og:site_name" content="Inmobiliaria Segura">
  `);
  assert.deepEqual(fields.map((field) => field.field), ["project_name", "agency_name"]);
  assert.doesNotMatch(JSON.stringify(fields), /example\.test|999/u);
});

function registry(sources: RegistrySource[]): SourceRegistry {
  return { registryVersion: "test-1", sources };
}

function allowedSource(sourceId: string, targets: CollectionTarget[]): RegistrySource {
  return {
    sourceId,
    label: sourceId,
    sourceClass: "official_project_website",
    purpose: "Test",
    officialDomainConfirmed: true,
    reviewStatus: "approved",
    robotsStatus: "allow",
    authorizationReference: `LEGAL-${sourceId}`,
    collection: {
      targets,
      userAgent: "VivaInteligenciaBatch/1.0",
      minIntervalMs: 5,
      timeoutMs: 2_000,
      maxResponseBytes: 100_000,
    },
  };
}

function response(body: string, status = 200, contentType = "text/html; charset=utf-8"): Response {
  return new Response(body, { status, headers: { "content-type": contentType } });
}
