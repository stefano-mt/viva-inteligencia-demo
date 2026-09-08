import path from "node:path";

export interface OpsConfig {
  host: string;
  port: number;
  logLevel: string;
  ingestionToken?: string;
  execute: boolean;
  repositoryRoot: string;
  registryPath: string;
  stagingDirectory: string;
}

export function readConfig(environment: NodeJS.ProcessEnv = process.env): OpsConfig {
  const repositoryRoot = path.resolve(import.meta.dirname, "..", "..", "..");
  const configuredRoot = environment.REPOSITORY_ROOT?.trim();
  const root = configuredRoot ? path.resolve(configuredRoot) : repositoryRoot;
  const token = environment.INGESTION_TOKEN?.trim()
    || environment.DATA_REFRESH_INTERNAL_TOKEN?.trim();
  const registryPath = path.resolve(
    environment.INGESTION_REGISTRY_PATH?.trim()
      || path.join(root, "data", "source", "ingestion", "source-registry.json"),
  );
  const stagingDirectory = path.resolve(
    environment.INGESTION_STAGING_DIRECTORY?.trim()
      || path.join(root, "data", "staging", "ops"),
  );
  assertInside(path.join(root, "data", "staging"), stagingDirectory, "INGESTION_STAGING_DIRECTORY");
  return {
    host: environment.OPS_HOST?.trim() || "0.0.0.0",
    port: integer(environment.OPS_PORT, 3100),
    logLevel: environment.LOG_LEVEL?.trim() || "info",
    ...(token ? { ingestionToken: token } : {}),
    execute: environment.DATA_REFRESH_EXECUTE?.trim().toLowerCase() === "true",
    repositoryRoot: root,
    registryPath,
    stagingDirectory,
  };
}

function integer(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65_536 ? parsed : fallback;
}

function assertInside(parent: string, candidate: string, label: string): void {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} debe quedar dentro de data/staging.`);
  }
}
