import { apiFetch, apiJson } from "./client";

export interface Doctor {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  specializationId: number | null;
  specializationTitle: string | null;
  registrationNumber: string;
  active: boolean;
  createdAt: string;
}

export interface DoctorInput {
  fullName: string;
  email: string;
  phone: string;
  specializationId: number;
  registrationNumber: string;
}

export type DoctorUpdate = Omit<DoctorInput, "email"> & { active: boolean };

export interface DoctorFilters {
  fullName: string;
  email: string;
  phone: string;
  registrationNumber: string;
  specializationId: string;
  active: string;
}

export interface Specialization {
  id: number;
  title: string;
  description: string;
}

export type SpecializationInput = Omit<Specialization, "id">;

export interface AuditEntry {
  id: number;
  eventType: string;
  actorEmail: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const listDoctors = (filters: DoctorFilters) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value.trim()) params.set(key, value.trim());
  });
  return apiJson<Doctor[]>(`/api/admin/doctors?${params}`);
};

export const getDoctor = (id: number) => apiJson<Doctor>(`/api/admin/doctors/${id}`);
export const createDoctor = (doctor: DoctorInput) => apiJson<Doctor>("/api/admin/doctors", json("POST", doctor));
export const updateDoctor = (id: number, doctor: DoctorUpdate) =>
  apiJson<Doctor>(`/api/admin/doctors/${id}`, json("PUT", doctor));
export const deleteDoctor = (id: number) => apiFetch(`/api/admin/doctors/${id}`, { method: "DELETE" });

export const listSpecializations = () => apiJson<Specialization[]>("/api/admin/specializations");
export const createSpecialization = (s: SpecializationInput) =>
  apiJson<Specialization>("/api/admin/specializations", json("POST", s));
export const updateSpecialization = (id: number, s: SpecializationInput) =>
  apiJson<Specialization>(`/api/admin/specializations/${id}`, json("PUT", s));
export const deleteSpecialization = (id: number) => apiFetch(`/api/admin/specializations/${id}`, { method: "DELETE" });

export const listAuditLogs = (page: number, eventType: string) => {
  const params = new URLSearchParams({ page: String(page), size: "20" });
  if (eventType) params.set("eventType", eventType);
  return apiJson<Page<AuditEntry>>(`/api/admin/audit-logs?${params}`);
};
