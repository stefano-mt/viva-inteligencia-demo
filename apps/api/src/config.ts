import path from "node:path";

export interface ApiConfig {
  host: string;
  port: number;
  logLevel: string;
  corsOrigin: string | boolean;
  snapshotPath: string;
  schemaPath: string;
  snapshotChecksum?: string;
  dataRefreshEnabled: boolean;
  dataRefreshOperatorKey?: string;
  dataRefreshDispatchUrl?: string;
  dataRefreshInternalToken?: string;
}

export function readConfig(environment: NodeJS.ProcessEnv = process.env): ApiConfig {
  const repositoryRoot = path.resolve(import.meta.dirname, "..", "..", "..");
  const checksum = environment.SNAPSHOT_SHA256?.trim();
  const refreshOperatorKey = environment.DATA_REFRESH_OPERATOR_KEY?.trim();
  const refreshDispatchUrl = environment.DATA_REFRESH_DISPATCH_URL?.trim();
  const refreshInternalToken = environment.DATA_REFRESH_INTERNAL_TOKEN?.trim();
  return {
    host: environment.API_HOST?.trim() || "0.0.0.0",
    port: integer(environment.API_PORT, 3000),
    logLevel: environment.LOG_LEVEL?.trim() || "info",
    corsOrigin: parseCors(environment.CORS_ORIGIN),
    snapshotPath: path.resolve(
      environment.SNAPSHOT_PATH?.trim() ||
        path.join(repositoryRoot, "data", "generated", "viva-platform-demo.json"),
    ),
    schemaPath: path.resolve(
      environment.SNAPSHOT_SCHEMA_PATH?.trim() ||
        path.join(repositoryRoot, "packages", "contracts", "schemas", "demo-v2.schema.json"),
    ),
    ...(checksum ? { snapshotChecksum: checksum } : {}),
    dataRefreshEnabled: environment.DATA_REFRESH_ENABLED?.trim().toLowerCase() === "true",
    ...(refreshOperatorKey ? { dataRefreshOperatorKey: refreshOperatorKey } : {}),
    ...(refreshDispatchUrl ? { dataRefreshDispatchUrl: refreshDispatchUrl.replace(/\/$/u, "") } : {}),
    ...(refreshInternalToken ? { dataRefreshInternalToken: refreshInternalToken } : {}),
  };
}

function integer(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65_536 ? parsed : fallback;
}

function parseCors(value: string | undefined): string | boolean {
  const normalized = value?.trim();
  if (!normalized || normalized === "same-origin") return false;
  if (normalized === "*") return true;
  return normalized;
}
