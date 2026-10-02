import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";

import { createDoctor, getDoctor, listSpecializations, updateDoctor } from "@/api/admin";
import { ApiError } from "@/api/client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import SpecializationEditor from "@/features/admin/SpecializationEditor";
import { doctorSchema, type DoctorForm } from "@/features/admin/schemas";

export default function DoctorFormPage() {
  const { id } = useParams();
  const doctorId = id ? Number(id) : null;
  const isEdit = doctorId !== null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [addingSpecialization, setAddingSpecialization] = useState(false);

  const {
    register,
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
      registrationNumber: "",
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
        phone: doctor.data.phone,
        specializationId: doctor.data.specializationId ? String(doctor.data.specializationId) : "",
        registrationNumber: doctor.data.registrationNumber,
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
        registrationNumber: v.registrationNumber,
      };
      return isEdit
        ? updateDoctor(doctorId, { ...base, active: v.active })
        : createDoctor({ ...base, email: v.email });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["doctors"] });
      navigate("/doctors");
    },
    onError: (e) => {
      if (e instanceof ApiError) {
        Object.entries(e.fieldErrors).forEach(([name, message]) => setError(name as keyof DoctorForm, { message }));
      }
    },
  });

  const hasFieldErrors = mutation.error instanceof ApiError && Object.keys(mutation.error.fieldErrors).length > 0;
  const formError = mutation.isError && !hasFieldErrors ? "Could not save the doctor. Please try again." : null;

  if (isEdit && doctor.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }
  if (isEdit && doctor.isError) {
    return <p className="text-sm text-destructive">Could not load this doctor.</p>;
  }

  return (
    <>
      <PageHeader
        title={isEdit ? "Edit doctor" : "Add doctor"}
        description={isEdit ? undefined : "The doctor can sign in with this Google email once saved."}
      />
      <Card className="max-w-2xl p-4 sm:p-6">
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" autoComplete="off" aria-invalid={!!errors.fullName} {...register("fullName")} />
            {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email">Google email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="off"
              readOnly={isEdit}
              className={isEdit ? "bg-muted text-muted-foreground" : undefined}
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" autoComplete="off" aria-invalid={!!errors.phone} {...register("phone")} />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="registrationNumber">Registration number</Label>
            <Input
              id="registrationNumber"
              autoComplete="off"
              aria-invalid={!!errors.registrationNumber}
              {...register("registrationNumber")}
            />
            {errors.registrationNumber && (
              <p className="text-sm text-destructive">{errors.registrationNumber.message}</p>
            )}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="specializationId">Specialization</Label>
              {!addingSpecialization && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setAddingSpecialization(true)}>
                  <Plus className="h-4 w-4" />
                  New specialization
                </Button>
              )}
            </div>
            <Select id="specializationId" aria-invalid={!!errors.specializationId} {...register("specializationId")}>
              <option value="">{specializations.isLoading ? "Loading..." : "Select a specialization"}</option>
              {specializations.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </Select>
            {errors.specializationId && <p className="text-sm text-destructive">{errors.specializationId.message}</p>}
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
            <label className="flex items-center gap-3 text-sm sm:col-span-2">
              <input type="checkbox" className="h-4 w-4 accent-primary" {...register("active")} />
              Active (can sign in)
            </label>
          )}

          {formError && <p className="text-sm text-destructive sm:col-span-2">{formError}</p>}
          <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:justify-end">
            <Button variant="outline" asChild>
              <Link to="/doctors">Cancel</Link>
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : isEdit ? "Save changes" : "Save doctor"}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
