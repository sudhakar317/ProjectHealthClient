import { z } from "zod";

export const doctorSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(120),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number"),
  specializationId: z.string().min(1, "Select a specialization"),
  registrationNumber: z.string().trim().min(1, "Registration number is required").max(50),
  active: z.boolean(),
});

export type DoctorForm = z.infer<typeof doctorSchema>;

export const specializationSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100),
  description: z.string().trim().min(1, "Description is required").max(500),
});

export type SpecializationForm = z.infer<typeof specializationSchema>;
