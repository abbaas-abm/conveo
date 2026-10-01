import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function FeaturedEventSkeleton() {
  return (
    <Card className="grid overflow-hidden border-gray-200 p-0 lg:min-h-[600px] lg:grid-cols-2">
      <Skeleton className="aspect-square w-full rounded-none bg-slate-100 lg:aspect-auto lg:min-h-[600px]" />
      <div className="flex flex-col justify-center gap-6 bg-primary p-8 sm:p-10 lg:p-12">
        <Skeleton className="h-6 w-28 rounded-full bg-white/20" />
        <Skeleton className="h-9 w-4/5 bg-white/20" />
        <Skeleton className="h-4 w-full bg-white/20" />
        <Skeleton className="h-4 w-2/3 bg-white/20" />
        <Skeleton className="h-12 w-40 rounded-lg bg-white/20" />
      </div>
    </Card>
  );
}
