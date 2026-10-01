"use client";

import * as React from "react";
import { CalendarDays, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatTime } from "@/lib/utils";
import type { EventRecord } from "@/lib/types";
import { QrScanner } from "@/components/volunteer/QrScanner";

export function ScannerPanel({ volunteerId }: { volunteerId: string }) {
  const [events, setEvents] = React.useState<EventRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [active, setActive] = React.useState<EventRecord | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("events")
        .select("*")
        .order("start_date", { ascending: false });
      if (mounted) {
        setEvents((data ?? []) as EventRecord[]);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (active) {
    return (
      <QrScanner
        event={active}
        volunteerId={volunteerId}
        onClose={() => setActive(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center border-dashed border-gray-300 bg-white px-6 py-16 text-center">
        <CalendarDays className="size-6 text-gray-400" />
        <h3 className="mt-3 text-base font-semibold text-gray-900">
          No events available
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Events will appear here once they are created.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <Card key={event.id} className="border-gray-200 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={
                event.status === "OPEN"
                  ? "success"
                  : event.status === "CLOSED"
                    ? "warning"
                    : "destructive"
              }
            >
              {event.status}
            </Badge>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" />
              {formatDate(event.start_date)} · {formatTime(event.start_date)}
            </span>
          </div>

          <h3 className="mt-2 text-base font-semibold text-gray-900">
            {event.title}
          </h3>
          {event.description && (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-gray-600">
              {event.description}
            </p>
          )}

          <Button className="mt-4 w-full" onClick={() => setActive(event)}>
            <ScanLine className="size-4" />
            Open Event Check-in
          </Button>
        </Card>
      ))}
    </div>
  );
}
