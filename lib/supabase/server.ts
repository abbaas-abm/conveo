import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv, AUTH_COOKIE_MAX_AGE } from "@/lib/supabase/env";

export async function createClient() {
  const { url, key } = getSupabaseEnv();

  if (!url || !key) return null;

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookieOptions: { maxAge: AUTH_COOKIE_MAX_AGE },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component. Safe to ignore when proxy refreshes sessions.
        }
      },
    },
  });
}
