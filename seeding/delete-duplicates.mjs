// One-off cleanup: delete the 16 duplicate junk profiles (malformed email +
// empty name) created during seeding, along with their registrations, storage
// tags and auth users. Safety-checked against the exact malformed emails.
//
// NO other data is touched.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BUCKET = "event_images";

function pickServiceKey() {
  const raw = readFileSync(join(ROOT, ".env"), "utf8");
  const cands = [];
  for (const l of raw.split(/\r?\n/)) {
    const m = l.match(/SERVICE_ROLE_KEY\s*=\s*(.*)/);
    if (m) {
      const v = m[1].trim().replace(/^["']|["']$/g, "");
      if (v) cands.push(v);
    }
  }
  const role = (t) => {
    try {
      return JSON.parse(Buffer.from(t.split(".")[1], "base64").toString()).role;
    } catch {
      return null;
    }
  };
  return cands.find((c) => role(c) === "service_role") || cands[0];
}

function env(k) {
  const raw = readFileSync(join(ROOT, ".env"), "utf8");
  for (const l of raw.split(/\r?\n/)) {
    const m = l.match(new RegExp(`^${k}=(.*)$`));
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

// id -> exact malformed email it must currently have (safety guard).
const TARGETS = {
  "e5693a75-1096-40de-9cce-301eee01679a": "2683894@students.wust",
  "889deb29-8ac1-47c7-9954-5e21132bf720": "2961355@students.wits",
  "3c9df740-256c-4363-ab36-74f1d8c4368f": "2614833@students.wits",
  "027eee44-8221-4a47-aa55-5483b6371233": "3072343@students.wits",
  "0c2098c7-602e-47d8-8089-dd989bc04788": "2958463@students.wits.ac",
  "93394084-b001-4178-b179-a5b675ac1a5a": "3033898@students.wits",
  "a7834267-77f3-4422-a70d-a59a96246bc9": "2801525@students.wits",
  "d4886bd7-7b14-45ab-a955-3bdff9fb46db": "bnmasuku@icloud.co",
  "e6197bd2-e996-41a8-b650-7034164d66c6": "2672018@students.wits",
  "a668d5bd-3725-43d4-bcd7-af10ebe33906": "2840807@students.wits.ac",
  "883ec489-e88f-4e2e-9ca7-fe3be2eaa988": "2542420@students.wits.ac",
  "d61804b3-f87e-4b2b-a7f3-a2b35d8d48e8": "3090474@students.wits.ac",
  "48917d6b-a8a6-42e3-8374-3f17838a89d9": "hayanda940@gmail.come",
  "a468e0eb-c5ee-4608-ba3a-c950025b7f42": "2691292@students.ac",
  "ce621c16-20da-4654-b935-2c49565f1d63": "2691292@students.wits",
  "d73af281-8ddd-48a1-b548-abb45fd8cf5f": "2974089@students.wits.ac",
};

function storagePath(url) {
  if (!url) return null;
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
}

async function main() {
  const url = env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL");
  const admin = createClient(url, pickServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const report = [["id", "email", "registrations", "tags", "status", "note"]];
  let deleted = 0;

  for (const [id, expectedEmail] of Object.entries(TARGETS)) {
    const { data: profile } = await admin
      .from("profiles")
      .select("id, email")
      .eq("id", id)
      .maybeSingle();

    if (!profile) {
      report.push([id, expectedEmail, 0, 0, "skipped", "profile not found"]);
      continue;
    }
    // Safety: only proceed if it is still the exact malformed duplicate.
    if (String(profile.email).trim() !== expectedEmail) {
      report.push([
        id,
        profile.email,
        0,
        0,
        "skipped",
        `email changed (expected ${expectedEmail})`,
      ]);
      continue;
    }

    // Registrations + their storage tags.
    const { data: regs } = await admin
      .from("registrations")
      .select("id, attendee_tag_url")
      .eq("attendee_id", id);

    let tags = 0;
    const paths = (regs ?? [])
      .map((r) => storagePath(r.attendee_tag_url))
      .filter(Boolean);
    if (paths.length > 0) {
      const { error: sErr } = await admin.storage.from(BUCKET).remove(paths);
      if (!sErr) tags = paths.length;
    }

    const { error: rErr } = await admin
      .from("registrations")
      .delete()
      .eq("attendee_id", id);
    if (rErr) {
      report.push([id, profile.email, 0, tags, "failed", `regs: ${rErr.message}`]);
      continue;
    }

    const { error: pErr } = await admin.from("profiles").delete().eq("id", id);
    if (pErr) {
      report.push([id, profile.email, regs?.length ?? 0, tags, "failed", `profile: ${pErr.message}`]);
      continue;
    }

    let note = "";
    try {
      const { error: aErr } = await admin.auth.admin.deleteUser(id);
      if (aErr) note = `auth: ${aErr.message}`;
    } catch (e) {
      note = `auth: ${e.message}`;
    }

    deleted++;
    report.push([id, profile.email, regs?.length ?? 0, tags, "deleted", note]);
  }

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
  writeFileSync(join(__dirname, "duplicate_delete_report.csv"), csv + "\n", "utf8");

  console.log("-----------------------------------------");
  console.log(`Deleted duplicate profiles: ${deleted} / ${Object.keys(TARGETS).length}`);
  console.log("Report: seeding/duplicate_delete_report.csv");
  console.log("-----------------------------------------");
  for (const r of report.slice(1)) {
    console.log(`  ${r[4].padEnd(8)} ${r[1]}  regs=${r[2]} tags=${r[3]} ${r[5] || ""}`);
  }
}

void main();
