import { Value } from "@sinclair/typebox/value";
import { describe, expect, it } from "vitest";
import { ApiErrorSchema, ScenarioInputSchema } from "./index.js";

describe("public API contracts", () => {
  it("accepts a partial scenario and rejects unknown fields", () => {
    expect(Value.Check(ScenarioInputSchema, { district_id: "district:miraflores" })).toBe(true);
    expect(Value.Check(ScenarioInputSchema, { unsafe: true })).toBe(false);
  });

  it("requires the stable error envelope", () => {
    expect(
      Value.Check(ApiErrorSchema, {
        code: "SCENARIO_INVALID",
        message: "No se pudo evaluar el escenario.",
        requestId: "request-1",
        details: [],
      }),
    ).toBe(true);
  });
});
