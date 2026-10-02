import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { VolunteerDashboard } from "@/components/volunteer/VolunteerDashboard";

export const metadata: Metadata = { title: "Support Team Portal" };

export default async function VolunteerPage() {
  const { user, profile } = await getCurrentUser();

  if (!user) redirect("/login?redirectTo=/volunteer");
  if (!profile || profile.onboarding !== "DONE") redirect("/onboarding");
  if (profile.role !== "volunteer") redirect("/user");

  return <VolunteerDashboard profile={profile} volunteerId={user.id} />;
}
