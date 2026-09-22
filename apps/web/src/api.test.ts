import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiDataProvider } from "./api.js";
import type { Scenario } from "./types.js";

const originalFetch = globalThis.fetch;
const scenario: Scenario = {
  version: 1,
  district_id: "150122",
  scope_mode: "radius",
  quadrant_id: null,
  center_latitude: -12.121,
  center_longitude: -77.03,
  radius_meters: 1_000,
  typology: "Departamento",
  bedrooms: 2,
  target_area_m2: 80,
  target_price_pen: 650_000,
  delivery_year: 2026,
  visualization: "positioning",
  source: "manual",
};

function jsonResponse(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status, headers: { "content-type": "application/json" },
  });
}

function pageResponse(datasetVersion = "dataset:one", contractVersion = "2.4.0") {
  return {
    datasetVersion, contractVersion,
    items: [], page: 1, pageSize: 18, total: 0, totalPages: 0,
  };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ApiDataProvider", () => {
  it("sends the complete canonical scenario and project query in a read-only POST", async () => {
    const response = {
      ...pageResponse(), page: 2, pageSize: 100,
      positioningStats: { count: 125, medianPublishedPricePen: 650_000 },
    };
    const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => jsonResponse(response));
    globalThis.fetch = fetchMock;
    const provider = new ApiDataProvider("https://api.test/api/v1/", 100);
    const parameters = { page: 2, pageSize: 100, query: "Área & precio", sort: "price-asc" };

    await expect(provider.scenarioProjects(scenario, parameters)).resolves.toEqual(response);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.test/api/v1/projects/query");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ accept: "application/json", "content-type": "application/json" });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(init?.body))).toEqual({ scenario, ...parameters });
    expect(JSON.parse(String(init?.body))).not.toHaveProperty("projectIds");
  });

  it("sends the full history scenario and retains event identity from the response", async () => {
    const historyScenario = { ...scenario, scope_mode: "quadrant" as const, quadrant_id: "NW", center_latitude: null, center_longitude: null, radius_meters: null };
    const response = {
      ...pageResponse(), page: 2, pageSize: 20, total: 21, totalPages: 2,
      items: [{
        history_event_id: "event:example", project_id: "project:nexo-1988",
        project: { id: "1988", name: "Arequipa", agency: "ACTUAL", district: "Miraflores" },
      }],
    };
    const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => jsonResponse(response));
    globalThis.fetch = fetchMock;

    await expect(new ApiDataProvider("/api/v1", 100).scenarioHistory(historyScenario, { page: 2, pageSize: 20 }))
      .resolves.toEqual(response);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/v1/history/query");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ accept: "application/json", "content-type": "application/json" });
    expect(JSON.parse(String(init?.body))).toEqual({ scenario: historyScenario, page: 2, pageSize: 20 });
  });

  it.each(["scenarioProjects", "scenarioHistory"] as const)("sends only the scenario when %s pagination is omitted", async (method) => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => jsonResponse(pageResponse()));
    globalThis.fetch = fetchMock;
    await new ApiDataProvider("/api/v1", 100)[method](scenario);
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]?.body))).toEqual({ scenario });
  });

  it.each(["scenarioProjects", "scenarioHistory"] as const)("preserves a structured 503 from %s instead of returning a successful page", async (method) => {
    globalThis.fetch = vi.fn(async () => jsonResponse({
      code: "SNAPSHOT_UNAVAILABLE", message: "Snapshot no disponible.",
      requestId: "request-503", details: [{ component: "snapshot" }],
    }, 503));
    await expect(new ApiDataProvider("/api/v1", 100)[method](scenario)).rejects.toMatchObject({
      name: "ApiClientError", status: 503, code: "SNAPSHOT_UNAVAILABLE",
      requestId: "request-503", message: "Snapshot no disponible.", details: [{ component: "snapshot" }],
    });
  });

  it.each(["scenarioProjects", "scenarioHistory"] as const)("aborts timed-out %s requests and clears its timer", async (method) => {
    vi.useFakeTimers();
    let requestSignal: AbortSignal | null | undefined;
    globalThis.fetch = vi.fn((_input, init) => new Promise<Response>((_resolve, reject) => {
      requestSignal = init?.signal;
      requestSignal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    }));
    const rejection = expect(new ApiDataProvider("/api/v1", 25)[method](scenario)).rejects.toMatchObject({
      code: "API_TIMEOUT", status: 408, requestId: null,
    });
    await vi.advanceTimersByTimeAsync(24);
    expect(requestSignal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await rejection;
    expect(requestSignal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["scenarioProjects", "scenarioHistory"] as const)("rejects incompatible contracts on %s even after successful initialization", async (method) => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse(pageResponse()))
      .mockResolvedValueOnce(jsonResponse(pageResponse("dataset:one", "3.0.0")));
    const provider = new ApiDataProvider("/api/v1", 100);
    await provider.meta();
    await expect(provider[method](scenario)).rejects.toMatchObject({
      name: "ApiClientError", code: "CONTRACT_INCOMPATIBLE", status: 409,
    });
  });

  it.each([
    { label: "empty body", body: "", code: "CONTRACT_INCOMPATIBLE", status: 409 },
    { label: "non-JSON body", body: "<html>Unavailable proxy</html>", code: "CONTRACT_INCOMPATIBLE", status: 409 },
    { label: "JSON null", body: "null", code: "CONTRACT_INCOMPATIBLE", status: 409 },
    { label: "empty JSON object", body: "{}", code: "CONTRACT_INCOMPATIBLE", status: 409 },
    { label: "missing contract version", body: JSON.stringify({ datasetVersion: "dataset:one" }), code: "CONTRACT_INCOMPATIBLE", status: 409 },
    { label: "missing dataset version", body: JSON.stringify({ contractVersion: "2.4.0" }), code: "API_RESPONSE_INVALID", status: 502 },
    { label: "empty dataset version", body: JSON.stringify({ contractVersion: "2.4.0", datasetVersion: "" }), code: "API_RESPONSE_INVALID", status: 502 },
  ])("fails closed for a successful HTTP response with $label", async ({ body, code, status }) => {
    globalThis.fetch = vi.fn(async () => new Response(body, { status: 200 }));
    await expect(new ApiDataProvider("/api/v1", 100).scenarioProjects(scenario)).rejects.toMatchObject({
      name: "ApiClientError", code, status, requestId: null,
    });
  });

  it.each(["scenarioProjects", "scenarioHistory"] as const)("rejects a changed dataset on %s without replacing the pinned version", async (method) => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse(pageResponse("dataset:one")))
      .mockResolvedValueOnce(jsonResponse(pageResponse("dataset:two")))
      .mockResolvedValueOnce(jsonResponse(pageResponse("dataset:one")));
    const provider = new ApiDataProvider("/api/v1", 100);
    await provider.meta();
    await expect(provider[method](scenario)).rejects.toMatchObject({
      name: "ApiClientError", code: "DATASET_CHANGED", status: 409,
    });
    await expect(provider[method](scenario)).resolves.toMatchObject({ datasetVersion: "dataset:one" });
  });

  it("pins a version from the first successful response even when meta has not loaded", async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse(pageResponse("dataset:one")))
      .mockResolvedValueOnce(jsonResponse(pageResponse("dataset:two")));
    const provider = new ApiDataProvider("/api/v1", 100);
    await provider.bootstrap();
    await expect(provider.scenarioHistory(scenario)).rejects.toMatchObject({ code: "DATASET_CHANGED", status: 409 });
  });

  it("normalizes structured API errors", async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({
      code: "SCENARIO_INVALID",
      message: "No se pudo evaluar el escenario.",
      requestId: "request-1",
      details: [{ path: "district_id" }],
    }), {
      status: 400,
      headers: { "content-type": "application/json" },
    }));

    await expect(new ApiDataProvider("https://api.test/api/v1", 100).meta()).rejects.toMatchObject({
      name: "ApiClientError",
      code: "SCENARIO_INVALID",
      status: 400,
      requestId: "request-1",
    });
  });

  it("fails with API_UNAVAILABLE when the network is down", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError("network down");
    });

    await expect(new ApiDataProvider("https://api.test/api/v1", 100).meta()).rejects.toEqual(
      expect.objectContaining({ code: "API_UNAVAILABLE", status: 503 }),
    );
  });

  it("aborts a request that exceeds the configured timeout", async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn((_url, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new DOMException("aborted", "AbortError"));
      });
    }));

    const rejection = expect(new ApiDataProvider("https://api.test/api/v1", 25).meta()).rejects.toMatchObject({
      code: "API_TIMEOUT",
      status: 408,
    });
    await vi.advanceTimersByTimeAsync(25);
    await rejection;
  });

  it("uses the protected refresh contract without exposing the operator key in the payload", async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({
      contractVersion: "2.4.0",
      datasetVersion: "dataset:one",
      accepted: true,
      run: {
        runId: "refresh-1",
        state: "queued",
        requestedAt: "2026-09-08T00:00:00.000Z",
        completedAt: null,
        message: "Solicitud aceptada.",
        published: false,
      },
    }), { status: 202, headers: { "content-type": "application/json" } }));
    globalThis.fetch = fetchMock;
    const provider = new ApiDataProvider("https://api.test/api/v1", 100);
    await provider.requestDataRefresh({
      scope: "active_district",
      districtIds: ["150122"],
      channels: ["official_websites"],
    }, "operator-secret");
    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall).toBeDefined();
    const [url, init] = firstCall!;
    expect(url).toBe("https://api.test/api/v1/data-refresh");
    expect(init?.headers).toMatchObject({ "x-data-refresh-key": "operator-secret" });
    expect(String(init?.body)).not.toContain("operator-secret");
  });
});
