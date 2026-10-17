import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Plus } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";

import { createDoctor, getDoctor, listSpecializations, updateDoctor } from "@/api/admin";
import { ApiError } from "@/api/client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectMenu } from "@/components/ui/select-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import SpecializationEditor from "@/features/admin/SpecializationEditor";
import { doctorSchema, type DoctorForm } from "@/features/admin/schemas";
import { describeError, hasFieldErrors } from "@/lib/errors";

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

export default function DoctorFormPage() {
  const { id } = useParams();
  const doctorId = id ? Number(id) : null;
  const isEdit = doctorId !== null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [addingSpecialization, setAddingSpecialization] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    reset,
    formState: { errors },
  } = useForm<DoctorForm>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      specializationId: "",
      active: true,
    },
  });

  const specializations = useQuery({ queryKey: ["specializations"], queryFn: listSpecializations });
  const doctor = useQuery({
    queryKey: ["doctors", doctorId],
    queryFn: () => getDoctor(doctorId!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (doctor.data) {
      reset({
        fullName: doctor.data.fullName,
        email: doctor.data.email,
        phone: doctor.data.phone ?? "",
        specializationId: doctor.data.specializationId ? String(doctor.data.specializationId) : "",
        active: doctor.data.active,
      });
    }
  }, [doctor.data, reset]);

  const mutation = useMutation({
    mutationFn: (v: DoctorForm) => {
      const base = {
        fullName: v.fullName,
        phone: v.phone,
        specializationId: Number(v.specializationId),
      };
      return isEdit ? updateDoctor(doctorId, { ...base, active: v.active }) : createDoctor({ ...base, email: v.email });
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ["doctors"] });
      toast({ title: isEdit ? "Doctor updated" : "Doctor added", description: saved.fullName, variant: "success" });
      navigate("/doctors");
    },
    onError: (e) => {
      if (e instanceof ApiError) {
        Object.entries(e.fieldErrors).forEach(([name, message]) => setError(name as keyof DoctorForm, { message }));
      }
    },
  });

  const formError =
    mutation.isError && !hasFieldErrors(mutation.error) ? describeError(mutation.error, "save the doctor").description : null;
  const specializationOptions = (specializations.data ?? []).map((s) => ({ value: String(s.id), label: s.title }));

  if (isEdit && doctor.isLoading) {
    return (
      <>
        <PageHeader title="Edit doctor" backTo={{ to: "/doctors", label: "Doctors" }} />
        <Card className="max-w-3xl space-y-5 p-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </Card>
      </>
    );
  }

  if (isEdit && doctor.isError) {
    return (
      <>
        <PageHeader title="Edit doctor" backTo={{ to: "/doctors", label: "Doctors" }} />
        <Card>
          <EmptyState
            icon={AlertCircle}
            title="Could not load this doctor"
            description="They may have been deleted, or the request failed."
            action={
              <Button variant="outline" size="sm" asChild>
                <Link to="/doctors">Back to doctors</Link>
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
        title={isEdit ? "Edit doctor" : "Add doctor"}
        description={isEdit ? undefined : "The doctor can sign in with this Google email once saved."}
        backTo={{ to: "/doctors", label: "Doctors" }}
      />

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="max-w-3xl">
        <Card className="overflow-hidden p-0">
          <Section title="Details" description="How this doctor is identified and reached.">
            <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message} className="space-y-2 sm:col-span-2">
              <Input id="fullName" autoComplete="off" aria-invalid={!!errors.fullName} {...register("fullName")} />
            </Field>

            <Field
              label="Google email"
              htmlFor="email"
              error={errors.email?.message}
              hint={isEdit ? "The sign-in email cannot be changed." : undefined}
              className="space-y-2 sm:col-span-2"
            >
              <Input
                id="email"
                type="email"
                autoComplete="off"
                readOnly={isEdit}
                className={isEdit ? "cursor-not-allowed bg-muted text-muted-foreground" : undefined}
                aria-invalid={!!errors.email}
                {...register("email")}
              />
            </Field>

            <Field label="Phone" htmlFor="phone" required={false} error={errors.phone?.message}>
              <Input id="phone" type="tel" autoComplete="off" aria-invalid={!!errors.phone} {...register("phone")} />
            </Field>
          </Section>

          <Section title="Practice">
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="specializationId">
                  Specialization <span className="text-destructive">*</span>
                </Label>
                {!addingSpecialization && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setAddingSpecialization(true)}>
                    <Plus />
                    New
                  </Button>
                )}
              </div>
              <Controller
                name="specializationId"
                control={control}
                render={({ field }) => (
                  <SelectMenu
                    id="specializationId"
                    value={field.value}
                    onValueChange={field.onChange}
                    options={specializationOptions}
                    placeholder={specializations.isLoading ? "Loading..." : "Select a specialization"}
                    invalid={!!errors.specializationId}
                  />
                )}
              />
              {errors.specializationId && (
                <p className="flex items-center gap-1.5 text-sm text-destructive">
                  <AlertCircle className="size-3.5 shrink-0" />
                  {errors.specializationId.message}
                </p>
              )}
              {specializations.isError && <p className="text-sm text-destructive">Could not load specializations.</p>}
            </div>

            {addingSpecialization && (
              <div className="sm:col-span-2">
                <SpecializationEditor
                  onCancel={() => setAddingSpecialization(false)}
                  onSaved={(saved) => {
                    setValue("specializationId", String(saved.id), { shouldValidate: true });
                    setAddingSpecialization(false);
                  }}
                />
              </div>
            )}

            {isEdit && (
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted/30 p-4 sm:col-span-2">
                <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-primary" {...register("active")} />
                <span>
                  <span className="block text-sm font-medium">Active</span>
                  <span className="block text-sm text-muted-foreground">
                    When off, this doctor is blocked from signing in.
                  </span>
                </span>
              </label>
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
              <Link to="/doctors">Cancel</Link>
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {isEdit ? "Save changes" : "Save doctor"}
            </Button>
          </div>
        </Card>
      </form>
    </>
  );
}
