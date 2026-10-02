import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";

let cached: ReturnType<typeof createSupabaseClient> | null = null;

/**
 * Cookie-less Supabase client for public, cacheable data reads. Safe to use
 * inside `unstable_cache` because it never touches `cookies()`.
 */
export function createAnonClient() {
  const { url, key } = getSupabaseEnv();
  if (!url || !key) return null;
  if (!cached) {
    cached = createSupabaseClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
