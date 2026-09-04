import fs from "node:fs/promises";
import os from "node:os";
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

  it("fails closed on corrupt JSON", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "viva-snapshot-"));
    const corruptPath = path.join(directory, "corrupt.json");
    await fs.writeFile(corruptPath, "{not-json", "utf8");
    try {
      await expect(loadAndValidateSnapshot({
        snapshotPath: corruptPath,
        schemaPath,
      })).rejects.toMatchObject({ code: "SNAPSHOT_INVALID" });
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects an incompatible contract version", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "viva-snapshot-"));
    const incompatiblePath = path.join(directory, "incompatible.json");
    const data = JSON.parse(await fs.readFile(snapshotPath, "utf8"));
    data.metadata.contract_version = "9.9.0";
    await fs.writeFile(incompatiblePath, JSON.stringify(data), "utf8");
    try {
      await expect(loadAndValidateSnapshot({
        snapshotPath: incompatiblePath,
        schemaPath,
      })).rejects.toMatchObject({ code: "SNAPSHOT_INVALID" });
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });
});
