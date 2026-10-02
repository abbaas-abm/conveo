import { Suspense } from "react";
import type { Metadata } from "next";
import { EventsExplorer } from "@/components/events/EventsExplorer";
import { getEvents } from "@/lib/data";

export const metadata: Metadata = { title: "Events & Registration" };

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <Suspense fallback={null}>
      <EventsExplorer events={events} />
    </Suspense>
  );
}
