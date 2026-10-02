import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getEventById } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { PledgeFlow } from "@/components/pledges/PledgeFlow";

export const metadata: Metadata = { title: "Take the Pledge" };

export default async function PledgePage(
  props: PageProps<"/pledges/[eventId]">,
) {
  const { eventId } = await props.params;
  const [event, { profile }] = await Promise.all([
    getEventById(eventId),
    getCurrentUser(),
  ]);

  if (!event) notFound();
  if (!event.has_pledges) redirect("/");

  const currentUser = profile
    ? {
        id: profile.id,
        firstName: profile.first_name ?? "",
        lastName: profile.last_name ?? "",
        name:
          [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
          profile.email,
      }
    : null;

  return (
    <PledgeFlow
      eventId={event.id}
      eventTitle={event.title}
      eventDescription={event.description}
      currentUser={currentUser}
    />
  );
}
