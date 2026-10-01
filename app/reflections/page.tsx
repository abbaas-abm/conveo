import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getEventById, getReflections } from "@/lib/data";
import { ReflectionsBoard } from "@/components/reflections/ReflectionsBoard";

export const metadata: Metadata = { title: "Live Reflections" };

export default async function ReflectionsPage(
  props: PageProps<"/reflections">,
) {
  const params = await props.searchParams;
  const eventId =
    typeof params.event === "string" && params.event ? params.event : undefined;

  const [{ profile }, event, reflections] = await Promise.all([
    getCurrentUser(),
    eventId ? getEventById(eventId) : Promise.resolve(null),
    getReflections(eventId),
  ]);

  const currentUser = profile
    ? {
        id: profile.id,
        name:
          [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
          profile.email,
        firstName: profile.first_name ?? "",
        lastName: profile.last_name ?? "",
      }
    : null;

  return (
    <ReflectionsBoard
      eventId={eventId ?? null}
      eventTitle={event?.title ?? null}
      currentUser={currentUser}
      initialReflections={reflections}
    />
  );
}
