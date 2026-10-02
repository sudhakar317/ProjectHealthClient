import { ShieldCheck, Stethoscope } from "lucide-react";

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

export default function LoginPage() {
  return (
    <div className="app-bg flex items-center justify-center p-4">
      <div className="glass relative z-10 w-full max-w-md rounded-[2rem] p-12 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/50 bg-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_8px_20px_rgba(31,38,135,0.25)] backdrop-blur-md">
          <Stethoscope className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-semibold tracking-tight drop-shadow-sm">Clinic</h1>
        <p className="mt-2 text-sm text-white/75">Sign in to continue</p>

        <button
          onClick={() => window.location.assign("/oauth2/authorization/google")}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl bg-white/90 px-5 py-3.5 backdrop-blur-md text-sm font-medium text-slate-800 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 active:translate-y-0"
        >
          <GoogleIcon />
          Sign in with Google
        </button>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-white/60">
          <ShieldCheck className="h-3.5 w-3.5" />
          Access is limited to registered accounts
        </p>
      </div>
    </div>
  );
}
