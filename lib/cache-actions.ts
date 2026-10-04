"use server";

import { revalidateTag } from "next/cache";

// Invalidate the cached event data immediately: the next request re-fetches
// fresh data instead of being served stale content. This makes admin changes
// (preferences, visibility, status, edits) reflect on the next refresh.
export async function revalidateEvents() {
  revalidateTag("events", { expire: 0 });
}
