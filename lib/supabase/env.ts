export function getSupabaseEnv() {
  // Treat empty strings as "not set" (Docker/compose can inject blank values).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || undefined;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const publishable =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const key = anon || publishable || undefined;

  return { url, key };
}

// Keep auth cookies in the browser for as long as possible (~13 months). The
// access token is still refreshed automatically; this only controls how long
// the session cookie itself persists between visits.
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

