export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/** The server was never reached: offline, a dropped connection, or the request blocked on the way. */
export class NetworkError extends Error {
  constructor() {
    super("Network unavailable");
    this.name = "NetworkError";
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fieldErrors: Record<string, string> = {},
    /** Matches the server's log line for this request; worth quoting when reporting a problem. */
    public requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ErrorBody {
  message?: string;
  fieldErrors?: Record<string, string>;
  requestId?: string;
}

let unauthorizedHandler: (() => void) | null = null;

/** Registered by the auth context: called on any 401 so the app falls back to the login page. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

function csrfToken(): string | undefined {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  const token = csrfToken();
  if (token) headers.set("X-XSRF-TOKEN", token);

  let response: Response;
  try {
    response = await fetch(path, { ...init, headers, credentials: "include" });
  } catch (error) {
    // A cancelled request (leaving the page, a superseded query) is not a connection problem.
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new NetworkError();
  }

  if (response.status === 401) {
    unauthorizedHandler?.();
    throw new UnauthorizedError();
  }
  if (!response.ok) {
    // The body is usually the server's ApiError, but a proxy in between may answer with HTML or
    // nothing at all, so every field is optional.
    const body = (await response.json().catch(() => null)) as ErrorBody | null;
    throw new ApiError(
      response.status,
      body?.message ?? `Request failed (${response.status})`,
      body?.fieldErrors ?? {},
      body?.requestId ?? response.headers.get("X-Request-Id") ?? undefined,
    );
  }
  return response;
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init);
  // No Content has no body to parse; reading one would throw.
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
