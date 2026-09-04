import { buildApp } from "./app.js";
import { readConfig } from "./config.js";
import { InMemorySnapshotRepository, loadAndValidateSnapshot } from "@viva/snapshot";

const config = readConfig();
let repository: InMemorySnapshotRepository | null = null;
let startupError: Error | null = null;

try {
  const loaded = await loadAndValidateSnapshot({
    snapshotPath: config.snapshotPath,
    schemaPath: config.schemaPath,
    ...(config.snapshotChecksum ? { expectedChecksum: config.snapshotChecksum } : {}),
  });
  repository = new InMemorySnapshotRepository(loaded);
} catch (error) {
  startupError = error instanceof Error ? error : new Error(String(error));
}

const app = await buildApp({ repository, startupError, config });
await app.listen({ host: config.host, port: config.port });

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "shutdown requested");
  await app.close();
  process.exit(0);
};
process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
