import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { user, profile } = await getCurrentUser();

  if (!user) redirect("/login?redirectTo=/admin");
  if (!profile || profile.onboarding !== "DONE") redirect("/onboarding");
  if (profile.role !== "admin") redirect("/user");

  return <AdminShell profile={profile}>{children}</AdminShell>;
}
