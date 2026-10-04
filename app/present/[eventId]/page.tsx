import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getEventById, getReflections } from "@/lib/data";
import { ReflectionsPresent } from "@/components/admin/ReflectionsPresent";

export const metadata: Metadata = { title: "Reflections · Present" };

// Projector view for the admin only — always dynamic + realtime.
export const dynamic = "force-dynamic";

export default async function PresentReflectionsPage(
  props: PageProps<"/present/[eventId]">,
) {
  const { eventId } = await props.params;

  const { profile } = await getCurrentUser();
  if (!profile || profile.role !== "admin") redirect("/");

  const [event, reflections] = await Promise.all([
    getEventById(eventId),
    getReflections(eventId),
  ]);
  if (!event) notFound();

  return (
    <ReflectionsPresent
      eventId={event.id}
      eventTitle={event.title}
      eventDescription={event.description}
      initialReflections={reflections}
    />
  );
}
