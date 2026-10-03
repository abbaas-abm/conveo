import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv, AUTH_COOKIE_MAX_AGE } from "@/lib/supabase/env";

export function createClient() {
  const { url, key } = getSupabaseEnv();

  if (!url || !key) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) in .env.local",
    );
  }

  return createBrowserClient(url, key, {
    cookieOptions: { maxAge: AUTH_COOKIE_MAX_AGE },
  });
}
