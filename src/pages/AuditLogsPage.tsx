import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ScrollText, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";

import { listAuditLogs, type AuditEntry, type AuditFilters } from "@/api/admin";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle, SheetContent } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectMenu } from "@/components/ui/select-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { auditEventGroups, describeDetails, eventMeta } from "@/features/admin/auditEvents";
import { absoluteTime, dayLabel, relativeTime, timeOfDay } from "@/lib/datetime";
import { cn } from "@/lib/utils";

const emptyFilters: AuditFilters = { eventType: "", from: "", to: "" };

interface DayGroup {
  day: string;
  entries: AuditEntry[];
}

/** Entries arrive newest-first, so a single pass preserves that order. */
function groupByDay(entries: AuditEntry[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const entry of entries) {
    const day = dayLabel(entry.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.entries.push(entry);
    else groups.push({ day, entries: [entry] });
  }
  return groups;
}

function EventChip({ type }: { type: string }) {
  const { label, icon: Icon, tone } = eventMeta(type);
  return (
    <Badge variant={tone} className="whitespace-nowrap">
      <Icon />
      {label}
    </Badge>
  );
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<AuditFilters>(emptyFilters);
  const [actorSearch, setActorSearch] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["audit-logs", page, filters],
    queryFn: () => listAuditLogs(page, filters),
    placeholderData: (previous) => previous,
  });

  // The API filters by event type and date, so actor search narrows the page already loaded.
  const visible = useMemo(() => {
    const term = actorSearch.trim().toLowerCase();
    if (!data) return [];
    if (!term) return data.items;
    return data.items.filter((e) => (e.actorEmail ?? "").toLowerCase().includes(term));
  }, [data, actorSearch]);

  const groups = useMemo(() => groupByDay(visible), [visible]);

  const setFilter = (name: keyof AuditFilters, value: string) => {
    setFilters((f) => ({ ...f, [name]: value }));
    setPage(0);
  };
  const clearAll = () => {
    setFilters(emptyFilters);
    setPage(0);
  };

  const activeKeys = (Object.keys(filters) as (keyof AuditFilters)[]).filter((k) => filters[k] !== "");
  const chipLabel = (key: keyof AuditFilters) => {
    if (key === "eventType") return eventMeta(filters.eventType).label;
    return `${key === "from" ? "From" : "To"} ${filters[key]}`;
  };

  const from = data && data.totalItems > 0 ? data.page * data.size + 1 : 0;
  const to = data ? Math.min((data.page + 1) * data.size, data.totalItems) : 0;
  const lastPage = data ? Math.max(data.totalPages - 1, 0) : 0;

  const filterFields = (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="filter-event">Event</Label>
        <SelectMenu
          id="filter-event"
          value={filters.eventType}
          onValueChange={(v) => setFilter("eventType", v)}
          options={auditEventGroups}
          placeholder="All events"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="filter-from">From date</Label>
        <Input
          id="filter-from"
          type="date"
          max={filters.to || undefined}
          value={filters.from}
          onChange={(e) => setFilter("from", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="filter-to">To date</Label>
        <Input
          id="filter-to"
          type="date"
          min={filters.from || undefined}
          value={filters.to}
          onChange={(e) => setFilter("to", e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Audit logs"
        description="A record of sign-ins and changes. Entries cannot be edited or deleted."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          icon={<Search />}
          type="search"
          placeholder="Search this page by email"
          aria-label="Search the current page by actor email"
          value={actorSearch}
          onChange={(e) => setActorSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="flex-1 sm:flex-none"
            aria-expanded={panelOpen || sheetOpen}
            onClick={() => {
              if (window.matchMedia("(min-width: 1024px)").matches) setPanelOpen((o) => !o);
              else setSheetOpen(true);
            }}
          >
            <SlidersHorizontal />
            Filters
            {activeKeys.length > 0 && (
              <Badge variant="info" className="ml-0.5 px-1.5">
                {activeKeys.length}
              </Badge>
            )}
          </Button>
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {data ? (actorSearch ? `${visible.length} on this page` : `${data.totalItems} entries`) : ""}
          </span>
        </div>
      </div>

      {activeKeys.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {activeKeys.map((key) => (
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

      {panelOpen && (
        <Card className="mt-4 hidden p-5 lg:block">
          {filterFields}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={clearAll} disabled={activeKeys.length === 0}>
              Clear all
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPanelOpen(false)}>
              Done
            </Button>
          </div>
        </Card>
      )}

      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="lg:hidden">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
          </DialogHeader>
          <DialogBody className="pb-4">{filterFields}</DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={clearAll} disabled={activeKeys.length === 0}>
              Clear all
            </Button>
            <Button onClick={() => setSheetOpen(false)}>Show {data?.totalItems ?? 0} entries</Button>
          </DialogFooter>
        </SheetContent>
      </Dialog>

      <Card className={cn("mt-4 overflow-hidden transition-opacity", isFetching && "opacity-70")}>
        {isLoading && (
          <div className="divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="h-6 w-28 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="hidden h-4 w-24 sm:block" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <EmptyState
            icon={ScrollText}
            title="Could not load audit logs"
            description="Something went wrong while fetching the entries."
            action={
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            }
          />
        )}

        {data && visible.length === 0 && (
          <EmptyState
            icon={ScrollText}
            title={actorSearch || activeKeys.length > 0 ? "No matching entries" : "No entries yet"}
            description={
              actorSearch
                ? "No one on this page matches that email. Try another page or clear the search."
                : activeKeys.length > 0
                  ? "Nothing was recorded for this event or date range."
                  : "Activity will appear here as people sign in and make changes."
            }
            action={
              activeKeys.length > 0 ? (
                <Button variant="outline" size="sm" onClick={clearAll}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        )}

        {/*
          A flex list rather than a <table>: the audit log is a feed, and columns that collapse by
          breakpoint keep long emails truncating cleanly instead of stretching a row.
        */}
        {data && visible.length > 0 && (
          <div>
            <div className="hidden items-center gap-4 border-b bg-muted/40 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:flex">
              <span className="w-52 shrink-0">Event</span>
              <span className="min-w-0 flex-1">By</span>
              <span className="hidden min-w-0 flex-1 lg:block">Detail</span>
              <span className="w-24 shrink-0 text-right">When</span>
            </div>

            {groups.map((group) => (
              <section key={group.day}>
                <h2 className="border-b bg-muted/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:px-5">
                  {group.day}
                </h2>
                <ul className="divide-y">
                  {group.entries.map((e) => {
                    const detail = describeDetails(e.details);
                    return (
                      <li key={e.id} className="px-4 py-3 transition-colors hover:bg-muted/40 sm:px-5">
                        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
                          <div className="flex items-center justify-between gap-3 sm:w-52 sm:shrink-0">
                            <EventChip type={e.eventType} />
                            <span
                              className="shrink-0 text-xs text-muted-foreground sm:hidden"
                              title={absoluteTime(e.createdAt)}
                            >
                              {timeOfDay(e.createdAt)}
                            </span>
                          </div>
                          <span className="min-w-0 flex-1 truncate text-sm" title={e.actorEmail ?? undefined}>
                            {e.actorEmail ?? "—"}
                          </span>
                          <span
                            className="hidden min-w-0 flex-1 truncate text-sm text-muted-foreground lg:block"
                            title={detail ?? undefined}
                          >
                            {detail ?? "—"}
                          </span>
                          <span
                            className="hidden w-24 shrink-0 text-right text-xs text-muted-foreground sm:block"
                            title={absoluteTime(e.createdAt)}
                          >
                            {relativeTime(e.createdAt)}
                          </span>
                        </div>

                        {/* Until the detail has a column of its own, give it a line. */}
                        {detail && (
                          <p className="mt-1 break-anywhere text-xs text-muted-foreground lg:hidden">{detail}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground">
              Showing {from}–{to} of {data.totalItems}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="First page"
                disabled={page === 0}
                onClick={() => setPage(0)}
              >
                <ChevronsLeft />
              </Button>
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
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Last page"
                disabled={page >= lastPage}
                onClick={() => setPage(lastPage)}
              >
                <ChevronsRight />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
