import { EventCardSkeleton } from "@/components/events/EventCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="bg-primary py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <Skeleton className="mx-auto h-3 w-32 bg-white/20" />
          <Skeleton className="mx-auto mt-4 h-9 w-4/5 bg-white/20" />
          <Skeleton className="mx-auto mt-4 h-4 w-full max-w-xl bg-white/20" />
          <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
            <Skeleton className="h-12 flex-1 rounded-lg bg-white/20" />
            <Skeleton className="h-12 rounded-lg bg-white/20 sm:w-48" />
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-4 w-32" />
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
