import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getEventById, getPledgesForEvent } from "@/lib/data";
import { AdminPledges } from "@/components/admin/AdminPledges";

export const metadata: Metadata = { title: "Admin · Pledges" };

export default async function AdminEventPledgesPage(
  props: PageProps<"/admin/pledges/[eventId]">,
) {
  const { eventId } = await props.params;
  const [event, pledges] = await Promise.all([
    getEventById(eventId),
    getPledgesForEvent(eventId),
  ]);

  if (!event) notFound();

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin/pledges"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          All events
        </Link>
        <h2 className="mt-3 text-lg font-semibold text-gray-900">
          {event.title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pledges signed for this event.
        </p>

        <div className="mt-5">
          <AdminPledges pledges={pledges} />
        </div>
      </div>
    </div>
  );
}
