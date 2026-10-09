import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { deliverReminderEmail } from "@/lib/email/reminder";
import { enqueue } from "@/lib/queue";

export const runtime = "nodejs";

// Admin-only. Sends reminder emails for the given registrations.
//
// Environment-aware: when Redis is available (VPS) the jobs are queued for the
// worker; otherwise (local dev) they are sent inline. Either way the caller
// gets per-registration statuses for the batch.
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

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (adminProfile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    registrationIds?: string[];
  };
  const ids = Array.isArray(body.registrationIds)
    ? body.registrationIds.filter((id): id is string => typeof id === "string")
    : [];
  if (ids.length === 0) {
    return NextResponse.json(
      { error: "registrationIds is required." },
      { status: 400 },
    );
  }

  // Probe the queue with the first id; if Redis is reachable, queue the rest.
  const firstQueued = await enqueue("reminders", "send-reminder", {
    registrationId: ids[0],
  });

  if (firstQueued) {
    await Promise.all(
      ids
        .slice(1)
        .map((id) =>
          enqueue("reminders", "send-reminder", { registrationId: id }),
        ),
    );
    return NextResponse.json({
      ok: true,
      mode: "queued",
      results: ids.map((registrationId) => ({
        registrationId,
        status: "queued" as const,
      })),
    });
  }

  // No Redis (local): send inline with modest concurrency.
  const admin = tryCreateAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "This action requires SUPABASE_SERVICE_ROLE_KEY on the server." },
      { status: 500 },
    );
  }
  const adminClient = admin;

  const results: {
    registrationId: string;
    status: string;
    error?: string;
    email?: string;
  }[] = [];
  let cursor = 0;
  const concurrency = Math.min(5, ids.length);
  async function worker() {
    while (cursor < ids.length) {
      const id = ids[cursor++];
      const result = await deliverReminderEmail({
        supabase: adminClient,
        registrationId: id,
      });
      results.push({
        registrationId: id,
        status: result.status,
        error: result.error,
        email: result.email,
      });
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  return NextResponse.json({ ok: true, mode: "inline", results });
}
