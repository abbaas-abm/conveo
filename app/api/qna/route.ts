import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    speakerId?: string | null;
    question?: string;
  };
  const eventId = typeof body.eventId === "string" ? body.eventId : "";
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const speakerId =
    typeof body.speakerId === "string" && body.speakerId
      ? body.speakerId
      : null;

  if (!eventId || !question) {
    return NextResponse.json(
      { error: "A question is required." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("qna")
    .insert({
      event_id: eventId,
      user_id: user.id,
      speaker_id: speakerId,
      question,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, question: data });
}
