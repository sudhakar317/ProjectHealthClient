import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  UserMinus,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import {
  deactivatePatient,
  listPatients,
  restorePatient,
  type Patient,
  type PatientFilters,
} from "@/api/patients";
import { useAuth } from "@/auth/AuthContext";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { ageFromDob } from "@/lib/datetime";
import { useDebounce } from "@/lib/useDebounce";
import { cn } from "@/lib/utils";
import { toastError } from "@/lib/errors";

const sexLabel: Record<Patient["sex"], string> = { MALE: "Male", FEMALE: "Female", OTHER: "Other" };

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

export default function PatientsPage() {
  const { user } = useAuth();
  const isDoctor = user?.role === "DOCTOR";
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<PatientFilters>({ search: "", includeInactive: false });
  const [pendingDeactivate, setPendingDeactivate] = useState<Patient | null>(null);
  const debounced = useDebounce(filters);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["patients", page, debounced],
    queryFn: () => listPatients(page, debounced),
    placeholderData: (previous) => previous,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["patients"] });

  const deactivate = useMutation({
    mutationFn: (id: number) => deactivatePatient(id),
    onSuccess: async () => {
      await invalidate();
      toast({ title: "Patient deactivated", description: pendingDeactivate?.fullName, variant: "success" });
      setPendingDeactivate(null);
    },
    onError: (e) => {
      toastError(e, "deactivate the patient");
      setPendingDeactivate(null);
    },
  });

  const restore = useMutation({
    mutationFn: (id: number) => restorePatient(id),
    onSuccess: async (patient) => {
      await invalidate();
      toast({ title: "Patient restored", description: patient.fullName, variant: "success" });
    },
    onError: (e) => toastError(e, "restore the patient"),
  });

  const setSearch = (search: string) => {
    setFilters((f) => ({ ...f, search }));
    setPage(0);
  };
  const toggleInactive = (includeInactive: boolean) => {
    setFilters((f) => ({ ...f, includeInactive }));
    setPage(0);
  };

  const lastPage = data ? Math.max(data.totalPages - 1, 0) : 0;
  const from = data && data.totalItems > 0 ? data.page * data.size + 1 : 0;
  const to = data ? Math.min((data.page + 1) * data.size, data.totalItems) : 0;

  const rowActions = (p: Patient) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${p.fullName}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to={`/patients/${p.id}`}>
            <NotebookPen />
            Visits
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={`/patients/${p.id}/edit`}>
            <Pencil />
            Edit
          </Link>
        </DropdownMenuItem>
        {p.active ? (
          <DropdownMenuItem destructive onSelect={() => setPendingDeactivate(p)}>
            <UserMinus />
            Deactivate
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => restore.mutate(p.id)}>
            <RotateCcw />
            Restore
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <PageHeader
        title="Patients"
        description={isDoctor ? "Patients you have registered." : "Every patient in the clinic."}
        action={
          isDoctor ? (
            <Button asChild className="w-full sm:w-auto">
              <Link to="/patients/new">
                <Plus />
                Add patient
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          icon={<Search />}
          type="search"
          placeholder="Search by name or phone"
          aria-label="Search patients by name or phone"
          value={filters.search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-sm"
        />
        <label className="flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={filters.includeInactive}
            onChange={(e) => toggleInactive(e.target.checked)}
          />
          Include inactive
        </label>
        <span className="whitespace-nowrap text-sm text-muted-foreground sm:ml-auto">
          {data ? `${data.totalItems} ${data.totalItems === 1 ? "patient" : "patients"}` : ""}
        </span>
      </div>

      <Card className={cn("mt-4 overflow-hidden transition-opacity", isFetching && "opacity-70")}>
        {isLoading && (
          <div className="divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <EmptyState
            icon={Users}
            title="Could not load patients"
            description="Something went wrong while fetching the list."
            action={
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            }
          />
        )}

        {data && data.items.length === 0 && (
          <EmptyState
            icon={Users}
            title={filters.search ? "No patients match that search" : "No patients yet"}
            description={
              filters.search
                ? "Try a different name or phone number."
                : isDoctor
                  ? "Register your first patient to get started."
                  : "Patients appear here once a doctor registers them."
            }
            action={
              !filters.search && isDoctor ? (
                <Button asChild size="sm">
                  <Link to="/patients/new">
                    <Plus />
                    Add patient
                  </Link>
                </Button>
              ) : undefined
            }
          />
        )}

        {data && data.items.length > 0 && (
          <>
            {/* Phone: cards, so nothing is squeezed into columns */}
            <ul className="divide-y sm:hidden">
              {data.items.map((p) => (
                <li key={p.id} className="flex items-start gap-3 p-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {initials(p.fullName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/patients/${p.id}`}
                      className="font-medium leading-tight hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {p.fullName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {sexLabel[p.sex]} · {ageFromDob(p.dateOfBirth)} · {p.phone}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {!p.active && <Badge variant="muted">Inactive</Badge>}
                      <Badge variant="outline">
                        <span className="truncate">{p.doctorName}</span>
                      </Badge>
                    </div>
                  </div>
                  {rowActions(p)}
                </li>
              ))}
            </ul>

            {/* Tablet and up: table */}
            <div className="hidden sm:block">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Patient</TableHead>
                    <TableHead className="w-32">Age / sex</TableHead>
                    <TableHead className="hidden w-40 lg:table-cell">Phone</TableHead>
                    <TableHead className="hidden w-48 lg:table-cell">Doctor</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="w-16 text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {initials(p.fullName)}
                          </span>
                          <div className="min-w-0">
                            <Link
                              to={`/patients/${p.id}`}
                              className="block truncate font-medium leading-tight hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              title={p.fullName}
                            >
                              {p.fullName}
                            </Link>
                            <div className="truncate text-xs text-muted-foreground lg:hidden">{p.phone}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {ageFromDob(p.dateOfBirth)} · {sexLabel[p.sex]}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        <span className="block truncate">{p.phone}</span>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        <span className="block truncate" title={p.doctorName}>
                          {p.doctorName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.active ? "success" : "muted"}>{p.active ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">{rowActions(p)}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground">
              Showing {from}–{to} of {data.totalItems}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
              >
                <ChevronLeft />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              <span className="px-2 text-sm tabular-nums text-muted-foreground">
                {data.page + 1} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= lastPage}
                onClick={() => setPage((p) => Math.min(p + 1, lastPage))}
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={pendingDeactivate !== null}
        onOpenChange={(open) => !open && setPendingDeactivate(null)}
        title="Deactivate this patient?"
        description={
          <>
            <span className="font-medium text-foreground">{pendingDeactivate?.fullName}</span> will be hidden from the
            list. The record is kept and can be restored at any time.
          </>
        }
        confirmLabel="Deactivate"
        destructive
        loading={deactivate.isPending}
        onConfirm={() => pendingDeactivate && deactivate.mutate(pendingDeactivate.id)}
      />
    </>
  );
}
