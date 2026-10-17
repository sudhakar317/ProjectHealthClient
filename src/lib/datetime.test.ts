import { afterEach, describe, expect, it, vi } from "vitest";

import { addDays, daysBetween, formatDate, todayLocal } from "@/lib/datetime";

describe("todayLocal", () => {
  afterEach(() => vi.useRealTimers());

  it("is the local calendar day just after midnight, not yesterday in UTC", () => {
    // 01:00 on 18 Oct in India is still 17 Oct in UTC. toISOString() said the 17th.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 18, 1, 0));

    expect(todayLocal()).toBe("2026-10-18");
    expect(new Date().toISOString().slice(0, 10)).toBe("2026-10-17");
  });
});

describe("addDays", () => {
  it("crosses month and year ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("handles a leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("daysBetween", () => {
  it("is positive when the later date is after", () => {
    expect(daysBetween("2026-10-17", "2026-10-03")).toBe(14);
    expect(daysBetween("2026-10-03", "2026-10-17")).toBe(-14);
    expect(daysBetween("2026-10-17", "2026-10-17")).toBe(0);
  });
});

describe("formatDate", () => {
  it("shows the calendar day it was given, never the day before", () => {
    expect(formatDate("2026-10-01")).toContain("1");
    expect(formatDate("2026-10-01")).toContain("2026");
    expect(formatDate("2026-10-01")).not.toContain("30");
  });
});
