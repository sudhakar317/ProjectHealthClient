import { z } from "zod";
import { todayLocal } from "@/lib/datetime";


export const visitSchema = z
  .object({
    visitDate: z
      .string()
      .min(1, "Visit date is required")
      .refine((v) => v <= todayLocal(), "A visit cannot be in the future"),
    notes: z.string().trim().min(1, "Notes are required").max(4000),
    /** Empty means no follow-up booked. */
    nextVisitDate: z.string(),
    /** Shown to an admin only; a doctor always authors their own visits. */
    doctorId: z.string().min(1, "Doctor is required"),
  })
  // Mirrors the server rule, so the error lands inline instead of after a round trip. Strictly
  // later: a follow-up booked for the day of the visit is not a follow-up.
  .refine((v) => !v.nextVisitDate || v.nextVisitDate > v.visitDate, {
    message: "The next visit must be after the visit date",
    path: ["nextVisitDate"],
  });

export type VisitForm = z.infer<typeof visitSchema>;
