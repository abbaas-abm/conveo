import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEventById } from "@/lib/data";
import { EventEditor } from "@/components/admin/EventEditor";

export const metadata: Metadata = { title: "Admin · Edit Event" };

// The editor is where staff flip preferences during a live event, so the event
// row must always be read fresh — never cached.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function AdminEventEditPage(
  props: PageProps<"/admin/events/[id]">,
) {
  const { id } = await props.params;
  const { tab } = await props.searchParams;
  const event = await getEventById(id);

  if (!event) notFound();

  return (
    <EventEditor
      event={event}
      initialTab={typeof tab === "string" ? tab : undefined}
    />
  );
}
