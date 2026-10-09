import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { deliverRegistrationEmail } from "@/lib/email/registration";
import type { UserPosition } from "@/lib/types";

export const runtime = "nodejs";

// Admin-only: generate + email an attendee tag on the attendee's behalf, and
// populate the registration's tag URL. Runs inline (single action, not a burst)
// so the admin gets the tag URL back immediately.
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
    registrationId?: string;
  };
  const registrationId =
    typeof body.registrationId === "string" ? body.registrationId : "";
  if (!registrationId) {
    return NextResponse.json(
      { error: "registrationId is required." },
      { status: 400 },
    );
  }

  const admin = tryCreateAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "This action requires SUPABASE_SERVICE_ROLE_KEY on the server." },
      { status: 500 },
    );
  }

  const { data: registration } = await admin
    .from("registrations")
    .select("id, event_id, attendee_id, status, position")
    .eq("id", registrationId)
    .maybeSingle();
  if (!registration) {
    return NextResponse.json(
      { error: "Registration not found." },
      { status: 404 },
    );
  }

  const [{ data: profile }, { data: event }] = await Promise.all([
    admin
      .from("profiles")
      .select("first_name,last_name,email,person_number,position")
      .eq("id", registration.attendee_id)
      .maybeSingle(),
    admin
      .from("events")
      .select("title,start_date,end_date,venue")
      .eq("id", registration.event_id)
      .maybeSingle(),
  ]);

  if (!profile?.email || !event) {
    return NextResponse.json(
      { error: "Missing attendee email or event details." },
      { status: 400 },
    );
  }

  // Trigger the registration on their behalf: make sure it is confirmed.
  if (registration.status !== "CONFIRMED") {
    await admin
      .from("registrations")
      .update({ status: "CONFIRMED" })
      .eq("id", registration.id);
  }

  // Prefer the position chosen at registration, then their profile position,
  // then the platform default.
  const position = (registration.position ??
    profile.position ??
    "STUDENT") as UserPosition;

  const attendeeTagUrl = await deliverRegistrationEmail({
    supabase: admin,
    registrationId: registration.id,
    data: {
      attendeeId: registration.attendee_id,
      eventId: registration.event_id,
      email: profile.email,
      firstName: profile.first_name ?? "",
      lastName: profile.last_name ?? "",
      personNumber: profile.person_number ?? null,
      position,
      eventTitle: event.title,
      startDate: event.start_date,
      endDate: event.end_date,
      venue: event.venue ?? null,
    },
    throwOnError: true,
  });

  return NextResponse.json({ ok: true, attendeeTagUrl });
}
