import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { InMemorySnapshotRepository, loadAndValidateSnapshot } from "@viva/snapshot";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import { readConfig } from "./config.js";

const root = path.resolve(import.meta.dirname, "../../..");
let app: FastifyInstance;

beforeAll(async () => {
  const config = readConfig({
    SNAPSHOT_PATH: path.join(root, "data/generated/viva-platform-demo.json"),
    SNAPSHOT_SCHEMA_PATH: path.join(root, "packages/contracts/schemas/demo-v2.schema.json"),
  });
  const loaded = await loadAndValidateSnapshot({
    snapshotPath: config.snapshotPath,
    schemaPath: config.schemaPath,
  });
  app = await buildApp({
    repository: new InMemorySnapshotRepository(loaded),
    config,
    logger: false,
  });
  await app.ready();
});

afterAll(async () => app.close());

describe("Viva API", () => {
  it("publishes live, ready, metadata and OpenAPI", async () => {
    const [live, ready, meta, openapi] = await Promise.all([
      app.inject({ method: "GET", url: "/health/live" }),
      app.inject({ method: "GET", url: "/health/ready" }),
      app.inject({ method: "GET", url: "/api/v1/meta" }),
      app.inject({ method: "GET", url: "/openapi.json" }),
    ]);
    expect(live.statusCode).toBe(200);
    expect(ready.json().status).toBe("ready");
    expect(meta.json().contractVersion).toBe("2.4.0");
    expect(openapi.json().paths["/api/v1/projects"]).toBeDefined();
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
});
