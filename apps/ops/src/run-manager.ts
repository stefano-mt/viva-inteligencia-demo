import path from "node:path";
import type { OpsConfig } from "./config.js";
import type { OfficialWebApiLoader } from "./ingestion.js";
import type {
  ChannelResult,
  OfficialWebBatchResult,
  RefreshChannel,
  RefreshRun,
  RunRequest,
} from "./types.js";

export interface RunManagerDependencies {
  config: OpsConfig;
  loadOfficialWebApi: OfficialWebApiLoader;
  now?: () => Date;
  schedule?: (task: () => void) => void;
}

export interface StartResult {
  deduplicated: boolean;
  run: RefreshRun;
}

export class RunIdConflictError extends Error {
  constructor() {
    super("El runId ya fue utilizado por una corrida terminada.");
    this.name = "RunIdConflictError";
  }
}

export class RefreshRunManager {
  readonly #config: OpsConfig;
  readonly #loadOfficialWebApi: OfficialWebApiLoader;
  readonly #now: () => Date;
  readonly #schedule: (task: () => void) => void;
  readonly #usedRunIds = new Set<string>();
  #current: RefreshRun;

  constructor(dependencies: RunManagerDependencies) {
    this.#config = dependencies.config;
    this.#loadOfficialWebApi = dependencies.loadOfficialWebApi;
    this.#now = dependencies.now ?? (() => new Date());
    this.#schedule = dependencies.schedule ?? ((task) => setImmediate(task));
    this.#current = emptyRun(this.#config.execute);
  }

  latest(): RefreshRun {
    return cloneRun(this.#current);
  }

  start(request: RunRequest): StartResult {
    if (this.#current.state === "queued" || this.#current.state === "running") {
      return { deduplicated: true, run: this.latest() };
    }
    if (this.#usedRunIds.has(request.runId)) throw new RunIdConflictError();
    this.#usedRunIds.add(request.runId);
    this.#current = {
      runId: request.runId,
      state: "queued",
      requestedAt: this.#now().toISOString(),
      startedAt: null,
      completedAt: null,
      scope: request.scope,
      districtIds: [...request.districtIds],
      channels: [...request.channels],
      channelResults: [],
      message: "Corrida encolada para ejecución fuera del request path.",
      published: false,
      execute: this.#config.execute,
    };
    const queuedRunId = request.runId;
    this.#schedule(() => {
      void this.#execute(request, queuedRunId);
    });
    return { deduplicated: false, run: this.latest() };
  }

  async checkReady(): Promise<void> {
    if (!this.#config.ingestionToken) throw new Error("INGESTION_TOKEN_MISSING");
    const api = await this.#loadOfficialWebApi();
    await api.readSourceRegistry(this.#config.registryPath);
  }

  async #execute(request: RunRequest, queuedRunId: string): Promise<void> {
    if (this.#current.runId !== queuedRunId || this.#current.state !== "queued") return;
    this.#current = {
      ...this.#current,
      state: "running",
      startedAt: this.#now().toISOString(),
      message: this.#config.execute
        ? "Corrida controlada en ejecución."
        : "Corrida de planificación en ejecución; DATA_REFRESH_EXECUTE=false.",
    };
    const results: ChannelResult[] = [];
    for (const channel of request.channels) {
      results.push(await this.#runChannel(channel, request));
    }
    const state = finalState(results);
    this.#current = {
      ...this.#current,
      state,
      completedAt: this.#now().toISOString(),
      channelResults: results,
      message: finalMessage(state, this.#config.execute),
    };
  }

  async #runChannel(channel: RefreshChannel, request: RunRequest): Promise<ChannelResult> {
    if (channel === "nexo_authorized_feed") {
      return {
        channel,
        state: "unsupported",
        code: "AUTHORIZED_FEED_INPUT_REQUIRED",
        message: "Nexo solo admite un feed entregado y autorizado; este servicio no navega el sitio público ni fabrica cobertura.",
      };
    }
    if (channel === "social_official_apis") {
      return {
        channel,
        state: "policy_blocked",
        code: "SOCIAL_API_AUTHORIZATION_REQUIRED",
        message: "Las redes sociales permanecen bloqueadas hasta disponer de APIs oficiales, credenciales y autorización registradas.",
      };
    }
    return this.#runOfficialWebsites(request);
  }

  async #runOfficialWebsites(request: RunRequest): Promise<ChannelResult> {
    try {
      const api = await this.#loadOfficialWebApi();
      const registry = await api.readSourceRegistry(this.#config.registryPath);
      const result = await api.runOfficialWebBatch({
        registry,
        registryReference: relativePortable(this.#config.repositoryRoot, this.#config.registryPath),
        dryRun: !this.#config.execute,
        filters: { districts: districtFilterValues(request.districtIds) },
        runId: request.runId,
      });
      const paths = artifactPaths(this.#config, request.runId);
      // The ingestion package owns serialization and persistence. This service never writes
      // source bodies, staging documents, or manifests itself.
      await api.writeBatchArtifacts(result, paths.outputPath, paths.manifestPath);
      return officialWebResult(this.#config, result, paths);
    } catch (error) {
      return {
        channel: "official_websites",
        state: "failed",
        code: safeIngestionCode(error),
        message: "La API controlada de webs oficiales no pudo completar la corrida.",
      };
    }
  }
}

function artifactPaths(config: OpsConfig, runId: string) {
  const basename = `${runId}.official-web-refresh`;
  return {
    outputPath: path.join(config.stagingDirectory, `${basename}.json`),
    manifestPath: path.join(config.stagingDirectory, `${basename}.manifest.json`),
  };
}

function officialWebResult(
  config: OpsConfig,
  result: OfficialWebBatchResult,
  paths: ReturnType<typeof artifactPaths>,
): ChannelResult {
  const counts = result.manifest.counts;
  const artifact = {
    staging: relativePortable(config.repositoryRoot, paths.outputPath),
    manifest: relativePortable(config.repositoryRoot, paths.manifestPath),
  };
  if (counts.failedTargets > 0) {
    return {
      channel: "official_websites",
      state: "failed",
      code: "OFFICIAL_WEB_TARGETS_FAILED",
      message: "La corrida terminó con uno o más targets fallidos; no se publica ningún dataset.",
      artifact,
      counts,
    };
  }
  if (counts.eligibleTargets === 0) {
    return {
      channel: "official_websites",
      state: "policy_blocked",
      code: counts.policyBlockedTargets > 0 ? "OFFICIAL_WEB_POLICY_BLOCKED" : "OFFICIAL_WEB_TARGETS_UNAVAILABLE",
      message: "No hay targets autorizados y elegibles para las webs oficiales solicitadas.",
      artifact,
      counts,
    };
  }
  return {
    channel: "official_websites",
    state: "succeeded",
    code: result.manifest.mode === "dry-run" ? "OFFICIAL_WEB_PLAN_READY" : "OFFICIAL_WEB_STAGED",
    message: result.manifest.mode === "dry-run"
      ? "Plan controlado generado sin solicitudes de red."
      : "Observaciones sanitizadas y manifiesto guardados en staging para revisión.",
    artifact,
    counts,
  };
}

function finalState(results: ChannelResult[]): RefreshRun["state"] {
  if (results.some((result) => result.state === "failed")) return "failed";
  if (results.some((result) => result.state === "policy_blocked" || result.state === "unsupported")) return "blocked";
  return "succeeded";
}

function finalMessage(state: RefreshRun["state"], execute: boolean): string {
  if (state === "failed") return "Corrida terminada con fallas; no se publicó ningún dataset.";
  if (state === "blocked") return "Corrida terminada con canales no autorizados o no soportados; no se publicó ningún dataset.";
  return execute
    ? "Corrida controlada guardada en staging; requiere validación antes de publicar."
    : "Plan de actualización generado sin ejecutar recolección; DATA_REFRESH_EXECUTE=false.";
}

function safeIngestionCode(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  const code = /^([A-Z][A-Z0-9_]{2,80})(?::|$)/u.exec(message)?.[1];
  return code ?? "OFFICIAL_WEB_REFRESH_FAILED";
}

function relativePortable(root: string, target: string): string {
  return path.relative(root, target).split(path.sep).join("/");
}

function districtFilterValues(districtIds: string[]): string[] {
  const demoDistrictNames: Record<string, string> = {
    "150101": "Cercado de Lima",
    "150113": "Jesus Maria",
    "150120": "Magdalena del Mar",
    "150122": "Miraflores",
    "150131": "San Isidro",
    "150136": "San Miguel",
    "150140": "Santiago de Surco",
  };
  return [...new Set(districtIds.flatMap((districtId) => [
    districtId,
    ...(demoDistrictNames[districtId] ? [demoDistrictNames[districtId]!] : []),
  ]))];
}

function emptyRun(execute: boolean): RefreshRun {
  return {
    runId: null,
    state: "idle",
    requestedAt: null,
    startedAt: null,
    completedAt: null,
    scope: null,
    districtIds: [],
    channels: [],
    channelResults: [],
    message: "No hay corridas en este proceso.",
    published: false,
    execute,
  };
}

function cloneRun(run: RefreshRun): RefreshRun {
  return structuredClone(run);
}
