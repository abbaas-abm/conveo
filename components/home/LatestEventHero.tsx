import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Hero } from "@/components/home/Hero";
import { HeroCountdown } from "@/components/home/HeroCountdown";
import { getCachedLatestEvent } from "@/lib/data";
import { formatDate, formatTime, secondsUntil } from "@/lib/utils";

/**
 * Homepage hero centred on the latest event (cached). Falls back to the
 * classic `Hero` when there is no upcoming event.
 */
export async function LatestEventHero() {
  const event = await getCachedLatestEvent();
  if (!event) return <Hero />;

  const cover = event.has_media ? event.cover_image_url : null;
  const featured =
    event.has_media && (event.featured_image_url || event.cover_image_url);

  return (
    <section className="relative isolate flex min-h-[82vh] items-center overflow-hidden bg-primary">
      {cover && (
        <Image
          src={cover}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-45"
        />
      )}
      {/* Lighter overlay: dark enough for text on the left, image visible. */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/55 to-primary/20" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d9b45b]">
              Upcoming event
            </p>

            <h1 className="mt-4 text-4xl font-semibold leading-[1.1] text-white text-balance sm:text-5xl lg:text-6xl">
              {event.title}
            </h1>

            {event.theme && (
              <p className="mt-3 text-sm font-semibold uppercase tracking-wider text-[#d9b45b] sm:text-base">
                {event.theme}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/90 sm:text-base">
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="size-4 text-[#d9b45b]" />
                {formatDate(event.start_date)} · {formatTime(event.start_date)}
              </span>
              <span className="inline-flex items-center gap-2">
                {event.mode === "ONLINE" ? (
                  <Video className="size-4 text-[#d9b45b]" />
                ) : (
                  <MapPin className="size-4 text-[#d9b45b]" />
                )}
                {event.mode === "ONLINE"
                  ? "Online"
                  : (event.venue ?? "Wits Campus")}
              </span>
            </div>

            <div className="mt-8">
              <HeroCountdown initialSeconds={secondsUntil(event.start_date)} />
            </div>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-white text-primary hover:bg-slate-100"
              >
                <Link href={`/events/${event.id}`}>
                  Register now
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/events">Explore all events</Link>
              </Button>
            </div>
          </div>

          {featured && (
            <div className="hidden lg:block lg:justify-self-end">
              <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/15">
                <Image
                  src={featured}
                  alt={event.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 460px"
                  className="object-cover"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
