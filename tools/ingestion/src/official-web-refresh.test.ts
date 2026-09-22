import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalJsonSha256,
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

test("blocks a target host outside the explicit allowlist before any network request", async () => {
  let fetchCalls = 0;
  const source = allowedSource("cross-host", [{ url: "https://unexpected.example/project" }]);
  source.url = "https://approved.example/";
  if (source.collection) source.collection.allowedHosts = ["approved.example"];

  const result = await runOfficialWebBatch({
    registry: registry([source]),
    registryReference: "source-registry.json",
    dryRun: false,
    runId: "cross-host-001",
  }, {
    now: fixedNow,
    fetchImpl: (async () => {
      fetchCalls += 1;
      return response("never");
    }) as typeof fetch,
  });

  assert.equal(fetchCalls, 0);
  assert.equal(result.manifest.counts.networkRequests, 0);
  assert.equal(result.manifest.targets[0]?.status, "failed");
  assert.equal(result.manifest.targets[0]?.code, "TARGET_HOST_NOT_ALLOWLISTED");
});

test("uses a confirmed source URL host only as a safe fallback allowlist", async () => {
  const calls: string[] = [];
  const source = allowedSource("fallback-host", [{ url: "https://fallback.example/project" }]);
  source.url = "https://fallback.example/";
  if (source.collection) delete source.collection.allowedHosts;
  const fetchImpl = (async (input: URL | RequestInfo) => {
    const url = String(input);
    calls.push(url);
    return url.endsWith("/robots.txt")
      ? response("User-agent: *\nAllow: /", 200, "text/plain")
      : response("<title>Proyecto fallback</title>");
  }) as typeof fetch;

  const result = await runOfficialWebBatch({
    registry: registry([source]),
    registryReference: "source-registry.json",
    dryRun: false,
    runId: "fallback-host-001",
    minIntervalMs: 0,
  }, { now: fixedNow, fetchImpl });

  assert.deepEqual(calls, ["https://fallback.example/robots.txt", "https://fallback.example/project"]);
  assert.equal(result.manifest.targets[0]?.status, "collected");
});

test("does not infer an executable target from source.url or legacy top-level targets", async () => {
  let fetchCalls = 0;
  const source = allowedSource("explicit-targets-only", []);
  source.url = "https://source-only.example/project";
  source.targets = [{ url: "https://legacy-target.example/project" }];
  if (source.collection) delete source.collection.targets;

  const result = await runOfficialWebBatch({
    registry: registry([source]),
    registryReference: "source-registry.json",
    dryRun: false,
    runId: "no-targets-001",
  }, {
    now: fixedNow,
    fetchImpl: (async () => {
      fetchCalls += 1;
      return response("never");
    }) as typeof fetch,
  });

  assert.equal(fetchCalls, 0);
  assert.equal(result.manifest.counts.selectedSources, 1);
  assert.equal(result.manifest.counts.selectedTargets, 0);
  assert.equal(result.manifest.counts.networkRequests, 0);
  assert.equal(result.manifest.sources[0]?.selectedTargets, 0);
  assert.deepEqual(result.manifest.targets, []);
});

test("rejects normalized duplicate source ids before network", async () => {
  let fetchCalls = 0;
  await assert.rejects(
    runOfficialWebBatch({
      registry: registry([
        allowedSource("Agency-Duplicate", [{ url: "https://one.example/project" }]),
        allowedSource(" agency-duplicate ", [{ url: "https://two.example/project" }]),
      ]),
      registryReference: "source-registry.json",
      dryRun: false,
      runId: "duplicate-source-001",
    }, {
      now: fixedNow,
      fetchImpl: (async () => {
        fetchCalls += 1;
        return response("never");
      }) as typeof fetch,
    }),
    /INGESTION_REGISTRY_DUPLICATE_SOURCE_ID:agency-duplicate/u,
  );
  assert.equal(fetchCalls, 0);
});

test("rejects duplicate target URLs within a source before network", async () => {
  let fetchCalls = 0;
  await assert.rejects(
    runOfficialWebBatch({
      registry: registry([allowedSource("duplicate-targets", [
        { url: "https://duplicate.example/project#overview" },
        { url: "https://duplicate.example/project#details" },
      ])]),
      registryReference: "source-registry.json",
      dryRun: false,
      runId: "duplicate-target-001",
    }, {
      now: fixedNow,
      fetchImpl: (async () => {
        fetchCalls += 1;
        return response("never");
      }) as typeof fetch,
    }),
    /INGESTION_REGISTRY_DUPLICATE_TARGET_URL:duplicate-targets:collection\.targets:1/u,
  );
  assert.equal(fetchCalls, 0);
});

test("rejects tracking-query variants that would produce the same auditable URL", async () => {
  let fetchCalls = 0;
  await assert.rejects(
    runOfficialWebBatch({
      registry: registry([allowedSource("duplicate-tracking-targets", [
        { url: "https://duplicate.example/project?utm=a" },
        { url: "https://duplicate.example/project?utm=b" },
      ])]),
      registryReference: "source-registry.json",
      dryRun: false,
      runId: "duplicate-tracking-target-001",
    }, {
      now: fixedNow,
      fetchImpl: (async () => {
        fetchCalls += 1;
        return response("never");
      }) as typeof fetch,
    }),
    /INGESTION_REGISTRY_DUPLICATE_TARGET_URL:duplicate-tracking-targets:collection\.targets:1/u,
  );
  assert.equal(fetchCalls, 0);
});

test("registry hashes use a stable canonical key order", () => {
  assert.equal(
    canonicalJsonSha256({ sources: [{ z: 3, a: 1 }], registryVersion: "test" }),
    canonicalJsonSha256({ registryVersion: "test", sources: [{ a: 1, z: 3 }] }),
  );
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

  const sourceRegistry = registry([allowedSource("agency-one", [{
      url: "https://agency-one.example/projects/residencial-uno?email=ops@example.test",
      district: "Miraflores",
      agency: "Inmobiliaria Uno",
      projectExternalId: "NEXO-10",
      projectName: "Residencial Uno",
      matchClass: "match_high",
      requiresHumanReview: false,
    }])]);
  const result = await runOfficialWebBatch({
    registry: sourceRegistry,
    registryReference: "data/source/ingestion/source-registry.json",
    dryRun: false,
    runId: "collection-001",
    minIntervalMs: 1_000,
  }, { now: fixedNow, fetchImpl, sleep: async (milliseconds) => { waits.push(milliseconds); } });

  assert.deepEqual(calls, [
    "https://agency-one.example/robots.txt",
    "https://agency-one.example/projects/residencial-uno",
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
  assert.equal(group?.observations[0]?.expectedProjectName, "Residencial Uno");
  assert.equal(group?.observations[0]?.matchClass, "match_high");
  assert.equal(group?.observations[0]?.requiresHumanReview, false);
  assert.equal(result.manifest.registrySha256, canonicalJsonSha256(sourceRegistry));
  assert.equal(result.manifest.counts.redirectsFollowed, 0);
  assert.match(result.manifest.stagingSha256, /^[a-f0-9]{64}$/u);
});

test("rejects a medium-confidence target that disables human review before network", async () => {
  let fetchCalls = 0;
  await assert.rejects(
    runOfficialWebBatch({
      registry: registry([allowedSource("unsafe-link", [{
        url: "https://unsafe.example/project",
        matchClass: "match_medium",
        requiresHumanReview: false,
      }])]),
      registryReference: "source-registry.json",
      dryRun: false,
      runId: "unsafe-001",
    }, {
      now: fixedNow,
      fetchImpl: (async () => {
        fetchCalls += 1;
        return response("never");
      }) as typeof fetch,
    }),
    /no puede omitir revisión humana/u,
  );
  assert.equal(fetchCalls, 0);
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
  assert.equal(result.manifest.counts.redirectsFollowed, 0);
});

test("follows and counts exactly three validated redirects", async () => {
  const calls: string[] = [];
  const fetchImpl = (async (input: URL | RequestInfo) => {
    const url = new URL(String(input));
    calls.push(url.href);
    if (url.pathname === "/robots.txt") return response("User-agent: *\nAllow: /", 200, "text/plain");
    const nextByPath: Record<string, string> = {
      "/project": "/redirect-one",
      "/redirect-one": "/redirect-two",
      "/redirect-two": "/final",
    };
    const location = nextByPath[url.pathname];
    return location
      ? new Response("", { status: 302, headers: { location } })
      : response("<title>Proyecto final</title>");
  }) as typeof fetch;
  const result = await runOfficialWebBatch({
    registry: registry([allowedSource("three-redirects", [{ url: "https://redirects.example/project" }])]),
    registryReference: "source-registry.json",
    dryRun: false,
    runId: "three-redirects-001",
    minIntervalMs: 0,
  }, { now: fixedNow, fetchImpl });

  assert.deepEqual(calls, [
    "https://redirects.example/robots.txt",
    "https://redirects.example/project",
    "https://redirects.example/redirect-one",
    "https://redirects.example/redirect-two",
    "https://redirects.example/final",
  ]);
  assert.equal(result.manifest.targets[0]?.status, "collected");
  assert.equal(result.manifest.counts.networkRequests, 5);
  assert.equal(result.manifest.counts.redirectsFollowed, 3);
});

test("stops before following a fourth redirect and keeps the accepted count auditable", async () => {
  const calls: string[] = [];
  const fetchImpl = (async (input: URL | RequestInfo) => {
    const url = new URL(String(input));
    calls.push(url.href);
    if (url.pathname === "/robots.txt") return response("User-agent: *\nAllow: /", 200, "text/plain");
    const nextByPath: Record<string, string> = {
      "/project": "/redirect-one",
      "/redirect-one": "/redirect-two",
      "/redirect-two": "/redirect-three",
      "/redirect-three": "/not-requested",
    };
    return new Response("", { status: 302, headers: { location: nextByPath[url.pathname] ?? "/unexpected" } });
  }) as typeof fetch;
  const result = await runOfficialWebBatch({
    registry: registry([allowedSource("redirect-limit", [{ url: "https://redirect-limit.example/project" }])]),
    registryReference: "source-registry.json",
    dryRun: false,
    runId: "redirect-limit-001",
    minIntervalMs: 0,
  }, { now: fixedNow, fetchImpl });

  assert.equal(calls.includes("https://redirect-limit.example/not-requested"), false);
  assert.equal(result.manifest.targets[0]?.status, "failed");
  assert.equal(result.manifest.targets[0]?.code, "REDIRECT_LIMIT_EXCEEDED");
  assert.equal(result.manifest.counts.networkRequests, 5);
  assert.equal(result.manifest.counts.redirectsFollowed, 3);
});

test("rejects an executable target outside the exact paths recorded in its access review", async () => {
  let fetchCalls = 0;
  const source = allowedSource("reviewed-paths", [
    { url: "https://reviewed-paths.example/project/unreviewed" },
  ]);
  source.accessReview = {
    reference: "PILOT-REVIEW-001",
    reviewedAt: "2026-09-08",
    technicalStatus: "pass",
    legalStatus: "approved",
    operationalStatus: "approved",
    robotsUrl: "https://reviewed-paths.example/robots.txt",
    robotsContentSha256: "a".repeat(64),
    routeRobotsStatus: "allow",
    reviewedPaths: ["/project/reviewed"],
    termsReferences: [],
    decision: "approved",
  };

  await assert.rejects(
    runOfficialWebBatch({
      registry: registry([source]),
      registryReference: "source-registry.json",
      dryRun: false,
      runId: "unreviewed-path-001",
    }, {
      now: fixedNow,
      fetchImpl: (async () => {
        fetchCalls += 1;
        return response("never");
      }) as typeof fetch,
    }),
    /INGESTION_REGISTRY_TARGET_PATH_NOT_REVIEWED/u,
  );
  assert.equal(fetchCalls, 0);
});

test("technical pilot collects exactly one reviewed candidate and marks output non-publishable", async () => {
  const calls: string[] = [];
  const source = pilotSource();
  const result = await runOfficialWebBatch({
    registry: registry([source]),
    registryReference: "source-registry.json",
    dryRun: false,
    filters: { sourceIds: [source.sourceId] },
    pilot: {
      productOwnerAuthorizationReference: "PO-DEMO-PILOT-001",
      targetUrl: "https://pilot.example/project/demo/",
    },
    runId: "pilot-001",
    minIntervalMs: 0,
  }, {
    now: fixedNow,
    fetchImpl: (async (input: URL | RequestInfo) => {
      const url = String(input);
      calls.push(url);
      return url.endsWith("/robots.txt")
        ? response("User-agent: *\nAllow: /project/demo/", 200, "text/plain")
        : response("<title>Proyecto Demo</title>");
    }) as typeof fetch,
  });

  assert.deepEqual(calls, ["https://pilot.example/robots.txt", "https://pilot.example/project/demo/"]);
  assert.equal(result.staging.schemaVersion, "pilot-1.0.0");
  assert.equal(result.staging.mode, "technical-pilot");
  assert.equal(result.staging.publishable, false);
  assert.equal(result.staging.pilotAuthorizationReference, "PO-DEMO-PILOT-001");
  assert.equal(result.manifest.manifestVersion, "pilot-1.0.0");
  assert.equal(result.manifest.publishable, false);
  assert.equal(result.manifest.sources[0]?.decision.code, "PILOT_COLLECTION_ALLOWED");
  assert.equal(result.manifest.counts.observations, 1);
});

test("technical pilot fails closed when Product Owner confirmation does not match", async () => {
  let fetchCalls = 0;
  const source = pilotSource();
  const result = await runOfficialWebBatch({
    registry: registry([source]),
    registryReference: "source-registry.json",
    dryRun: false,
    filters: { sourceIds: [source.sourceId] },
    pilot: {
      productOwnerAuthorizationReference: "PO-WRONG",
      targetUrl: "https://pilot.example/project/demo/",
    },
  }, {
    now: fixedNow,
    fetchImpl: (async () => {
      fetchCalls += 1;
      return response("never");
    }) as typeof fetch,
  });

  assert.equal(fetchCalls, 0);
  assert.equal(result.manifest.sources[0]?.decision.code, "PILOT_AUTHORIZATION_MISMATCH");
  assert.equal(result.manifest.targets[0]?.status, "policy_blocked");
});

test("technical pilot rejects an unreviewed redirect before following it", async () => {
  const calls: string[] = [];
  const source = pilotSource();
  const result = await runOfficialWebBatch({
    registry: registry([source]),
    registryReference: "source-registry.json",
    dryRun: false,
    filters: { sourceIds: [source.sourceId] },
    pilot: {
      productOwnerAuthorizationReference: "PO-DEMO-PILOT-001",
      targetUrl: "https://pilot.example/project/demo/",
    },
    minIntervalMs: 0,
  }, {
    now: fixedNow,
    fetchImpl: (async (input: URL | RequestInfo) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("/robots.txt")) return response("User-agent: *\nAllow: /", 200, "text/plain");
      return new Response("", { status: 302, headers: { location: "/project/not-reviewed/" } });
    }) as typeof fetch,
  });

  assert.deepEqual(calls, ["https://pilot.example/robots.txt", "https://pilot.example/project/demo/"]);
  assert.equal(result.manifest.targets[0]?.status, "failed");
  assert.equal(result.manifest.targets[0]?.code, "TARGET_PATH_NOT_REVIEWED");
});

test("technical pilot requires one exact registered source before any network", async () => {
  let fetchCalls = 0;
  await assert.rejects(
    runOfficialWebBatch({
      registry: registry([pilotSource()]),
      registryReference: "source-registry.json",
      dryRun: false,
      pilot: {
        productOwnerAuthorizationReference: "PO-DEMO-PILOT-001",
        targetUrl: "https://pilot.example/project/demo/",
      },
    }, {
      fetchImpl: (async () => {
        fetchCalls += 1;
        return response("never");
      }) as typeof fetch,
    }),
    /INGESTION_PILOT_SCOPE_INVALID/u,
  );
  assert.equal(fetchCalls, 0);
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
  const allowedHosts = [...new Set(targets.map((target) => new URL(target.url).hostname))];
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
      allowedHosts,
      userAgent: "VivaInteligenciaBatch/1.0",
      minIntervalMs: 5,
      timeoutMs: 2_000,
      maxResponseBytes: 100_000,
    },
  };
}

function pilotSource(): RegistrySource {
  return {
    sourceId: "agency-pilot",
    label: "Web oficial piloto",
    sourceClass: "official_project_website",
    purpose: "Factibilidad técnica",
    url: "https://pilot.example/",
    officialDomainConfirmed: true,
    reviewStatus: "pending",
    robotsStatus: "unknown",
    accessReview: {
      reference: "TECHNICAL-REVIEW-001",
      reviewedAt: "2026-09-08",
      technicalStatus: "pass",
      legalStatus: "pending",
      operationalStatus: "pending",
      robotsUrl: "https://pilot.example/robots.txt",
      robotsContentSha256: "a".repeat(64),
      routeRobotsStatus: "allow",
      reviewedPaths: ["/project/demo/"],
      termsReferences: ["https://pilot.example/terms/"],
      decision: "blocked_pending_review_and_authorization",
    },
    pilotAuthorization: {
      reference: "PO-DEMO-PILOT-001",
      approvedAt: "2026-09-09",
      approvedByRole: "product_owner",
      status: "approved",
      purpose: "technical_feasibility",
      allowedPaths: ["/project/demo/"],
    },
    candidateTargets: [{
      url: "https://pilot.example/project/demo/",
      district: "Miraflores",
      agency: "Agency Pilot",
      projectName: "Proyecto Demo",
      projectExternalId: "P-001",
      matchClass: "match_high",
      requiresHumanReview: false,
      demoScope: true,
    }],
    collection: {
      targets: [],
      allowedHosts: ["pilot.example"],
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
