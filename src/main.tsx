import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toaster } from "./components/ui/toast";
import { isRetryable } from "./lib/errors";
import { ThemeProvider } from "./theme/ThemeProvider";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry only what might succeed next time. The default retries everything three times, so a
      // 404 or 403 sat behind a spinner for seconds before the error state appeared.
      retry: (failureCount, error) => isRetryable(error) && failureCount < 2,
      // Fresh for 30 seconds: switching tabs back no longer refetches every list, and every timeline
      // refetch is an audit-log row (rules.md 5.7). Saves still invalidate, so edits show at once.
      staleTime: 30_000,
    },
    // Never repeat a write behind the user's back: a retried POST could record a visit twice.
    mutations: { retry: false },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            {/* Last line of defence: catches a failure in the layout or auth shell itself. */}
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </BrowserRouter>
        </AuthProvider>
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
