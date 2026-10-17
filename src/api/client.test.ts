import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiFetch, apiJson, NetworkError, setUnauthorizedHandler, UnauthorizedError } from "@/api/client";

function respond(status: number, body?: unknown, headers: Record<string, string> = {}) {
  const init = { status, headers: { "Content-Type": "application/json", ...headers } };
  return new Response(body === undefined ? null : typeof body === "string" ? body : JSON.stringify(body), init);
}

describe("apiFetch", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setUnauthorizedHandler(null);
  });

  it("sends the CSRF token from the cookie and includes credentials", async () => {
    document.cookie = "XSRF-TOKEN=tok%2Fen";
    fetchMock.mockResolvedValue(respond(200, {}));

    await apiFetch("/api/patients", { method: "POST" });

    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init?.headers).get("X-XSRF-TOKEN")).toBe("tok/en");
    expect(init?.credentials).toBe("include");
  });

  it("turns a refused connection into a NetworkError, not a raw TypeError", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(apiFetch("/api/patients")).rejects.toBeInstanceOf(NetworkError);
  });

  it("lets a cancelled request through as a cancellation, not a network failure", async () => {
    fetchMock.mockRejectedValue(new DOMException("aborted", "AbortError"));

    await expect(apiFetch("/api/patients")).rejects.toMatchObject({ name: "AbortError" });
  });

  it("signs the user out on a 401", async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    fetchMock.mockResolvedValue(respond(401, { message: "Your session has ended" }));

    await expect(apiFetch("/api/me")).rejects.toBeInstanceOf(UnauthorizedError);
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it("carries the server's message, field errors and request id", async () => {
    fetchMock.mockResolvedValue(
      respond(409, {
        message: "This patient already has a visit on that date",
        fieldErrors: { visitDate: "This patient already has a visit on that date" },
        requestId: "ab12cd34ef56",
      }),
    );

    const error = await apiFetch("/api/patients/1/visits").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      message: "This patient already has a visit on that date",
      fieldErrors: { visitDate: "This patient already has a visit on that date" },
      requestId: "ab12cd34ef56",
    });
  });

  it("survives an error page that is not JSON, falling back to the header id", async () => {
    fetchMock.mockResolvedValue(respond(502, "<html>Bad Gateway</html>", { "X-Request-Id": "edge-12345678" }));

    const error = await apiFetch("/api/patients").catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 502, fieldErrors: {}, requestId: "edge-12345678" });
  });
});

describe("apiJson", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns undefined for No Content instead of failing to parse an empty body", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(apiJson("/api/visits/1")).resolves.toBeUndefined();
  });

  it("parses a JSON body", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(respond(200, { id: 7 })));

    await expect(apiJson<{ id: number }>("/api/visits/7")).resolves.toEqual({ id: 7 });
  });
});
