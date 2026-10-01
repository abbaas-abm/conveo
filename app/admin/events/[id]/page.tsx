import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEventById } from "@/lib/data";
import { EventEditor } from "@/components/admin/EventEditor";

export const metadata: Metadata = { title: "Admin · Edit Event" };

export default async function AdminEventEditPage(
  props: PageProps<"/admin/events/[id]">,
) {
  const { id } = await props.params;
  const event = await getEventById(id);

  if (!event) notFound();

  return <EventEditor event={event} />;
}
