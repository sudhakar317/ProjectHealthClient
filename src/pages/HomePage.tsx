import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Plus, ScrollText, Tags, UserCheck, UserX, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { listAuditLogs, listDoctors, listSpecializations, type AuditFilters, type DoctorFilters } from "@/api/admin";
import { useAuth } from "@/auth/AuthContext";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { eventMeta } from "@/features/admin/auditEvents";
import FollowUpsCard from "@/features/visits/FollowUpsCard";
import { greeting, relativeTime } from "@/lib/datetime";

const noAuditFilters: AuditFilters = { eventType: "", from: "", to: "" };

const noFilters: DoctorFilters = {
  fullName: "",
  email: "",
  phone: "",
  specializationId: "",
  active: "",
};

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
  tone = "text-primary",
}: {
  label: string;
  value: number | undefined;
  icon: typeof Users;
  loading: boolean;
  tone?: string;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground sm:text-sm">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-10 sm:h-8 sm:w-12" />
          ) : (
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">{value ?? "—"}</p>
          )}
        </div>
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted sm:size-10 sm:rounded-xl ${tone}`}>
          <Icon className="size-4 sm:size-5" />
        </span>
      </div>
    </Card>
  );
}

function AdminDashboard() {
  const doctors = useQuery({ queryKey: ["doctors", "list", noFilters], queryFn: () => listDoctors(noFilters) });
  const specializations = useQuery({ queryKey: ["specializations"], queryFn: listSpecializations });
  const activity = useQuery({
    queryKey: ["audit-logs", 0, noAuditFilters],
    queryFn: () => listAuditLogs(0, noAuditFilters),
  });

  const total = doctors.data?.length;
  const active = doctors.data?.filter((d) => d.active).length;
  const disabled = doctors.data?.filter((d) => !d.active).length;
  const recent = activity.data?.items.slice(0, 6) ?? [];

  return (
    <>
      {/* Two across even on a phone: four full-width cards pushed everything useful off the screen. */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Doctors" value={total} icon={Users} loading={doctors.isLoading} />
        <StatCard label="Active" value={active} icon={UserCheck} loading={doctors.isLoading} tone="text-success" />
        <StatCard label="Disabled" value={disabled} icon={UserX} loading={doctors.isLoading} tone="text-muted-foreground" />
        <StatCard
          label="Specializations"
          value={specializations.data?.length}
          icon={Tags}
          loading={specializations.isLoading}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* min-w-0: grid items default to min-width:auto, so a long email would widen the column. */}
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
            <CardTitle>Recent activity</CardTitle>
            <Button variant="link" size="sm" asChild className="h-auto p-0">
              <Link to="/audit-logs">
                View all
                <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            {activity.isLoading && (
              <div className="divide-y border-t">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 sm:px-6">
                    <Skeleton className="h-6 w-28 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            )}
            {activity.isError && (
              <p className="px-4 py-6 text-sm text-muted-foreground sm:px-6">Could not load recent activity.</p>
            )}
            {activity.data && recent.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted-foreground sm:px-6">Nothing recorded yet.</p>
            )}
            {recent.length > 0 && (
              <ul className="divide-y border-t">
                {recent.map((e) => {
                  const { label, icon: Icon, tone } = eventMeta(e.eventType);
                  return (
                    <li key={e.id} className="flex items-center gap-3 px-4 py-3 sm:px-6">
                      <Badge variant={tone} className="shrink-0 whitespace-nowrap">
                        <Icon />
                        {label}
                      </Badge>
                      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground" title={e.actorEmail ?? ""}>
                        {e.actorEmail ?? "—"}
                      </span>
                      <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                        {relativeTime(e.createdAt)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild className="justify-start">
              <Link to="/doctors/new">
                <Plus />
                Add doctor
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-start">
              <Link to="/specializations">
                <Tags />
                Specializations
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-start">
              <Link to="/audit-logs">
                <ScrollText />
                View audit logs
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <FollowUpsCard />
      </div>
    </>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  return (
    <>
      <PageHeader
        title={greeting()}
        description={user?.email}
        action={
          <Badge variant="info" className="capitalize">
            {user?.role.toLowerCase()}
          </Badge>
        }
      />

      {isAdmin ? (
        <AdminDashboard />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <FollowUpsCard />
          <Card className="min-w-0">
            <CardHeader className="pb-3">
              <CardTitle>Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button asChild className="justify-start">
                <Link to="/patients/new">
                  <Plus />
                  Add patient
                </Link>
              </Button>
              <Button variant="outline" asChild className="justify-start">
                <Link to="/patients">
                  <Users />
                  View patients
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
