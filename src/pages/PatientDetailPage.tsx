import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NotebookPen, Pencil, Plus, Users } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getPatient } from "@/api/patients";
import { deleteVisit, listPatientVisits, restoreVisit, type Visit } from "@/api/visits";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import VisitDialog from "@/features/visits/VisitDialog";
import VisitTimeline from "@/features/visits/VisitTimeline";
import { ageFromDob } from "@/lib/datetime";
import { toastError } from "@/lib/errors";

const sexLabel = { MALE: "Male", FEMALE: "Female", OTHER: "Other" } as const;

export default function PatientDetailPage() {
  const { id } = useParams();
  const patientId = Number(id);
  const queryClient = useQueryClient();

  const [includeInactive, setIncludeInactive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [editing, setEditing] = useState<Visit | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Visit | null>(null);

  const patient = useQuery({
    queryKey: ["patients", patientId],
    queryFn: () => getPatient(patientId),
    enabled: Number.isFinite(patientId),
  });

  const visits = useQuery({
    queryKey: ["visits", "patient", patientId, includeInactive],
    queryFn: () => listPatientVisits(patientId, includeInactive),
    enabled: Number.isFinite(patientId),
  });

  /** Visits a later one has already answered: their dates are history and the form locks them. */
  const answeredIds = new Set(
    (visits.data ?? []).map((v) => v.previousVisitId).filter((id): id is number => id !== null),
  );

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["visits"] });
    await queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
  };

  const remove = useMutation({
    mutationFn: (visit: Visit) => deleteVisit(visit.id),
    onSuccess: async () => {
      await invalidate();
      toast({ title: "Visit deleted", description: "It can be restored at any time.", variant: "success" });
      setPendingDelete(null);
    },
    onError: (e) => {
      toastError(e, "delete the visit");
      setPendingDelete(null);
    },
  });

  const restore = useMutation({
    mutationFn: (visit: Visit) => restoreVisit(visit.id),
    onSuccess: async () => {
      await invalidate();
      toast({ title: "Visit restored", variant: "success" });
    },
    onError: (e) => toastError(e, "restore the visit"),
  });

  if (patient.isError || !Number.isFinite(patientId)) {
    return (
      <>
        <PageHeader title="Patient" backTo={{ to: "/patients", label: "Patients" }} />
        <Card>
          <EmptyState
            icon={Users}
            title="Could not load this patient"
            description="They may have been removed, or they belong to another doctor."
            action={
              <Button asChild variant="outline" size="sm">
                <Link to="/patients">Back to patients</Link>
              </Button>
            }
          />
        </Card>
      </>
    );
  }

  const p = patient.data;

  return (
    <>
      <PageHeader
        title={p?.fullName ?? "Patient"}
        description={
          p ? `${sexLabel[p.sex]} · ${ageFromDob(p.dateOfBirth)} · ${p.phone} · Dr ${p.doctorName}` : undefined
        }
        backTo={{ to: "/patients", label: "Patients" }}
        action={
          p && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link to={`/patients/${p.id}/edit`}>
                  <Pencil />
                  Edit patient
                </Link>
              </Button>
              {/* An inactive patient cannot take a new visit, matching the server rule. */}
              <Button className="w-full sm:w-auto" disabled={!p.active} onClick={() => setRecording(true)}>
                <Plus />
                Record visit
              </Button>
            </div>
          )
        }
      />

      {p && !p.active && (
        <div className="mb-4">
          <Badge variant="muted">This patient is inactive. Restore them before recording a visit.</Badge>
        </div>
      )}

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Visit history</h2>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          Include deleted
        </label>
      </div>

      <Card className="overflow-hidden">
        {visits.isLoading && (
          <div className="divide-y">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2 p-4 sm:px-6">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        )}

        {visits.isError && (
          <EmptyState
            icon={NotebookPen}
            title="Could not load the visits"
            description="Something went wrong while fetching the history."
            action={
              <Button variant="outline" size="sm" onClick={() => void visits.refetch()}>
                Retry
              </Button>
            }
          />
        )}

        {visits.data && visits.data.length === 0 && (
          <EmptyState
            icon={NotebookPen}
            title="No visits yet"
            description="Record the first consultation to start this patient's history."
            action={
              p?.active ? (
                <Button size="sm" onClick={() => setRecording(true)}>
                  <Plus />
                  Record visit
                </Button>
              ) : undefined
            }
          />
        )}

        {visits.data && visits.data.length > 0 && (
          <VisitTimeline
            visits={visits.data}
            onEdit={setEditing}
            onDelete={setPendingDelete}
            onRestore={(visit) => restore.mutate(visit)}
          />
        )}
      </Card>

      {/* Keyed so the form resets between recording a new visit and editing an existing one. */}
      {p && recording && (
        <VisitDialog
          key="new"
          open
          onOpenChange={setRecording}
          patientId={p.id}
          patientName={p.fullName}
          patientDoctorId={p.doctorId}
        />
      )}

      {p && editing && (
        <VisitDialog
          key={editing.id}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          patientId={p.id}
          patientName={p.fullName}
          patientDoctorId={p.doctorId}
          existing={editing}
          answered={answeredIds.has(editing.id)}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this visit?"
        description="The note is kept and can be restored at any time."
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete)}
      />
    </>
  );
}
