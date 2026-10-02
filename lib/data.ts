import { createClient } from "@/lib/supabase/server";
import type {
  EventRecord,
  EventGalleryImage,
  Announcement,
  AnnouncementWithEvent,
  ReflectionWithUser,
  PledgeWithUser,
  ProgramBlock,
  Speaker,
  Profile,
  Registration,
  Feedback,
} from "@/lib/types";

export async function getEvents(): Promise<EventRecord[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("start_date", { ascending: true });
    if (error) throw error;
    return (data ?? []) as EventRecord[];
  } catch {
    return [];
  }
}

export async function getFeaturedEvent(): Promise<EventRecord | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as EventRecord) ?? null;
  } catch {
    return null;
  }
}

export async function getEventById(id: string): Promise<EventRecord | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as EventRecord) ?? null;
  } catch {
    return null;
  }
}

export interface ProgramBlockWithSpeakers extends ProgramBlock {
  speakers: Speaker[];
}

export async function getEventProgram(
  eventId: string,
): Promise<ProgramBlockWithSpeakers[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("event_program_blocks")
      .select(
        "*, event_program_block_speakers(speaker:speakers(*))",
      )
      .eq("event_id", eventId)
      .order("day_number", { ascending: true })
      .order("display_order", { ascending: true });
    if (error) throw error;

    const blocks = (data ?? []) as unknown as Array<
      ProgramBlock & {
        event_program_block_speakers?: Array<{ speaker: Speaker }>;
      }
    >;

    return blocks.map(({ event_program_block_speakers, ...block }) => ({
      ...block,
      speakers: (event_program_block_speakers ?? [])
        .map((entry) => entry.speaker)
        .filter(Boolean),
    })) as ProgramBlockWithSpeakers[];
  } catch {
    return [];
  }
}

export interface RegistrationWithEvent extends Registration {
  event: EventRecord;
}

export async function getUserRegistrations(userId: string): Promise<RegistrationWithEvent[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("registrations")
      .select("*, event:events(*)")
      .eq("attendee_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as RegistrationWithEvent[];
  } catch {
    return [];
  }
}

export async function getUserFeedback(
  userId: string,
): Promise<Feedback[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .eq("attendee_id", userId);
    if (error) throw error;
    return (data ?? []) as Feedback[];
  } catch {
    return [];
  }
}

export async function getProfileById(
  userId: string,
): Promise<Profile | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    return (data as Profile) ?? null;
  } catch {
    return null;
  }
}

export async function getAllProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Profile[];
  } catch {
    return [];
  }
}

export async function getSpeakers(): Promise<Speaker[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("speakers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Speaker[];
  } catch {
    return [];
  }
}

export async function getSpeakersByEvent(
  eventId: string,
): Promise<Speaker[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("speakers")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Speaker[];
  } catch {
    return [];
  }
}

export async function getEventGallery(
  eventId: string,
): Promise<EventGalleryImage[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("event_gallery_images")
      .select("*")
      .eq("event_id", eventId)
      .order("display_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as EventGalleryImage[];
  } catch {
    return [];
  }
}

export async function getEventAnnouncements(
  eventId: string,
): Promise<Announcement[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Announcement[];
  } catch {
    return [];
  }
}

export async function getRecentAnnouncements(
  limit = 5,
): Promise<AnnouncementWithEvent[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("announcements")
      .select("id, event_id, text, created_at, event:events(id, title)")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as unknown as AnnouncementWithEvent[];
  } catch {
    return [];
  }
}

export async function getReflections(
  eventId?: string,
): Promise<ReflectionWithUser[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  try {
    let query = supabase
      .from("reflections")
      .select("*, user:profiles!user_id(first_name,last_name)")
      .order("created_at", { ascending: false });
    if (eventId) query = query.eq("event_id", eventId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as unknown as ReflectionWithUser[];
  } catch {
    return [];
  }
}

export async function getPledgesForEvent(
  eventId: string,
): Promise<PledgeWithUser[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("pledges")
      .select("*, user:profiles!user_id(first_name,last_name,email)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as PledgeWithUser[];
  } catch {
    return [];
  }
}
