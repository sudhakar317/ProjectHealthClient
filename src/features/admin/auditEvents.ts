import {
  CalendarPlus,
  Eye,
  FilePen,
  FilePlus2,
  LogIn,
  LogOut,
  RotateCcw,
  NotebookPen,
  ShieldX,
  Tags,
  Trash2,
  UserMinus,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

import type { BadgeProps } from "@/components/ui/badge";
import type { SelectGroup } from "@/components/ui/select-menu";

type Tone = NonNullable<BadgeProps["variant"]>;

interface EventMeta {
  label: string;
  icon: LucideIcon;
  tone: Tone;
}

/** Single source of truth for audit event presentation. Mirrors AuditService's constants. */
const META: Record<string, EventMeta> = {
  LOGIN_SUCCESS: { label: "Signed in", icon: LogIn, tone: "success" },
  LOGIN_FAILURE: { label: "Sign-in failed", icon: ShieldX, tone: "danger" },
  LOGOUT: { label: "Signed out", icon: LogOut, tone: "muted" },
  DOCTOR_CREATED: { label: "Doctor created", icon: FilePlus2, tone: "info" },
  DOCTOR_UPDATED: { label: "Doctor updated", icon: FilePen, tone: "warning" },
  DOCTOR_DELETED: { label: "Doctor deleted", icon: Trash2, tone: "danger" },
  SPECIALIZATION_CREATED: { label: "Specialization created", icon: Tags, tone: "info" },
  SPECIALIZATION_UPDATED: { label: "Specialization updated", icon: FilePen, tone: "warning" },
  SPECIALIZATION_DELETED: { label: "Specialization deleted", icon: Trash2, tone: "danger" },
  PATIENT_CREATED: { label: "Patient registered", icon: UserPlus, tone: "info" },
  PATIENT_VIEWED: { label: "Patient opened", icon: Eye, tone: "muted" },
  PATIENT_UPDATED: { label: "Patient updated", icon: FilePen, tone: "warning" },
  PATIENT_DELETED: { label: "Patient deactivated", icon: UserMinus, tone: "danger" },
  PATIENT_RESTORED: { label: "Patient restored", icon: RotateCcw, tone: "success" },
  VISIT_CREATED: { label: "Visit recorded", icon: CalendarPlus, tone: "info" },
  VISIT_VIEWED: { label: "Visit opened", icon: Eye, tone: "muted" },
  VISIT_HISTORY_VIEWED: { label: "Visit history opened", icon: NotebookPen, tone: "muted" },
  VISIT_UPDATED: { label: "Visit updated", icon: FilePen, tone: "warning" },
  VISIT_DELETED: { label: "Visit deleted", icon: Trash2, tone: "danger" },
  VISIT_RESTORED: { label: "Visit restored", icon: RotateCcw, tone: "success" },
};

/** Grouped so the filter stays scannable: nine flat options read as a wall. */
export const auditEventGroups: SelectGroup[] = [
  { label: "Access", options: ["LOGIN_SUCCESS", "LOGIN_FAILURE", "LOGOUT"].map(toOption) },
  { label: "Doctors", options: ["DOCTOR_CREATED", "DOCTOR_UPDATED", "DOCTOR_DELETED"].map(toOption) },
  {
    label: "Patients",
    options: ["PATIENT_CREATED", "PATIENT_VIEWED", "PATIENT_UPDATED", "PATIENT_DELETED", "PATIENT_RESTORED"].map(
      toOption,
    ),
  },
  {
    label: "Visits",
    options: [
      "VISIT_CREATED",
      "VISIT_HISTORY_VIEWED",
      "VISIT_VIEWED",
      "VISIT_UPDATED",
      "VISIT_DELETED",
      "VISIT_RESTORED",
    ].map(toOption),
  },
  {
    label: "Specializations",
    options: ["SPECIALIZATION_CREATED", "SPECIALIZATION_UPDATED", "SPECIALIZATION_DELETED"].map(toOption),
  },
];

function toOption(value: string) {
  return { value, label: META[value].label };
}

export function eventMeta(type: string): EventMeta {
  return META[type] ?? { label: type.toLowerCase().replace(/_/g, " "), icon: FilePen, tone: "muted" };
}

/** Reasons and methods the backend stores verbatim in `details`. */
const REASONS: Record<string, string> = {
  dev_login: "via dev sign-in",
  dev_login_not_allowed: "not an admin or doctor",
  not_registered: "not registered",
  inactive: "account disabled",
  unverified_email: "email not verified",
  sub_mismatch: "linked to a different Google account",
  oauth2_error: "Google sign-in error",
};

/**
 * `details` carries two different things: the target of a change ("id=3 email=a@b.com") or the
 * reason an attempt failed ("not_registered"). Both are stored raw, so make them readable here
 * rather than rewriting an append-only log.
 */
export function describeDetails(details: string | null): string | null {
  if (!details) return null;
  if (REASONS[details]) return REASONS[details];
  const target = details.match(/\b(?:email|title)=(.+)$/);
  return target ? target[1].trim() : details;
}
