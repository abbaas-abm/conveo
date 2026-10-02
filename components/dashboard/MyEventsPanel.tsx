"use client";

import Link from "next/link";
import {
  CalendarDays,
  Clock,
  Download,
  MapPin,
  Ticket,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate, formatTime } from "@/lib/utils";
import type { RegistrationWithEvent } from "@/lib/data";

export function MyEventsPanel({ registrations }: { registrations: RegistrationWithEvent[] }) {
  if (registrations.length === 0) {
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
      {registrations.map((registration) => {
        const event = registration.event;
        const isConfirmed = registration.status === "CONFIRMED";
        const hasTag = isConfirmed && Boolean(registration.attendee_tag_url);
        return (
          <Card key={registration.id} className="border-gray-200 p-5">
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

              <div className="flex w-full gap-2 sm:w-auto sm:shrink-0">
                {hasTag && (
                  <Button
                    asChild
                    variant="default"
                    size="sm"
                    className="flex-1 sm:flex-none"
                  >
                    <a
                      href={`${registration.attendee_tag_url}?download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                    >
                      <Download className="size-4" />
                      Tag
                    </a>
                  </Button>
                )}
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  <Link href={`/events/${event.id}`}>View</Link>
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
