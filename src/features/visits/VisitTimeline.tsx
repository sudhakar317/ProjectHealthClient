import { CalendarClock, MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

import type { Visit } from "@/api/visits";
import { useAuth } from "@/auth/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { daysBetween, formatDate, todayLocal } from "@/lib/datetime";

interface Props {
  visits: Visit[];
  onEdit: (visit: Visit) => void;
  onDelete: (visit: Visit) => void;
  onRestore: (visit: Visit) => void;
}




/** How close the patient came to the date they were given, worked out fresh from the two dates. */
function Punctuality({ visit }: { visit: Visit }) {
  if (!visit.expectedDate) return null;
  const days = daysBetween(visit.visitDate, visit.expectedDate);
  const booked = `Booked for ${formatDate(visit.expectedDate)}`;
  if (days === 0) {
    return (
      <Badge variant="success" title={booked} aria-label={`On time. ${booked}`}>
        On time
      </Badge>
    );
  }
  const late = days > 0;
  const amount = late ? days : -days;
  const text = `${amount} day${amount === 1 ? "" : "s"} ${late ? "late" : "early"}`;
  return (
    // The badge is short on purpose; aria-label carries the booked date, which a sighted reader
    // gets from the tooltip. Without it the tooltip would replace the text as the accessible name.
    <Badge variant={late ? "warning" : "info"} title={booked} aria-label={`${text}. ${booked}`}>
      {text}
    </Badge>
  );
}

/** Only while the booking is still open: once a later visit answers it, that visit says it better. */
function OpenBooking({ visit, answered }: { visit: Visit; answered: boolean }) {
  if (!visit.nextVisitDate || answered) return null;
  const now = todayLocal();
  const overdue = visit.nextVisitDate < now;
  const due = visit.nextVisitDate === now;
  return (
    <Badge variant={overdue ? "danger" : due ? "warning" : "outline"} className="gap-1">
      <CalendarClock className="size-3" />
      {overdue ? `Overdue since ${formatDate(visit.nextVisitDate)}` : due ? "Due today" : `Next ${formatDate(visit.nextVisitDate)}`}
    </Badge>
  );
}

/**
 * Notes run to 4000 characters, which would let one consultation swamp the whole history. Clamped
 * to a few lines, with the toggle shown only when the text really is cut off, measured after
 * layout rather than guessed from the length: wrapping depends on the column width.
 */
function VisitNotes({ notes }: { notes: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clipped, setClipped] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el) setClipped(el.scrollHeight > el.clientHeight + 1);
    // Measured while still clamped; expanding must not re-run this or the toggle would vanish.
  }, [notes]);

  return (
    <div className="space-y-1">
      <p
        ref={ref}
        className={cn("whitespace-pre-wrap break-words text-sm text-muted-foreground", !expanded && "line-clamp-4")}
      >
        {notes}
      </p>
      {clipped && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="rounded text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

export default function VisitTimeline({ visits, onEdit, onDelete, onRestore }: Props) {
  const { user } = useAuth();

  // A booking is answered when some other visit in the history points back at it.
  const answered = new Set(visits.map((v) => v.previousVisitId).filter((id): id is number => id !== null));

  /**
   * A doctor sees no author on their own notes, it is only noise. An admin always sees it, and so
   * does a doctor looking at a note another doctor wrote, which happens once a patient is moved.
   */
  const authorOf = (visit: Visit) =>
    user?.role === "ADMIN" || visit.doctorId !== user?.id ? visit.doctorName : null;

  return (
    <ul className="divide-y">
      {visits.map((visit) => {
        const author = authorOf(visit);
        return (
          <li key={visit.id} className="flex items-start gap-3 p-4 sm:px-6">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium leading-tight">{formatDate(visit.visitDate)}</span>
                {!visit.active && <Badge variant="muted">Deleted</Badge>}
                <Punctuality visit={visit} />
                <OpenBooking visit={visit} answered={answered.has(visit.id)} />
              </div>

              <VisitNotes notes={visit.notes} />

              {author && <p className="text-xs text-muted-foreground">Recorded by {author}</p>}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`Actions for the visit on ${visit.visitDate}`}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {visit.active ? (
                  <>
                    <DropdownMenuItem onSelect={() => onEdit(visit)}>
                      <Pencil />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem destructive onSelect={() => onDelete(visit)}>
                      <Trash2 />
                      Delete
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onSelect={() => onRestore(visit)}>
                    <RotateCcw />
                    Restore
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        );
      })}
    </ul>
  );
}
