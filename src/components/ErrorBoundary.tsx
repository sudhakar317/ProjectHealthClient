import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  /** Changing this clears the error, so navigating away from a broken page recovers on its own. */
  resetKey?: unknown;
}

interface State {
  error: Error | null;
}

/**
 * Without this, one rendering bug blanks the entire app and the user is left with an empty page.
 * With it, only the broken part is replaced, the navigation keeps working, and they can retry.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Render failed", error, info.componentStack);
  }

  componentDidUpdate(previous: Props) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <Card role="alert" className="mx-auto max-w-lg p-6 text-center sm:p-8">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold">This page couldn't be displayed</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Something unexpected went wrong while showing it. Try again, or reload if it keeps happening.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reload page
          </Button>
          <Button onClick={() => this.setState({ error: null })}>
            <RotateCcw />
            Try again
          </Button>
        </div>
      </Card>
    );
  }
}
