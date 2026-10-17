import { describe, expect, it } from "vitest";

import { ApiError, NetworkError, UnauthorizedError } from "@/api/client";
import { describeError, hasFieldErrors, isRetryable } from "@/lib/errors";

describe("describeError", () => {
  it("shows the server's own message for a rule it enforced", () => {
    const error = new ApiError(409, "This doctor has patients or visit records, so they can't be deleted");

    expect(describeError(error, "delete the doctor")).toEqual({
      title: "Could not delete the doctor",
      description: "This doctor has patients or visit records, so they can't be deleted",
    });
  });

  it("says offline for a network failure rather than blaming the server", () => {
    expect(describeError(new NetworkError(), "save the visit").description).toMatch(/offline/);
  });

  it("gives a reference to quote for a genuine server fault", () => {
    const error = new ApiError(500, "Something went wrong on our side", {}, "ab12cd34ef56");

    expect(describeError(error).description).toContain("ab12cd34ef56");
  });

  it("calls a 500 with no request id unreachable, because a proxy answered, not the app", () => {
    // What the dev proxy returns when the backend is down: a 500 with no body.
    const error = new ApiError(500, "Request failed (500)");

    expect(describeError(error).description).toMatch(/isn't responding/);
  });

  it.each([502, 503, 504])("treats a %i gateway error as the server being unreachable", (status) => {
    expect(describeError(new ApiError(status, "x", {}, "id")).description).toMatch(/isn't responding/);
  });

  it("tells a signed-out user to sign in again", () => {
    expect(describeError(new UnauthorizedError()).title).toBe("Your session has ended");
  });

  it("never shows a raw JavaScript error message", () => {
    const description = describeError(new TypeError("Cannot read properties of undefined (reading 'id')")).description;

    expect(description).not.toMatch(/undefined|TypeError|reading/);
  });

  it("uses a neutral title when no action is given", () => {
    expect(describeError(new NetworkError()).title).toBe("Something went wrong");
  });
});

describe("isRetryable", () => {
  it("retries what might succeed next time", () => {
    expect(isRetryable(new NetworkError())).toBe(true);
    expect(isRetryable(new ApiError(503, "down"))).toBe(true);
  });

  it("never retries a request that will fail the same way again", () => {
    expect(isRetryable(new ApiError(404, "Not found"))).toBe(false);
    expect(isRetryable(new ApiError(409, "Conflict"))).toBe(false);
    expect(isRetryable(new UnauthorizedError())).toBe(false);
  });
});

describe("hasFieldErrors", () => {
  it("is true only when the server pinned the problem to fields", () => {
    expect(hasFieldErrors(new ApiError(409, "x", { visitDate: "Taken" }))).toBe(true);
    expect(hasFieldErrors(new ApiError(409, "x"))).toBe(false);
    expect(hasFieldErrors(new NetworkError())).toBe(false);
  });
});
