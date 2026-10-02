import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deliverEventReport } from "@/lib/email/report";
import { enqueue } from "@/lib/queue";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    eventId?: string;
    email?: string;
  };
  const eventId = typeof body.eventId === "string" ? body.eventId : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!eventId || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "A valid event and email address are required." },
      { status: 400 },
    );
  }

  // Generate + send in the background. Prefer the queue; fall back to inline
  // delivery if Redis is unavailable.
  const queued = await enqueue("reports", "send-report", { eventId, to: email });
  if (!queued) {
    after(() => deliverEventReport({ supabase, to: email, eventId }));
  }

  return NextResponse.json({ ok: true });
}
