import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function HeroFallback() {
  return (
    <Card className="border-gray-200 p-6">
      <div className="flex size-11 items-center justify-center rounded-lg bg-blue-50 text-primary">
        <CalendarDays className="size-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">
        Student leadership initiatives
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        The DLU delivers leadership workshops, critical engagement sessions,
        entrepreneurship programmes and campus activations throughout the
        academic year.
      </p>
      <ul className="mt-4 space-y-2 text-sm text-gray-600">
        <li className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-primary" />
          Personal &amp; leadership development
        </li>
        <li className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-primary" />
          Experiential learning &amp; critical engagement
        </li>
        <li className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-primary" />
          Entrepreneurship &amp; innovation
        </li>
      </ul>
      <Button asChild variant="outline" className="mt-5 w-full">
        <Link href="/about">Learn about our programmes</Link>
      </Button>
    </Card>
  );
}
