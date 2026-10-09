import type { SupabaseClient } from "@supabase/supabase-js";
import { generateAttendeeBadge } from "@/lib/pdf/attendee-badge";
import { slugify } from "@/lib/utils";
import type { UserPosition } from "@/lib/types";

const POSITION_LABELS: Record<UserPosition, string> = {
  STUDENT: "Student",
  STAFF: "Staff",
  GUEST: "Guest",
  GUEST_SPEAKER: "Guest Speaker",
};

const BUCKET = "event_images";

export interface RegistrationEmailData {
  attendeeId: string;
  eventId: string;
  email: string;
  firstName: string;
  lastName: string;
  personNumber: string | null;
  position: UserPosition | null;
  eventTitle: string;
  startDate: string;
  endDate: string;
  venue: string | null;
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(iso));
}

function renderEmailHtml(data: RegistrationEmailData, dateText: string, position: string) {
  const fullName = `${data.firstName} ${data.lastName}`.trim() || "Attendee";
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="background:#003366;padding:28px 24px;text-align:center;">
        <p style="margin:0;color:#d9b45b;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Centre for Student Development</p>
        <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;">Registration Confirmed</h1>
      </div>
      <div style="padding:28px 24px;color:#1f2937;">
        <p style="margin:0 0 16px;font-size:16px;">Hi ${fullName},</p>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">
          Your attendance has been successfully marked. Your personalised attendee badge is attached to this email as a PDF.
        </p>
        <div style="border:1px solid #e5e7eb;border-radius:10px;padding:18px;background:#f8fafc;">
          <p style="margin:0 0 10px;font-size:15px;font-weight:bold;color:#003366;">${data.eventTitle}</p>
          <p style="margin:4px 0;font-size:14px;color:#4b5563;"><strong>Date &amp; Time:</strong> ${dateText}</p>
          <p style="margin:4px 0;font-size:14px;color:#4b5563;"><strong>Venue:</strong> ${data.venue || "To be confirmed"}</p>
          <p style="margin:4px 0;font-size:14px;color:#4b5563;"><strong>Attending as:</strong> ${position}</p>
        </div>
        <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#4b5563;">
          Please present your badge (printed or on your phone) at the door for fast check-in.
          You can also download it anytime from your CSD dashboard.
        </p>
      </div>
      <div style="border-top:3px solid #d9b45b;background:#003366;padding:16px 24px;text-align:center;">
        <p style="margin:0;color:#ffffff;font-size:12px;">University of the Witwatersrand · CSD</p>
      </div>
    </div>
  </div>`;
}

export async function deliverRegistrationEmail({
  supabase,
  registrationId,
  data,
  throwOnError = false,
}: {
  supabase: SupabaseClient;
  registrationId: string;
  data: RegistrationEmailData;
  throwOnError?: boolean;
}): Promise<string | null> {
  try {
    const key = process.env.PLUNK_SECRET_KEY;
    if (!key) throw new Error("PLUNK_SECRET_KEY is not set");

    const position = data.position
      ? POSITION_LABELS[data.position] ?? data.position
      : "Attendee";
    const dateText = `${formatDateTime(data.startDate)} - ${formatDateTime(data.endDate)}`;

    const pdfBytes = await generateAttendeeBadge({
      eventTitle: data.eventTitle,
      firstName: data.firstName,
      lastName: data.lastName,
      positionLabel: position,
      attendeeId: data.attendeeId,
      dateText,
      venue: data.venue,
      personNumber: data.personNumber,
    });

    const base64 = Buffer.from(pdfBytes).toString("base64");
    const filename = `attendee-badge-${slugify(data.eventTitle) || "event"}.pdf`;

    const response = await fetch("https://next-api.useplunk.com/v1/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: data.email,
        subject: `REGISTRATION CONFIRMED: ${data.eventTitle}`,
        body: renderEmailHtml(data, dateText, position),
        from: { name: "Wits CSD", email: "registrations@witscsd.co.za" },
        attachments: [
          {
            filename,
            content: base64,
            contentType: "application/pdf",
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Plunk error ${response.status}: ${text}`);
    }

    console.log(`Registration confirmation email sent to ${data.email}`);

    // Store the badge so it can be re-downloaded from the dashboard.
    const path = `attendee-tags/${data.eventId}/${data.attendeeId}-${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (uploadError) throw uploadError;

    const { data: publicUrl } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);

    const { error: updateError } = await supabase
      .from("registrations")
      .update({ attendee_tag_url: publicUrl.publicUrl })
      .eq("id", registrationId);
    if (updateError) throw updateError;

    console.log(`Attendee tag stored at ${publicUrl.publicUrl}`);
    return publicUrl.publicUrl;
  } catch (error) {
    console.error("Registration confirmation email failed:", error);
    if (throwOnError) throw error;
    return null;
  }
}
