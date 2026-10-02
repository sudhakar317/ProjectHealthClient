import { apiFetch, apiJson, UnauthorizedError } from "./client";

export interface Me {
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
