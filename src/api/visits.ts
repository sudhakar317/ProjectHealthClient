import { apiFetch, apiJson } from "./client";
import type { Page } from "./admin";

export interface Visit {
  id: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  /** yyyy-mm-dd */
  visitDate: string;
  notes: string;
  nextVisitDate: string | null;
  /** The earlier visit whose follow-up this one answered; null for a walk-in. */
  previousVisitId: number | null;
  /** That earlier visit's booked date. Subtract it from visitDate to get early/late. */
  expectedDate: string | null;
  active: boolean;
  createdAt: string;
}

export interface VisitInput {
  visitDate: string;
  notes: string;
  /** null clears the follow-up. */
  nextVisitDate: string | null;
  /**
   * Honoured only for an admin, who records visits on a doctor's behalf. The server ignores it
   * for a doctor, who always authors their own visits.
   */
  doctorId?: number;
}

export interface VisitFilters {
  search: string;
  from: string;
  to: string;
  includeInactive: boolean;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/** Timeline for one patient. */
export const listPatientVisits = (patientId: number, includeInactive: boolean) => {
  const params = new URLSearchParams();
  if (includeInactive) params.set("includeInactive", "true");
  return apiJson<Visit[]>(`/api/patients/${patientId}/visits?${params}`);
};

export const listVisits = (page: number, filters: VisitFilters) => {
  const params = new URLSearchParams({ page: String(page), size: "20" });
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.includeInactive) params.set("includeInactive", "true");
  return apiJson<Page<Visit>>(`/api/visits?${params}`);
};

/** Visits whose next appointment is due today or overdue, oldest first. */
export const listFollowUps = () => apiJson<Visit[]>("/api/visits/follow-ups");

export const createVisit = (patientId: number, visit: VisitInput) =>
  apiJson<Visit>(`/api/patients/${patientId}/visits`, json("POST", visit));

export const updateVisit = (id: number, visit: VisitInput) => apiJson<Visit>(`/api/visits/${id}`, json("PUT", visit));

/** Soft delete: the record is kept and can be restored. */
export const deleteVisit = (id: number) => apiFetch(`/api/visits/${id}`, { method: "DELETE" });

export const restoreVisit = (id: number) => apiJson<Visit>(`/api/visits/${id}/restore`, { method: "POST" });
