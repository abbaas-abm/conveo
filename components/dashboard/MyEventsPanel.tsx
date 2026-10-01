"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CalendarX2,
  Clock,
  Download,
  Loader2,
  MapPin,
  Ticket,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatTime } from "@/lib/utils";
import type { RsvpWithEvent } from "@/lib/data";

export function MyEventsPanel({ rsvps }: { rsvps: RsvpWithEvent[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function cancelRsvp(rsvp: RsvpWithEvent) {
    setPendingId(rsvp.id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("rsvps")
        .update({ status: "CANCELLED" })
        .eq("id", rsvp.id);
      if (error) throw error;
      toast.success("RSVP cancelled.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not cancel RSVP.",
      );
    } finally {
      setPendingId(null);
    }
  }

  if (rsvps.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center border-dashed border-gray-300 bg-slate-50 px-6 py-14 text-center">
        <Ticket className="size-6 text-gray-400" />
        <h3 className="mt-3 text-base font-semibold text-gray-900">
          You haven&apos;t registered for any events yet
        </h3>
        <p className="mt-1 max-w-md text-sm text-gray-600">
          Explore upcoming workshops, summits and pitch sessions and reserve
          your seat with one click.
        </p>
        <Button asChild className="mt-5">
          <Link href="/events">Explore events</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {rsvps.map((rsvp) => {
        const event = rsvp.event;
        const isConfirmed = rsvp.status === "CONFIRMED";
        return (
          <Card key={rsvp.id} className="border-gray-200 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={isConfirmed ? "success" : "destructive"}>
                    {isConfirmed ? "Confirmed" : "Cancelled"}
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
                <h3 className="mt-2 truncate text-base font-medium text-gray-900">
                  <Link
                    href={`/events/${event.id}`}
                    className="hover:text-primary"
                  >
                    {event.title}
                  </Link>
                </h3>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-3.5 text-gray-400" />
                    {formatDate(event.start_date)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-3.5 text-gray-400" />
                    {formatTime(event.start_date)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-gray-400" />
                    {event.venue ?? "Wits Campus"}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                {isConfirmed && rsvp.attendee_tag_url && (
                  <Button asChild variant="default" size="sm">
                    <a
                      href={`${rsvp.attendee_tag_url}?download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                    >
                      <Download className="size-4" />
                      Tag
                    </a>
                  </Button>
                )}
                <Button asChild variant="outline" size="sm">
                  <Link href={`/events/${event.id}`}>View</Link>
                </Button>
                {isConfirmed && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-red-50 hover:text-destructive"
                    onClick={() => cancelRsvp(rsvp)}
                    disabled={pendingId === rsvp.id}
                  >
                    {pendingId === rsvp.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CalendarX2 className="size-4" />
                    )}
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
