// Filters seeding/slc-db.csv down to records whose email is NOT already in the
// Supabase `profiles` table, and writes seeding/final_slc.csv.
//
// Run:  node seeding/process-rsvp.mjs
//
// Uses the service-role key from .env (bypasses RLS) so it can read every
// profile email. Email matching is case- and whitespace-insensitive.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ---- Load .env (no dotenv dependency) ------------------------------------
function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(join(ROOT, ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let value = m[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      // Keep the first non-empty definition of a key.
      if (!env[m[1]]) env[m[1]] = value;
    }
  } catch {
    /* .env optional */
  }
  return env;
}

const env = loadEnv();
const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;

// .env can hold a correctly-named key with a truncated value as well as the
// legacy misspelled name. Pick the first value that is a real service_role JWT.
function jwtRole(token) {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString("utf8"),
    );
    return payload?.role ?? null;
  } catch {
    return null;
  }
}

function pickServiceKey() {
  const candidates = [];
  try {
    const raw = readFileSync(join(ROOT, ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
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

const serviceKey = pickServiceKey();

if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL or a valid service-role key in .env");
  process.exit(1);
}

const norm = (value) => (value ?? "").trim().toLowerCase();

// ---- Minimal RFC-4180 CSV parse/serialize --------------------------------
function parseCSV(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
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
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      // ignore
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function toCSV(rows) {
  return (
    rows
      .map((r) =>
        r
          .map((f) => {
            const s = f == null ? "" : String(f);
            return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(","),
      )
      .join("\n") + "\n"
  );
}

async function fetchProfileEmails(supabase) {
  const emails = new Set();
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("profiles")
      .select("email")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    for (const row of data ?? []) {
      const e = norm(row.email);
      if (e) emails.add(e);
    }
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return emails;
}

async function main() {
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("Fetching profile emails from Supabase...");
  const profileEmails = await fetchProfileEmails(supabase);
  console.log(`  profiles with an email: ${profileEmails.size}`);

  const csvPath = join(__dirname, "slc-db.csv");
  const rows = parseCSV(readFileSync(csvPath, "utf8"));
  const header = rows[0];
  const records = rows.slice(1).filter((r) => r.some((f) => f.trim() !== ""));

  const emailIdx = header.findIndex((h) => h.trim().toLowerCase() === "email");
  if (emailIdx === -1) {
    console.error("Could not find an 'email' column in the CSV header.");
    process.exit(1);
  }

  const kept = [];
  let excluded = 0;
  const seenInCsv = new Set();
  let duplicateEmailsInOutput = 0;

  for (const record of records) {
    const email = norm(record[emailIdx]);
    if (email && profileEmails.has(email)) {
      excluded++;
      continue;
    }
    if (email) {
      if (seenInCsv.has(email)) duplicateEmailsInOutput++;
      seenInCsv.add(email);
    }
    kept.push(record);
  }

  const outPath = join(__dirname, "final_slc.csv");
  writeFileSync(outPath, toCSV([header, ...kept]), "utf8");

  console.log("");
  console.log("-----------------------------------------");
  console.log(`CSV records read      : ${records.length}`);
  console.log(`Excluded (in profiles): ${excluded}`);
  console.log(`Written to output     : ${kept.length}`);
  console.log(
    `Duplicate emails in output (same email, >1 row): ${duplicateEmailsInOutput}`,
  );
  console.log(`Output file           : seeding/final_slc.csv`);
  console.log("-----------------------------------------");
}

main().catch((err) => {
  console.error("Failed:", err?.message ?? err);
  process.exit(1);
});
