import { Suspense } from "react";
import type { Metadata } from "next";
import { EventsExplorer } from "@/components/events/EventsExplorer";
import { getEvents, getRecentAnnouncements } from "@/lib/data";

export const metadata: Metadata = { title: "Events & RSVP" };

export default async function EventsPage() {
  const [events, announcements] = await Promise.all([
    getEvents(),
    getRecentAnnouncements(5),
  ]);

  return (
    <Suspense fallback={null}>
      <EventsExplorer events={events} announcements={announcements} />
    </Suspense>
  );
}
