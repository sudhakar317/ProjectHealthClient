import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, Plus, Search, SlidersHorizontal, Trash2, Users, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { deleteDoctor, listDoctors, listSpecializations, type Doctor, type DoctorFilters } from "@/api/admin";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  SheetContent,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectMenu } from "@/components/ui/select-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { useDebounce } from "@/lib/useDebounce";
import { cn } from "@/lib/utils";
import { toastError } from "@/lib/errors";

const emptyFilters: DoctorFilters = {
  fullName: "",
  email: "",
  phone: "",
  specializationId: "",
  active: "",
};

/** Everything except fullName, which has its own search box in the toolbar. */
const advancedKeys = ["email", "phone", "specializationId", "active"] as const;

const textFields: { name: "email" | "phone"; label: string; placeholder: string }[] = [
  { name: "email", label: "Email", placeholder: "name@example.com" },
  { name: "phone", label: "Phone", placeholder: "Any phone number" },
];

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

export default function DoctorsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<DoctorFilters>(emptyFilters);
  const [panelOpen, setPanelOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Doctor | null>(null);
  const debounced = useDebounce(filters);

  const specializations = useQuery({ queryKey: ["specializations"], queryFn: listSpecializations });
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["doctors", "list", debounced],
    queryFn: () => listDoctors(debounced),
    placeholderData: (previous) => previous,
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteDoctor(id),
    onSuccess: async (_result, _id) => {
      await queryClient.invalidateQueries({ queryKey: ["doctors"] });
      toast({ title: "Doctor deleted", description: `${pendingDelete?.fullName} can no longer sign in.`, variant: "success" });
      setPendingDelete(null);
    },
    onError: (e) => {
      // Usually the doctor has records: the server says so, and that they should be deactivated instead.
      toastError(e, "delete the doctor");
      setPendingDelete(null);
    },
  });

  const setFilter = (name: keyof DoctorFilters, value: string) => setFilters((f) => ({ ...f, [name]: value }));
  const clearAll = () => setFilters(emptyFilters);

  const activeAdvanced = advancedKeys.filter((key) => filters[key] !== "");
  const anyFilter = activeAdvanced.length > 0 || filters.fullName !== "";

  const chipLabel = (key: (typeof advancedKeys)[number]) => {
    const value = filters[key];
    if (key === "specializationId") {
      return `Specialization: ${specializations.data?.find((s) => String(s.id) === value)?.title ?? value}`;
    }
    if (key === "active") return value === "true" ? "Status: Active" : "Status: Disabled";
    const field = textFields.find((f) => f.name === key);
    return `${field?.label ?? key}: ${value}`;
  };

  const filterFields = (
    <div className="grid gap-4 sm:grid-cols-2">
      {textFields.map((f) => (
        <div key={f.name} className="space-y-2">
          <Label htmlFor={`filter-${f.name}`}>{f.label}</Label>
          <Input
            id={`filter-${f.name}`}
            placeholder={f.placeholder}
            value={filters[f.name]}
            onChange={(e) => setFilter(f.name, e.target.value)}
          />
        </div>
      ))}
      <div className="space-y-2">
        <Label htmlFor="filter-specialization">Specialization</Label>
        <SelectMenu
          id="filter-specialization"
          value={filters.specializationId}
          onValueChange={(v) => setFilter("specializationId", v)}
          options={(specializations.data ?? []).map((s) => ({ value: String(s.id), label: s.title }))}
          placeholder="All specializations"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="filter-status">Status</Label>
        <SelectMenu
          id="filter-status"
          value={filters.active}
          onValueChange={(v) => setFilter("active", v)}
          options={[
            { value: "true", label: "Active" },
            { value: "false", label: "Disabled" },
          ]}
          placeholder="Any status"
        />
      </div>
    </div>
  );

  const rowActions = (d: Doctor) => (
    <>
      <Button variant="ghost" size="icon-sm" asChild aria-label={`Edit ${d.fullName}`}>
        <Link to={`/doctors/${d.id}/edit`}>
          <Pencil />
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete ${d.fullName}`}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setPendingDelete(d)}
      >
        <Trash2 />
      </Button>
    </>
  );

  return (
    <>
      <PageHeader
        title="Doctors"
        description="People allowed to sign in to the clinic."
        action={
          <Button asChild className="w-full sm:w-auto">
            <Link to="/doctors/new">
              <Plus />
              Add doctor
            </Link>
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          icon={<Search />}
          type="search"
          placeholder="Search by name"
          aria-label="Search doctors by name"
          value={filters.fullName}
          onChange={(e) => setFilter("fullName", e.target.value)}
          className="sm:max-w-sm"
        />
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="flex-1 sm:flex-none"
            aria-expanded={panelOpen || sheetOpen}
            onClick={() => {
              // The inline panel is desktop-only; phones get a sheet so the list stays on screen.
              if (window.matchMedia("(min-width: 1024px)").matches) setPanelOpen((o) => !o);
              else setSheetOpen(true);
            }}
          >
            <SlidersHorizontal />
            Filters
            {activeAdvanced.length > 0 && (
              <Badge variant="info" className="ml-0.5 px-1.5">
                {activeAdvanced.length}
              </Badge>
            )}
          </Button>
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {data ? `${data.length} ${data.length === 1 ? "doctor" : "doctors"}` : ""}
          </span>
        </div>
      </div>

      {/* Active filter chips */}
      {activeAdvanced.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {activeAdvanced.map((key) => (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 rounded-full border bg-card py-1 pl-3 pr-1.5 text-xs font-medium shadow-soft"
            >
              <span className="max-w-[14rem] truncate">{chipLabel(key)}</span>
              <button
                onClick={() => setFilter(key, "")}
                aria-label={`Remove ${chipLabel(key)} filter`}
                className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
          <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={clearAll}>
            Clear all
          </Button>
        </div>
      )}

      {/* Desktop inline filter panel */}
      {panelOpen && (
        <Card className="mt-4 hidden p-5 lg:block">
          {filterFields}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={clearAll} disabled={!anyFilter}>
              Clear all
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPanelOpen(false)}>
              Done
            </Button>
          </div>
        </Card>
      )}

      {/* Mobile / tablet filter sheet */}
      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="lg:hidden">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
          </DialogHeader>
          <DialogBody className="pb-4">{filterFields}</DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={clearAll} disabled={!anyFilter}>
              Clear all
            </Button>
            <Button onClick={() => setSheetOpen(false)}>
              Show {data?.length ?? 0} {data?.length === 1 ? "result" : "results"}
            </Button>
          </DialogFooter>
        </SheetContent>
      </Dialog>

      <Card className={cn("mt-4 overflow-hidden transition-opacity", isFetching && "opacity-70")}>
        {isLoading && (
          <div className="divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <EmptyState
            icon={Users}
            title="Could not load doctors"
            description="Something went wrong while fetching the list."
            action={
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            }
          />
        )}

        {data && data.length === 0 && (
          <EmptyState
            icon={Users}
            title={anyFilter ? "No doctors match these filters" : "No doctors yet"}
            description={
              anyFilter
                ? "Try removing a filter or searching for a different name."
                : "Add a doctor to let them sign in to the clinic."
            }
            action={
              anyFilter ? (
                <Button variant="outline" size="sm" onClick={clearAll}>
                  Clear filters
                </Button>
              ) : (
                <Button asChild size="sm">
                  <Link to="/doctors/new">
                    <Plus />
                    Add doctor
                  </Link>
                </Button>
              )
            }
          />
        )}

        {data && data.length > 0 && (
          <>
            {/* Phone: cards, so nothing is squeezed into columns */}
            <ul className="divide-y sm:hidden">
              {data.map((d) => (
                <li key={d.id} className="flex items-start gap-3 p-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {initials(d.fullName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-tight">{d.fullName}</p>
                    <p className="break-anywhere text-xs text-muted-foreground">{d.email}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge variant={d.active ? "success" : "muted"}>{d.active ? "Active" : "Disabled"}</Badge>
                      {d.specializationTitle && <Badge variant="outline">{d.specializationTitle}</Badge>}
                    </div>
                    {d.phone && <p className="mt-2 text-xs text-muted-foreground">{d.phone}</p>}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${d.fullName}`}>
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/doctors/${d.id}/edit`}>
                          <Pencil />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem destructive onSelect={() => setPendingDelete(d)}>
                        <Trash2 />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>

            {/* Tablet and up: table */}
            <div className="hidden sm:block">
              {/* table-fixed so the width classes below win and long emails truncate instead of
                  stretching the table past its container. */}
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Doctor</TableHead>
                    <TableHead className="hidden w-44 md:table-cell">Specialization</TableHead>
                    <TableHead className="hidden w-40 lg:table-cell">Phone</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="w-24 text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {initials(d.fullName)}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-medium leading-tight" title={d.fullName}>
                              {d.fullName}
                            </div>
                            <div className="truncate text-xs text-muted-foreground" title={d.email}>
                              {d.email}
                            </div>
                            <div className="truncate text-xs text-muted-foreground md:hidden">
                              {d.specializationTitle ?? "—"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {d.specializationTitle ? (
                          <Badge variant="outline" className="max-w-full">
                            <span className="truncate">{d.specializationTitle}</span>
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        <span className="block truncate">{d.phone || "—"}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={d.active ? "success" : "muted"}>{d.active ? "Active" : "Disabled"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">{rowActions(d)}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this doctor?"
        description={
          <>
            <span className="font-medium text-foreground">{pendingDelete?.fullName}</span> will no longer be able to
            sign in. This cannot be undone.
          </>
        }
        confirmLabel="Delete doctor"
        destructive
        loading={remove.isPending}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)}
      />
    </>
  );
}
