import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getCurrentUser() {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, user: null, profile: null };

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { supabase, user: null, profile: null };

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle<Profile>();

    return { supabase, user, profile: profile ?? null };
  } catch {
    return { supabase, user: null, profile: null };
  }
}
