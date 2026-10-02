import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deliverPledgeDocument } from "@/lib/email/pledge";
import { enqueue } from "@/lib/queue";

export const runtime = "nodejs";

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

  const body = (await request.json().catch(() => ({}))) as {
    eventId?: string;
    pledgeText?: string;
  };
  const eventId = typeof body.eventId === "string" ? body.eventId : "";
  const pledgeText =
    typeof body.pledgeText === "string" ? body.pledgeText.trim() : "";

  if (!eventId || !pledgeText) {
    return NextResponse.json(
      { error: "A pledge is required." },
      { status: 400 },
    );
  }

  const { data: pledge, error } = await supabase
    .from("pledges")
    .insert({
      user_id: user.id,
      event_id: eventId,
      pledge_text: pledgeText,
    })
    .select("id")
    .single();

  if (error || !pledge) {
    return NextResponse.json(
      { error: error?.message ?? "Could not save your pledge." },
      { status: 500 },
    );
  }

  const pledgeId = pledge.id as string;

  // Generate the document + email in the background. Prefer the queue; fall
  // back to inline delivery if Redis is unavailable.
  const queued = await enqueue("pledges", "send-pledge", { pledgeId });
  if (!queued) {
    after(() => deliverPledgeDocument({ supabase, pledgeId }));
  }

  return NextResponse.json({ ok: true, pledgeId });
}
