import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import type { Profile } from "@/lib/types";

export const metadata: Metadata = { title: "Complete your profile" };

export default async function OnboardingPage() {
  const { user, profile } = await getCurrentUser();

  if (!user) redirect("/login");
  if (profile?.onboarding === "DONE") redirect("/user");

  // Fall back to a minimal profile if the DB row has not been created yet.
  const activeProfile: Profile =
    profile ??
    ({
      id: user.id,
      first_name: null,
      last_name: null,
      email: user.email ?? "",
      phone_number: null,
      position: null,
      role: "user",
      gender: null,
      person_number: null,
      faculty: null,
      course_of_study: null,
      year_of_study: null,
      place_of_residence: null,
      university_res: null,
      onboarding: "PERSONAL_DETAILS",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies Profile);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
            Let&apos;s set up your profile
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            A few quick details so we can tailor your CSD experience.
          </p>
        </div>
        <OnboardingFlow profile={activeProfile} />
      </div>
    </div>
  );
}
