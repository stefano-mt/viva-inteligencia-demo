import path from "node:path";
import type { ScenarioInput } from "@viva/contracts";
import { evaluateWorkspace, summarizePositioning } from "@viva/domain";
import type { JsonObject } from "@viva/domain";
import { beforeAll, describe, expect, it } from "vitest";
import { InMemorySnapshotRepository } from "./repository.js";
import type { LoadedSnapshot } from "./types.js";
import { loadAndValidateSnapshot } from "./validation.js";

let loaded: LoadedSnapshot;
let repository: InMemorySnapshotRepository;
beforeAll(async () => {
  const root = path.resolve(import.meta.dirname, "../../..");
  loaded = await loadAndValidateSnapshot({
    snapshotPath: path.join(root, "data/generated/viva-platform-demo.json"),
    schemaPath: path.join(root, "packages/contracts/schemas/demo-v2.schema.json"),
  });
  repository = new InMemorySnapshotRepository(loaded);
});

const scenarios: Array<[string, ScenarioInput]> = [
  ["district", { district_id: "150122" }],
  ["NW", { district_id: "150122", scope_mode: "quadrant", quadrant_id: "NW" }],
  ["NE", { district_id: "150122", scope_mode: "quadrant", quadrant_id: "NE" }],
  ["bedroom range", { district_id: "150122", bedrooms: 2 }],
  ["delivery", { district_id: "150122", delivery_year: 2026 }],
  ["radius", { district_id: "150122", scope_mode: "radius", center_latitude: -12.121, center_longitude: -77.03, radius_meters: 500 }],
];

describe("canonical scenario query", () => {
  it.each(scenarios)("filters %s before pagination using the unchanged domain", (_label, scenario) => {
    const expected = evaluateWorkspace(loaded.data, scenario).comparableProjectIds.sort();
    const first = repository.projects({ scenario, pageSize: 3 });
    const ids: string[] = [];
    for (let page = 1; page <= first.totalPages; page += 1) {
      const result = repository.projects({ scenario, pageSize: 3, page });
      expect(result.total).toBe(expected.length);
      expect(result.items.length).toBeLessThanOrEqual(3);
      ids.push(...result.items.map(({ id }) => `project:nexo-${id}`));
    }
    expect(ids.sort()).toEqual(expected);
    const events = repository.history({ scenario, pageSize: 100 });
    const expectedEvents = (loaded.data.history.events as JsonObject[])
      .filter((event) => expected.includes(String(event.project_id)));
    expect(events.total).toBe(expectedEvents.length);
    expect(events.items.every((event) => expected.includes(String(event.project_id)))).toBe(true);
  });

  it("returns no district events for an empty NE scenario history", () => {
    expect(repository.history({ district: "150122" }).total).toBe(5);
    expect(repository.history({ scenario: scenarios[2]![1] })).toMatchObject({ items: [], total: 0, totalPages: 0 });
    expect(repository.projects({ projectIds: [] }).total).toBe(0);
    expect(repository.history({ projectIds: [] }).total).toBe(0);
  });

  it("resolves event identity even when its project is absent from the displayed page", () => {
    const page = repository.projects({ scenario: { district_id: "150122" }, pageSize: 1 });
    const events = repository.history({ scenario: { district_id: "150122" } });
    const event = events.items.find((item) => !page.items.some(({ id }) => item.project_id === `project:nexo-${id}`))!;
    expect(event).toBeDefined();
    expect(event.project).toMatchObject({
      id: String(event.project_id).replace("project:nexo-", ""),
      name: expect.any(String), agency: expect.any(String), district: "Miraflores",
    });
    (event.project as JsonObject).name = "mutated client result";
    expect(repository.history({ scenario: { district_id: "150122" } }).items
      .find((item) => item.history_event_id === event.history_event_id)?.project).not.toMatchObject({ name: "mutated client result" });
  });

  it("uses the domain bedroom range in the legacy catalog query too", () => {
    const withMiddleBedroom = loaded.data.projects.find((project) => project.district === "Miraflores" && project.bedrooms_min === 1 && project.bedrooms_max === 3)!;
    expect(repository.projects({ district: "150122", bedrooms: 2, pageSize: 100 }).items.map(({ id }) => id))
      .toContain(String(withMiddleBedroom.id));
  });

  it("calculates positioning over the full query population, not the returned page", () => {
    const scenario = { district_id: "150122" };
    const all = repository.projects({ scenario, pageSize: 100 });
    const first = repository.projects({ scenario, pageSize: 1 });
    expect(first.positioningStats).toEqual(summarizePositioning(all.items));
    expect(first.positioningStats!.count).toBeGreaterThan(1);
    expect(repository.projects({ scenario, query: "Arequipa" }).positioningStats).toEqual(
      summarizePositioning(all.items.filter(({ name, agency, address, district }) =>
        [name, agency, address, district].join(" ").toLowerCase().includes("arequipa"))),
    );
    expect(repository.projects({ scenario, query: "no-such-project-zzz" }).positioningStats)
      .toEqual({ count: 0, medianPublishedPricePen: null });
  });

  it("does not truncate an internal scenario universe larger than 100 projects", () => {
    const data = structuredClone(loaded.data);
    const sample = data.projects.find(({ id }) => id === "1988")!;
    const assignment = data.geography.assignments.find(({ observed_project_id }) => observed_project_id === "observed:nexo-1988")!;
    for (let index = 0; index < 40; index += 1) {
      const id = `scenario-fixture-${index}`;
      data.projects.push({ ...sample, id, project_name: `Scenario fixture ${index}` });
      data.model.projects.push({ project_id: `project:nexo-${id}` });
      data.geography.assignments.push({ ...assignment, observed_project_id: `observed:nexo-${id}`, authoritative_project_id: `project:nexo-${id}` });
    }
    const expanded = new InMemorySnapshotRepository({ ...loaded, data });
    const scenario = { district_id: "150122" };
    const expected = evaluateWorkspace(data, scenario).comparableProjectIds;
    expect(expected.length).toBeGreaterThan(100);
    const first = expanded.projects({ scenario, pageSize: 100 });
    const second = expanded.projects({ scenario, pageSize: 100, page: 2 });
    expect(first.total).toBe(expected.length);
    expect([...first.items, ...second.items].map(({ id }) => `project:nexo-${id}`).sort()).toEqual([...expected].sort());
    expect(first.positioningStats).toEqual(second.positioningStats);
    expect(first.positioningStats).toEqual(summarizePositioning([...first.items, ...second.items]));
  });
});
