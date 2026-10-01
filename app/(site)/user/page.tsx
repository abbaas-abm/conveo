import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";
import { UserDashboard } from "@/components/dashboard/UserDashboard";
import { getCurrentUser } from "@/lib/auth";
import { getUserRsvps } from "@/lib/data";

export const metadata: Metadata = { title: "Dashboard" };

export default async function UserPage() {
  const { user, profile } = await getCurrentUser();

  if (!user) redirect("/login?redirectTo=/user");
  if (profile && profile.onboarding !== "DONE") redirect("/onboarding");
  if (!profile) redirect("/login");
  if (profile.role === "admin") redirect("/admin");

  const rsvps = await getUserRsvps(user.id);
  const firstName = profile.first_name ?? "Leader";

  return (
    <>
      <PageHero
        eyebrow="Student Dashboard"
        title={`Welcome back, ${firstName}`}
        subtitle="Manage your profile and track your event registrations."
      />
      <section className="bg-slate-50 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <UserDashboard profile={profile} rsvps={rsvps} />
        </div>
      </section>
    </>
  );
}
