import { randomUUID, timingSafeEqual } from "node:crypto";
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import type { OpsConfig } from "./config.js";
import { createOfficialWebApiLoader, type OfficialWebApiLoader } from "./ingestion.js";
import { RefreshRunManager, RunIdConflictError } from "./run-manager.js";
import { demoDistrictIds, refreshChannels, type RunRequest } from "./types.js";

export interface AppDependencies {
  config: OpsConfig;
  logger?: boolean;
  loadOfficialWebApi?: OfficialWebApiLoader;
  manager?: RefreshRunManager;
}

export async function buildApp(dependencies: AppDependencies): Promise<FastifyInstance> {
  const options: FastifyServerOptions = {
    bodyLimit: 64 * 1024,
    genReqId: () => randomUUID(),
    logger: dependencies.logger === false ? false : { level: dependencies.config.logLevel },
  };
  const app = Fastify(options);
  const manager = dependencies.manager ?? new RefreshRunManager({
    config: dependencies.config,
    loadOfficialWebApi: dependencies.loadOfficialWebApi
      ?? createOfficialWebApiLoader(dependencies.config.repositoryRoot),
  });

  app.addHook("onRequest", async (request, reply) => {
    if (!isProtectedRoute(request.url)) return;
    if (!validToken(request.headers["x-ingestion-token"], dependencies.config.ingestionToken)) {
      return reply.code(401).send({
        code: "INGESTION_UNAUTHORIZED",
        message: "El token interno de ingesta no es válido.",
        requestId: request.id,
      });
    }
  });

  app.get("/health/live", async () => ({ status: "ok", service: "viva-ops" }));
  app.get("/health/ready", async (_request, reply) => {
    try {
      await manager.checkReady();
      return {
        status: "ready",
        service: "viva-ops",
        execute: dependencies.config.execute,
        mode: dependencies.config.execute ? "controlled-collection" : "dry-run",
      };
    } catch {
      return reply.code(503).send({
        status: "not_ready",
        service: "viva-ops",
        reason: !dependencies.config.ingestionToken
          ? "INGESTION_TOKEN_MISSING"
          : "INGESTION_API_OR_REGISTRY_UNAVAILABLE",
      });
    }
  });

  app.get("/runs/latest", async () => ({ run: manager.latest() }));

  app.post<{ Body: RunRequest }>("/runs", {
    schema: {
      body: {
        type: "object",
        additionalProperties: false,
        required: ["runId", "scope", "districtIds", "channels"],
        properties: {
          runId: {
            type: "string",
            minLength: 1,
            maxLength: 128,
            pattern: "^[A-Za-z0-9][A-Za-z0-9._-]*$",
          },
          scope: { enum: ["active_district", "demo_districts"] },
          districtIds: {
            type: "array",
            maxItems: 20,
            uniqueItems: true,
            items: { type: "string", minLength: 1, maxLength: 100 },
          },
          channels: {
            type: "array",
            minItems: 1,
            maxItems: refreshChannels.length,
            uniqueItems: true,
            items: { enum: [...refreshChannels] },
          },
        },
      },
    },
  }, async (request, reply) => {
    if (request.body.scope === "active_district" && request.body.districtIds.length !== 1) {
      return reply.code(400).send({
        code: "ACTIVE_DISTRICT_REQUIRED",
        message: "active_district requiere exactamente un districtId.",
        requestId: request.id,
      });
    }
    const normalizedRequest: RunRequest = request.body.scope === "demo_districts"
      ? { ...request.body, districtIds: [...demoDistrictIds] }
      : request.body;
    const started = manager.start(normalizedRequest);
    return reply.code(202).send({
      accepted: true,
      deduplicated: started.deduplicated,
      run: started.run,
    });
  });

  app.setNotFoundHandler((request, reply) => reply.code(404).send({
    code: "ROUTE_NOT_FOUND",
    message: "La ruta solicitada no existe.",
    requestId: request.id,
  }));
  app.setErrorHandler((error, request, reply) => {
    const validation = (error as { validation?: unknown[] }).validation;
    if (validation) {
      return reply.code(400).send({
        code: "REQUEST_INVALID",
        message: "La solicitud no cumple el contrato interno.",
        requestId: request.id,
      });
    }
    if (error instanceof RunIdConflictError) {
      return reply.code(409).send({
        code: "RUN_ID_CONFLICT",
        message: error.message,
        requestId: request.id,
      });
    }
    request.log.error({ err: error }, "ops request failed");
    return reply.code(500).send({
      code: "INTERNAL_ERROR",
      message: "No se pudo procesar la solicitud.",
      requestId: request.id,
    });
  });

  return app;
}

function isProtectedRoute(url: string): boolean {
  const pathname = url.split("?", 1)[0];
  return pathname === "/runs" || pathname === "/runs/latest";
}

function validToken(received: string | string[] | undefined, expected: string | undefined): boolean {
  if (typeof received !== "string" || !expected) return false;
  const receivedBytes = Buffer.from(received);
  const expectedBytes = Buffer.from(expected);
  return receivedBytes.length === expectedBytes.length && timingSafeEqual(receivedBytes, expectedBytes);
}
