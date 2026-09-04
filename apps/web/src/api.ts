import type {
  Bootstrap,
  JsonObject,
  Meta,
  Page,
  ProjectSummary,
  Scenario,
  WorkspaceEvaluation,
} from "./types.js";

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly requestId: string | null,
    readonly details: unknown[] = [],
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export interface DataProvider {
  meta(): Promise<Meta>;
  bootstrap(): Promise<Bootstrap>;
  evaluateWorkspace(scenario: Scenario): Promise<WorkspaceEvaluation>;
  projects(parameters?: Record<string, string | number | string[] | undefined>): Promise<Page<ProjectSummary>>;
  project(projectId: string): Promise<JsonObject>;
  inspector(routeSlug: string): Promise<JsonObject>;
  comparison(scenario: Scenario, projectIds: string[], includeTargetScenario?: boolean): Promise<JsonObject>;
  history(parameters?: Record<string, string | number | string[] | undefined>): Promise<Page<JsonObject>>;
  assistant(payload: {
    scenario: Scenario;
    input: string;
    intentId?: string | null;
    projectIds?: string[];
    inspectorRouteSlug?: string | null;
  }): Promise<JsonObject>;
}

export class ApiDataProvider implements DataProvider {
  readonly #baseUrl: string;
  readonly #timeoutMs: number;

  constructor(baseUrl = import.meta.env.VITE_API_BASE_URL || "/api/v1", timeoutMs = 8_000) {
    this.#baseUrl = baseUrl.replace(/\/$/u, "");
    this.#timeoutMs = timeoutMs;
  }

  meta() { return this.#request<Meta>("/meta"); }
  bootstrap() { return this.#request<Bootstrap>("/bootstrap"); }
  evaluateWorkspace(scenario: Scenario) {
    return this.#request<WorkspaceEvaluation>("/workspace/evaluate", {
      method: "POST",
      body: JSON.stringify({ scenario }),
    });
  }
  projects(parameters: Record<string, string | number | string[] | undefined> = {}) {
    return this.#request<Page<ProjectSummary>>(`/projects${queryString(parameters)}`);
  }
  project(projectId: string) {
    return this.#request<JsonObject>(`/projects/${encodeURIComponent(projectId)}`);
  }
  inspector(routeSlug: string) {
    return this.#request<JsonObject>(`/inspector/cases/${encodeURIComponent(routeSlug)}`);
  }
  comparison(scenario: Scenario, projectIds: string[], includeTargetScenario = false) {
    return this.#request<JsonObject>("/comparisons/evaluate", {
      method: "POST",
      body: JSON.stringify({ scenario, projectIds, includeTargetScenario }),
    });
  }
  history(parameters: Record<string, string | number | string[] | undefined> = {}) {
    return this.#request<Page<JsonObject>>(`/history${queryString(parameters)}`);
  }
  assistant(payload: {
    scenario: Scenario;
    input: string;
    intentId?: string | null;
    projectIds?: string[];
    inspectorRouteSlug?: string | null;
  }) {
    return this.#request<JsonObject>("/assistant/answer", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async #request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), this.#timeoutMs);
    try {
      const response = await fetch(`${this.#baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          accept: "application/json",
          ...(init.body ? { "content-type": "application/json" } : {}),
          ...init.headers,
        },
      });
      const payload = await response.json().catch(() => ({})) as JsonObject;
      if (!response.ok) {
        throw new ApiClientError(
          String(payload.message ?? "No se pudo completar la consulta."),
          String(payload.code ?? "API_ERROR"),
          response.status,
          typeof payload.requestId === "string" ? payload.requestId : null,
          Array.isArray(payload.details) ? payload.details : [],
        );
      }
      return payload as T;
    } catch (error) {
      if (error instanceof ApiClientError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ApiClientError("La consulta excedió el tiempo disponible.", "API_TIMEOUT", 408, null);
      }
      throw new ApiClientError("La API no está disponible. Verifica la conexión y reintenta.", "API_UNAVAILABLE", 503, null);
    } finally {
      window.clearTimeout(timeout);
    }
  }
}

function queryString(parameters: Record<string, string | number | string[] | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters)) {
    if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    else if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}
