import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getEventById, getCachedSpeakersByEvent } from "@/lib/data";
import { EventQna } from "@/components/events/EventQna";

export const metadata: Metadata = { title: "Event Q&A" };
export const dynamic = "force-dynamic";

export default async function EventQuestionsPage(
  props: PageProps<"/events/[id]/questions">,
) {
  const { id } = await props.params;

  const [event, speakers, { user, profile }] = await Promise.all([
    getEventById(id),
    getCachedSpeakersByEvent(id),
    getCurrentUser(),
  ]);

  if (!event) notFound();
  if (!event.has_questions) redirect("/");
  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/events/${id}/questions`)}`);
  }

  return (
    <EventQna
      eventId={event.id}
      eventTitle={event.title}
      speakers={speakers}
      currentUser={{
        id: user.id,
        firstName: profile?.first_name ?? "",
        lastName: profile?.last_name ?? "",
      }}
    />
  );
}
