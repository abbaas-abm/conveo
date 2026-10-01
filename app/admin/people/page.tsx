import type { Metadata } from "next";
import { getAllProfiles } from "@/lib/data";
import { AdminPeople } from "@/components/admin/AdminPeople";

export const metadata: Metadata = { title: "Admin · People" };

export default async function AdminPeoplePage() {
  const profiles = await getAllProfiles();

  return (
    <div className="p-4 sm:p-6">
      <AdminPeople profiles={profiles} />
    </div>
  );
}
