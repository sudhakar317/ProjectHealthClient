import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ShieldCheck, Stethoscope, TriangleAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";

import { devLogin } from "@/api/auth";
import { ApiError } from "@/api/client";

/** Reasons sent by LoginAuditHandlers as ?error=<reason> after a rejected Google sign-in. */
const errorMessages: Record<string, string> = {
  not_registered: "That Google account is not registered. Ask an admin to add you first.",
  inactive: "That account has been disabled. Contact an admin to re-enable it.",
  unverified_email: "That Google account has an unverified email address.",
  sub_mismatch: "That email is already linked to a different Google account.",
  oauth2_error: "Sign-in with Google failed. Please try again.",
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.2 5.5-4.7 7.2l7.6 5.9c4.4-4.1 6.9-10.1 6.9-17.6z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

/** Development/testing only: stripped from production builds by the import.meta.env.DEV guard below. */
function DevEmailLogin() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await devLogin(email.trim());
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-8 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-left">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-200">
        <TriangleAlert className="size-3.5" />
        Development only
      </p>
      <form onSubmit={(e) => void submit(e)} className="mt-3">
        <label htmlFor="dev-email" className="sr-only">
          Admin or doctor email
        </label>
        <input
          id="dev-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin or doctor email"
          className="w-full rounded-lg border border-white/15 bg-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-white/40 focus-visible:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        />
        <button
          type="submit"
          disabled={busy}
          className="mt-2 w-full rounded-lg bg-white/15 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in with email"}
        </button>
        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      </form>
    </div>
  );
}

export default function LoginPage() {
  const [params] = useSearchParams();
  const reason = params.get("error");
  const message = reason ? (errorMessages[reason] ?? "Sign-in failed. Please try again.") : null;

  return (
    <div className="auth-bg">
      <div className="auth-card text-center text-white">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-lg">
          <Stethoscope className="size-7" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Clinic</h1>
        <p className="mt-1.5 text-sm text-white/60">Sign in to continue</p>

        {message && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-2.5 rounded-xl border border-red-400/30 bg-red-500/15 p-3.5 text-left"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-300" />
            <p className="text-sm text-red-100">{message}</p>
          </div>
        )}

        <button
          onClick={() => window.location.assign("/oauth2/authorization/google")}
          className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl bg-white px-5 py-3.5 text-sm font-medium text-slate-800 shadow-lg transition hover:bg-white/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent active:scale-[0.99]"
        >
          <GoogleIcon />
          Sign in with Google
        </button>

        {import.meta.env.DEV && <DevEmailLogin />}

        <p className="mt-7 flex items-center justify-center gap-1.5 text-xs text-white/50">
          <ShieldCheck className="size-3.5" />
          Access is limited to registered accounts
        </p>
      </div>
    </div>
  );
}
