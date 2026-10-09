// One-off: repair the 19 malformed profile emails.
//   - wits/student domains -> @students.wits.ac.za
//   - gmail typos          -> @gmail.com
//   - icloud.co            -> @icloud.com
//   - spu.ac               -> @spu.ac.za
//
// Updates profiles.email AND the matching auth user email. Collisions
// (corrected email already used elsewhere) are skipped, never overwritten.
// No deletes.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

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

function corrected(email) {
  const [local, domainRaw] = String(email).split("@");
  const domain = (domainRaw || "").toLowerCase();
  if (
    domain === "students.wust" ||
    domain === "students.wits" ||
    domain === "students.wits.ac" ||
    domain === "students.ac"
  ) {
    return `${local}@students.wits.ac.za`;
  }
  if (domain === "gmail.comm" || domain === "gmail.come") {
    return `${local}@gmail.com`;
  }
  if (domain === "icloud.co") return `${local}@icloud.com`;
  if (domain === "spu.ac") return `${local}@spu.ac.za`;
  return null;
}

async function main() {
  const url = env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL");
  const admin = createClient(url, pickServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // All profiles (paginated).
  const profiles = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("profiles")
      .select("id, email, first_name, last_name")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const r of data ?? []) profiles.push(r);
    if (!data || data.length < 1000) break;
  }

  const existing = new Set(profiles.map((p) => String(p.email || "").toLowerCase()));
  const report = [["id", "old_email", "new_email", "status", "note"]];

  for (const p of profiles) {
    const next = corrected(p.email);
    if (!next) continue;

    const key = next.toLowerCase();
    // Collision: the corrected address already belongs to another profile.
    if (existing.has(key)) {
      report.push([p.id, p.email, next, "skipped", "corrected email already in use"]);
      continue;
    }

    const { error: pErr } = await admin
      .from("profiles")
      .update({ email: next })
      .eq("id", p.id);
    if (pErr) {
      report.push([p.id, p.email, next, "failed", pErr.message]);
      continue;
    }
    existing.add(key);

    // Keep the auth user's email in sync (best effort).
    let note = "";
    try {
      const { error: aErr } = await admin.auth.admin.updateUserById(p.id, {
        email: next,
        email_confirm: true,
      });
      if (aErr) note = `auth: ${aErr.message}`;
    } catch (e) {
      note = `auth: ${e.message}`;
    }
    report.push([p.id, p.email, next, "fixed", note]);
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
  writeFileSync(join(__dirname, "email_fix_report.csv"), csv + "\n", "utf8");

  const counts = report.slice(1).reduce((acc, r) => {
    acc[r[3]] = (acc[r[3]] ?? 0) + 1;
    return acc;
  }, {});
  console.log("-----------------------------------------");
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);
  console.log("Report: seeding/email_fix_report.csv");
  console.log("-----------------------------------------");
  for (const r of report.slice(1)) {
    console.log(`  ${r[3].padEnd(8)} ${r[1]} -> ${r[2]}${r[4] ? `  (${r[4]})` : ""}`);
  }
}

void main();
