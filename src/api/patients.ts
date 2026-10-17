import { apiFetch, apiJson } from "./client";
import type { Page } from "./admin";

export type Sex = "MALE" | "FEMALE" | "OTHER";

export interface Patient {
  id: number;
  fullName: string;
  phone: string;
  sex: Sex;
  /** yyyy-mm-dd */
  dateOfBirth: string;
  address: string | null;
  notes: string | null;
  doctorId: number;
  doctorName: string;
  active: boolean;
  createdAt: string;
}

export interface PatientInput {
  fullName: string;
  phone: string;
  sex: Sex;
  dateOfBirth: string;
  address: string;
  notes: string;
}

/** doctorId is honoured only for an admin; omitting it leaves the doctor unchanged. */
export type PatientUpdate = PatientInput & { doctorId?: number };

export interface PatientFilters {
  search: string;
  includeInactive: boolean;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const listPatients = (page: number, filters: PatientFilters) => {
  const params = new URLSearchParams({ page: String(page), size: "20" });
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.includeInactive) params.set("includeInactive", "true");
  return apiJson<Page<Patient>>(`/api/patients?${params}`);
};

export const getPatient = (id: number) => apiJson<Patient>(`/api/patients/${id}`);

export const createPatient = (patient: PatientInput) => apiJson<Patient>("/api/patients", json("POST", patient));

export const updatePatient = (id: number, patient: PatientUpdate) =>
  apiJson<Patient>(`/api/patients/${id}`, json("PUT", patient));

/** Soft delete: marks the patient inactive, the record is never removed. */
export const deactivatePatient = (id: number) => apiFetch(`/api/patients/${id}`, { method: "DELETE" });

export const restorePatient = (id: number) => apiJson<Patient>(`/api/patients/${id}/restore`, { method: "POST" });
