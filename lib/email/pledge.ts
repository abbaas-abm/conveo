import type { SupabaseClient } from "@supabase/supabase-js";
import { generatePledgeLetter } from "@/lib/pdf/pledge-letter";

const BUCKET = "event_images";

function formatSignedAt(iso: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(iso));
}

export async function deliverPledgeDocument({
  supabase,
  pledgeId,
  throwOnError = false,
}: {
  supabase: SupabaseClient;
  pledgeId: string;
  throwOnError?: boolean;
}) {
  try {
    const key = process.env.PLUNK_SECRET_KEY;
    if (!key) throw new Error("PLUNK_SECRET_KEY is not set");

    const { data: pledge } = await supabase
      .from("pledges")
      .select("id, pledge_text, created_at, user_id, event_id")
      .eq("id", pledgeId)
      .maybeSingle();
    if (!pledge) throw new Error("Pledge not found.");

    const [{ data: profile }, { data: event }] = await Promise.all([
      supabase
        .from("profiles")
        .select("first_name,last_name,email")
        .eq("id", pledge.user_id ?? "")
        .maybeSingle(),
      supabase
        .from("events")
        .select("title,description")
        .eq("id", pledge.event_id ?? "")
        .maybeSingle(),
    ]);
    if (!profile?.email || !event) {
      throw new Error("Missing profile or event for pledge.");
    }

    const signedAt = formatSignedAt(pledge.created_at);
    const pdfBytes = await generatePledgeLetter({
      eventTitle: event.title,
      eventDescription: event.description,
      firstName: profile.first_name ?? "",
      lastName: profile.last_name ?? "",
      pledgeText: pledge.pledge_text,
      signedAt,
    });

    const path = `pledges/pledge_${pledge.id}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (uploadError) throw uploadError;

    const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(path);
    await supabase
      .from("pledges")
      .update({ pledge_document_url: publicUrl.publicUrl })
      .eq("id", pledge.id);

    const fullName =
      [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
      "Attendee";
    const base64 = Buffer.from(pdfBytes).toString("base64");

    const response = await fetch("https://next-api.useplunk.com/v1/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: profile.email,
        subject: `Your Official Pledge Certificate for ${event.title}`,
        from: { name: "Wits CSD", email: "registrations@witscsd.co.za" },
        body: `
          <div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.6;">
            <p>Hi ${fullName},</p>
            <p>Thank you for taking the pledge at <strong>${event.title}</strong>. Your official pledge certificate is attached to this email.</p>
            <p style="color:#6b7280;font-size:13px;">Centre for Student Development · University of the Witwatersrand</p>
          </div>`,
        attachments: [
          {
            filename: `pledge-${pledge.id}.pdf`,
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

    console.log(`Pledge certificate sent for "${event.title}" to ${profile.email}`);
  } catch (error) {
    console.error("Pledge document delivery failed:", error);
    if (throwOnError) throw error;
  }
}
