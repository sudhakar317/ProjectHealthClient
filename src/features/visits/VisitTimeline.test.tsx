import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Me } from "@/api/auth";
import type { Visit } from "@/api/visits";
import VisitTimeline from "@/features/visits/VisitTimeline";

const auth = vi.hoisted(() => ({ user: null as Me | null }));
vi.mock("@/auth/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false, logout: vi.fn() }) }));

const DOCTOR: Me = { id: 10, email: "meera@clinic.example", role: "DOCTOR" };
const ADMIN: Me = { id: 1, email: "admin@clinic.example", role: "ADMIN" };

const visit = (over: Partial<Visit> = {}): Visit => ({
  id: 1,
  patientId: 1,
  patientName: "Asha Rao",
  doctorId: DOCTOR.id,
  doctorName: "Dr Meera",
  visitDate: "2026-10-01",
  notes: "Sore throat, advised rest",
  nextVisitDate: null,
  previousVisitId: null,
  expectedDate: null,
  active: true,
  createdAt: "2026-10-01T10:00:00Z",
  ...over,
});

const renderTimeline = (visits: Visit[]) =>
  render(<VisitTimeline visits={visits} onEdit={vi.fn()} onDelete={vi.fn()} onRestore={vi.fn()} />);

beforeEach(() => {
  auth.user = DOCTOR;
  // Only the clock is faked, so Testing Library's own timers keep working.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 17, 12, 0));
});

afterEach(() => vi.useRealTimers());

describe("punctuality", () => {
  it("shows how late the patient came against the date they were given", () => {
    renderTimeline([visit({ id: 2, visitDate: "2026-10-17", expectedDate: "2026-10-03", previousVisitId: 1 })]);

    expect(screen.getByText("14 days late")).toBeInTheDocument();
  });

  it("shows how early they came", () => {
    renderTimeline([visit({ id: 2, visitDate: "2026-10-17", expectedDate: "2026-11-14", previousVisitId: 1 })]);

    expect(screen.getByText("28 days early")).toBeInTheDocument();
  });

  it("says one day, not one days", () => {
    renderTimeline([visit({ id: 2, visitDate: "2026-10-04", expectedDate: "2026-10-03", previousVisitId: 1 })]);

    expect(screen.getByText("1 day late")).toBeInTheDocument();
  });

  it("says on time when they kept the date", () => {
    renderTimeline([visit({ id: 2, visitDate: "2026-10-03", expectedDate: "2026-10-03", previousVisitId: 1 })]);

    expect(screen.getByText("On time")).toBeInTheDocument();
  });

  it("names the booked date for a screen reader, not just the tooltip", () => {
    renderTimeline([visit({ id: 2, visitDate: "2026-10-17", expectedDate: "2026-10-03", previousVisitId: 1 })]);

    expect(screen.getByLabelText(/14 days late\. Booked for/)).toBeInTheDocument();
  });

  it("shows nothing for a visit that did not follow a booking", () => {
    renderTimeline([visit()]);

    expect(screen.queryByText(/late|early|On time/)).not.toBeInTheDocument();
  });
});

describe("who recorded it", () => {
  it("is hidden from a doctor reading their own note", () => {
    renderTimeline([visit()]);

    expect(screen.queryByText(/Recorded by/)).not.toBeInTheDocument();
  });

  it("is shown to a doctor reading a note another doctor wrote", () => {
    renderTimeline([visit({ doctorId: 11, doctorName: "Dr Rao" })]);

    expect(screen.getByText("Recorded by Dr Rao")).toBeInTheDocument();
  });

  it("is always shown to an admin", () => {
    auth.user = ADMIN;
    renderTimeline([visit()]);

    expect(screen.getByText("Recorded by Dr Meera")).toBeInTheDocument();
  });
});

describe("open bookings", () => {
  it("flags a booking that has passed without a visit", () => {
    renderTimeline([visit({ nextVisitDate: "2026-10-03" })]);

    expect(screen.getByText(/Overdue since/)).toBeInTheDocument();
  });

  it("flags a booking due today", () => {
    renderTimeline([visit({ nextVisitDate: "2026-10-17" })]);

    expect(screen.getByText("Due today")).toBeInTheDocument();
  });

  it("shows an upcoming booking as next", () => {
    renderTimeline([visit({ nextVisitDate: "2026-11-14" })]);

    expect(screen.getByText(/^Next /)).toBeInTheDocument();
  });

  it("drops the badge once a later visit answered the booking", () => {
    renderTimeline([
      visit({ id: 2, visitDate: "2026-10-05", previousVisitId: 1, expectedDate: "2026-10-03" }),
      visit({ id: 1, nextVisitDate: "2026-10-03" }),
    ]);

    expect(screen.queryByText(/Overdue since/)).not.toBeInTheDocument();
    expect(screen.getByText("2 days late")).toBeInTheDocument();
  });
});

describe("long notes", () => {
  it("are clamped with a toggle only when the text is actually cut off", async () => {
    // jsdom does no layout, so report the paragraph as taller than its clamped box.
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(240);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(80);
    renderTimeline([visit({ notes: "A long consultation note. ".repeat(40) })]);

    await userEvent.click(screen.getByRole("button", { name: "Show more" }));

    expect(screen.getByRole("button", { name: "Show less" })).toBeInTheDocument();
  });

  it("have no toggle when they fit", () => {
    renderTimeline([visit({ notes: "Short." })]);

    expect(screen.queryByRole("button", { name: /Show more/ })).not.toBeInTheDocument();
  });
});
