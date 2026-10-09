import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getQueueCounts } from "@/lib/queue";

export const runtime = "nodejs";

// Admin-only. Returns the reminders queue job counts so the UI can show live
// progress while a queued batch is processed by the worker.
export async function GET() {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 },
    );
  }

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (adminProfile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const counts = await getQueueCounts("reminders");
  return NextResponse.json({ ok: true, counts });
}
