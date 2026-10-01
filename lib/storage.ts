import { createClient } from "@/lib/supabase/client";

export const EVENT_IMAGE_BUCKET = "event_images";

function extensionFor(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "png";
}

export async function uploadEventImage(
  file: File,
  folder: string,
): Promise<{ url: string; path: string }> {
  const supabase = createClient();
  const path = `${folder}/${crypto.randomUUID()}.${extensionFor(file)}`;
  const { error } = await supabase.storage
    .from(EVENT_IMAGE_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage
    .from(EVENT_IMAGE_BUCKET)
    .getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function removeEventImage(path: string | null | undefined) {
  if (!path) return;
  try {
    const supabase = createClient();
    await supabase.storage.from(EVENT_IMAGE_BUCKET).remove([path]);
  } catch {
    // Non-fatal: orphaned file is acceptable.
  }
}
