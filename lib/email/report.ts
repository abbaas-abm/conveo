import type { SupabaseClient } from "@supabase/supabase-js";
import { generateEventReport } from "@/lib/pdf/event-report";
import { slugify } from "@/lib/utils";
import type { UserPosition } from "@/lib/types";

const POSITION_LABELS: Record<UserPosition, string> = {
  STUDENT: "Student",
  STAFF: "Staff",
  GUEST: "Guest",
  GUEST_SPEAKER: "Guest Speaker",
};

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(iso));
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(iso));
}

function nameOf(profile: {
  first_name: string | null;
  last_name: string | null;
} | null) {
  if (!profile) return "Anonymous";
  return (
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    "Anonymous"
  );
}

export async function deliverEventReport({
  supabase,
  to,
  eventId,
  throwOnError = false,
}: {
  supabase: SupabaseClient;
  to: string;
  eventId: string;
  throwOnError?: boolean;
}) {
  try {
    const key = process.env.PLUNK_SECRET_KEY;
    if (!key) throw new Error("PLUNK_SECRET_KEY is not set");

    const { data: event } = await supabase
      .from("events")
      .select("title, description, start_date, end_date, venue")
      .eq("id", eventId)
      .maybeSingle();
    if (!event) throw new Error("Event not found.");

    const [registrationRes, attendanceRes, feedbackRes] = await Promise.all([
      supabase
        .from("registrations")
        .select(
          "attendee_id, position, created_at, attendee:profiles!attendee_id(first_name,last_name)",
        )
        .eq("event_id", eventId)
        .order("created_at", { ascending: true }),
      supabase
        .from("attendance")
        .select(
          "attendee_id, created_at, attendee:profiles!attendee_id(first_name,last_name)",
        )
        .eq("event_id", eventId)
        .order("created_at", { ascending: true }),
      supabase
        .from("feedback")
        .select(
          "rating, comment, created_at, attendee:profiles!attendee_id(first_name,last_name)",
        )
        .eq("event_id", eventId)
        .order("created_at", { ascending: true }),
    ]);

    type ProfileJoin = {
      first_name: string | null;
      last_name: string | null;
    } | null;

    const positionByAttendee = new Map<string, UserPosition>();
    const registrations = (
      (registrationRes.data ?? []) as unknown as Array<{
        attendee_id: string;
        position: UserPosition | null;
        created_at: string;
        attendee: ProfileJoin;
      }>
    ).map((r) => {
      if (r.position) positionByAttendee.set(r.attendee_id, r.position);
      return {
        name: nameOf(r.attendee),
        detail: r.position ? POSITION_LABELS[r.position] : "Registration",
        dateText: formatDateTime(r.created_at),
      };
    });

    const attendees = (
      (attendanceRes.data ?? []) as unknown as Array<{
        attendee_id: string;
        created_at: string;
        attendee: ProfileJoin;
      }>
    ).map((a) => {
      const position = positionByAttendee.get(a.attendee_id);
      return {
        name: nameOf(a.attendee),
        detail: position ? `Checked in · ${POSITION_LABELS[position]}` : "Checked in",
        dateText: formatDateTime(a.created_at),
      };
    });

    const feedbackRows = (feedbackRes.data ?? []) as unknown as Array<{
      rating: number;
      comment: string | null;
      created_at: string;
      attendee: ProfileJoin;
    }>;

    const feedback = feedbackRows.map((f) => ({
      name: nameOf(f.attendee),
      rating: f.rating,
      comment: f.comment,
      dateText: formatDate(f.created_at),
    }));

    const averageRating =
      feedbackRows.length > 0
        ? feedbackRows.reduce((sum, f) => sum + f.rating, 0) /
          feedbackRows.length
        : null;

    const pdfBytes = await generateEventReport({
      eventTitle: event.title,
      description: event.description,
      dateText: `${formatDate(event.start_date)} - ${formatDate(event.end_date)}`,
      venue: event.venue,
      totalRegistrations: registrations.length,
      totalAttendees: attendees.length,
      averageRating,
      registrations,
      attendees,
      feedback,
    });

    const base64 = Buffer.from(pdfBytes).toString("base64");
    const filename = `report-${slugify(event.title) || "event"}.pdf`;

    const response = await fetch("https://next-api.useplunk.com/v1/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        subject: `Report: ${event.title}`,
        from: { name: "Wits CSD", email: "reports@witscsd.co.za" },
        body: `
          <div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.6;">
            <p>Hello,</p>
            <p>Please find attached the CSD event report for <strong>${event.title}</strong>.</p>
            <p>It includes attendance, registrations and feedback summaries for the event.</p>
            <p style="color:#6b7280;font-size:13px;">Centre for Student Development · University of the Witwatersrand</p>
          </div>`,
        attachments: [
          { filename, content: base64, contentType: "application/pdf" },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Plunk error ${response.status}: ${text}`);
    }

    console.log(`Event report sent for "${event.title}" to ${to}`);
  } catch (error) {
    console.error("Event report delivery failed:", error);
    if (throwOnError) throw error;
  }
}
