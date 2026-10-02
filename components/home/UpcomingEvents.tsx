import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/events/EventCard";
import { getCachedEvents } from "@/lib/data";

export async function UpcomingEvents() {
  const events = await getCachedEvents();
  const highlights = events.filter((event) => event.status !== "ENDED").slice(0, 3);

  return (
    <section className="border-t border-gray-200 bg-slate-50 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
              Upcoming events
            </h2>
            <p className="mt-3 text-base leading-relaxed text-gray-600">
              Workshops, leadership summits, pitch nights and critical
              engagements. Reserve your spot with your Wits credentials.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/events">
              View all events
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        {highlights.length === 0 ? (
          <div className="mt-10 flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
            <CalendarDays className="size-6 text-gray-400" />
            <h3 className="mt-3 text-base font-semibold text-gray-900">
              No upcoming events at the moment
            </h3>
            <p className="mt-1 max-w-md text-sm text-gray-600">
              New leadership workshops, summits and entrepreneurship sessions
              are published regularly.
            </p>
            <Button asChild variant="outline" className="mt-5">
              <Link href="/events">Explore events</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
