import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getEventById } from "@/lib/data";
import { EventQuestionsTab } from "@/components/admin/EventQuestionsTab";

export const metadata: Metadata = { title: "Admin · Questions" };

export default async function AdminEventQuestionsPage(
  props: PageProps<"/admin/questions/[eventId]">,
) {
  const { eventId } = await props.params;
  const event = await getEventById(eventId);

  if (!event) notFound();

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin/questions"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          All events
        </Link>
        <h2 className="mt-3 text-lg font-semibold text-gray-900">
          {event.title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Attendee questions for this event.
        </p>

        <div className="mt-5">
          <EventQuestionsTab event={event} />
        </div>
      </div>
    </div>
  );
}
