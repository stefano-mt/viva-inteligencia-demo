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
});
