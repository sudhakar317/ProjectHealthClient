import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { createSpecialization, updateSpecialization, type Specialization } from "@/api/admin";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { specializationSchema, type SpecializationForm } from "./schemas";

interface Props {
  /** When set, edits this specialization; otherwise creates a new one. */
  existing?: Specialization;
  onSaved: (saved: Specialization) => void;
  onCancel: () => void;
}

/** Deliberately not a <form> element: it is also rendered inside the add-doctor form, and forms cannot nest. */
export default function SpecializationEditor({ existing, onSaved, onCancel }: Props) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SpecializationForm>({
    resolver: zodResolver(specializationSchema),
    defaultValues: { title: existing?.title ?? "", description: existing?.description ?? "" },
  });

  const mutation = useMutation({
    mutationFn: (values: SpecializationForm) =>
      existing ? updateSpecialization(existing.id, values) : createSpecialization(values),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ["specializations"] });
      await queryClient.invalidateQueries({ queryKey: ["doctors"] });
      onSaved(saved);
    },
    onError: (e) => {
      if (e instanceof ApiError) {
        Object.entries(e.fieldErrors).forEach(([name, message]) =>
          setError(name as keyof SpecializationForm, { message }),
        );
      }
    },
  });

  const hasFieldErrors = mutation.error instanceof ApiError && Object.keys(mutation.error.fieldErrors).length > 0;

  return (
    <Card className="space-y-4 border-primary/30 bg-accent/40 p-4">
      <div className="space-y-2">
        <Label htmlFor="spec-title">Title</Label>
        <Input id="spec-title" autoComplete="off" aria-invalid={!!errors.title} {...register("title")} />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="spec-description">Description</Label>
        <Textarea id="spec-description" aria-invalid={!!errors.description} {...register("description")} />
        {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
      </div>
      {mutation.isError && !hasFieldErrors && (
        <p className="text-sm text-destructive">Could not save the specialization. Please try again.</p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" disabled={mutation.isPending} onClick={() => void handleSubmit((v) => mutation.mutate(v))()}>
          {mutation.isPending ? "Saving..." : existing ? "Save changes" : "Add specialization"}
        </Button>
      </div>
    </Card>
  );
}
