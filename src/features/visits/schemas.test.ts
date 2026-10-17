import { describe, expect, it } from "vitest";

import { visitSchema } from "@/features/visits/schemas";
import { addDays, todayLocal } from "@/lib/datetime";

const valid = { visitDate: "2026-10-01", notes: "Sore throat", nextVisitDate: "", doctorId: "4" };

const errorsOf = (input: Record<string, string>) => {
  const result = visitSchema.safeParse(input);
  return result.success ? {} : Object.fromEntries(result.error.issues.map((i) => [i.path.join("."), i.message]));
};

describe("visitSchema", () => {
  it("accepts a visit with no follow-up booked", () => {
    expect(visitSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a follow-up after the visit", () => {
    expect(visitSchema.safeParse({ ...valid, nextVisitDate: "2026-10-15" }).success).toBe(true);
  });

  it("rejects a follow-up on the same day as the visit", () => {
    expect(errorsOf({ ...valid, nextVisitDate: "2026-10-01" })).toEqual({
      nextVisitDate: "The next visit must be after the visit date",
    });
  });

  it("rejects a follow-up before the visit", () => {
    expect(errorsOf({ ...valid, nextVisitDate: "2026-09-30" })).toHaveProperty("nextVisitDate");
  });

  it("rejects a visit dated in the future", () => {
    expect(errorsOf({ ...valid, visitDate: addDays(todayLocal(), 1) })).toEqual({
      visitDate: "A visit cannot be in the future",
    });
  });

  it("accepts a visit dated today", () => {
    expect(visitSchema.safeParse({ ...valid, visitDate: todayLocal() }).success).toBe(true);
  });

  it("rejects notes that are only whitespace", () => {
    expect(errorsOf({ ...valid, notes: "   " })).toHaveProperty("notes");
  });
});
