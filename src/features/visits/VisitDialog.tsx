import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { Controller, useForm } from "react-hook-form";

import { listDoctors, type DoctorFilters } from "@/api/admin";
import { ApiError } from "@/api/client";
import { createVisit, updateVisit, type Visit } from "@/api/visits";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  SheetContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectMenu } from "@/components/ui/select-menu";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { visitSchema, type VisitForm } from "@/features/visits/schemas";
import { describeError, hasFieldErrors } from "@/lib/errors";
import { addDays, todayLocal } from "@/lib/datetime";

const activeDoctorFilters: DoctorFilters = {
  fullName: "",
  email: "",
  phone: "",
  specializationId: "",
  active: "true",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: number;
  patientName: string;
  /** Fallback author: an admin records a visit against this doctor unless they pick another. */
  patientDoctorId: number;
  /** When set, edits this visit instead of recording a new one. */
  existing?: Visit;
  /** True when a later visit already followed this one, which fixes both of its dates. */
  answered?: boolean;
}


export default function VisitDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
  patientDoctorId,
  existing,
  answered = false,
}: Props) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const {
    register,
    control,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<VisitForm>({
    resolver: zodResolver(visitSchema),
    defaultValues: {
      visitDate: existing?.visitDate ?? todayLocal(),
      notes: existing?.notes ?? "",
      nextVisitDate: existing?.nextVisitDate ?? "",
      doctorId: String(existing?.doctorId ?? patientDoctorId),
    },
  });

  const visitDate = watch("visitDate");

  // Only an admin chooses the doctor, and the endpoint behind this list is admin-only.
  const doctors = useQuery({
    queryKey: ["doctors", "list", activeDoctorFilters],
    queryFn: () => listDoctors(activeDoctorFilters),
    enabled: isAdmin,
  });

  const mutation = useMutation({
    mutationFn: (v: VisitForm) => {
      const payload = {
        visitDate: v.visitDate,
        notes: v.notes,
        nextVisitDate: v.nextVisitDate ? v.nextVisitDate : null,
        // Travels only for an admin; the server ignores it for a doctor either way.
        ...(isAdmin ? { doctorId: Number(v.doctorId) } : {}),
      };
      return existing ? updateVisit(existing.id, payload) : createVisit(patientId, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["visits"] });
      await queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
      toast({ title: existing ? "Visit updated" : "Visit recorded", description: patientName, variant: "success" });
      onOpenChange(false);
    },
    onError: (e) => {
      if (e instanceof ApiError) {
        Object.entries(e.fieldErrors).forEach(([name, message]) => setError(name as keyof VisitForm, { message }));
      }
    },
  });

  // Field problems show beside their field; anything else is explained once, above the buttons.
  const formError =
    mutation.isError && !hasFieldErrors(mutation.error) ? describeError(mutation.error, "save the visit").description : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl">
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="flex min-h-0 flex-col">
          <DialogHeader>
            <DialogTitle>{existing ? "Edit visit" : "Record visit"}</DialogTitle>
            <DialogDescription>{patientName}</DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-5 pb-4">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="visitDate">
                  Visit date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="visitDate"
                  type="date"
                  max={todayLocal()}
                  disabled={answered}
                  className={answered ? "cursor-not-allowed bg-muted text-muted-foreground" : undefined}
                  aria-invalid={!!errors.visitDate}
                  {...register("visitDate")}
                />
                {errors.visitDate && <p className="text-sm text-destructive">{errors.visitDate.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nextVisitDate">
                  Next visit <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="nextVisitDate"
                  type="date"
                  // The day after the visit is the earliest valid follow-up; the picker greys out the rest.
                  min={visitDate ? addDays(visitDate, 1) : undefined}
                  disabled={answered}
                  className={answered ? "cursor-not-allowed bg-muted text-muted-foreground" : undefined}
                  aria-invalid={!!errors.nextVisitDate}
                  {...register("nextVisitDate")}
                />
                {errors.nextVisitDate && <p className="text-sm text-destructive">{errors.nextVisitDate.message}</p>}
              </div>
            </div>

            {answered && (
              <p className="text-xs text-muted-foreground">
                A later visit already followed this one, so its dates are fixed. The notes can still be corrected.
              </p>
            )}

            {isAdmin && (
              <div className="space-y-2">
                <Label htmlFor="doctorId">
                  Doctor <span className="text-destructive">*</span>
                </Label>
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
                      invalid={!!errors.doctorId}
                      // No blank choice: a visit must always keep an author.
                      allowEmpty={false}
                    />
                  )}
                />
                {errors.doctorId ? (
                  <p className="text-sm text-destructive">{errors.doctorId.message}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Whose visit this is. Defaults to the patient's doctor.</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">
                Notes <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="notes"
                rows={6}
                className="min-h-[9rem]"
                placeholder="What the patient presented with, findings, and advice given"
                aria-invalid={!!errors.notes}
                {...register("notes")}
              />
              {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
            </div>

            {formError && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                {formError}
              </p>
            )}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {existing ? "Save changes" : "Record visit"}
            </Button>
          </DialogFooter>
        </form>
      </SheetContent>
    </Dialog>
  );
}
