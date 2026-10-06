import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getEvents } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin · Questions" };

export default async function AdminQuestionsPage() {
  const events = await getEvents();

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-lg font-semibold text-gray-900">Questions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select an event to view and manage attendee questions.
        </p>

        <Card className="mt-5 divide-y divide-gray-100 border-gray-200 p-0">
          {events.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-gray-600">
              No events yet.
            </p>
          ) : (
            events.map((event) => (
              <Link
                key={event.id}
                href={`/admin/questions/${event.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">
                    {event.title || "Untitled event"}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    {formatDate(event.start_date)}
                  </p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-gray-400" />
              </Link>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}
