import type { Metadata } from "next";
import { Tag } from "lucide-react";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const metadata: Metadata = { title: "Admin · Tags" };

export default function AdminTagsPage() {
  return (
    <div className="p-4 sm:p-6">
      <AdminPlaceholder
        title="Tags"
        description="Create and manage tags used to categorise CSD events and attendees."
        icon={<Tag className="size-5" />}
      />
    </div>
  );
}
