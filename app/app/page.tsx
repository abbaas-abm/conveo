import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

// Server-side entry point for the installed PWA. Because the auth check runs on
// the server (using the session cookie), the app goes straight to the dashboard
// or the sign-in screen with no client-side flash.
export const dynamic = "force-dynamic";

export default async function AppEntryPage() {
  const { user } = await getCurrentUser();
  redirect(user ? "/user" : "/login");
}
