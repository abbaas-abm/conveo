import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventFeatured } from "@/components/events/EventFeatured";
import { getCachedEventFeatured, getCachedLatestEvent } from "@/lib/data";

/**
 * Homepage "Featured" section — a slider of the latest event's featured
 * moments (cached). Renders nothing when there is no event / no featured items.
 */
export async function HomeFeaturedSection() {
  const event = await getCachedLatestEvent();
  if (!event || !event.has_featured) return null;

  const items = await getCachedEventFeatured(event.id);
  if (items.length === 0) return null;

  return (
    <section className="border-t border-gray-200 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C59B27]">
              Featured
            </p>
            <h2 className="mt-2 text-2xl font-semibold leading-snug text-gray-900 sm:text-3xl">
              {"Don't miss out at the"}
              <span className="relative inline-block">
                {event.title}
                <svg
                  className="absolute -bottom-1 left-0 h-2.5 w-full text-[#C59B27]"
                  viewBox="0 0 200 12"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 8 C 50 2, 150 2, 198 8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h2>
            <p className="mt-3 text-base leading-relaxed text-gray-600">
              Some exciting moments taking place at the {event.title} event!
              Don&apos;t miss out!
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/events/${event.id}`}>
              View event
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-10">
          <EventFeatured items={items} />
        </div>
      </div>
    </section>
  );
}
