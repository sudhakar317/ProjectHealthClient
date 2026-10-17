import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";

import { listDoctors, type DoctorFilters } from "@/api/admin";
import { ApiError } from "@/api/client";
import { createPatient, getPatient, updatePatient, type Sex } from "@/api/patients";
import { useAuth } from "@/auth/AuthContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectMenu } from "@/components/ui/select-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { patientSchema, type PatientForm } from "@/features/patients/schemas";
import { describeError, hasFieldErrors } from "@/lib/errors";
import { todayLocal } from "@/lib/datetime";

const sexOptions = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
];

const activeDoctorFilters: DoctorFilters = {
  fullName: "",
  email: "",
  phone: "",
  specializationId: "",
  active: "true",
};

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="border-b px-4 py-5 last:border-0 sm:px-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  required = true,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className ?? "space-y-2"}>
      <Label htmlFor={htmlFor}>
        {label}{" "}
        {required ? (
          <span className="text-destructive">*</span>
        ) : (
          <span className="font-normal text-muted-foreground">(optional)</span>
        )}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export default function PatientFormPage() {
  const { id } = useParams();
  const patientId = id ? Number(id) : null;
  const isEdit = patientId !== null;
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<PatientForm>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      sex: "",
      dateOfBirth: "",
      address: "",
      notes: "",
      doctorId: "",
    },
  });

  const patient = useQuery({
    queryKey: ["patients", patientId],
    queryFn: () => getPatient(patientId!),
    enabled: isEdit,
  });

  // Only an admin can reassign, so only an admin needs the doctor list (the endpoint is admin-only).
  const doctors = useQuery({
    queryKey: ["doctors", "list", activeDoctorFilters],
    queryFn: () => listDoctors(activeDoctorFilters),
    enabled: isAdmin && isEdit,
  });

  useEffect(() => {
    if (patient.data) {
      reset({
        fullName: patient.data.fullName,
        phone: patient.data.phone,
        sex: patient.data.sex,
        dateOfBirth: patient.data.dateOfBirth,
        address: patient.data.address ?? "",
        notes: patient.data.notes ?? "",
        doctorId: String(patient.data.doctorId),
      });
    }
  }, [patient.data, reset]);

  const mutation = useMutation({
    mutationFn: (v: PatientForm) => {
      const base = {
        fullName: v.fullName,
        phone: v.phone,
        sex: v.sex as Sex,
        dateOfBirth: v.dateOfBirth,
        address: v.address,
        notes: v.notes,
      };
      if (!isEdit) return createPatient(base);
      // doctorId travels only for an admin; the server ignores it for a doctor either way.
      return updatePatient(patientId, isAdmin ? { ...base, doctorId: Number(v.doctorId) } : base);
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast({ title: isEdit ? "Patient updated" : "Patient registered", description: saved.fullName, variant: "success" });
      navigate("/patients");
    },
    onError: (e) => {
      if (e instanceof ApiError) {
        Object.entries(e.fieldErrors).forEach(([name, message]) => setError(name as keyof PatientForm, { message }));
      }
    },
  });

  const formError =
    mutation.isError && !hasFieldErrors(mutation.error) ? describeError(mutation.error, "save the patient").description : null;

  if (isEdit && patient.isLoading) {
    return (
      <>
        <PageHeader title="Edit patient" backTo={{ to: "/patients", label: "Patients" }} />
        <Card className="max-w-3xl space-y-5 p-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </Card>
      </>
    );
  }

  if (isEdit && patient.isError) {
    return (
      <>
        <PageHeader title="Edit patient" backTo={{ to: "/patients", label: "Patients" }} />
        <Card>
          <EmptyState
            icon={AlertCircle}
            title="Could not load this patient"
            description="They may have been removed, or they belong to another doctor."
            action={
              <Button variant="outline" size="sm" asChild>
                <Link to="/patients">Back to patients</Link>
              </Button>
            }
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={isEdit ? "Edit patient" : "Add patient"}
        description={isEdit ? undefined : "You will be recorded as this patient's doctor."}
        backTo={{ to: "/patients", label: "Patients" }}
      />

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="max-w-3xl">
        <Card className="overflow-hidden p-0">
          <Section title="Details">
            <Field
              label="Full name"
              htmlFor="fullName"
              error={errors.fullName?.message}
              className="space-y-2 sm:col-span-2"
            >
              <Input id="fullName" autoComplete="off" aria-invalid={!!errors.fullName} {...register("fullName")} />
            </Field>

            <Field label="Phone" htmlFor="phone" error={errors.phone?.message}>
              <Input id="phone" type="tel" autoComplete="off" aria-invalid={!!errors.phone} {...register("phone")} />
            </Field>

            <Field label="Date of birth" htmlFor="dateOfBirth" error={errors.dateOfBirth?.message}>
              <Input
                id="dateOfBirth"
                type="date"
                max={todayLocal()}
                aria-invalid={!!errors.dateOfBirth}
                {...register("dateOfBirth")}
              />
            </Field>

            <Field label="Sex" htmlFor="sex" error={errors.sex?.message}>
              <Controller
                name="sex"
                control={control}
                render={({ field }) => (
                  <SelectMenu
                    id="sex"
                    value={field.value}
                    onValueChange={field.onChange}
                    options={sexOptions}
                    placeholder="Select"
                    invalid={!!errors.sex}
                  />
                )}
              />
            </Field>
          </Section>

          <Section title="More">
            <Field
              label="Address"
              htmlFor="address"
              required={false}
              error={errors.address?.message}
              className="space-y-2 sm:col-span-2"
            >
              <Input id="address" autoComplete="off" aria-invalid={!!errors.address} {...register("address")} />
            </Field>

            <Field
              label="Notes"
              htmlFor="notes"
              required={false}
              error={errors.notes?.message}
              className="space-y-2 sm:col-span-2"
            >
              <Textarea id="notes" aria-invalid={!!errors.notes} {...register("notes")} />
            </Field>

            {isEdit && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="doctorId">
                  Doctor <span className="text-destructive">*</span>
                </Label>
                {isAdmin ? (
                  <>
                    <Controller
                      name="doctorId"
                      control={control}
                      render={({ field }) => (
                        <SelectMenu
                          id="doctorId"
                          value={field.value}
                          onValueChange={field.onChange}
                          options={(doctors.data ?? []).map((d) => ({ value: String(d.id), label: d.fullName }))}
                          placeholder={doctors.isLoading ? "Loading..." : "Select a doctor"}
                          // No blank choice: a patient must always keep a doctor.
                          allowEmpty={false}
                        />
                      )}
                    />
                    <p className="text-xs text-muted-foreground">
                      You can move this patient to another doctor, but it cannot be left empty.
                    </p>
                  </>
                ) : (
                  <Input
                    id="doctorId"
                    readOnly
                    className="cursor-not-allowed bg-muted text-muted-foreground"
                    value={patient.data?.doctorName ?? ""}
                  />
                )}
              </div>
            )}
          </Section>

          <div className="flex flex-col-reverse gap-2 border-t bg-muted/30 px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
            {formError && (
              <p className="flex items-center gap-1.5 text-sm text-destructive sm:mr-auto">
                <AlertCircle className="size-4 shrink-0" />
                {formError}
              </p>
            )}
            <Button variant="outline" asChild>
              <Link to="/patients">Cancel</Link>
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {isEdit ? "Save changes" : "Save patient"}
            </Button>
          </div>
        </Card>
      </form>
    </>
  );
}
