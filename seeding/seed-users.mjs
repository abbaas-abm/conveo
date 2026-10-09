// Seeds auth users + profiles from seeding/final_slc.csv.
//
// CREATE-ONLY. This script never deletes or modifies existing rows:
//   - createUser() is only called for emails NOT already in profiles.
//   - If the auth user already exists, the record is skipped (untouched).
//   - The profile is only written for users this run just created.
//
// Usage:
//   node seeding/seed-users.mjs --dry-run --limit=5   # preview, no writes
//   node seeding/seed-users.mjs --limit=3             # create first 3
//   node seeding/seed-users.mjs                       # full run
//
// Writes a report to seeding/seeding_report.csv.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const limitArg = args.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
const CONCURRENCY = 4;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- .env ----------------------------------------------------------------
function loadEnv() {
  const env = {};
  try {
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
  } catch {
    /* ignore */
  }
  return env;
}

function jwtRole(token) {
  try {
    return JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString("utf8"),
    ).role;
  } catch {
    return null;
  }
}

function pickServiceKey() {
  const candidates = [];
  try {
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
  } catch {
    /* ignore */
  }
  return (
    candidates.find((c) => jwtRole(c) === "service_role") ??
    candidates.sort((a, b) => b.length - a.length)[0] ??
    ""
  );
}

const env = loadEnv();
const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = pickServiceKey();
if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL or a valid service-role key in .env");
  process.exit(1);
}

// ---- CSV -----------------------------------------------------------------
function parseCSV(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      /* skip */
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const clean = (v) => {
  const s = (v ?? "").trim();
  return s === "" ? null : s;
};

function mapPosition(raw) {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v) return null;
  if (v.includes("guest speaker")) return "GUEST_SPEAKER";
  if (v.includes("staff")) return "STAFF";
  if (v === "guest") return "GUEST";
  if (v.includes("student")) return "STUDENT";
  return null;
}

// ---- Supabase helpers ----------------------------------------------------
async function createUserWithRetry(admin, opts) {
  const attempts = 4;
  let lastError = null;
  for (let a = 0; a < attempts; a++) {
    const { data, error } = await admin.auth.admin.createUser(opts);
    if (!error) return { data, error: null };
    lastError = error;
    const msg = error.message || "";
    const transient =
      error.status === 429 ||
      (error.status >= 500 && error.status < 600) ||
      /rate limit|timeout|fetch failed|ECONN/i.test(msg);
    if (!transient || a === attempts - 1) break;
    await sleep(1000 * 2 ** a);
  }
  return { data: null, error: lastError };
}

async function processRecord(admin, rec) {
  const email = rec.email.trim();
  const result = { email, status: "", user_id: "", error: "" };

  if (DRY_RUN) {
    result.status = "dry-run";
    console.log(
      "  " +
        JSON.stringify({
          email,
          first_name: clean(rec.first_name),
          last_name: clean(rec.last_name),
          position: mapPosition(rec.position),
          person_number: clean(rec.person_number),
          course_of_study: clean(rec.course_of_study),
          gender: clean(rec.gender),
          role: "user",
          onboarding: "DONE",
        }),
    );
    return result;
  }

  const { data, error } = await createUserWithRetry(admin, {
    email,
    email_confirm: true,
    user_metadata: {
      first_name: rec.first_name ?? "",
      last_name: rec.last_name ?? "",
    },
  });

  if (error) {
    const alreadyExists =
      /already/i.test(error.message || "") ||
      error.code === "email_exists" ||
      error.status === 422;
    result.status = alreadyExists ? "skipped" : "failed";
    result.error = error.message || String(error);
    return result;
  }

  const userId = data?.user?.id ?? null;
  if (!userId) {
    result.status = "failed";
    result.error = "createUser returned no user id";
    return result;
  }

  const profile = {
    id: userId,
    first_name: clean(rec.first_name),
    last_name: clean(rec.last_name),
    email,
    position: mapPosition(rec.position),
    person_number: clean(rec.person_number),
    course_of_study: clean(rec.course_of_study),
    gender: clean(rec.gender),
    role: "user",
    onboarding: "DONE",
  };

  const { error: pErr } = await admin
    .from("profiles")
    .upsert(profile, { onConflict: "id" });

  if (pErr) {
    result.status = "created_no_profile";
    result.user_id = userId;
    result.error = pErr.message;
    return result;
  }

  result.status = "created";
  result.user_id = userId;
  return result;
}

async function runPool(items, worker, concurrency) {
  const results = new Array(items.length);
  let next = 0;
  let done = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const idx = next++;
      if (idx >= items.length) break;
      results[idx] = await worker(items[idx]);
      done++;
      if (done % 100 === 0) console.log(`  ...${done}/${items.length}`);
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  const rows = parseCSV(readFileSync(join(__dirname, "final_slc.csv"), "utf8"));
  const header = rows[0].map((h) => h.trim());
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));

  // Unique emails, first occurrence wins.
  const seen = new Set();
  const records = [];
  for (const r of rows.slice(1)) {
    const email = (r[idx.email] ?? "").trim();
    if (!email) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    records.push({
      first_name: r[idx.first_name],
      last_name: r[idx.last_name],
      email,
      position: r[idx.position],
      person_number: r[idx.person_number],
      course_of_study: r[idx.course_of_study],
      gender: r[idx.gender],
    });
  }

  const queue = records.slice(0, Number.isFinite(LIMIT) ? LIMIT : undefined);
  console.log(
    `Records: ${records.length} unique emails; processing ${queue.length}` +
      (DRY_RUN ? " (DRY RUN — no writes)" : ""),
  );

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const results = await runPool(
    queue,
    (rec) => processRecord(admin, rec),
    CONCURRENCY,
  );

  const counts = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  if (!DRY_RUN) {
    const report = [
      ["email", "status", "user_id", "error"],
      ...results.map((r) => [r.email, r.status, r.user_id, r.error]),
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
    writeFileSync(join(__dirname, "seeding_report.csv"), csv + "\n", "utf8");
  }

  console.log("\n-----------------------------------------");
  console.log(`Processed : ${results.length}`);
  for (const [k, v] of Object.entries(counts).sort()) {
    console.log(`  ${k}: ${v}`);
  }
  if (!DRY_RUN) console.log("Report    : seeding/seeding_report.csv");
  console.log("-----------------------------------------");
}

main().catch((e) => {
  console.error("Failed:", e?.message ?? e);
  process.exit(1);
});
