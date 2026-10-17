import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { useState } from "react";

import { deleteSpecialization, listSpecializations, type Specialization } from "@/api/admin";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { SpecializationDialog } from "@/features/admin/SpecializationEditor";
import { toastError } from "@/lib/errors";

type Editing = { kind: "new" } | { kind: "edit"; item: Specialization } | null;

export default function SpecializationsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Editing>(null);
  const [pendingDelete, setPendingDelete] = useState<Specialization | null>(null);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["specializations"],
    queryFn: listSpecializations,
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteSpecialization(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["specializations"] });
      toast({ title: "Specialization deleted", description: pendingDelete?.title, variant: "success" });
      setPendingDelete(null);
    },
    onError: (e) => {
      toastError(e, "delete the specialization");
      setPendingDelete(null);
    },
  });

  const rowActions = (s: Specialization) => (
    <>
      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${s.title}`} onClick={() => setEditing({ kind: "edit", item: s })}>
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete ${s.title}`}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setPendingDelete(s)}
      >
        <Trash2 />
      </Button>
    </>
  );

  return (
    <>
      <PageHeader
        title="Specializations"
        description="Choose from these when adding a doctor."
        action={
          <Button className="w-full sm:w-auto" onClick={() => setEditing({ kind: "new" })}>
            <Plus />
            Add specialization
          </Button>
        }
      />

      <Card className="overflow-hidden">
        {isLoading && (
          <div className="divide-y">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2 p-4">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-64" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <EmptyState
            icon={Tags}
            title="Could not load specializations"
            action={
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            }
          />
        )}

        {data && data.length === 0 && (
          <EmptyState
            icon={Tags}
            title="No specializations yet"
            description="Add one so doctors can be assigned a field of practice."
            action={
              <Button size="sm" onClick={() => setEditing({ kind: "new" })}>
                <Plus />
                Add specialization
              </Button>
            }
          />
        )}

        {data && data.length > 0 && (
          <>
            {/* Phone: stacked cards */}
            <ul className="divide-y sm:hidden">
              {data.map((s) => (
                <li key={s.id} className="flex items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{s.title}</p>
                    {s.description && <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1">{rowActions(s)}</div>
                </li>
              ))}
            </ul>

            {/* Tablet and up: table */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-64">Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-24 text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.title}</TableCell>
                      <TableCell className="max-w-md text-muted-foreground">{s.description || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">{rowActions(s)}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>

      {editing && (
        <SpecializationDialog
          key={editing.kind === "edit" ? editing.item.id : "new"}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          existing={editing.kind === "edit" ? editing.item : undefined}
          onSaved={() => setEditing(null)}
          onCancel={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this specialization?"
        description={
          <>
            <span className="font-medium text-foreground">{pendingDelete?.title}</span> will be removed. Doctors
            already assigned to it cannot be left without one, so this may be rejected.
          </>
        }
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)}
      />
    </>
  );
}
