import type { ScenarioInput } from "@viva/contracts";
import { buildBenchmarkContext, buildComparisonModel } from "./legacy/benchmark.js";
import { buildComparabilityContext, roundHalfAwayFromZero } from "./legacy/comparability.js";
import { buildEvidenceDossier } from "./legacy/evidence-inspector.js";
import { buildHistoryContext, normalizeHistoryFilters } from "./legacy/history.js";
import { buildAssistantResponse } from "./legacy/assistant-engine.js";
import {
  buildTerritorialContext,
  createScenarioEnvironment,
  validateScenario,
} from "./legacy/scenario.js";
import type { JsonObject, SnapshotData, WorkspaceEvaluation } from "./types.js";

type LegacyFunction = (...args: any[]) => any;
const callBuildBenchmarkContext = buildBenchmarkContext as LegacyFunction;
const callBuildComparisonModel = buildComparisonModel as LegacyFunction;
const callBuildComparabilityContext = buildComparabilityContext as LegacyFunction;
const callBuildEvidenceDossier = buildEvidenceDossier as LegacyFunction;
const callBuildHistoryContext = buildHistoryContext as LegacyFunction;
const callNormalizeHistoryFilters = normalizeHistoryFilters as LegacyFunction;
const callBuildAssistantResponse = buildAssistantResponse as LegacyFunction;
const callBuildTerritorialContext = buildTerritorialContext as LegacyFunction;
const callCreateScenarioEnvironment = createScenarioEnvironment as LegacyFunction;
const callValidateScenario = validateScenario as LegacyFunction;

function asJsonObject(value: unknown): JsonObject {
  return (value ?? {}) as JsonObject;
}

export function evaluateWorkspace(
  data: SnapshotData,
  scenarioInput: ScenarioInput = {},
): WorkspaceEvaluation {
  const environment = callCreateScenarioEnvironment(data);
  const validated = callValidateScenario(
    { ...environment.defaults, ...scenarioInput, version: 1 },
    environment,
    { source: "api" },
  );
  const territorial = callBuildTerritorialContext({
    scenarioState: validated,
    geography: data.geography,
    boundaryArtifactStatus: "valid",
  });
  const comparability = callBuildComparabilityContext({
    territorialContext: territorial,
    projects: data.projects,
    authoritativeProjectIds: data.model.projects.map(({ project_id }) => project_id),
    cutoffAt: data.metadata.cutoff_at,
  });
  const geographyTotal = territorial.observed_scope_project_ids.length;
  const geographyIncluded = territorial.geography_valid_project_ids.length;
  const geographyCoveragePct = geographyTotal === 0
    ? 0
    : roundHalfAwayFromZero((geographyIncluded / geographyTotal) * 100, 1) ?? 0;
  const scenarioContext = {
    scenario: structuredClone(validated.scenario),
    scope: structuredClone(territorial.scope),
    comparable_project_ids: [...comparability.comparable_project_ids],
    price_reference_project_ids: [...comparability.price_reference_project_ids],
    cutoff_at: data.metadata.cutoff_at,
    scenario_status: validated.scenario_status,
    comparability_status: comparability.comparability_status,
  };
  const targetPrice = validated.scenario.target_price_pen;
  const targetArea = validated.scenario.target_area_m2;
  const benchmarkContext = callBuildBenchmarkContext({
    data,
    scenarioContext,
    targetScenario: targetPrice == null && targetArea == null
      ? null
      : {
          target_price_pen: targetPrice,
          target_area_m2: targetArea,
          district: validated.scenario.district_id,
          delivery_status: validated.scenario.delivery_year === "all"
            ? null
            : String(validated.scenario.delivery_year),
        },
  });
  const historyContext = callBuildHistoryContext({
    data,
    scenarioContext,
    filters: callNormalizeHistoryFilters(),
  });
  return {
    scenario: structuredClone(validated.scenario),
    scenarioStatus: validated.scenario_status as "valid" | "invalid",
    corrections: structuredClone(validated.corrections),
    scope: asJsonObject(territorial.scope),
    coverage: {
      geographyIncluded,
      geographyTotal,
      geographyCoveragePct,
      evidenceCoveragePct: comparability.evidence_coverage_pct,
    },
    marketReading: {
      comparableProjectCount: comparability.comparable_project_ids.length,
      priceReferenceCount: comparability.price_reference_project_ids.length,
      medianPricePerM2: comparability.price_diagnosis.median,
      pricePosition: comparability.price_diagnosis.position,
    },
    priceDiagnosis: asJsonObject(comparability.price_diagnosis),
    comparableProjectIds: [...comparability.comparable_project_ids],
    priceReferenceProjectIds: [...comparability.price_reference_project_ids],
    internal: {
      scenarioContext: asJsonObject(scenarioContext),
      benchmarkContext: asJsonObject(benchmarkContext),
      historyContext: asJsonObject(historyContext),
    },
  };
}

export function evaluateComparison(
  data: SnapshotData,
  scenario: ScenarioInput,
  projectIds: string[],
  includeTargetScenario = false,
): JsonObject {
  const workspace = evaluateWorkspace(data, scenario);
  return asJsonObject(callBuildComparisonModel({
    benchmarkContext: workspace.internal.benchmarkContext,
    selectedProjectIds: projectIds,
    includeTargetScenario,
  }));
}

export function evaluateInspectorCase(data: SnapshotData, routeSlug: string): JsonObject | null {
  const inspectorCase = (data.inspector.cases as JsonObject[] | undefined)?.find(
    (item) => item.route_slug === routeSlug || item.case_id === routeSlug,
  );
  if (!inspectorCase) return null;
  return asJsonObject(callBuildEvidenceDossier({
    model: data.model,
    inspector: data.inspector,
    projectId: inspectorCase.project_id,
    typologyId: inspectorCase.typology_id,
  }));
}

export function answerAssistant(
  data: SnapshotData,
  scenario: ScenarioInput,
  input: string,
  intentId: string | null = null,
  projectIds: string[] = [],
  inspectorRouteSlug: string | null = null,
): JsonObject {
  const workspace = evaluateWorkspace(data, scenario);
  const comparisonModel = projectIds.length >= 2
    ? evaluateComparison(data, scenario, projectIds, false)
    : null;
  const inspectorDossier = inspectorRouteSlug
    ? evaluateInspectorCase(data, inspectorRouteSlug)
    : null;
  return asJsonObject(callBuildAssistantResponse({
    data,
    scenarioContext: workspace.internal.scenarioContext,
    historyContext: workspace.internal.historyContext,
    benchmarkContext: workspace.internal.benchmarkContext,
    comparisonModel,
    inspectorDossier,
    input,
    intentId,
  }));
}
