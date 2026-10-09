import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deliverRegistrationEmail } from "@/lib/email/registration";
import { enqueue } from "@/lib/queue";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
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
    .from("registrations")
    .select("status")
    .eq("attendee_id", user.id)
    .eq("event_id", eventId)
    .maybeSingle();
  const alreadyConfirmed = existing?.status === "CONFIRMED";

  // RSVP gate: a new registration is only allowed if the signed-in email is on
  // the `rsvped` list. (Already-confirmed attendees are grandfathered.)
  if (!alreadyConfirmed) {
    const { data: hasRsvp, error: rsvpError } =
      await supabase.rpc("has_rsvped");
    if (rsvpError) {
      console.error("RSVP check failed:", rsvpError);
    }
    if (!hasRsvp) {
      return NextResponse.json(
        {
          error:
            "This form requires you to RSVP. We couldn't find an RSVP for your email — please RSVP first, and make sure you use the same email you RSVPed with.",
        },
        { status: 403 },
      );
    }
  }

  const { data: registrationRow, error } = await supabase
    .from("registrations")
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

  if (error || !registrationRow) {
    return NextResponse.json(
      { error: error?.message ?? "Could not create registration." },
      { status: 500 },
    );
  }

  const registrationId = registrationRow.id as string;

  // Send the confirmation email + PDF badge in the background, only for a
  // newly confirmed registration.
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
      const emailData = {
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
      };

      const queued = await enqueue("registrations", "send-confirmation", {
        registrationId,
        data: emailData,
      });

      if (!queued) {
        const deliveryClient = tryCreateAdminClient() ?? supabase;
        after(() =>
          deliverRegistrationEmail({
            supabase: deliveryClient,
            registrationId,
            data: emailData,
          }),
        );
      }
    }
  }

  return NextResponse.json({ ok: true, registrationId });
}
