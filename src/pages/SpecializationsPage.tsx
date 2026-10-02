import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { deleteSpecialization, listSpecializations, type Specialization } from "@/api/admin";
import { ApiError } from "@/api/client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SpecializationEditor from "@/features/admin/SpecializationEditor";

type Editing = { kind: "new" } | { kind: "edit"; item: Specialization } | null;

export default function SpecializationsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Editing>(null);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["specializations"], queryFn: listSpecializations });

  const remove = useMutation({
    mutationFn: (id: number) => deleteSpecialization(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["specializations"] }),
  });

  const confirmDelete = (s: Specialization) => {
    if (window.confirm(`Delete the "${s.title}" specialization?`)) remove.mutate(s.id);
  };

  return (
    <>
      <PageHeader
        title="Specializations"
        description="Choose from these when adding a doctor."
        action={
          !editing && (
            <Button className="w-full sm:w-auto" onClick={() => setEditing({ kind: "new" })}>
              <Plus className="h-4 w-4" />
              Add specialization
            </Button>
          )
        }
      />

      {editing && (
        <div className="mb-4 max-w-2xl">
          <SpecializationEditor
            key={editing.kind === "edit" ? editing.item.id : "new"}
            existing={editing.kind === "edit" ? editing.item : undefined}
            onSaved={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {remove.isError && (
        <p className="mb-3 text-sm text-destructive">
          {remove.error instanceof ApiError ? remove.error.message : "Could not delete the specialization."}
        </p>
      )}

      <Card className="overflow-hidden">
        {isLoading && <p className="p-8 text-center text-sm text-muted-foreground">Loading...</p>}
        {isError && (
          <div className="p-8 text-center text-sm">
            <p className="text-destructive">Could not load specializations.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        )}
        {data && data.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No specializations yet.</p>}
        {data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="hidden sm:table-cell">Description</TableHead>
                <TableHead className="w-24 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium">{s.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground sm:hidden">{s.description}</div>
                  </TableCell>
                  <TableCell className="hidden max-w-md text-muted-foreground sm:table-cell">{s.description}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Edit ${s.title}`}
                        onClick={() => setEditing({ kind: "edit", item: s })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Delete ${s.title}`}
                        disabled={remove.isPending}
                        onClick={() => confirmDelete(s)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
