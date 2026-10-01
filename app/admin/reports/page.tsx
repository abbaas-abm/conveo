import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const metadata: Metadata = { title: "Admin · Reports" };

export default function AdminReportsPage() {
  return (
    <div className="p-4 sm:p-6">
      <AdminPlaceholder
        title="Reports"
        description="Generate and export reports across events, attendance, RSVPs and feedback."
        icon={<FileText className="size-5" />}
      />
    </div>
  );
}
