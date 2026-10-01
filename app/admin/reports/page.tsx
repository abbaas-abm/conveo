import type { Metadata } from "next";
import { getEvents } from "@/lib/data";
import { AdminReports } from "@/components/admin/AdminReports";

export const metadata: Metadata = { title: "Admin · Reports" };

export default async function AdminReportsPage() {
  const events = await getEvents();

  return (
    <div className="p-4 sm:p-6">
      <AdminReports events={events} />
    </div>
  );
}
