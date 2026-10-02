export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
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

  const response = await fetch(path, { ...init, headers, credentials: "include" });
  if (response.status === 401) {
    unauthorizedHandler?.();
    throw new UnauthorizedError();
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
      fieldErrors?: Record<string, string>;
    } | null;
    throw new ApiError(response.status, body?.message ?? `Request failed (${response.status})`, body?.fieldErrors);
  }
  return response;
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init);
  return (await response.json()) as T;
}
