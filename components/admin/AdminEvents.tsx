"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronRight,
  Loader2,
  MapPin,
  Plus,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatTime } from "@/lib/utils";
import type { EventRecord } from "@/lib/types";

export function AdminEvents({ events }: { events: EventRecord[] }) {
  const router = useRouter();
  const [creating, setCreating] = React.useState(false);

  async function createEvent() {
    setCreating(true);
    try {
      const supabase = createClient();
      const start = new Date();
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
      const { data, error } = await supabase
        .from("events")
        .insert({
          title: "Draft",
          start_date: start.toISOString(),
          end_date: end.toISOString(),
          mode: "IN_PERSON",
          status: "CLOSED",
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Draft event created.");
      router.push(`/admin/events/${data.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create event.",
      );
      setCreating(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="size-4" />
          {events.length} {events.length === 1 ? "event" : "events"}
        </div>
        <Button onClick={createEvent} disabled={creating}>
          {creating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          {creating ? "Creating..." : "Create event"}
        </Button>
      </div>

      {events.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <CalendarDays className="size-6 text-gray-400" />
          <h3 className="mt-3 text-base font-semibold text-gray-900">
            No events yet
          </h3>
          <p className="mt-1 max-w-md text-sm text-gray-600">
            Create your first event. It will be saved as a draft that you can
            build out step by step.
          </p>
          <Button className="mt-5" onClick={createEvent} disabled={creating}>
            <Plus className="size-4" />
            Create event
          </Button>
        </Card>
      ) : (
        <Card className="divide-y divide-gray-100 border-gray-200 p-0">
          {events.map((event) => {
            const isDraft = event.title.trim().toLowerCase() === "draft";
            return (
              <Link
                key={event.id}
                href={`/admin/events/${event.id}`}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium text-gray-900">
                      {event.title || "Untitled event"}
                    </span>
                    {isDraft && <Badge variant="warning">Draft</Badge>}
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
                    <Badge variant="outline">
                      {event.mode === "ONLINE" ? (
                        <>
                          <Video className="size-3" /> Online
                        </>
                      ) : (
                        <>
                          <MapPin className="size-3" /> In Person
                        </>
                      )}
                    </Badge>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {formatDate(event.start_date)} ·{" "}
                      {formatTime(event.start_date)}
                    </span>
                    {event.venue && <span>{event.venue}</span>}
                    <span className="font-mono">
                      {event.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-5 shrink-0 text-gray-400" />
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}
