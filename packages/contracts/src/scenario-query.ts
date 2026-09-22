import { Value } from "@sinclair/typebox/value";
import {
  ScenarioHistoryRequestSchema, ScenarioProjectsRequestSchema,
  type ScenarioHistoryRequest, type ScenarioProjectsRequest,
} from "./api.js";

// Validate before HTTP adapters can remove unsupported fields or coerce input.
export function isScenarioProjectsRequest(value: unknown): value is ScenarioProjectsRequest {
  return Value.Check(ScenarioProjectsRequestSchema, value);
}

export function isScenarioHistoryRequest(value: unknown): value is ScenarioHistoryRequest {
  return Value.Check(ScenarioHistoryRequestSchema, value);
}
