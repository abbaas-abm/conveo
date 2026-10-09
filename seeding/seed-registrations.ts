// Seeds registrations + attendee tags for every profile NOT already registered
// for the target event. Local, incremental, no Redis/worker, and NO emails.
//
//   CREATE-ONLY. No deletes, no updates to existing rows.
//   Reuses the app's real badge generator (lib/pdf/attendee-badge.ts).
//
// Usage:
//   npx tsx seeding/seed-registrations.ts --dry-run --limit=5
//   npx tsx seeding/seed-registrations.ts --limit=10
//   npx tsx seeding/seed-registrations.ts
//
// Report: seeding/registration_seed_report.csv

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { generateAttendeeBadge } from "../lib/pdf/attendee-badge";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const limitArg = args.find((a) => a.startsWith("--limit="));
const concArg = args.find((a) => a.startsWith("--concurrency="));
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
const CONCURRENCY = concArg ? Number(concArg.split("=")[1]) : 3;

const EVENT_TITLE = "3rd annual student leadership conference";
const BUCKET = "event_images";

const POSITION_LABELS: Record<string, string> = {
  STUDENT: "Student",
  STAFF: "Staff",
  GUEST: "Guest",
  GUEST_SPEAKER: "Guest Speaker",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---- env -----------------------------------------------------------------
function readEnv() {
  const env: Record<string, string> = {};
  for (const line of readFileSync(join(ROOT, ".env"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!env[m[1]]) env[m[1]] = v;
  }
  return env;
}

function jwtRole(token: string): string | null {
  try {
    return JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString("utf8"),
    ).role;
  } catch {
    return null;
  }
}

function pickServiceKey(): string {
  const candidates: string[] = [];
  for (const line of readFileSync(join(ROOT, ".env"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || !/SERVICE_ROLE_KEY$/.test(m[1])) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (v) candidates.push(v);
  }
  return (
    candidates.find((c) => jwtRole(c) === "service_role") ??
    candidates.sort((a, b) => b.length - a.length)[0] ??
    ""
  );
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

// ---- paginated reads -----------------------------------------------------
async function fetchAll<T>(
  admin: SupabaseClient,
  table: string,
  columns: string,
  filter?: { column: string; value: string },
): Promise<T[]> {
  const out: T[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    let q = admin.from(table).select(columns).range(from, from + pageSize - 1);
    if (filter) q = q.eq(filter.column, filter.value);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    for (const row of data ?? []) out.push(row as T);
    if (!data || data.length < pageSize) break;
  }
  return out;
}

interface ProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  person_number: string | null;
}

interface EventRow {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  venue: string | null;
}

async function processProfile(
  admin: SupabaseClient,
  event: EventRow,
  profile: ProfileRow,
): Promise<{ email: string; status: string; error: string }> {
  const label = "seed";
  const row = { email: profile.id, status: "", error: "" };
  try {
    if (DRY_RUN) {
      row.status = "dry-run";
      return row;
    }

    const positionLabel = profile.position
      ? (POSITION_LABELS[profile.position] ?? profile.position)
      : "Attendee";

    const pdfBytes = await generateAttendeeBadge({
      eventTitle: event.title,
      firstName: profile.first_name ?? "",
      lastName: profile.last_name ?? "",
      positionLabel,
      attendeeId: profile.id,
      dateText: `${formatDateTime(event.start_date)} - ${formatDateTime(event.end_date)}`,
      venue: event.venue,
      personNumber: profile.person_number,
    });

    const path = `attendee-tags/${event.id}/${profile.id}-${crypto.randomUUID()}.pdf`;
    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(path, Buffer.from(pdfBytes), {
        contentType: "application/pdf",
        upsert: false,
      });
    if (upErr) throw new Error(`upload: ${upErr.message}`);

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);

    const { error: insErr } = await admin.from("registrations").insert({
      event_id: event.id,
      attendee_id: profile.id,
      status: "CONFIRMED",
      position: profile.position,
      attendee_tag_url: pub.publicUrl,
    });
    if (insErr) throw new Error(`insert: ${insErr.message}`);

    row.status = "created";
    void label;
    return row;
  } catch (e) {
    row.status = "failed";
    row.error = e instanceof Error ? e.message : String(e);
    return row;
  }
}

async function main() {
  const env = readEnv();
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const key = pickServiceKey();
  if (!url || !key) {
    console.error("Missing SUPABASE_URL or service-role key in .env");
    process.exit(1);
  }
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Locate the event.
  const { data: events, error: evErr } = await admin
    .from("events")
    .select("id,title,start_date,end_date,venue")
    .ilike("title", `%${EVENT_TITLE}%`);
  if (evErr) throw new Error(evErr.message);
  const found = (events ?? [])[0] as EventRow | undefined;
  if (!found) {
    console.error(`Event matching "${EVENT_TITLE}" not found.`);
    process.exit(1);
  }
  const event: EventRow = found;
  console.log(`Event: ${event.title} (${event.id})`);

  // 2. Already-registered attendee ids.
  const regs = await fetchAll<{ attendee_id: string }>(
    admin,
    "registrations",
    "attendee_id",
    { column: "event_id", value: event.id },
  );
  const registered = new Set(regs.map((r) => r.attendee_id));
  console.log(`Already registered: ${registered.size}`);

  // 3. All profiles.
  const profiles = await fetchAll<ProfileRow>(
    admin,
    "profiles",
    "id, first_name, last_name, position, person_number",
  );
  console.log(`Profiles total: ${profiles.length}`);

  const unregistered = profiles.filter((p) => !registered.has(p.id));
  const queue = unregistered.slice(
    0,
    Number.isFinite(LIMIT) ? LIMIT : undefined,
  );
  console.log(
    `Unregistered: ${unregistered.length}; processing ${queue.length}` +
      (DRY_RUN ? " (DRY RUN)" : ""),
  );

  // 4. Process incrementally.
  const results: { email: string; status: string; error: string }[] = [];
  let done = 0;
  let next = 0;
  async function worker() {
    while (true) {
      const idx = next++;
      if (idx >= queue.length) break;
      results[idx] = await processProfile(admin, event, queue[idx]);
      done++;
      if (done % 25 === 0 || done === queue.length) {
        console.log(`  ...${done}/${queue.length}`);
      }
      await sleep(50);
    }
  }
  await Promise.all(
    Array.from({ length: Math.max(1, CONCURRENCY) }, () => worker()),
  );

  const counts = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  if (!DRY_RUN) {
    const report = [
      ["attendee_id", "status", "error"],
      ...results.map((r) => [r.email, r.status, r.error]),
    ];
    const csv = report
      .map((row) =>
        row
          .map((f) => {
            const s = f == null ? "" : String(f);
            return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(","),
      )
      .join("\n");
    writeFileSync(
      join(__dirname, "registration_seed_report.csv"),
      csv + "\n",
      "utf8",
    );
  }

  console.log("\n-----------------------------------------");
  console.log(`Processed: ${results.length}`);
  for (const [k, v] of Object.entries(counts).sort()) {
    console.log(`  ${k}: ${v}`);
  }
  if (!DRY_RUN) console.log("Report   : seeding/registration_seed_report.csv");
  console.log("-----------------------------------------");
}

main().catch((e) => {
  console.error("Failed:", e?.message ?? e);
  process.exit(1);
});
