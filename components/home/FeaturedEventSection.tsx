import { getFeaturedEvent } from "@/lib/data";
import { FeaturedEventCard } from "./FeaturedEventCard";
import { HeroFallback } from "./HeroFallback";

export async function FeaturedEventSection() {
  const event = await getFeaturedEvent();

  return (
    <section className="border-b border-gray-200 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
            Featured event
          </h2>
          <p className="mt-3 text-base leading-relaxed text-gray-600">
            The latest opportunity on the CSD calendar.
          </p>
        </div>

        <div className="mt-10">
          {event ? (
            <FeaturedEventCard event={event} />
          ) : (
            <div className="max-w-2xl">
              <HeroFallback />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
