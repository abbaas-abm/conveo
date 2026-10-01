"use client";

import * as React from "react";
import { CalendarCheck, History } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatTime, initials } from "@/lib/utils";
import type { Profile, EventRecord } from "@/lib/types";

interface AttendanceRow {
  id: string;
  event_id: string;
  attendee_id: string;
  created_at: string;
  event: EventRecord | null;
  attendee: Profile | null;
}

export function HistoryPanel({ volunteerId }: { volunteerId: string }) {
  const [rows, setRows] = React.useState<AttendanceRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("attendance")
        .select(
          "id, event_id, attendee_id, created_at, event:events!event_id(*), attendee:profiles!attendee_id(*)",
        )
        .eq("volunteer_id", volunteerId)
        .order("created_at", { ascending: false });
      if (!mounted) return;
      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }
      setRows((data ?? []) as unknown as AttendanceRow[]);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [volunteerId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center border-dashed border-gray-300 bg-white px-6 py-16 text-center">
        <History className="size-6 text-gray-400" />
        <h3 className="mt-3 text-base font-semibold text-gray-900">
          No check-ins yet
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Attendees you check in will appear here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const name =
          [row.attendee?.first_name, row.attendee?.last_name]
            .filter(Boolean)
            .join(" ") || "Attendee";
        return (
          <Card key={row.id} className="flex items-center gap-4 p-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {initials(row.attendee?.first_name, row.attendee?.last_name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-gray-900">{name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {row.event?.title ?? "Event"}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarCheck className="size-3.5" />
                {formatDate(row.created_at)} · {formatTime(row.created_at)}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
