import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

let configured = false;

function configure(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject =
    process.env.VAPID_SUBJECT?.trim() || "mailto:registrations@witscsd.co.za";

  if (!publicKey || !privateKey) return false;
  if (!configured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

interface SubscriptionRow {
  id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * Sends a Web Push notification to every stored subscription. Uses the
 * service-role Supabase client (RLS bypass) to read all rows, and prunes
 * subscriptions that the push service reports as gone (404/410).
 */
export async function sendPushToAll(
  supabase: SupabaseClient,
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  if (!configure()) return { sent: 0, failed: 0 };

  const { data } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, keys");
  const subscriptions = (data ?? []) as SubscriptionRow[];

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (row) => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: row.keys },
          JSON.stringify(payload),
        );
        sent += 1;
      } catch (error) {
        failed += 1;
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", row.id);
        }
      }
    }),
  );

  return { sent, failed };
}
