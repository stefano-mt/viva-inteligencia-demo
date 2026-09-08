import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import { readConfig, type OpsConfig } from "./config.js";
import type { OfficialWebBatchResult, OfficialWebRefreshApi } from "./types.js";

const token = "test-ingestion-token";
const authorization = { "x-ingestion-token": token };
const openApps: FastifyInstance[] = [];

afterEach(async () => {
  await Promise.all(openApps.splice(0).map((app) => app.close()));
});

describe("ops health and authorization", () => {
  it("keeps health public but protects both run endpoints before validation", async () => {
    const { app } = await testApp();
    const [live, ready, post, latest] = await Promise.all([
      app.inject({ method: "GET", url: "/health/live" }),
      app.inject({ method: "GET", url: "/health/ready" }),
      app.inject({ method: "POST", url: "/runs", payload: {} }),
      app.inject({ method: "GET", url: "/runs/latest" }),
    ]);

    expect(live.statusCode).toBe(200);
    expect(ready.json()).toMatchObject({ status: "ready", execute: false, mode: "dry-run" });
    expect(post.statusCode).toBe(401);
    expect(post.json()).toMatchObject({ code: "INGESTION_UNAUTHORIZED" });
    expect(latest.statusCode).toBe(401);
  });

  it("is not ready without a configured token", async () => {
    const load = vi.fn(async () => fakeOfficialWebApi().api);
    const { app } = await testApp({ ingestionToken: "" }, load);
    const ready = await app.inject({ method: "GET", url: "/health/ready" });

    expect(ready.statusCode).toBe(503);
    expect(ready.json().reason).toBe("INGESTION_TOKEN_MISSING");
    expect(load).not.toHaveBeenCalled();
  });
});

describe("asynchronous refresh runs", () => {
  it("enqueues immediately, runs official websites dry by default, and persists only through the ingestion API", async () => {
    const fake = fakeOfficialWebApi();
    const { app, config } = await testApp({}, async () => fake.api);
    const accepted = await app.inject({
      method: "POST",
      url: "/runs",
      headers: authorization,
      payload: request("refresh-001", ["official_websites"]),
    });

    expect(accepted.statusCode).toBe(202);
    expect(accepted.json()).toMatchObject({
      accepted: true,
      deduplicated: false,
      run: { runId: "refresh-001", state: "queued", execute: false, published: false },
    });

    const run = await waitForTerminal(app);
    expect(fake.batchOptions).toEqual({
      registry: { registryVersion: "test", sources: [] },
      registryReference: "data/source/ingestion/source-registry.json",
      dryRun: true,
      filters: { districts: ["150122", "Miraflores"] },
      runId: "refresh-001",
    });
    expect(fake.writes).toEqual([{
      outputPath: path.join(config.stagingDirectory, "refresh-001.official-web-refresh.json"),
      manifestPath: path.join(config.stagingDirectory, "refresh-001.official-web-refresh.manifest.json"),
    }]);
    expect(run).toMatchObject({
      state: "succeeded",
      published: false,
      channelResults: [{
        channel: "official_websites",
        state: "succeeded",
        code: "OFFICIAL_WEB_PLAN_READY",
        counts: { networkRequests: 0 },
      }],
    });
    expect(JSON.stringify(run)).not.toContain("raw html");
  });

  it("confines demo-wide refreshes to the seven declared demo districts", async () => {
    const fake = fakeOfficialWebApi();
    const { app } = await testApp({}, async () => fake.api);
    await app.inject({
      method: "POST",
      url: "/runs",
      headers: authorization,
      payload: {
        runId: "refresh-demo-scope",
        scope: "demo_districts",
        districtIds: [],
        channels: ["official_websites"],
      },
    });

    const run = await waitForTerminal(app);
    expect(run.districtIds).toEqual(["150101", "150113", "150120", "150122", "150131", "150136", "150140"]);
    expect(fake.batchOptions).toMatchObject({
      filters: {
        districts: expect.arrayContaining([
          "150101", "Cercado de Lima",
          "150113", "Jesus Maria",
          "150120", "Magdalena del Mar",
          "150122", "Miraflores",
          "150131", "San Isidro",
          "150136", "San Miguel",
          "150140", "Santiago de Surco",
        ]),
      },
    });
  });

  it("deduplicates any concurrent request onto the active job", async () => {
    let release!: (result: OfficialWebBatchResult) => void;
    const pending = new Promise<OfficialWebBatchResult>((resolve) => { release = resolve; });
    const fake = fakeOfficialWebApi();
    fake.api.runOfficialWebBatch = async () => pending;
    const { app } = await testApp({}, async () => fake.api);

    await app.inject({
      method: "POST",
      url: "/runs",
      headers: authorization,
      payload: request("refresh-active", ["official_websites"]),
    });
    await waitForState(app, "running");
    const duplicate = await app.inject({
      method: "POST",
      url: "/runs",
      headers: authorization,
      payload: request("refresh-other", ["nexo_authorized_feed"]),
    });

    expect(duplicate.statusCode).toBe(202);
    expect(duplicate.json()).toMatchObject({
      accepted: true,
      deduplicated: true,
      run: { runId: "refresh-active", state: "running" },
    });
    release(batchResult());
    await waitForTerminal(app);
  });

  it("reports Nexo and social as unsupported or policy-blocked without loading a collector", async () => {
    const load = vi.fn(async () => fakeOfficialWebApi().api);
    const { app } = await testApp({}, load);
    await app.inject({
      method: "POST",
      url: "/runs",
      headers: authorization,
      payload: request("refresh-policy", ["nexo_authorized_feed", "social_official_apis"]),
    });

    const run = await waitForTerminal(app);
    expect(run).toMatchObject({ state: "blocked", published: false });
    expect(run.channelResults).toEqual([
      expect.objectContaining({
        channel: "nexo_authorized_feed",
        state: "unsupported",
        code: "AUTHORIZED_FEED_INPUT_REQUIRED",
      }),
      expect.objectContaining({
        channel: "social_official_apis",
        state: "policy_blocked",
        code: "SOCIAL_API_AUTHORIZATION_REQUIRED",
      }),
    ]);
    expect(load).not.toHaveBeenCalled();
  });

  it("rejects malformed requests and does not expose ingestion failures", async () => {
    const fake = fakeOfficialWebApi();
    fake.api.runOfficialWebBatch = async () => {
      throw new Error("SECRET failure at C:\\private\\raw.html");
    };
    const { app } = await testApp({}, async () => fake.api);
    const invalid = await app.inject({
      method: "POST",
      url: "/runs",
      headers: authorization,
      payload: request("../escape", ["official_websites"]),
    });
    expect(invalid.statusCode).toBe(400);

    await app.inject({
      method: "POST",
      url: "/runs",
      headers: authorization,
      payload: request("refresh-failure", ["official_websites"]),
    });
    const run = await waitForTerminal(app);
    expect(run).toMatchObject({
      state: "failed",
      channelResults: [{ code: "OFFICIAL_WEB_REFRESH_FAILED", state: "failed" }],
    });
    expect(JSON.stringify(run)).not.toMatch(/SECRET|private|raw\.html/u);
  });
});

describe("configuration", () => {
  it("defaults execution to false and confines output to data/staging", () => {
    const root = path.resolve("C:/safe-repository");
    const config = readConfig({ REPOSITORY_ROOT: root, INGESTION_TOKEN: token });
    expect(config.execute).toBe(false);
    expect(config.stagingDirectory).toBe(path.join(root, "data", "staging", "ops"));
    expect(() => readConfig({
      REPOSITORY_ROOT: root,
      INGESTION_STAGING_DIRECTORY: path.resolve("C:/outside"),
    })).toThrow(/dentro de data\/staging/u);
  });
});

async function testApp(
  overrides: Partial<OpsConfig> = {},
  loadOfficialWebApi?: () => Promise<OfficialWebRefreshApi>,
) {
  const repositoryRoot = path.resolve("C:/repo");
  const config: OpsConfig = {
    host: "127.0.0.1",
    port: 3001,
    logLevel: "silent",
    ingestionToken: token,
    execute: false,
    repositoryRoot,
    registryPath: path.join(repositoryRoot, "data/source/ingestion/source-registry.json"),
    stagingDirectory: path.join(repositoryRoot, "data/staging/ops"),
    ...overrides,
  };
  const fallback = fakeOfficialWebApi();
  const app = await buildApp({
    config,
    logger: false,
    loadOfficialWebApi: loadOfficialWebApi ?? (async () => fallback.api),
  });
  await app.ready();
  openApps.push(app);
  return { app, config };
}

function request(runId: string, channels: string[]) {
  return {
    runId,
    scope: "active_district",
    districtIds: ["150122"],
    channels,
  };
}

function fakeOfficialWebApi() {
  const writes: Array<{ outputPath: string; manifestPath: string }> = [];
  let batchOptions: unknown;
  const api: OfficialWebRefreshApi = {
    async readSourceRegistry() {
      return { registryVersion: "test", sources: [] };
    },
    async runOfficialWebBatch(options) {
      batchOptions = options;
      return batchResult();
    },
    async writeBatchArtifacts(_result, outputPath, manifestPath) {
      writes.push({ outputPath, manifestPath });
    },
  };
  return {
    api,
    writes,
    get batchOptions() { return batchOptions; },
  };
}

function batchResult(): OfficialWebBatchResult {
  return {
    staging: { deliberately: "not returned", html: "raw html" },
    manifest: {
      mode: "dry-run",
      counts: {
        selectedSources: 1,
        selectedTargets: 1,
        eligibleTargets: 1,
        policyBlockedTargets: 0,
        plannedTargets: 1,
        collectedTargets: 0,
        robotsBlockedTargets: 0,
        failedTargets: 0,
        networkRequests: 0,
        observations: 0,
        observationFields: 0,
      },
    },
  };
}

async function waitForTerminal(app: FastifyInstance) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const response = await app.inject({ method: "GET", url: "/runs/latest", headers: authorization });
    const run = response.json().run;
    if (["succeeded", "blocked", "failed"].includes(run.state)) return run;
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  throw new Error("La corrida no terminó durante la prueba.");
}

async function waitForState(app: FastifyInstance, expected: string) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const response = await app.inject({ method: "GET", url: "/runs/latest", headers: authorization });
    if (response.json().run.state === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  throw new Error(`La corrida no alcanzó ${expected}.`);
}
