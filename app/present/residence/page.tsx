import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getResidenceStats } from "@/lib/data";
import { ResidencePresent } from "@/components/admin/ResidencePresent";

export const metadata: Metadata = { title: "Residence · Present" };

// Projector view for the admin only — always dynamic.
export const dynamic = "force-dynamic";

export default async function PresentResidencePage() {
  const { profile } = await getCurrentUser();
  if (!profile || profile.role !== "admin") redirect("/");

  const stats = await getResidenceStats();

  return <ResidencePresent stats={stats} />;
}
