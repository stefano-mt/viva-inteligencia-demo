import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";
import { ContractVersionSchema, VersionedResponseSchema } from "./common.js";
import { ScenarioCorrectionSchema, ScenarioInputSchema, ScenarioSchema } from "./scenario.js";

export const MetaResponseSchema = Type.Intersect([
  VersionedResponseSchema,
  Type.Object({
    apiVersion: Type.Literal("1.0.0"),
    cutoffAt: Type.String({ format: "date-time" }),
    generatedAt: Type.String({ format: "date-time" }),
    checksum: Type.String({ pattern: "^[a-f0-9]{64}$" }),
    coverage: Type.Object({
      projects: Type.Integer({ minimum: 0 }),
      districts: Type.Integer({ minimum: 0 }),
      selectedAgencies: Type.Integer({ minimum: 0 }),
    }),
  }),
]);

export const BootstrapResponseSchema = Type.Intersect([
  VersionedResponseSchema,
  Type.Object({
    scenarioCatalogs: Type.Record(Type.String(), Type.Unknown()),
    initialScenario: ScenarioSchema,
    navigation: Type.Array(
      Type.Object({
        id: Type.String(),
        label: Type.String(),
        kind: Type.Union([Type.Literal("primary"), Type.Literal("expert")]),
      }),
    ),
    districts: Type.Array(
      Type.Object({
        id: Type.String(),
        name: Type.String(),
        projectCount: Type.Integer({ minimum: 0 }),
        centerLatitude: Type.Union([Type.Null(), Type.Number()]),
        centerLongitude: Type.Union([Type.Null(), Type.Number()]),
        quadrants: Type.Array(
          Type.Object({ id: Type.String(), label: Type.String() }),
        ),
      }),
    ),
    inspectorCases: Type.Array(
      Type.Object({
        id: Type.String(),
        routeSlug: Type.String(),
        qualityStatus: Type.String(),
      }),
    ),
    assistantIntents: Type.Array(
      Type.Object({
        id: Type.String(),
        label: Type.String(),
        question: Type.String(),
      }),
    ),
  }),
]);

export const WorkspaceEvaluateRequestSchema = Type.Object({
  scenario: ScenarioInputSchema,
});

export const WorkspaceEvaluateResponseSchema = Type.Intersect([
  VersionedResponseSchema,
  Type.Object({
    scenario: ScenarioSchema,
    scenarioStatus: Type.Union([Type.Literal("valid"), Type.Literal("invalid")]),
    corrections: Type.Array(ScenarioCorrectionSchema),
    scope: Type.Record(Type.String(), Type.Unknown()),
    coverage: Type.Record(Type.String(), Type.Unknown()),
    marketReading: Type.Record(Type.String(), Type.Unknown()),
    priceDiagnosis: Type.Record(Type.String(), Type.Unknown()),
    benchmark: Type.Record(Type.String(), Type.Unknown()),
    comparableProjectIds: Type.Array(Type.String()),
    priceReferenceProjectIds: Type.Array(Type.String()),
  }),
]);

export const ProjectSummarySchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  agency: Type.String(),
  district: Type.String(),
  address: Type.Union([Type.String(), Type.Null()]),
  typology: Type.Union([Type.String(), Type.Null()]),
  bedrooms: Type.Union([Type.Number(), Type.String(), Type.Null()]),
  areaM2: Type.Union([Type.Number(), Type.Null()]),
  pricePen: Type.Union([Type.Number(), Type.Null()]),
  pricePerM2: Type.Union([Type.Number(), Type.Null()]),
  phase: Type.Union([Type.String(), Type.Null()]),
  sourceUrl: Type.Union([Type.String(), Type.Null()]),
  latitude: Type.Union([Type.Number(), Type.Null()]),
  longitude: Type.Union([Type.Number(), Type.Null()]),
});

export const PaginatedProjectsSchema = Type.Intersect([
  VersionedResponseSchema,
  Type.Object({
    items: Type.Array(ProjectSummarySchema),
    page: Type.Integer({ minimum: 1 }),
    pageSize: Type.Integer({ minimum: 1, maximum: 100 }),
    total: Type.Integer({ minimum: 0 }),
    totalPages: Type.Integer({ minimum: 0 }),
  }),
]);

export const ProjectDetailResponseSchema = Type.Intersect([
  VersionedResponseSchema,
  Type.Object({
    project: Type.Record(Type.String(), Type.Unknown()),
    traceability: Type.Record(Type.String(), Type.Unknown()),
  }),
]);

export const InspectorResponseSchema = Type.Intersect([
  VersionedResponseSchema,
  Type.Object({ dossier: Type.Record(Type.String(), Type.Unknown()) }),
]);

export const ComparisonRequestSchema = Type.Object({
  scenario: ScenarioInputSchema,
  projectIds: Type.Array(Type.String({ minLength: 1 }), { minItems: 2, maxItems: 3 }),
  includeTargetScenario: Type.Optional(Type.Boolean()),
});

export const ComparisonResponseSchema = Type.Intersect([
  VersionedResponseSchema,
  Type.Object({ comparison: Type.Record(Type.String(), Type.Unknown()) }),
]);

export const HistoryResponseSchema = Type.Intersect([
  VersionedResponseSchema,
  Type.Object({
    items: Type.Array(Type.Record(Type.String(), Type.Unknown())),
    page: Type.Integer({ minimum: 1 }),
    pageSize: Type.Integer({ minimum: 1, maximum: 100 }),
    total: Type.Integer({ minimum: 0 }),
    totalPages: Type.Integer({ minimum: 0 }),
  }),
]);

export const AssistantRequestSchema = Type.Object({
  scenario: ScenarioInputSchema,
  input: Type.String({ minLength: 1, maxLength: 1000 }),
  intentId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  projectIds: Type.Optional(Type.Array(Type.String(), { maxItems: 3 })),
  inspectorRouteSlug: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

export const AssistantResponseSchema = Type.Intersect([
  VersionedResponseSchema,
  Type.Object({ answer: Type.Record(Type.String(), Type.Unknown()) }),
]);

export const PublicContractSchema = Type.Object({
  contractVersion: ContractVersionSchema,
});

export type MetaResponse = Static<typeof MetaResponseSchema>;
export type BootstrapResponse = Static<typeof BootstrapResponseSchema>;
export type WorkspaceEvaluateRequest = Static<typeof WorkspaceEvaluateRequestSchema>;
export type ProjectSummary = Static<typeof ProjectSummarySchema>;
export type ComparisonRequest = Static<typeof ComparisonRequestSchema>;
export type AssistantRequest = Static<typeof AssistantRequestSchema>;
