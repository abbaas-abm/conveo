import type { Metadata } from "next";
import { getResidenceStats } from "@/lib/data";
import { AdminResidence } from "@/components/admin/AdminResidence";

export const metadata: Metadata = { title: "Admin · Residence" };

export default async function AdminResidencePage() {
  const stats = await getResidenceStats();

  return (
    <div className="p-4 sm:p-6">
      <AdminResidence stats={stats} />
    </div>
  );
}
