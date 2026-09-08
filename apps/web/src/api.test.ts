import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiDataProvider } from "./api.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ApiDataProvider", () => {
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
