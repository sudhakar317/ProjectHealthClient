import { z } from "zod";
import { todayLocal } from "@/lib/datetime";


const sexValues: string[] = ["MALE", "FEMALE", "OTHER"];

export const patientSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(120),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number"),
  // Membership check rather than z.enum: it keeps the field a plain string, so the empty select
  // state is a validation error instead of a type mismatch between the form's input and output.
  sex: z.string().refine((v) => sexValues.includes(v), "Select a sex"),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine((v) => v <= todayLocal(), "Date of birth cannot be in the future"),
  address: z.string().trim().max(300),
  notes: z.string().trim().max(1000),
  /** Admin only. Never empty: the UI offers no blank option. */
  doctorId: z.string(),
});

export type PatientForm = z.infer<typeof patientSchema>;
