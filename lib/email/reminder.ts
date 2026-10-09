import type { SupabaseClient } from "@supabase/supabase-js";

const EVENT_BASE_URL = "https://witscsd.co.za";

const SENDER = { name: "Wits CSD", email: "reminders@witscsd.co.za" };

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

interface ReminderData {
  name: string;
  eventTitle: string;
  theme: string | null;
  dateText: string;
  venue: string;
  eventId: string;
  hasTag: boolean;
}

function renderReminderHtml(data: ReminderData) {
  const eventUrl = `${EVENT_BASE_URL}/events/${data.eventId}`;
  const tagMsg = data.hasTag
    ? "Your personalised attendee tag is attached to this email. Please present it (printed or on your phone) at the door for fast check-in."
    : "Please remember to bring your attendee tag for fast check-in at the door.";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<title>Event Reminder</title>
<style>
  body { margin: 0; padding: 0; background: #eef2f7; }
  table { border-collapse: collapse; }
  img { border: 0; outline: none; }
  a { text-decoration: none; }
  @media only screen and (max-width: 600px) {
    .wrap { padding: 14px 10px !important; }
    .card { border-radius: 14px !important; }
    .pad { padding-left: 20px !important; padding-right: 20px !important; }
    .head { padding-top: 26px !important; padding-bottom: 22px !important; }
    .h1 { font-size: 21px !important; }
    .title { font-size: 17px !important; }
    .btn a { display: block !important; width: 100% !important; box-sizing: border-box !important; padding-left: 0 !important; padding-right: 0 !important; }
    .label { width: 104px !important; }
  }
</style>
</head>
<body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;">
    <tr>
      <td align="center" class="wrap" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="card" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#003366;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="height:5px;background:#d9b45b;font-size:0;line-height:0;">&nbsp;</td></tr>
                <tr>
                  <td align="center" class="pad head" style="padding:30px 28px 26px;">
                    <p style="margin:0;color:#d9b45b;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:700;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">Centre for Student Development</p>
                    <h1 class="h1" style="margin:10px 0 0;color:#ffffff;font-size:24px;line-height:1.3;font-weight:700;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">Event Reminder</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="pad" style="padding:30px 28px 28px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#1f2937;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi ${data.name},</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#374151;">
                This is a friendly reminder that you&rsquo;re registered for the event below. We can&rsquo;t wait to see you there.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="background:#f8fafc;padding:18px 20px;">
                    <p class="title" style="margin:0;font-size:18px;font-weight:700;color:#003366;line-height:1.35;">${data.eventTitle}</p>
                    ${data.theme ? `<p style="margin:6px 0 0;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#b8860b;">${data.theme}</p>` : ""}
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-top:1px solid #eef2f7;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td class="label" style="padding:6px 0;font-size:13px;color:#6b7280;width:120px;vertical-align:top;">Date &amp; Time</td>
                        <td style="padding:6px 0;font-size:14px;color:#1f2937;font-weight:600;">${data.dateText}</td>
                      </tr>
                      <tr>
                        <td class="label" style="padding:6px 0;font-size:13px;color:#6b7280;width:120px;vertical-align:top;">Venue</td>
                        <td style="padding:6px 0;font-size:14px;color:#1f2937;font-weight:600;">${data.venue}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="btn" style="margin:26px 0 6px;">
                <tr>
                  <td align="center">
                    <a href="${eventUrl}" style="display:inline-block;background:#003366;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:15px 36px;border-radius:999px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">View event details</a>
                  </td>
                </tr>
              </table>

              <p style="margin:20px 0 0;font-size:14px;line-height:1.7;color:#4b5563;">${tagMsg}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="border-top:3px solid #d9b45b;background:#003366;padding:20px 28px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
              <p style="margin:0;color:#ffffff;font-size:12px;line-height:1.6;">University of the Witwatersrand &middot; Centre for Student Development</p>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.6);font-size:11px;">This reminder was sent because you registered for this event.</p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;text-align:center;color:#9aa5b1;font-size:11px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">&copy; ${new Date().getFullYear()} Wits CSD</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface ReminderResult {
  status: "sent" | "failed";
  error?: string;
  email?: string;
}

export async function deliverReminderEmail({
  supabase,
  registrationId,
  throwOnError = false,
}: {
  supabase: SupabaseClient;
  registrationId: string;
  throwOnError?: boolean;
}): Promise<ReminderResult> {
  let email: string | undefined;
  try {
    const key = process.env.PLUNK_SECRET_KEY;
    if (!key) throw new Error("PLUNK_SECRET_KEY is not set");

    const { data: reg } = await supabase
      .from("registrations")
      .select("id, event_id, attendee_id, attendee_tag_url")
      .eq("id", registrationId)
      .maybeSingle();
    if (!reg) throw new Error("Registration not found.");

    const [{ data: profile }, { data: event }] = await Promise.all([
      supabase
        .from("profiles")
        .select("first_name,last_name,email")
        .eq("id", reg.attendee_id)
        .maybeSingle(),
      supabase
        .from("events")
        .select("title,theme,start_date,end_date,venue,mode")
        .eq("id", reg.event_id)
        .maybeSingle(),
    ]);
    if (!profile?.email || !event) {
      throw new Error("Missing attendee email or event details.");
    }
    const to = String(profile.email).trim();
    if (!isValidEmail(to)) {
      console.warn(`Skipping reminder: invalid email "${profile.email}"`);
      return { status: "failed", error: "Invalid email address", email: to };
    }
    email = to;

    const name =
      [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
      "Attendee";
    const dateText = `${formatDateTime(event.start_date)} - ${formatDateTime(event.end_date)}`;
    const venue =
      event.mode === "ONLINE" ? "Online" : event.venue || "Wits Campus";

    // Attach the attendee tag when one exists. If it can't be fetched, the
    // reminder is still sent (without the attachment).
    let attachments:
      | { filename: string; content: string; contentType: string }[]
      | undefined;
    if (reg.attendee_tag_url) {
      try {
        const res = await fetch(reg.attendee_tag_url);
        if (res.ok) {
          const bytes = Buffer.from(await res.arrayBuffer());
          attachments = [
            {
              filename: `attendee-tag-${reg.attendee_id}.pdf`,
              content: bytes.toString("base64"),
              contentType: "application/pdf",
            },
          ];
        }
      } catch {
        attachments = undefined;
      }
    }

    const response = await fetch("https://next-api.useplunk.com/v1/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        subject: `Reminder: ${event.title}`,
        from: SENDER,
        body: renderReminderHtml({
          name,
          eventTitle: event.title,
          theme: event.theme ?? null,
          dateText,
          venue,
          eventId: reg.event_id,
          hasTag: Boolean(attachments),
        }),
        ...(attachments ? { attachments } : {}),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      // Only retry transient Plunk failures. Validation errors (e.g. an
      // invalid recipient) are reported and skipped so the queue keeps moving.
      const retryable = response.status === 429 || response.status >= 500;
      if (throwOnError && retryable) {
        throw new Error(`Plunk error ${response.status}: ${text}`);
      }
      console.error(
        `Reminder not sent (${response.status}) to ${to}: ${text}`,
      );
      return {
        status: "failed",
        error: `Plunk error ${response.status}`,
        email: to,
      };
    }

    console.log(`Reminder sent for ${event.title} to ${to}`);
    return { status: "sent", email: to };
  } catch (error) {
    console.error("Reminder email failed:", error);
    if (throwOnError) throw error;
    return {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      email,
    };
  }
}
