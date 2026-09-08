import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { InMemorySnapshotRepository, loadAndValidateSnapshot } from "@viva/snapshot";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import { readConfig } from "./config.js";

const root = path.resolve(import.meta.dirname, "../../..");
let app: FastifyInstance;
let repository: InMemorySnapshotRepository;

beforeAll(async () => {
  const config = readConfig({
    SNAPSHOT_PATH: path.join(root, "data/generated/viva-platform-demo.json"),
    SNAPSHOT_SCHEMA_PATH: path.join(root, "packages/contracts/schemas/demo-v2.schema.json"),
  });
  const loaded = await loadAndValidateSnapshot({
    snapshotPath: config.snapshotPath,
    schemaPath: config.schemaPath,
  });
  repository = new InMemorySnapshotRepository(loaded);
  app = await buildApp({
    repository,
    config,
    logger: false,
  });
  await app.ready();
});

afterAll(async () => app.close());
afterEach(() => vi.unstubAllGlobals());

describe("Viva API", () => {
  it("publishes live, ready, metadata and OpenAPI", async () => {
    const [live, ready, meta, openapi, geography, coverage] = await Promise.all([
      app.inject({ method: "GET", url: "/health/live" }),
      app.inject({ method: "GET", url: "/health/ready" }),
      app.inject({ method: "GET", url: "/api/v1/meta" }),
      app.inject({ method: "GET", url: "/openapi.json" }),
      app.inject({ method: "GET", url: "/api/v1/geography/districts/150122" }),
      app.inject({ method: "GET", url: "/api/v1/source-coverage?district=150122" }),
    ]);
    expect(live.statusCode).toBe(200);
    expect(ready.json().status).toBe("ready");
    expect(meta.json().contractVersion).toBe("2.4.0");
    expect(openapi.json().paths["/api/v1/projects"]).toBeDefined();
    expect(openapi.json().paths["/api/v1/geography/districts/{districtId}"]).toBeDefined();
    expect(openapi.json().paths["/api/v1/source-coverage"]).toBeDefined();
    expect(geography.json()).toMatchObject({
      district: { id: "150122", name: "Miraflores" },
      analysisZones: {
        status: "internal_analytic",
        method: "district_valid_point_coordinate_medians_v1",
      },
      provenance: { status: "referential", officialBoundaryRegistry: "RENLIM" },
    });
    expect(geography.json().analysisZones.zones).toHaveLength(4);
    expect(coverage.json()).toMatchObject({
      scope: { districtId: "150122", districtName: "Miraflores" },
      totals: { projects: 90 },
      channels: {
        nexo: { coveragePct: 100 },
        social: { coveragePct: 0, status: "pending_authorization" },
      },
    });
  });

  it("keeps bootstrap small and lists projects by page", async () => {
    const bootstrap = await app.inject({ method: "GET", url: "/api/v1/bootstrap" });
    const projects = await app.inject({
      method: "GET",
      url: "/api/v1/projects?district=Miraflores&pageSize=5",
    });
    expect(Buffer.byteLength(bootstrap.body)).toBeLessThan(500_000);
    expect(projects.json().items).toHaveLength(5);
    expect(projects.json().total).toBe(90);
    expect(Buffer.byteLength(projects.body)).toBeLessThan(1_000_000);
  });

  it("evaluates scenario, comparison, inspector, history and assistant", async () => {
    const bootstrap = await app.inject({ method: "GET", url: "/api/v1/bootstrap" });
    const scenario = bootstrap.json().initialScenario;
    const workspace = await app.inject({
      method: "POST",
      url: "/api/v1/workspace/evaluate",
      payload: { scenario },
    });
    const projectIds = workspace.json().comparableProjectIds.slice(0, 2);
    const comparison = await app.inject({
      method: "POST",
      url: "/api/v1/comparisons/evaluate",
      payload: { scenario, projectIds },
    });
    const inspector = await app.inject({ method: "GET", url: "/api/v1/inspector/cases/f3-area-match" });
    const history = await app.inject({ method: "GET", url: "/api/v1/history?pageSize=5" });
    const assistant = await app.inject({
      method: "POST",
      url: "/api/v1/assistant/answer",
      payload: { scenario, input: "¿Qué debo priorizar?" },
    });
    expect(workspace.statusCode).toBe(200);
    expect(workspace.json().scenarioStatus).toBe("valid");
    expect(workspace.json().corrections).toEqual([]);
    expect(comparison.statusCode).toBe(200);
    expect(inspector.statusCode).toBe(200);
    expect(history.statusCode).toBe(200);
    expect(assistant.statusCode).toBe(200);
  });

  it("rejects invalid input with a stable request id", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/assistant/answer",
      payload: { scenario: {}, input: "" },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: "REQUEST_INVALID" });
    expect(response.json().requestId).toMatch(/^[0-9a-f-]{36}$/u);
  });

  it("keeps data refresh disabled until the private operator workflow is configured", async () => {
    const status = await app.inject({ method: "GET", url: "/api/v1/data-refresh/status" });
    const attempt = await app.inject({
      method: "POST",
      url: "/api/v1/data-refresh",
      payload: { scope: "demo_districts", channels: ["official_websites"] },
    });
    expect(status.json()).toMatchObject({ enabled: false, run: { state: "idle", published: false } });
    expect(attempt.statusCode).toBe(503);
    expect(attempt.json()).toMatchObject({ code: "DATA_REFRESH_NOT_CONFIGURED" });
  });

  it("dispatches with the internal token and mirrors the private worker status", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/runs/latest")) {
        return new Response(JSON.stringify({
          run: {
            runId: "refresh-test",
            state: "blocked",
            requestedAt: "2026-09-08T00:00:00.000Z",
            completedAt: "2026-09-08T00:00:01.000Z",
            message: "Fuentes pendientes de autorización.",
            published: false,
          },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      expect(init?.headers).toMatchObject({ "x-ingestion-token": "internal-test-token" });
      return new Response(JSON.stringify({
        accepted: true,
        run: {
          runId: "refresh-test",
          state: "queued",
          requestedAt: "2026-09-08T00:00:00.000Z",
          completedAt: null,
          message: "Corrida encolada.",
          published: false,
        },
      }), { status: 202, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);
    const configured = readConfig({
      SNAPSHOT_PATH: path.join(root, "data/generated/viva-platform-demo.json"),
      SNAPSHOT_SCHEMA_PATH: path.join(root, "packages/contracts/schemas/demo-v2.schema.json"),
      DATA_REFRESH_ENABLED: "true",
      DATA_REFRESH_OPERATOR_KEY: "operator-test-key",
      DATA_REFRESH_DISPATCH_URL: "http://ops.test:3100",
      DATA_REFRESH_INTERNAL_TOKEN: "internal-test-token",
    });
    const configuredApp = await buildApp({ repository, config: configured, logger: false });
    await configuredApp.ready();
    try {
      const accepted = await configuredApp.inject({
        method: "POST",
        url: "/api/v1/data-refresh",
        headers: { "x-data-refresh-key": "operator-test-key" },
        payload: { scope: "demo_districts", channels: ["official_websites"] },
      });
      expect(accepted.statusCode).toBe(202);
      expect(accepted.json()).toMatchObject({ accepted: true, run: { state: "queued", published: false } });
      const status = await configuredApp.inject({ method: "GET", url: "/api/v1/data-refresh/status" });
      expect(status.json()).toMatchObject({ enabled: true, run: { state: "blocked", published: false } });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      await configuredApp.close();
    }
  });
});
