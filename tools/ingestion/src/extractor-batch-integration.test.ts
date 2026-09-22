import assert from "node:assert/strict";
import test from "node:test";
import {
  runOfficialWebBatch,
  type RegistrySource,
  type SourceRegistry,
} from "./official-web-refresh.js";

test("staging and manifest retain extractor provenance and fail-closed issues", async () => {
  const payload = {
    projects: [
      { type: "project", name: "Proyecto A", publishedPrice: 500000, currency: "PEN" },
      { type: "project", name: "Proyecto B", publishedPrice: 600000, currency: "PEN" },
    ],
  };
  const fetchImpl = (async (input: URL | RequestInfo) => {
    const url = String(input);
    if (url.endsWith("/robots.txt")) return response("User-agent: *\nAllow: /", "text/plain");
    return response(`<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(payload)}</script>`);
  }) as typeof fetch;

  const source: RegistrySource = {
    sourceId: "official-priority-agency",
    label: "Inmobiliaria prioritaria",
    sourceClass: "official_project_website",
    officialDomainConfirmed: true,
    reviewStatus: "approved",
    robotsStatus: "allow",
    authorizationReference: "AUTH-TEST-001",
    collection: {
      targets: [{ url: "https://priority.example/projects", agency: "Inmobiliaria prioritaria" }],
      allowedHosts: ["priority.example"],
      userAgent: "VivaInteligenciaBatch/1.0",
      minIntervalMs: 0,
      extractorArchetypes: ["embedded_json", "html"],
    },
  };
  const registry: SourceRegistry = { registryVersion: "test-wave-1", sources: [source] };
  const result = await runOfficialWebBatch({
    registry,
    registryReference: "fixtures/source-registry.json",
    dryRun: false,
    runId: "extractor-audit-001",
    minIntervalMs: 0,
  }, {
    fetchImpl,
    now: () => new Date("2026-09-08T20:00:00.000Z"),
  });

  const observation = result.staging.sourceObservations[0]?.observations[0];
  assert.ok(observation);
  assert.equal(observation.fields.some((field) => field.field === "published_price"), false);
  assert.ok(observation.extraction?.attempts.some((attempt) => attempt.archetype === "embedded_json" && attempt.applicable));
  assert.ok(observation.extraction?.issueCodes.includes("AMBIGUOUS_FIELD"));
  assert.ok(result.manifest.counts.extractionIssues > 0);
  assert.deepEqual(result.manifest.targets[0]?.extractorArchetypes, ["embedded_json"]);
  assert.ok(result.manifest.targets[0]?.extractionIssueCodes?.includes("AMBIGUOUS_FIELD"));
  assert.match(result.manifest.stagingSha256, /^[a-f0-9]{64}$/u);
});

function response(body: string, contentType = "text/html; charset=utf-8"): Response {
  return new Response(body, { status: 200, headers: { "content-type": contentType } });
}
