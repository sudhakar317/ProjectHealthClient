import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { deleteDoctor, listDoctors, listSpecializations, type Doctor, type DoctorFilters } from "@/api/admin";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebounce } from "@/lib/useDebounce";

const emptyFilters: DoctorFilters = {
  fullName: "",
  email: "",
  phone: "",
  registrationNumber: "",
  specializationId: "",
  active: "",
};

const textFilters: { name: keyof DoctorFilters; label: string }[] = [
  { name: "fullName", label: "Name" },
  { name: "email", label: "Email" },
  { name: "phone", label: "Phone" },
  { name: "registrationNumber", label: "Registration no." },
];

export default function DoctorsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<DoctorFilters>(emptyFilters);
  const debounced = useDebounce(filters);
  const hasFilters = Object.values(filters).some(Boolean);

  const specializations = useQuery({ queryKey: ["specializations"], queryFn: listSpecializations });
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["doctors", "list", debounced],
    queryFn: () => listDoctors(debounced),
    placeholderData: (previous) => previous,
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteDoctor(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["doctors"] }),
  });

  const confirmDelete = (d: Doctor) => {
    if (window.confirm(`Delete ${d.fullName}? They will no longer be able to sign in.`)) remove.mutate(d.id);
  };

  const setFilter = (name: keyof DoctorFilters, value: string) => setFilters((f) => ({ ...f, [name]: value }));

  return (
    <>
      <PageHeader
        title="Doctors"
        description="People allowed to sign in to the clinic."
        action={
          <Button asChild className="w-full sm:w-auto">
            <Link to="/doctors/new">
              <Plus className="h-4 w-4" />
              Add doctor
            </Link>
          </Button>
        }
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {textFilters.map((f) => (
            <Input
              key={f.name}
              placeholder={f.label}
              aria-label={`Filter by ${f.label.toLowerCase()}`}
              value={filters[f.name]}
              onChange={(e) => setFilter(f.name, e.target.value)}
            />
          ))}
          <Select
            aria-label="Filter by specialization"
            value={filters.specializationId}
            onChange={(e) => setFilter("specializationId", e.target.value)}
          >
            <option value="">All specializations</option>
            {specializations.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by status"
            value={filters.active}
            onChange={(e) => setFilter("active", e.target.value)}
          >
            <option value="">Any status</option>
            <option value="true">Active</option>
            <option value="false">Disabled</option>
          </Select>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => setFilters(emptyFilters)}>
            Clear filters
          </Button>
        )}
      </Card>

      {remove.isError && <p className="mb-3 text-sm text-destructive">Could not delete the doctor.</p>}

      <Card className="overflow-hidden">
        {isLoading && <p className="p-8 text-center text-sm text-muted-foreground">Loading...</p>}
        {isError && (
          <div className="p-8 text-center text-sm">
            <p className="text-destructive">Could not load doctors.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        )}
        {data && data.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {hasFilters ? "No doctors match these filters." : "No doctors yet."}
          </p>
        )}
        {data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Specialization</TableHead>
                <TableHead className="hidden lg:table-cell">Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Reg. no.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div className="font-medium">{d.fullName}</div>
                    <div className="break-all text-xs text-muted-foreground">{d.email}</div>
                    <div className="mt-1 text-xs text-muted-foreground md:hidden">{d.specializationTitle ?? "—"}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{d.specializationTitle ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{d.phone}</TableCell>
                  <TableCell className="hidden lg:table-cell">{d.registrationNumber}</TableCell>
                  <TableCell>
                    <Badge variant={d.active ? "success" : "muted"}>{d.active ? "Active" : "Disabled"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" asChild aria-label={`Edit ${d.fullName}`}>
                        <Link to={`/doctors/${d.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Delete ${d.fullName}`}
                        disabled={remove.isPending}
                        onClick={() => confirmDelete(d)}
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
