import { randomUUID } from "node:crypto";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import {
  ApiErrorSchema,
  AssistantRequestSchema,
  AssistantResponseSchema,
  BootstrapResponseSchema,
  ComparisonRequestSchema,
  ComparisonResponseSchema,
  DataRefreshAcceptedResponseSchema,
  DataRefreshRequestSchema,
  DataRefreshStatusResponseSchema,
  DistrictGeographyResponseSchema,
  HistoryResponseSchema,
  InspectorResponseSchema,
  MetaResponseSchema,
  PaginatedProjectsSchema,
  ProjectDetailResponseSchema,
  SourceCoverageResponseSchema,
  WorkspaceEvaluateRequestSchema,
  WorkspaceEvaluateResponseSchema,
  type AssistantRequest,
  type ComparisonRequest,
  type DataRefreshRequest,
  type WorkspaceEvaluateRequest,
} from "@viva/contracts";
import {
  answerAssistant,
  evaluateComparison,
  evaluateInspectorCase,
  evaluateWorkspace,
} from "@viva/domain";
import type { DataRepository, ProjectQuery } from "@viva/snapshot";
import type { ApiConfig } from "./config.js";

interface AppDependencies {
  repository: DataRepository | null;
  startupError?: Error | null;
  config: ApiConfig;
  logger?: boolean;
}

interface DataRefreshRunState {
  runId: string | null;
  state: "idle" | "queued" | "running" | "succeeded" | "blocked" | "failed";
  requestedAt: string | null;
  completedAt: string | null;
  message: string;
  published: boolean;
}

export async function buildApp(dependencies: AppDependencies): Promise<FastifyInstance> {
  const logger = dependencies.logger === false
    ? false
    : {
        level: dependencies.config.logLevel,
        ...(process.env.NODE_ENV === "development"
          ? { transport: { target: "pino-pretty", options: { colorize: true } } }
          : {}),
      };
  const options: FastifyServerOptions = {
    bodyLimit: 256 * 1024,
    genReqId: () => randomUUID(),
    logger,
  };
  const app: FastifyInstance = Fastify(options);
  let refreshRun = emptyRefreshRun();

  await app.register(helmet, { global: true, contentSecurityPolicy: false });
  await app.register(cors, {
    origin: dependencies.config.corsOrigin,
    methods: ["GET", "POST", "OPTIONS"],
  });
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Viva Inteligencia API",
        version: "1.0.0",
        description: "API pública, determinista y de solo lectura para el MVP comercial.",
      },
    },
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  const versioned = () => {
    const metadata = requireRepository(dependencies).metadata();
    return {
      datasetVersion: metadata.datasetVersion,
      contractVersion: metadata.contractVersion,
    };
  };

  app.get("/health/live", async () => ({ status: "ok" }));
  app.get("/health/ready", async (_request, reply) => {
    if (!dependencies.repository) {
      return reply.code(503).send({
        status: "not_ready",
        reason: dependencies.startupError?.message ?? "Snapshot no disponible.",
      });
    }
    return { status: "ready", ...versioned() };
  });
  app.get("/openapi.json", async () => app.swagger());

  app.get("/api/v1/meta", {
    schema: { response: { 200: MetaResponseSchema, default: ApiErrorSchema } },
  }, async () => ({
    apiVersion: "1.0.0" as const,
    ...requireRepository(dependencies).metadata(),
  }));

  app.get("/api/v1/bootstrap", {
    schema: { response: { 200: BootstrapResponseSchema, default: ApiErrorSchema } },
  }, async () => ({ ...versioned(), ...requireRepository(dependencies).bootstrap() }));

  app.post<{ Body: WorkspaceEvaluateRequest }>("/api/v1/workspace/evaluate", {
    schema: {
      body: WorkspaceEvaluateRequestSchema,
      response: { 200: WorkspaceEvaluateResponseSchema, default: ApiErrorSchema },
    },
  }, async (request) => {
    const evaluation = evaluateWorkspace(
      requireRepository(dependencies).snapshot(),
      request.body.scenario,
    );
    const { internal: _internal, ...publicEvaluation } = evaluation;
    return { ...versioned(), ...publicEvaluation };
  });

  app.get<{ Querystring: ProjectQuery }>("/api/v1/projects", {
    schema: {
      querystring: {
        type: "object",
        additionalProperties: false,
        properties: {
          page: { type: "integer", minimum: 1 },
          pageSize: { type: "integer", minimum: 1, maximum: 100 },
          district: { type: "string" },
          typology: { type: "string" },
          bedrooms: { anyOf: [{ type: "string" }, { type: "number" }] },
          phase: { type: "string" },
          query: { type: "string", maxLength: 200 },
          projectIds: { type: "array", maxItems: 100, items: { type: "string" } },
          sort: { enum: ["name", "price-asc", "price-desc", "area-asc", "area-desc"] },
        },
      },
      response: { 200: PaginatedProjectsSchema, default: ApiErrorSchema },
    },
  }, async (request) => ({
    ...versioned(),
    ...requireRepository(dependencies).projects(request.query),
  }));

  app.get<{ Params: { projectId: string } }>("/api/v1/projects/:projectId", {
    schema: {
      params: { type: "object", required: ["projectId"], properties: { projectId: { type: "string", minLength: 1 } } },
      response: { 200: ProjectDetailResponseSchema, default: ApiErrorSchema },
    },
  }, async (request, reply) => {
    const result = requireRepository(dependencies).project(request.params.projectId);
    if (!result) return sendError(reply, request.id, 404, "PROJECT_NOT_FOUND", "No se encontró el proyecto.");
    return { ...versioned(), ...result };
  });

  app.get<{ Params: { districtId: string } }>("/api/v1/geography/districts/:districtId", {
    schema: {
      params: { type: "object", required: ["districtId"], properties: { districtId: { type: "string", minLength: 1 } } },
      response: { 200: DistrictGeographyResponseSchema, default: ApiErrorSchema },
    },
  }, async (request, reply) => {
    const result = requireRepository(dependencies).districtGeography(request.params.districtId);
    if (!result) return sendError(reply, request.id, 404, "DISTRICT_GEOGRAPHY_NOT_FOUND", "No se encontró la geometría del distrito.");
    return { ...versioned(), ...result };
  });

  app.get<{ Querystring: { district?: string } }>("/api/v1/source-coverage", {
    schema: {
      querystring: {
        type: "object",
        additionalProperties: false,
        properties: { district: { type: "string", minLength: 1 } },
      },
      response: { 200: SourceCoverageResponseSchema, default: ApiErrorSchema },
    },
  }, async (request) => ({
    ...versioned(),
    ...requireRepository(dependencies).sourceCoverage(request.query.district),
  }));

  app.get("/api/v1/data-refresh/status", {
    schema: { response: { 200: DataRefreshStatusResponseSchema, default: ApiErrorSchema } },
  }, async (request) => {
    if (refreshConfigured(dependencies.config)) {
      try {
        refreshRun = await fetchLatestRefreshRun(dependencies.config, refreshRun);
      } catch (error) {
        request.log.warn({ err: error }, "data refresh status unavailable");
      }
    }
    return {
      ...versioned(),
      enabled: refreshConfigured(dependencies.config),
      lastPublishedAt: requireRepository(dependencies).metadata().generatedAt,
      run: refreshRun,
    };
  });

  app.post<{ Body: DataRefreshRequest; Headers: { "x-data-refresh-key"?: string } }>("/api/v1/data-refresh", {
    schema: {
      body: DataRefreshRequestSchema,
      response: { 202: DataRefreshAcceptedResponseSchema, default: ApiErrorSchema },
    },
  }, async (request, reply) => {
    if (!refreshConfigured(dependencies.config)) {
      return sendError(reply, request.id, 503, "DATA_REFRESH_NOT_CONFIGURED", "La actualización controlada todavía no está configurada en este entorno.");
    }
    if (request.headers["x-data-refresh-key"] !== dependencies.config.dataRefreshOperatorKey) {
      return sendError(reply, request.id, 401, "DATA_REFRESH_UNAUTHORIZED", "La clave de actualización no es válida.");
    }
    const runId = `refresh-${randomUUID()}`;
    const requestedAt = new Date().toISOString();
    refreshRun = {
      runId,
      state: "queued",
      requestedAt,
      completedAt: null,
      message: "Actualización enviada al proceso controlado.",
      published: false,
    };
    try {
      const response = await fetch(`${dependencies.config.dataRefreshDispatchUrl}/runs`, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-ingestion-token": dependencies.config.dataRefreshInternalToken ?? "",
        },
        body: JSON.stringify({
          runId,
          scope: request.body.scope ?? "demo_districts",
          districtIds: request.body.districtIds ?? [],
          channels: request.body.channels ?? ["nexo_authorized_feed", "official_websites", "social_official_apis"],
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (!response.ok) {
        refreshRun = {
          ...refreshRun,
          state: response.status === 409 || response.status === 423 ? "blocked" : "failed",
          completedAt: new Date().toISOString(),
          message: String(payload.message ?? "El proceso de actualización rechazó la solicitud."),
        };
        return sendError(reply, request.id, response.status === 401 ? 502 : response.status, String(payload.code ?? "DATA_REFRESH_REJECTED"), refreshRun.message);
      }
      refreshRun = normalizeOpsRun(payload, refreshRun);
      return reply.code(202).send({ ...versioned(), accepted: true, run: refreshRun });
    } catch (error) {
      request.log.error({ err: error }, "data refresh dispatch failed");
      refreshRun = {
        ...refreshRun,
        state: "failed",
        completedAt: new Date().toISOString(),
        message: "No se pudo contactar el proceso controlado de actualización.",
      };
      return sendError(reply, request.id, 502, "DATA_REFRESH_DISPATCH_FAILED", refreshRun.message);
    }
  });

  app.get<{ Params: { routeSlug: string } }>("/api/v1/inspector/cases/:routeSlug", {
    schema: {
      params: { type: "object", required: ["routeSlug"], properties: { routeSlug: { type: "string", minLength: 1 } } },
      response: { 200: InspectorResponseSchema, default: ApiErrorSchema },
    },
  }, async (request, reply) => {
    const dossier = evaluateInspectorCase(requireRepository(dependencies).snapshot(), request.params.routeSlug);
    if (!dossier) return sendError(reply, request.id, 404, "INSPECTOR_CASE_NOT_FOUND", "No se encontró el caso de evidencia.");
    return { ...versioned(), dossier };
  });

  app.post<{ Body: ComparisonRequest }>("/api/v1/comparisons/evaluate", {
    schema: {
      body: ComparisonRequestSchema,
      response: { 200: ComparisonResponseSchema, default: ApiErrorSchema },
    },
  }, async (request) => ({
    ...versioned(),
    comparison: evaluateComparison(
      requireRepository(dependencies).snapshot(),
      request.body.scenario,
      request.body.projectIds,
      request.body.includeTargetScenario ?? false,
    ),
  }));

  app.get<{ Querystring: ProjectQuery }>("/api/v1/history", {
    schema: {
      querystring: {
        type: "object",
        additionalProperties: false,
        properties: {
          page: { type: "integer", minimum: 1 },
          pageSize: { type: "integer", minimum: 1, maximum: 100 },
          district: { type: "string" },
          projectIds: { type: "array", maxItems: 100, items: { type: "string" } },
        },
      },
      response: { 200: HistoryResponseSchema, default: ApiErrorSchema },
    },
  }, async (request) => ({
    ...versioned(),
    ...requireRepository(dependencies).history(request.query),
  }));

  app.post<{ Body: AssistantRequest }>("/api/v1/assistant/answer", {
    schema: {
      body: AssistantRequestSchema,
      response: { 200: AssistantResponseSchema, default: ApiErrorSchema },
    },
  }, async (request) => ({
    ...versioned(),
    answer: answerAssistant(
      requireRepository(dependencies).snapshot(),
      request.body.scenario,
      request.body.input,
      request.body.intentId ?? null,
      request.body.projectIds ?? [],
      request.body.inspectorRouteSlug ?? null,
    ),
  }));

  app.setNotFoundHandler((request, reply) =>
    sendError(reply, request.id, 404, "ROUTE_NOT_FOUND", "La ruta solicitada no existe."));
  app.setErrorHandler((error, request, reply) => {
    const normalizedError = error as {
      validation?: unknown[];
      statusCode?: number;
      code?: string;
    };
    const validation = normalizedError.validation;
    const statusCode = validation ? 400 : Math.max(400, Number(normalizedError.statusCode ?? 500));
    const code = validation
      ? "REQUEST_INVALID"
      : normalizedError.code ?? (statusCode >= 500 ? "INTERNAL_ERROR" : "REQUEST_FAILED");
    if (statusCode >= 500) request.log.error({ err: error }, "request failed");
    return sendError(
      reply,
      request.id,
      statusCode,
      code,
      validation ? "La solicitud no cumple el contrato." : "No se pudo procesar la solicitud.",
      validation ?? [],
    );
  });

  return app;
}

function refreshConfigured(config: ApiConfig): boolean {
  return config.dataRefreshEnabled
    && Boolean(config.dataRefreshOperatorKey)
    && Boolean(config.dataRefreshDispatchUrl)
    && Boolean(config.dataRefreshInternalToken);
}

function emptyRefreshRun(): DataRefreshRunState {
  return {
    runId: null,
    state: "idle",
    requestedAt: null,
    completedAt: null,
    message: "No se ha solicitado una actualización en este proceso.",
    published: false,
  };
}

async function fetchLatestRefreshRun(config: ApiConfig, fallback: DataRefreshRunState): Promise<DataRefreshRunState> {
  const response = await fetch(`${config.dataRefreshDispatchUrl}/runs/latest`, {
    headers: {
      accept: "application/json",
      "x-ingestion-token": config.dataRefreshInternalToken ?? "",
    },
    signal: AbortSignal.timeout(3_000),
  });
  if (!response.ok) throw new Error(`OPS_STATUS_${response.status}`);
  const payload = await response.json() as unknown;
  return normalizeOpsRun(payload, fallback);
}

function normalizeOpsRun(payload: unknown, fallback: DataRefreshRunState): DataRefreshRunState {
  if (!payload || typeof payload !== "object") return fallback;
  const wrapper = payload as Record<string, unknown>;
  const value = wrapper.run && typeof wrapper.run === "object"
    ? wrapper.run as Record<string, unknown>
    : wrapper;
  const allowedStates = new Set<DataRefreshRunState["state"]>([
    "idle", "queued", "running", "succeeded", "blocked", "failed",
  ]);
  const state = allowedStates.has(value.state as DataRefreshRunState["state"])
    ? value.state as DataRefreshRunState["state"]
    : fallback.state;
  return {
    runId: typeof value.runId === "string" ? value.runId : fallback.runId,
    state,
    requestedAt: typeof value.requestedAt === "string" ? value.requestedAt : fallback.requestedAt,
    completedAt: typeof value.completedAt === "string" ? value.completedAt : null,
    message: typeof value.message === "string" ? value.message : fallback.message,
    published: value.published === true,
  };
}

function requireRepository(dependencies: AppDependencies): DataRepository {
  if (!dependencies.repository) {
    const error = new Error(dependencies.startupError?.message ?? "Snapshot no disponible.");
    Object.assign(error, { statusCode: 503, code: "SNAPSHOT_UNAVAILABLE" });
    throw error;
  }
  return dependencies.repository;
}

function sendError(
  reply: any,
  requestId: string,
  statusCode: number,
  code: string,
  message: string,
  details: unknown[] = [],
) {
  return reply.code(statusCode).send({ code, message, requestId, details });
}
