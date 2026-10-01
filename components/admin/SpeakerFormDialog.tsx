"use client";

import * as React from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AvatarUploader } from "@/components/admin/AvatarUploader";
import { createClient } from "@/lib/supabase/client";
import { storagePathFromPublicUrl } from "@/lib/utils";
import type { Speaker, EventRecord } from "@/lib/types";

const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"];
const BUCKET = "event_images";

export function SpeakerFormDialog({
  speaker,
  fixedEventId,
  events,
  onOpenChange,
  onSaved,
}: {
  speaker: Speaker | null;
  fixedEventId?: string;
  events?: EventRecord[];
  onOpenChange: (open: boolean) => void;
  onSaved: (speaker: Speaker) => void;
}) {
  const [firstName, setFirstName] = React.useState(speaker?.first_name ?? "");
  const [lastName, setLastName] = React.useState(speaker?.last_name ?? "");
  const [title, setTitle] = React.useState(speaker?.title ?? "");
  const [gender, setGender] = React.useState(speaker?.gender ?? "");
  const [bio, setBio] = React.useState(speaker?.bio ?? "");
  const [eventId, setEventId] = React.useState(
    speaker?.event_id ?? fixedEventId ?? "",
  );
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [saving, setSaving] = React.useState(false);

  const needsEventPicker = !fixedEventId && Boolean(events);

  async function uploadAvatar(file: File): Promise<string> {
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `speakers/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async function removeStoredImage(url: string | null | undefined) {
    const path = storagePathFromPublicUrl(url, BUCKET);
    if (!path) return;
    try {
      const supabase = createClient();
      await supabase.storage.from(BUCKET).remove([path]);
    } catch {
      // Non-fatal: orphaned file is acceptable.
    }
  }

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First name and surname are required.");
      return;
    }
    const resolvedEventId = fixedEventId ?? eventId;
    if (needsEventPicker && !resolvedEventId) {
      toast.error("Please select the event this speaker belongs to.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      let avatarUrl = speaker?.avatar_url ?? null;

      if (avatarFile) {
        const previous = speaker?.avatar_url ?? null;
        avatarUrl = await uploadAvatar(avatarFile);
        if (previous) await removeStoredImage(previous);
      }

      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        title: title.trim() || null,
        gender: gender || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
        event_id: resolvedEventId || null,
      };

      if (speaker) {
        const { data, error } = await supabase
          .from("speakers")
          .update(payload)
          .eq("id", speaker.id)
          .select("*")
          .single();
        if (error) throw error;
        onSaved(data as Speaker);
        toast.success("Speaker updated.");
      } else {
        const { data, error } = await supabase
          .from("speakers")
          .insert(payload)
          .select("*")
          .single();
        if (error) throw error;
        onSaved(data as Speaker);
        toast.success("Speaker added.");
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Speaker save failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Could not save the speaker.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="gap-8 p-8 sm:max-w-3xl sm:p-10">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-2xl">
            {speaker ? "Edit speaker" : "Add speaker"}
          </DialogTitle>
          <DialogDescription className="text-base">
            Upload a photo, crop it, and capture the speaker&apos;s details.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-10 sm:grid-cols-[260px_1fr]">
          <div className="space-y-3">
            <Label className="block">Profile photo</Label>
            <AvatarUploader
              initialUrl={speaker?.avatar_url ?? null}
              onFileChange={setAvatarFile}
            />
          </div>

          <div className="space-y-6">
            {needsEventPicker && (
              <div className="space-y-2.5">
                <Label>Event</Label>
                <Select
                  value={eventId || undefined}
                  onValueChange={setEventId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(events ?? []).map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.title || "Untitled event"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2.5">
                <Label>First name</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2.5">
                <Label>Surname</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2.5">
                <Label>Title / role</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2.5">
                <Label>Gender</Label>
                <Select value={gender || undefined} onValueChange={setGender}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2.5">
              <Label>Bio</Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="min-h-64"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {saving ? "Saving..." : speaker ? "Save changes" : "Save speaker"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
