import type { Metadata } from "next";
import { getEvents, getSpeakers } from "@/lib/data";
import { AdminSpeakers } from "@/components/admin/AdminSpeakers";

export const metadata: Metadata = { title: "Admin · Speakers" };

export default async function AdminSpeakersPage() {
  const [speakers, events] = await Promise.all([getSpeakers(), getEvents()]);

  return (
    <div className="p-4 sm:p-6">
      <AdminSpeakers initialSpeakers={speakers} initialEvents={events} />
    </div>
  );
}
