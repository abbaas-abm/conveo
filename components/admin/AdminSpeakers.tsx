"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2, Mic2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { initials, storagePathFromPublicUrl } from "@/lib/utils";
import type { Speaker, EventRecord } from "@/lib/types";
import { SpeakerFormDialog } from "@/components/admin/SpeakerFormDialog";

const BUCKET = "event_images";

export function AdminSpeakers({
  initialSpeakers,
  eventId,
  initialEvents,
}: {
  initialSpeakers?: Speaker[];
  eventId?: string;
  initialEvents?: EventRecord[];
}) {
  const [speakers, setSpeakers] = React.useState<Speaker[]>(
    initialSpeakers ?? [],
  );
  const [loading, setLoading] = React.useState(initialSpeakers === undefined);
  const [events, setEvents] = React.useState<EventRecord[]>(
    initialEvents ?? [],
  );
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Speaker | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (initialSpeakers !== undefined) return;
    let active = true;
    (async () => {
      const supabase = createClient();
      let request = supabase
        .from("speakers")
        .select("*")
        .order("created_at", { ascending: false });
      if (eventId) request = request.eq("event_id", eventId);
      const { data } = await request;
      if (active) {
        setSpeakers((data ?? []) as Speaker[]);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [initialSpeakers, eventId]);

  React.useEffect(() => {
    if (eventId || initialEvents !== undefined) return;
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("events")
        .select("*")
        .order("start_date", { ascending: false });
      if (active) setEvents((data ?? []) as EventRecord[]);
    })();
    return () => {
      active = false;
    };
  }, [eventId, initialEvents]);

  const filtered = speakers.filter((speaker) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      `${speaker.first_name} ${speaker.last_name}`.toLowerCase().includes(q) ||
      (speaker.title ?? "").toLowerCase().includes(q) ||
      (speaker.bio ?? "").toLowerCase().includes(q)
    );
  });

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(speaker: Speaker) {
    setEditing(speaker);
    setOpen(true);
  }

  function handleSaved(saved: Speaker) {
    if (eventId && saved.event_id !== eventId) {
      setSpeakers((prev) => prev.filter((s) => s.id !== saved.id));
      return;
    }
    setSpeakers((prev) => {
      const exists = prev.some((s) => s.id === saved.id);
      return exists
        ? prev.map((s) => (s.id === saved.id ? saved : s))
        : [saved, ...prev];
    });
  }

  async function handleDelete(speaker: Speaker) {
    const name =
      [speaker.first_name, speaker.last_name].filter(Boolean).join(" ") ||
      "this speaker";
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;

    setDeletingId(speaker.id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("speakers")
        .delete()
        .eq("id", speaker.id);
      if (error) throw error;

      const path = storagePathFromPublicUrl(speaker.avatar_url, BUCKET);
      if (path) {
        try {
          await supabase.storage.from(BUCKET).remove([path]);
        } catch {
          // Non-fatal.
        }
      }

      setSpeakers((prev) => prev.filter((s) => s.id !== speaker.id));
      toast.success("Speaker deleted.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete speaker.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mic2 className="size-4" />
          {speakers.length} {speakers.length === 1 ? "speaker" : "speakers"}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search speakers..."
              className="pl-10"
            />
          </div>
          <Button onClick={openNew}>
            <Plus className="size-4" />
            Add speaker
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="divide-y divide-gray-100 border-gray-200 p-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="size-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <Mic2 className="size-6 text-gray-400" />
          <h3 className="mt-3 text-base font-semibold text-gray-900">
            {speakers.length === 0 ? "No speakers yet" : "No speakers found"}
          </h3>
          <p className="mt-1 max-w-md text-sm text-gray-600">
            {speakers.length === 0
              ? "Add your first speaker with a photo and biography."
              : "Try a different search term."}
          </p>
          {speakers.length === 0 && (
            <Button className="mt-5" onClick={openNew}>
              <Plus className="size-4" />
              Add speaker
            </Button>
          )}
        </Card>
      ) : (
        <Card className="divide-y divide-gray-100 border-gray-200 p-0">
          {filtered.map((speaker) => {
            const name =
              [speaker.first_name, speaker.last_name]
                .filter(Boolean)
                .join(" ") || "Unnamed";
            const eventTitle = events.find(
              (event) => event.id === speaker.event_id,
            )?.title;
            return (
              <div
                key={speaker.id}
                className="flex items-center gap-4 px-5 py-4"
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-slate-100">
                  {speaker.avatar_url ? (
                    <Image
                      src={speaker.avatar_url}
                      alt={name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-primary">
                      {initials(speaker.first_name, speaker.last_name)}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-gray-900">
                      {name}
                    </p>
                    {!eventId && eventTitle && (
                      <Badge variant="blue" className="shrink-0">
                        {eventTitle}
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {speaker.title || "No title"}
                  </p>
                  <p className="truncate text-sm text-gray-600">
                    {speaker.bio || "No description"}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Edit speaker"
                    onClick={() => openEdit(speaker)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete speaker"
                    className="text-destructive hover:bg-red-50 hover:text-destructive"
                    onClick={() => handleDelete(speaker)}
                    disabled={deletingId === speaker.id}
                  >
                    {deletingId === speaker.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {open && (
        <SpeakerFormDialog
          key={editing?.id ?? "new"}
          speaker={editing}
          fixedEventId={eventId}
          events={eventId ? undefined : events}
          onOpenChange={setOpen}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
