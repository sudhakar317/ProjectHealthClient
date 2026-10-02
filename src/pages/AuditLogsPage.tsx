import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { listAuditLogs } from "@/api/admin";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const eventTypes = [
  "LOGIN_SUCCESS",
  "LOGIN_FAILURE",
  "LOGOUT",
  "DOCTOR_CREATED",
  "DOCTOR_UPDATED",
  "DOCTOR_DELETED",
  "SPECIALIZATION_CREATED",
  "SPECIALIZATION_UPDATED",
  "SPECIALIZATION_DELETED",
];

const label = (type: string) => type.toLowerCase().replace(/_/g, " ");

export default function AuditLogsPage() {
  const [page, setPage] = useState(0);
  const [eventType, setEventType] = useState("");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["audit-logs", page, eventType],
    queryFn: () => listAuditLogs(page, eventType),
    placeholderData: (previous) => previous,
  });

  return (
    <>
      <PageHeader title="Audit logs" description="A record of sign-ins and changes. Entries cannot be edited or deleted." />

      <div className="mb-4 max-w-xs">
        <Select
          aria-label="Filter by event"
          value={eventType}
          onChange={(e) => {
            setEventType(e.target.value);
            setPage(0);
          }}
        >
          <option value="">All events</option>
          {eventTypes.map((t) => (
            <option key={t} value={t}>
              {label(t)}
            </option>
          ))}
        </Select>
      </div>

      <Card className="overflow-hidden">
        {isLoading && <p className="p-8 text-center text-sm text-muted-foreground">Loading...</p>}
        {isError && (
          <div className="p-8 text-center text-sm">
            <p className="text-destructive">Could not load audit logs.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        )}
        {data && data.items.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No entries.</p>}
        {data && data.items.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Event</TableHead>
                <TableHead className="hidden md:table-cell">By</TableHead>
                <TableHead className="hidden lg:table-cell">Details</TableHead>
                <TableHead className="hidden lg:table-cell">IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(e.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium capitalize">{label(e.eventType)}</div>
                    <div className="break-all text-xs text-muted-foreground md:hidden">{e.actorEmail ?? "—"}</div>
                  </TableCell>
                  <TableCell className="hidden break-all md:table-cell">{e.actorEmail ?? "—"}</TableCell>
                  <TableCell className="hidden break-all text-muted-foreground lg:table-cell">{e.details ?? "—"}</TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">{e.ipAddress ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Page {data.page + 1} of {data.totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
