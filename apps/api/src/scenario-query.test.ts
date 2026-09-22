import path from "node:path";
import type { ScenarioInput } from "@viva/contracts";
import { evaluateWorkspace } from "@viva/domain";
import { InMemorySnapshotRepository, loadAndValidateSnapshot } from "@viva/snapshot";
import type { LoadedSnapshot } from "@viva/snapshot";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { readConfig } from "./config.js";

let app: FastifyInstance;
let loaded: LoadedSnapshot;
let repository: InMemorySnapshotRepository;
beforeAll(async () => {
  const root = path.resolve(import.meta.dirname, "../../..");
  loaded = await loadAndValidateSnapshot({
    snapshotPath: path.join(root, "data/generated/viva-platform-demo.json"),
    schemaPath: path.join(root, "packages/contracts/schemas/demo-v2.schema.json"),
  });
  repository = new InMemorySnapshotRepository(loaded);
  app = await buildApp({ repository, config: readConfig({}), logger: false });
  await app.ready();
});
afterAll(async () => app.close());

describe("canonical scenario HTTP queries", () => {
  it.each<ScenarioInput>([
    { district_id: "150122", scope_mode: "quadrant", quadrant_id: "NW" },
    { district_id: "150122", scope_mode: "quadrant", quadrant_id: "NE" },
    { district_id: "150122", bedrooms: 2 },
    { district_id: "150122", delivery_year: 2026 },
    { district_id: "150122", scope_mode: "radius", center_latitude: -12.121, center_longitude: -77.03, radius_meters: 500 },
  ])("returns the evaluated population for %j", async (scenario) => {
    const expected = evaluateWorkspace(loaded.data, scenario).comparableProjectIds;
    const response = await app.inject({
      method: "POST", url: "/api/v1/projects/query", payload: { scenario, pageSize: 100 },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      contractVersion: "2.4.0", datasetVersion: loaded.data.metadata.dataset_id, total: expected.length,
      positioningStats: { count: expect.any(Number) },
    });
    expect(response.json().items.map(({ id }: { id: string }) => `project:nexo-${id}`).sort()).toEqual([...expected].sort());
    expect(Buffer.byteLength(response.body)).toBeLessThan(1_000_000);
    const history = await app.inject({
      method: "POST", url: "/api/v1/history/query", payload: { scenario, pageSize: 100 },
    });
    expect(history.statusCode).toBe(200);
    expect(history.json().items.every((event: { project_id: string }) => expected.includes(event.project_id))).toBe(true);
    for (const event of history.json().items) {
      expect(event.project).toMatchObject({
        id: event.project_id.replace("project:nexo-", ""), name: expect.any(String), agency: expect.any(String),
      });
    }
  });

  it("keeps catalog queries compatible and resolves history identities independently", async () => {
    const catalog = await app.inject({ method: "GET", url: "/api/v1/projects?district=150122&pageSize=1" });
    expect(catalog.json()).toMatchObject({ total: 90 });
    expect(catalog.json().positioningStats).toBeUndefined();
    const history = await app.inject({ method: "GET", url: "/api/v1/history?district=150122" });
    expect(history.json().total).toBe(5);
    expect(history.json().items.every((event: { project: { name: string } | null }) => Boolean(event.project?.name))).toBe(true);
    const ne = await app.inject({
      method: "POST", url: "/api/v1/history/query",
      payload: { scenario: { district_id: "150122", scope_mode: "quadrant", quadrant_id: "NE" } },
    });
    expect(ne.json()).toMatchObject({ total: 0, items: [] });
  });

  it("publishes the additive schemas and rejects unbounded or ambiguous inputs", async () => {
    const openapi = await app.inject({ method: "GET", url: "/openapi.json" });
    expect(openapi.json().paths["/api/v1/projects/query"].post).toBeDefined();
    expect(openapi.json().paths["/api/v1/history/query"].post).toBeDefined();
    for (const url of ["/api/v1/projects/query", "/api/v1/history/query"]) {
      for (const payload of [{}, { scenario: {}, pageSize: 101 }, { scenario: {}, projectIds: ["1988"] }]) {
        const invalid = await app.inject({ method: "POST", url, payload });
        expect(invalid.statusCode).toBe(400);
        expect(invalid.json().code).toBe("REQUEST_INVALID");
      }
    }
  });

  it("paginates more than 100 canonical projects without any client-supplied IDs", async () => {
    const data = structuredClone(loaded.data);
    const sample = data.projects.find(({ id }) => id === "1988")!;
    const assignment = data.geography.assignments.find(({ observed_project_id }) => observed_project_id === "observed:nexo-1988")!;
    for (let index = 0; index < 40; index += 1) {
      const id = `http-scenario-${index}`;
      data.projects.push({ ...sample, id, project_name: `HTTP scenario ${index}` });
      data.model.projects.push({ project_id: `project:nexo-${id}` });
      data.geography.assignments.push({ ...assignment, observed_project_id: `observed:nexo-${id}`, authoritative_project_id: `project:nexo-${id}` });
    }
    const expanded = await buildApp({
      repository: new InMemorySnapshotRepository({ ...loaded, data }), config: readConfig({}), logger: false,
    });
    try {
      const expected = evaluateWorkspace(data, { district_id: "150122" }).comparableProjectIds;
      expect(expected.length).toBeGreaterThan(100);
      const responses = await Promise.all([1, 2].map((page) => expanded.inject({
        method: "POST", url: "/api/v1/projects/query", payload: { scenario: { district_id: "150122" }, page, pageSize: 100 },
      })));
      expect(responses.every(({ statusCode }) => statusCode === 200)).toBe(true);
      expect(responses[0]!.json().total).toBe(expected.length);
      expect(responses.flatMap((response) => response.json().items.map(({ id }: { id: string }) => `project:nexo-${id}`)).sort())
        .toEqual([...expected].sort());
    } finally { await expanded.close(); }
  });

  it("does not invent a publication date from generation time", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/data-refresh/status" });
    expect(response.json()).toMatchObject({
      snapshotGeneratedAt: loaded.data.metadata.generated_at,
      publication: { status: "not_recorded", publishedAt: null },
      // Preserved only as a deprecated compatibility alias.
      lastPublishedAt: loaded.data.metadata.generated_at,
    });
  });
});
