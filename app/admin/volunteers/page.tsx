import type { Metadata } from "next";
import { HeartHandshake } from "lucide-react";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const metadata: Metadata = { title: "Admin · Support Team" };

export default function AdminVolunteersPage() {
  return (
    <div className="p-4 sm:p-6">
      <AdminPlaceholder
        title="Support Team"
        description="Assign support team members to events for check-in and attendance verification."
        icon={<HeartHandshake className="size-5" />}
      />
    </div>
  );
}
