import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, MapPin, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate, formatTime } from "@/lib/utils";
import type { EventRecord, EventStatus } from "@/lib/types";

const STATUS_STYLES: Record<
  EventStatus,
  { label: string; variant: "success" | "warning" | "destructive" }
> = {
  OPEN: { label: "Open", variant: "success" },
  CLOSED: { label: "Closed", variant: "warning" },
  ENDED: { label: "Ended", variant: "destructive" },
};

export function EventCard({ event }: { event: EventRecord }) {
  const status = STATUS_STYLES[event.status];
  const image = event.featured_image_url ?? event.cover_image_url;

  return (
    <Card className="flex h-full flex-col overflow-hidden border-gray-200 transition-colors hover:border-gray-300">
      <div className="relative h-44 w-full bg-slate-100">
        {image ? (
          <Image
            src={image}
            alt={event.title}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <CalendarDays className="size-8" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
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

        <h3 className="mt-3 line-clamp-2 text-base font-semibold leading-snug text-gray-900">
          {event.title}
        </h3>
        {event.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-600">
            {event.description}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5 text-gray-400" />
            {formatDate(event.start_date)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5 text-gray-400" />
            {formatTime(event.start_date)}
          </span>
        </div>

        <div className="mt-auto pt-5">
          <Button asChild variant="outline" className="w-full">
            <Link href={`/events/${event.id}`}>
              View event
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function EventCardSkeleton() {
  return (
    <Card className="overflow-hidden border-gray-200">
      <div className="h-44 w-full animate-pulse bg-slate-100" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-24 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
        <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100" />
      </div>
    </Card>
  );
}
