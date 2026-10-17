import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Me } from "@/api/auth";
import { ApiError } from "@/api/client";
import type { Visit } from "@/api/visits";
import VisitDialog from "@/features/visits/VisitDialog";

const auth = vi.hoisted(() => ({ user: null as Me | null }));
vi.mock("@/auth/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false, logout: vi.fn() }) }));

const api = vi.hoisted(() => ({ createVisit: vi.fn(), updateVisit: vi.fn(), listDoctors: vi.fn() }));
vi.mock("@/api/visits", async (original) => ({
  ...(await original<typeof import("@/api/visits")>()),
  createVisit: api.createVisit,
  updateVisit: api.updateVisit,
}));
vi.mock("@/api/admin", async (original) => ({
  ...(await original<typeof import("@/api/admin")>()),
  listDoctors: api.listDoctors,
}));

const DOCTOR: Me = { id: 10, email: "meera@clinic.example", role: "DOCTOR" };
const ADMIN: Me = { id: 1, email: "admin@clinic.example", role: "ADMIN" };

const existingVisit: Visit = {
  id: 5,
  patientId: 1,
  patientName: "Asha Rao",
  doctorId: 10,
  doctorName: "Dr Meera",
  visitDate: "2026-10-01",
  notes: "Sore throat",
  nextVisitDate: "2026-10-03",
  previousVisitId: null,
  expectedDate: null,
  active: true,
  createdAt: "2026-10-01T10:00:00Z",
};

function renderDialog(props: Partial<Parameters<typeof VisitDialog>[0]> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <VisitDialog open onOpenChange={vi.fn()} patientId={1} patientName="Asha Rao" patientDoctorId={10} {...props} />
    </QueryClientProvider>,
  );
}

const fill = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => {
  auth.user = DOCTOR;
  api.createVisit.mockReset();
  api.updateVisit.mockReset();
  api.listDoctors.mockReset().mockResolvedValue([]);
});

describe("who chooses the doctor", () => {
  it("never asks a doctor: they always author their own visits", () => {
    renderDialog();

    expect(screen.queryByText("Doctor")).not.toBeInTheDocument();
    expect(api.listDoctors).not.toHaveBeenCalled();
  });

  it("asks an admin, who is recording on a doctor's behalf", async () => {
    auth.user = ADMIN;
    renderDialog();

    expect(await screen.findByText("Doctor")).toBeInTheDocument();
    expect(api.listDoctors).toHaveBeenCalled();
  });
});

describe("validation", () => {
  it("rejects a same-day follow-up before anything is sent", async () => {
    renderDialog();
    fill(/Visit date/, "2026-10-05");
    fill(/Next visit/, "2026-10-05");
    await userEvent.type(screen.getByLabelText(/Notes/), "Review");

    await userEvent.click(screen.getByRole("button", { name: "Record visit" }));

    expect(await screen.findByText("The next visit must be after the visit date")).toBeInTheDocument();
    expect(api.createVisit).not.toHaveBeenCalled();
  });

  it("starts the follow-up picker the day after the visit", () => {
    renderDialog();
    fill(/Visit date/, "2026-10-05");

    expect(screen.getByLabelText(/Next visit/)).toHaveAttribute("min", "2026-10-06");
  });
});

describe("server errors", () => {
  it("puts a field error from the server beside its field", async () => {
    api.createVisit.mockRejectedValue(
      new ApiError(409, "This patient already has a visit on that date", {
        visitDate: "This patient already has a visit on that date",
      }),
    );
    renderDialog();
    fill(/Visit date/, "2026-10-05");
    await userEvent.type(screen.getByLabelText(/Notes/), "Review");

    await userEvent.click(screen.getByRole("button", { name: "Record visit" }));

    expect(await screen.findByText("This patient already has a visit on that date")).toBeInTheDocument();
  });

  it("explains a server fault and gives a reference to quote", async () => {
    api.createVisit.mockRejectedValue(new ApiError(500, "Something went wrong", {}, "ab12cd34ef56"));
    renderDialog();
    fill(/Visit date/, "2026-10-05");
    await userEvent.type(screen.getByLabelText(/Notes/), "Review");

    await userEvent.click(screen.getByRole("button", { name: "Record visit" }));

    expect(await screen.findByText(/quote reference ab12cd34ef56/)).toBeInTheDocument();
  });
});

describe("a visit a later one already followed", () => {
  it("locks both dates but leaves the notes editable", () => {
    renderDialog({ existing: existingVisit, answered: true });

    expect(screen.getByLabelText(/Visit date/)).toBeDisabled();
    expect(screen.getByLabelText(/Next visit/)).toBeDisabled();
    expect(screen.getByLabelText(/Notes/)).toBeEnabled();
    expect(screen.getByText(/its dates are fixed/)).toBeInTheDocument();
  });

  it("still saves a corrected note", async () => {
    api.updateVisit.mockResolvedValue({ ...existingVisit, notes: "Tonsillitis" });
    renderDialog({ existing: existingVisit, answered: true });
    const notes = screen.getByLabelText(/Notes/);
    await userEvent.clear(notes);
    await userEvent.type(notes, "Tonsillitis");

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(api.updateVisit).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ notes: "Tonsillitis", visitDate: "2026-10-01", nextVisitDate: "2026-10-03" }),
      ),
    );
  });

  it("leaves both dates open on a visit nothing has followed yet", () => {
    renderDialog({ existing: existingVisit, answered: false });

    expect(screen.getByLabelText(/Visit date/)).toBeEnabled();
    expect(screen.getByLabelText(/Next visit/)).toBeEnabled();
  });
});
