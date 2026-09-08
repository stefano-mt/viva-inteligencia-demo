import path from "node:path";
import { pathToFileURL } from "node:url";
import type { OfficialWebRefreshApi } from "./types.js";

export type OfficialWebApiLoader = () => Promise<OfficialWebRefreshApi>;

export function createOfficialWebApiLoader(repositoryRoot: string): OfficialWebApiLoader {
  let cached: Promise<OfficialWebRefreshApi> | undefined;
  return () => {
    cached ??= loadOfficialWebApi(repositoryRoot).catch((error: unknown) => {
      cached = undefined;
      throw error;
    });
    return cached;
  };
}

async function loadOfficialWebApi(repositoryRoot: string): Promise<OfficialWebRefreshApi> {
  const packageModule = "@viva/ingestion-tools/dist/official-web-refresh.js";
  const fileModule = pathToFileURL(
    path.resolve(repositoryRoot, "tools", "ingestion", "dist", "official-web-refresh.js"),
  ).href;
  let lastError: unknown;
  for (const specifier of [packageModule, fileModule]) {
    try {
      const loaded: unknown = await import(specifier);
      if (isOfficialWebApi(loaded)) return loaded;
      lastError = new Error("El módulo no expone la API official-web-refresh esperada.");
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error("INGESTION_API_UNAVAILABLE", { cause: lastError });
}

function isOfficialWebApi(value: unknown): value is OfficialWebRefreshApi {
  if (!value || typeof value !== "object") return false;
  const api = value as Record<string, unknown>;
  return typeof api.readSourceRegistry === "function"
    && typeof api.runOfficialWebBatch === "function"
    && typeof api.writeBatchArtifacts === "function";
}
