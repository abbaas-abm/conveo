import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl space-y-3 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-9 w-1/2 max-w-md" />
          <Skeleton className="h-4 w-2/3 max-w-lg" />
        </div>
      </section>

      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[380px_1fr] lg:px-8">
          <div className="space-y-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
            <Skeleton className="h-56 rounded-xl" />
          </div>

          <Card className="border-gray-200 p-6 sm:p-8">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="mt-2 h-4 w-72 max-w-full" />
            <div className="mt-7 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Skeleton className="h-11 rounded-lg" />
                <Skeleton className="h-11 rounded-lg" />
              </div>
              <Skeleton className="h-11 rounded-lg" />
              <Skeleton className="h-36 rounded-lg" />
              <Skeleton className="h-12 w-40 rounded-lg" />
            </div>
          </Card>
        </div>
      </section>
    </>
  );
}
