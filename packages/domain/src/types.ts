import type { Scenario, ScenarioCorrection, ScenarioInput } from "@viva/contracts";

export type JsonObject = Record<string, unknown>;

export interface SnapshotData extends JsonObject {
  metadata: JsonObject & {
    contract_version: string;
    dataset_id: string;
    cutoff_at: string;
    generated_at: string;
    counts?: JsonObject;
  };
  model: JsonObject & { projects: Array<JsonObject & { project_id: string }> };
  projects: JsonObject[];
  geography: JsonObject & { districts: JsonObject[]; assignments: JsonObject[] };
  scenario_catalogs: JsonObject;
  scenario_defaults: Scenario;
  inspector: JsonObject;
  benchmark: JsonObject;
  history: JsonObject;
  assistant: JsonObject;
  pilot?: JsonObject;
}

export interface WorkspaceEvaluation {
  scenario: Scenario;
  scenarioStatus: "valid" | "invalid";
  corrections: ScenarioCorrection[];
  scope: JsonObject;
  coverage: JsonObject;
  marketReading: JsonObject;
  priceDiagnosis: JsonObject;
  comparableProjectIds: string[];
  priceReferenceProjectIds: string[];
  internal: {
    scenarioContext: JsonObject;
    benchmarkContext: JsonObject;
    historyContext: JsonObject;
  };
}

export interface WorkspaceEvaluationInput {
  scenario: ScenarioInput;
}
