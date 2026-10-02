import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime } from "@/lib/utils";
import type { EventRecord } from "@/lib/types";

export function FeaturedEventCard({ event }: { event: EventRecord }) {
  const image = event.has_media
    ? (event.featured_image_url ?? event.cover_image_url)
    : null;
  const isOpen = event.status === "OPEN";

  return (
    <div className="grid overflow-hidden rounded-2xl border border-gray-200 shadow-sm lg:min-h-[600px] lg:grid-cols-2">
      <div className="group relative aspect-square overflow-hidden bg-slate-100 lg:aspect-auto lg:min-h-[600px]">
        {image ? (
          <Image
            src={image}
            alt={event.title}
            fill
            sizes="(max-width: 1024px) 100vw, 640px"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-200 to-slate-300 text-gray-400">
            <CalendarDays className="size-12" />
            <span className="text-xs font-medium uppercase tracking-wide">
              No image
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col justify-center gap-6 bg-primary p-8 text-white sm:p-10 lg:p-12">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-[#d9b45b] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            Featured event
          </span>
          {event.theme && (
            <span className="text-xs font-semibold uppercase tracking-wider text-[#d9b45b]">
              {event.theme}
            </span>
          )}
        </div>

        <h3 className="text-3xl font-semibold leading-snug text-balance text-white sm:text-4xl">
          {event.title}
        </h3>

        {event.description && (
          <p className="line-clamp-4 text-base leading-relaxed text-white/80">
            {event.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/80">
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="size-4 text-[#d9b45b]" />
            {formatDate(event.start_date)} · {formatTime(event.start_date)}
          </span>
          <span className="inline-flex items-center gap-2">
            {event.mode === "ONLINE" ? (
              <>
                <Video className="size-4 text-[#d9b45b]" /> Online
              </>
            ) : (
              <>
                <MapPin className="size-4 text-[#d9b45b]" />
                {event.venue ?? "Wits Campus"}
              </>
            )}
          </span>
        </div>

        <div className="pt-2">
          <Button
            asChild
            size="lg"
            className="bg-[#d9b45b] text-primary hover:bg-[#c9a54c]"
          >
            <Link href={`/events/${event.id}`}>
              {isOpen ? "Register now" : "Learn more"}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
