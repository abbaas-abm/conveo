import { PageHero } from "@/components/layout/PageHero";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <PageHero
        eyebrow="Student Dashboard"
        title="Loading your dashboard"
        subtitle="Fetching your profile, registrations and feedback."
      />
      <section className="bg-slate-50 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-12 w-full max-w-2xl rounded-xl" />
          <Card className="mt-6 border-slate-200 p-6">
            <div className="flex gap-4">
              <Skeleton className="size-14 rounded-full" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </Card>
          <Card className="mt-6 border-slate-200 p-6">
            <Skeleton className="h-6 w-56" />
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-11 w-full rounded-lg" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </>
  );
}
