import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="bg-slate-50 pb-20">
      <div className="h-72 w-full animate-pulse bg-slate-100 sm:h-80" />
      <div className="mx-auto mt-10 grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="space-y-8">
          <Card className="border-slate-200 p-8">
            <Skeleton className="h-7 w-48" />
            <div className="mt-5 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </Card>
          <Card className="border-slate-200 p-8">
            <Skeleton className="h-7 w-56" />
            <div className="mt-6 space-y-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-5">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <Card className="border-slate-200 p-6">
          <Skeleton className="h-6 w-40" />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
          <Skeleton className="mt-6 h-12 w-full rounded-lg" />
        </Card>
      </div>
    </div>
  );
}
