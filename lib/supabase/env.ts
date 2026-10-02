export function getSupabaseEnv() {
  // Treat empty strings as "not set" (Docker/compose can inject blank values).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || undefined;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const publishable =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const key = anon || publishable || undefined;

  return { url, key };
}
