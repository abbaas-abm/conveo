import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { ProfilePanel } from "@/components/dashboard/ProfilePanel";
export const metadata: Metadata = { title: "Admin · Profile" };

export default async function AdminProfilePage() {
  const { profile } = await getCurrentUser();
  if (!profile) redirect("/login?redirectTo=/admin/profile");

  return (
    <div className="p-4 sm:p-6">
      <ProfilePanel profile={profile} />
    </div>
  );
}
