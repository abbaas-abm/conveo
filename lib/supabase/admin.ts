import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client used by the background worker. Bypasses RLS, so
 * it must only ever be imported by worker/server code — never by client
 * components or route handlers that run in the web process.
 */
export function createAdminClient() {
  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Returns an admin client, or `null` if the service-role key isn't configured.
 * Useful for the inline delivery fallback so badge/pledge/report uploads still
 * work when the Redis worker isn't available.
 */
export function tryCreateAdminClient() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}
