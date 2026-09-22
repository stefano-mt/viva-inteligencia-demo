import { Value } from "@sinclair/typebox/value";
import { describe, expect, it } from "vitest";
import { ScenarioHistoryRequestSchema, ScenarioProjectsRequestSchema } from "./api.js";

describe("read-only canonical scenario query contracts", () => {
  it("accepts a scenario with bounded pages without sending project IDs", () => {
    const body = {
      scenario: { district_id: "150122", scope_mode: "quadrant", quadrant_id: "NE" },
      page: 2, pageSize: 100,
    };
    expect(Value.Check(ScenarioProjectsRequestSchema, { ...body, query: "Arequipa", sort: "name" })).toBe(true);
    expect(Value.Check(ScenarioHistoryRequestSchema, body)).toBe(true);
  });

  it("rejects missing scenarios, unbounded pages and unsupported fields", () => {
    for (const schema of [ScenarioProjectsRequestSchema, ScenarioHistoryRequestSchema]) {
      expect(Value.Check(schema, {})).toBe(false);
      expect(Value.Check(schema, { scenario: {}, pageSize: 101 })).toBe(false);
      expect(Value.Check(schema, { scenario: {}, page: 0 })).toBe(false);
      expect(Value.Check(schema, { scenario: {}, projectIds: [] })).toBe(false);
      expect(Value.Check(schema, { scenario: { unsupported: true } })).toBe(false);
    }
  });
});
