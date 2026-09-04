import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateWorkspace } from "./workspace.js";
import type { SnapshotData } from "./types.js";

const snapshotPath = path.resolve(
  import.meta.dirname,
  "../../../data/generated/viva-platform-demo.json",
);
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8")) as SnapshotData;

describe("workspace domain", () => {
  it("evaluates the default scenario without browser or server state", () => {
    const result = evaluateWorkspace(snapshot, snapshot.scenario_defaults);
    expect(result.scenarioStatus).toBe("valid");
    expect(result.comparableProjectIds.length).toBeGreaterThan(0);
    expect(result.marketReading.comparableProjectCount).toBe(result.comparableProjectIds.length);
  });

  it("corrects an invalid district deterministically", () => {
    const result = evaluateWorkspace(snapshot, { district_id: "district:invalid" });
    expect(result.scenarioStatus).toBe("invalid");
    expect(result.corrections.some(({ code }) => code === "INVALID_DISTRICT")).toBe(true);
    expect(result.scenario.district_id).toBe(snapshot.scenario_defaults.district_id);
  });
});
