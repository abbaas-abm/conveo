import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getEventById } from "@/lib/data";
import { FeedbackFlow } from "@/components/feedback/FeedbackFlow";

export const metadata: Metadata = { title: "Event Feedback" };

export default async function FeedbackPage(
  props: PageProps<"/feedback/[eventId]">,
) {
  const { eventId } = await props.params;
  const event = await getEventById(eventId);

  if (!event) notFound();
  if (!event.has_feedback) redirect("/");

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-primary px-4 py-16 text-white">
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[38rem] -translate-x-1/2 rounded-full bg-[#d9b45b]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 size-[30rem] -translate-x-1/2 rounded-full bg-[#C59B27]/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-xl">
        <FeedbackFlow eventId={event.id} eventTitle={event.title} />
      </div>
    </main>
  );
}
