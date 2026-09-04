import path from "node:path";
import { describe, expect, it } from "vitest";
import { InMemorySnapshotRepository } from "./repository.js";
import { loadAndValidateSnapshot, SnapshotValidationError } from "./validation.js";

const root = path.resolve(import.meta.dirname, "../../..");
const snapshotPath = path.join(root, "data/generated/viva-platform-demo.json");
const schemaPath = path.join(root, "packages/contracts/schemas/demo-v2.schema.json");

describe("snapshot repository", () => {
  it("validates, indexes and paginates the immutable snapshot", async () => {
    const loaded = await loadAndValidateSnapshot({ snapshotPath, schemaPath });
    const repository = new InMemorySnapshotRepository(loaded);
    const page = repository.projects({ district: "Miraflores", pageSize: 5 });
    expect(repository.metadata().contractVersion).toBe("2.4.0");
    expect(page.items).toHaveLength(5);
    expect(page.total).toBe(90);
    expect(page.items.every(({ district }) => district === "Miraflores")).toBe(true);
  });

  it("fails closed on a checksum mismatch", async () => {
    await expect(loadAndValidateSnapshot({
      snapshotPath,
      schemaPath,
      expectedChecksum: "0".repeat(64),
    })).rejects.toBeInstanceOf(SnapshotValidationError);
  });
});
