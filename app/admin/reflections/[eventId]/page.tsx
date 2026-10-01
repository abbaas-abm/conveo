import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getEventById, getReflections } from "@/lib/data";
import { AdminReflections } from "@/components/admin/AdminReflections";

export const metadata: Metadata = { title: "Admin · Reflections" };

export default async function AdminEventReflectionsPage(
  props: PageProps<"/admin/reflections/[eventId]">,
) {
  const { eventId } = await props.params;
  const [event, reflections] = await Promise.all([
    getEventById(eventId),
    getReflections(eventId),
  ]);

  if (!event) notFound();

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin/reflections"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          All events
        </Link>
        <h2 className="mt-3 text-lg font-semibold text-gray-900">
          {event.title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Live reflections from attendees.
        </p>

        <div className="mt-5">
          <AdminReflections reflections={reflections} />
        </div>
      </div>
    </div>
  );
}
