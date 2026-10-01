import type { Metadata } from "next";
import { getEvents } from "@/lib/data";
import { AdminEvents } from "@/components/admin/AdminEvents";

export const metadata: Metadata = { title: "Admin · Events" };

export default async function AdminEventsPage() {
  const events = await getEvents();

  return (
    <div className="p-4 sm:p-6">
      <AdminEvents events={events} />
    </div>
  );
}
