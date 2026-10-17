import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, type UseFormRegister } from "react-hook-form";

import { createSpecialization, updateSpecialization, type Specialization } from "@/api/admin";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { specializationSchema, type SpecializationForm } from "./schemas";
import { describeError, hasFieldErrors } from "@/lib/errors";

interface UseSpecializationFormArgs {
  existing?: Specialization;
  onSaved: (saved: Specialization) => void;
}

/**
 * Shared create/edit logic. Deliberately exposes a plain submit callback rather than a <form>:
 * the inline editor is rendered inside the add-doctor form, and forms cannot nest.
 */
function useSpecializationForm({ existing, onSaved }: UseSpecializationFormArgs) {
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
      toast({
        title: existing ? "Specialization updated" : "Specialization added",
        description: saved.title,
        variant: "success",
      });
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


  return {
    register,
    errors,
    isPending: mutation.isPending,
    generalError:
      mutation.isError && !hasFieldErrors(mutation.error)
        ? describeError(mutation.error, "save the specialization").description
        : null,
    submit: () => void handleSubmit((v) => mutation.mutate(v))(),
  };
}

interface FieldsProps {
  register: UseFormRegister<SpecializationForm>;
  errors: Partial<Record<keyof SpecializationForm, { message?: string }>>;
  idPrefix: string;
}

function SpecializationFields({ register, errors, idPrefix }: FieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-title`}>Title</Label>
        <Input
          id={`${idPrefix}-title`}
          autoComplete="off"
          placeholder="e.g. Cardiology"
          aria-invalid={!!errors.title}
          {...register("title")}
        />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-description`}>Description</Label>
        <Textarea
          id={`${idPrefix}-description`}
          placeholder="What this specialization covers"
          aria-invalid={!!errors.description}
          {...register("description")}
        />
        {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
      </div>
    </div>
  );
}

interface EditorProps {
  /** When set, edits this specialization; otherwise creates a new one. */
  existing?: Specialization;
  onSaved: (saved: Specialization) => void;
  onCancel: () => void;
}

/** Inline panel, used inside the add-doctor form where a modal would hide the form behind it. */
export default function SpecializationEditor({ existing, onSaved, onCancel }: EditorProps) {
  const { register, errors, isPending, generalError, submit } = useSpecializationForm({ existing, onSaved });

  return (
    <Card className="space-y-4 border-primary/30 bg-accent/40 p-4 shadow-none">
      <p className="text-sm font-medium">New specialization</p>
      <SpecializationFields register={register} errors={errors} idPrefix="inline-spec" />
      {generalError && <p className="text-sm text-destructive">{generalError}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" loading={isPending} onClick={submit}>
          Add specialization
        </Button>
      </div>
    </Card>
  );
}

interface DialogProps extends EditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Modal version, used from the Specializations page. */
export function SpecializationDialog({ existing, onSaved, onOpenChange, open }: DialogProps) {
  const { register, errors, isPending, generalError, submit } = useSpecializationForm({ existing, onSaved });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Edit specialization" : "Add specialization"}</DialogTitle>
          <DialogDescription>Doctors are assigned one of these when they are added.</DialogDescription>
        </DialogHeader>
        <DialogBody className="pb-4">
          <SpecializationFields register={register} errors={errors} idPrefix="dialog-spec" />
          {generalError && <p className="mt-3 text-sm text-destructive">{generalError}</p>}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" loading={isPending} onClick={submit}>
            {existing ? "Save changes" : "Add specialization"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
