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
  HistoryResponseSchema,
  InspectorResponseSchema,
  MetaResponseSchema,
  PaginatedProjectsSchema,
  ProjectDetailResponseSchema,
  WorkspaceEvaluateRequestSchema,
  WorkspaceEvaluateResponseSchema,
  type AssistantRequest,
  type ComparisonRequest,
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
