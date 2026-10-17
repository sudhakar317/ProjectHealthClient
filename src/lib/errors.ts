import { ApiError, NetworkError, UnauthorizedError } from "@/api/client";
import { toast } from "@/components/ui/use-toast";

export interface ErrorDescription {
  title: string;
  description: string;
}

/** Statuses a gateway or proxy answers with when the app server itself is down or slow. */
const UNREACHABLE = new Set([502, 503, 504]);

/**
 * Turns any failure into words a person can act on. The server writes its 4xx messages for the
 * user ("This patient already has a visit on that date"), so those are shown as they are; what
 * differs is how a failure we did not anticipate is explained.
 *
 * @param action what was being attempted, phrased to follow "Could not", e.g. "save the visit"
 */
export function describeError(error: unknown, action?: string): ErrorDescription {
  const title = action ? `Could not ${action}` : "Something went wrong";

  if (error instanceof NetworkError) {
    return { title, description: "You appear to be offline. Check your connection and try again." };
  }
  if (error instanceof UnauthorizedError) {
    return { title: "Your session has ended", description: "Please sign in again to continue." };
  }
  if (error instanceof ApiError) {
    if (error.status >= 500) {
      // No request id means the response never came from the app: a proxy answered for it.
      if (UNREACHABLE.has(error.status) || !error.requestId) {
        return { title, description: "The server isn't responding right now. Please try again in a moment." };
      }
      return {
        title,
        description: `Something went wrong on our side. If it keeps happening, quote reference ${error.requestId}.`,
      };
    }
    return { title, description: error.message };
  }
  return { title, description: "An unexpected error occurred. Please try again." };
}

/** The usual response to a failed action: say what failed and why, without leaving the page. */
export function toastError(error: unknown, action?: string) {
  const { title, description } = describeError(error, action);
  toast({ title, description, variant: "destructive" });
}

/** Retrying only helps when the failure was transient; a 4xx will fail the same way every time. */
export function isRetryable(error: unknown): boolean {
  return error instanceof NetworkError || (error instanceof ApiError && error.status >= 500);
}

/** True when the server already attached the problem to specific fields of the form. */
export function hasFieldErrors(error: unknown): error is ApiError {
  return error instanceof ApiError && Object.keys(error.fieldErrors).length > 0;
}
