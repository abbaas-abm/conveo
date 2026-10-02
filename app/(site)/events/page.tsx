import { Suspense } from "react";
import type { Metadata } from "next";
import { EventsExplorer } from "@/components/events/EventsExplorer";
import { getCachedEvents } from "@/lib/data";

export const metadata: Metadata = { title: "Events & Registration" };
export const revalidate = 60;

export default async function EventsPage() {
  const events = await getCachedEvents();

  return (
    <Suspense fallback={null}>
      <EventsExplorer events={events} />
    </Suspense>
  );
}
