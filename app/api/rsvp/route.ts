import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deliverRsvpEmail } from "@/lib/email/rsvp";
import type { UserPosition } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    eventId?: string;
    position?: string;
  };
  const eventId = typeof body.eventId === "string" ? body.eventId : "";
  const position = typeof body.position === "string" ? body.position : "";
  if (!eventId || !position) {
    return NextResponse.json(
      { error: "eventId and position are required." },
      { status: 400 },
    );
  }

  const { data: existing } = await supabase
    .from("rsvps")
    .select("status")
    .eq("attendee_id", user.id)
    .eq("event_id", eventId)
    .maybeSingle();
  const alreadyConfirmed = existing?.status === "CONFIRMED";

  const { data: rsvpRow, error } = await supabase
    .from("rsvps")
    .upsert(
      {
        event_id: eventId,
        attendee_id: user.id,
        status: "CONFIRMED",
        position: position as UserPosition,
      },
      { onConflict: "attendee_id,event_id" },
    )
    .select("id")
    .single();

  if (error || !rsvpRow) {
    return NextResponse.json(
      { error: error?.message ?? "Could not create RSVP." },
      { status: 500 },
    );
  }

  const rsvpId = rsvpRow.id as string;

  // Send the confirmation email + PDF badge in the background, only for a
  // newly confirmed RSVP.
  if (!alreadyConfirmed) {
    const [{ data: profile }, { data: event }] = await Promise.all([
      supabase
        .from("profiles")
        .select("first_name,last_name,email,person_number")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("events")
        .select("title,start_date,end_date,venue")
        .eq("id", eventId)
        .maybeSingle(),
    ]);

    if (profile?.email && event) {
      after(() =>
        deliverRsvpEmail({
          supabase,
          rsvpId,
          data: {
            attendeeId: user.id,
            eventId,
            email: profile.email,
            firstName: profile.first_name ?? "",
            lastName: profile.last_name ?? "",
            personNumber: profile.person_number ?? null,
            position: position as UserPosition,
            eventTitle: event.title,
            startDate: event.start_date,
            endDate: event.end_date,
            venue: event.venue ?? null,
          },
        }),
      );
    }
  }

  return NextResponse.json({ ok: true, rsvpId });
}
