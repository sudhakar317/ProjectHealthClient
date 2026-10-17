import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { Link } from "react-router-dom";

import { listFollowUps } from "@/api/visits";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, todayLocal } from "@/lib/datetime";



/** Visits whose next appointment is due today or earlier, oldest first so overdue sorts to the top. */
export default function FollowUpsCard() {
  const followUps = useQuery({ queryKey: ["follow-ups"], queryFn: listFollowUps });

  return (
    <Card className="min-w-0">
      <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
        <CardTitle>Follow-ups due</CardTitle>
        {followUps.data && followUps.data.length > 0 && (
          <Badge variant="info" className="shrink-0">
            {followUps.data.length}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-0 sm:p-0">
        {followUps.isLoading && (
          <div className="divide-y border-t">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 sm:px-6">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        )}

        {followUps.isError && (
          <p className="px-4 py-6 text-sm text-muted-foreground sm:px-6">Could not load follow-ups.</p>
        )}

        {followUps.data && followUps.data.length === 0 && (
          <p className="px-4 py-6 text-sm text-muted-foreground sm:px-6">Nothing due. Follow-ups appear here on the day they fall.</p>
        )}

        {followUps.data && followUps.data.length > 0 && (
          <ul className="divide-y border-t">
            {followUps.data.map((visit) => (
              <li key={visit.id} className="flex items-center gap-3 px-4 py-3 sm:px-6">
                <Link
                  to={`/patients/${visit.patientId}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  title={visit.patientName}
                >
                  {visit.patientName}
                </Link>
                <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
                  <CalendarClock className="size-3.5" />
                  {formatDate(visit.nextVisitDate ?? "")}
                </span>
                {visit.nextVisitDate && visit.nextVisitDate < todayLocal() && (
                  <Badge variant="danger" className="shrink-0">
                    Overdue
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
