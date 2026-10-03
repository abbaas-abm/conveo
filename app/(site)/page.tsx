import { Suspense } from "react";
import { Hero } from "@/components/home/Hero";
import { CoreUnits } from "@/components/home/CoreUnits";
import { FeaturedEventSection } from "@/components/home/FeaturedEventSection";
import { UpcomingEvents } from "@/components/home/UpcomingEvents";
import { FeaturedEventSkeleton } from "@/components/home/FeaturedEventSkeleton";
import { EventCardSkeleton } from "@/components/events/EventCard";

export const revalidate = 60;

export default function HomePage() {
  return (
    <div className="pwa:hidden">
      <Hero />
      <Suspense
        fallback={
          <section className="border-b border-gray-200 bg-white py-16 sm:py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <FeaturedEventSkeleton />
            </div>
          </section>
        }
      >
        <FeaturedEventSection />
      </Suspense>
      <CoreUnits />
      <Suspense
        fallback={
          <section className="border-t border-gray-200 bg-slate-50 py-16 sm:py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <EventCardSkeleton key={i} />
                ))}
              </div>
            </div>
          </section>
        }
      >
        <UpcomingEvents />
      </Suspense>
    </div>
  );
}
