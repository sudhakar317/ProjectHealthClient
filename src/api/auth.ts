import { apiFetch, apiJson, UnauthorizedError } from "./client";

export interface Me {
  /** Lets the UI tell the signed-in doctor's own records apart from another doctor's. */
  id: number;
  email: string;
  role: "ADMIN" | "DOCTOR";
}

/** Resolves to null when not signed in. */
export async function getMe(): Promise<Me | null> {
  try {
    return await apiJson<Me>("/api/me");
  } catch (e) {
    if (e instanceof UnauthorizedError) return null;
    throw e;
  }
}

export async function logout(): Promise<void> {
  await apiFetch("/logout", { method: "POST" });
}

/** Dev/test only: backend exposes this solely under its "local" profile. */
export const devLogin = (email: string) =>
  apiJson<Me>("/api/dev/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
