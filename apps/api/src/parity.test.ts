import path from "node:path";
import { performance } from "node:perf_hooks";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { answerAssistant, evaluateComparison, evaluateWorkspace } from "@viva/domain";
import type { JsonObject } from "@viva/domain";
import type { ScenarioInput } from "@viva/contracts";
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
  const loaded = await loadAndValidateSnapshot({ snapshotPath: config.snapshotPath, schemaPath: config.schemaPath });
  repository = new InMemorySnapshotRepository(loaded);
  app = await buildApp({ repository, config, logger: false });
  await app.ready();
});

afterAll(async () => app.close());

describe("API parity and operational boundaries", () => {
  it("returns the same deterministic workspace, comparison and assistant decisions as the pure domain", async () => {
    const scenario = repository.bootstrap().initialScenario as ScenarioInput;
    const expectedWorkspace = evaluateWorkspace(repository.snapshot(), scenario);
    const { internal: _internal, ...expectedPublicWorkspace } = expectedWorkspace;
    const workspaceResponse = await app.inject({ method: "POST", url: "/api/v1/workspace/evaluate", payload: { scenario } });
    const actualWorkspace = workspaceResponse.json();
    expect(actualWorkspace).toMatchObject(json(expectedPublicWorkspace));

    const projectIds = expectedWorkspace.comparableProjectIds.slice(0, 3);
    const comparisonResponse = await app.inject({
      method: "POST",
      url: "/api/v1/comparisons/evaluate",
      payload: { scenario, projectIds, includeTargetScenario: false },
    });
    expect(comparisonResponse.json().comparison).toEqual(json(
      evaluateComparison(repository.snapshot(), scenario, projectIds, false),
    ));

    const input = "¿Qué cobertura y limitaciones tiene la muestra?";
    const assistantResponse = await app.inject({
      method: "POST",
      url: "/api/v1/assistant/answer",
      payload: { scenario, input, projectIds },
    });
    expect(assistantResponse.json().answer).toEqual(json(
      answerAssistant(repository.snapshot(), scenario, input, null, projectIds, null),
    ));
  });

  it("serves every approved inspector case without exposing the complete snapshot", async () => {
    const bootstrap = repository.bootstrap();
    for (const item of bootstrap.inspectorCases as JsonObject[]) {
      const response = await app.inject({ method: "GET", url: `/api/v1/inspector/cases/${item.routeSlug}` });
      expect(response.statusCode, String(item.routeSlug)).toBe(200);
      expect(response.json()).toMatchObject({ contractVersion: "2.4.0", datasetVersion: expect.any(String) });
      expect(Buffer.byteLength(response.body), String(item.routeSlug)).toBeLessThan(1_000_000);
    }
    const forbidden = await app.inject({ method: "GET", url: "/api/v1/snapshot" });
    expect(forbidden.statusCode).toBe(404);
  });

  it("fails readiness closed and returns a stable envelope when the snapshot is unavailable", async () => {
    const unavailable = await buildApp({
      repository: null,
      startupError: new Error("Snapshot inválido"),
      config: readConfig({}),
      logger: false,
    });
    const ready = await unavailable.inject({ method: "GET", url: "/health/ready" });
    const data = await unavailable.inject({ method: "GET", url: "/api/v1/meta" });
    expect(ready.statusCode).toBe(503);
    expect(ready.json()).toMatchObject({ status: "not_ready" });
    expect(data.statusCode).toBe(503);
    expect(data.json()).toMatchObject({ code: "SNAPSHOT_UNAVAILABLE", requestId: expect.any(String) });
    await unavailable.close();
  });

  it("keeps in-process p95 below the 500 ms reference budget", async () => {
    const durations = [];
    for (let index = 0; index < 30; index += 1) {
      const start = performance.now();
      const response = await app.inject({ method: "GET", url: "/api/v1/projects?district=150122&pageSize=18" });
      durations.push(performance.now() - start);
      expect(response.statusCode).toBe(200);
    }
    durations.sort((left, right) => left - right);
    expect(durations[Math.ceil(durations.length * 0.95) - 1]).toBeLessThan(500);
  });
});

function json<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
