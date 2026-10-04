import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { pushConfigured, sendPushToAll } from "@/lib/push";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!pushConfigured()) {
    return NextResponse.json(
      { error: "Push is not configured (missing VAPID keys)." },
      { status: 500 },
    );
  }

  const admin = tryCreateAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Push requires SUPABASE_SERVICE_ROLE_KEY on the server." },
      { status: 500 },
    );
  }

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    text?: string;
    url?: string;
  };
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const url = typeof body.url === "string" ? body.url : "/";
  if (!text) {
    return NextResponse.json({ error: "A message is required." }, { status: 400 });
  }

  const result = await sendPushToAll(admin, {
    title: "Centre for Student Development",
    body: text,
    url,
  });
  console.log(`[push] sent=${result.sent} failed=${result.failed}`);

  return NextResponse.json({ ok: true, ...result });
}

