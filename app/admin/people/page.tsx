import type { Metadata } from "next";
import { AdminPeople } from "@/components/admin/AdminPeople";

export const metadata: Metadata = { title: "Admin · People" };

export default function AdminPeoplePage() {
  return (
    <div className="p-4 sm:p-6">
      <AdminPeople />
    </div>
  );
}
