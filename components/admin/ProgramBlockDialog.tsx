"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2, Plus, Search, X } from "lucide-react";
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
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/utils";
import {
  PROGRAM_BLOCK_LABELS,
  PROGRAM_BLOCK_TYPES,
} from "@/lib/program";
import type {
  ProgramBlockType,
  Speaker,
} from "@/lib/types";
import type { ProgramBlockWithSpeakers } from "@/lib/data";

interface ProgramBlockDialogProps {
  eventId: string;
  dayNumber: number;
  block: ProgramBlockWithSpeakers | null;
  nextOrder: number;
  defaultStart: string;
  defaultEnd: string;
  onOpenChange: (open: boolean) => void;
  onSaved: (block: ProgramBlockWithSpeakers) => void;
}

export function ProgramBlockDialog({
  eventId,
  dayNumber,
  block,
  nextOrder,
  defaultStart,
  defaultEnd,
  onOpenChange,
  onSaved,
}: ProgramBlockDialogProps) {
  const [title, setTitle] = React.useState(block?.title ?? "");
  const [description, setDescription] = React.useState(block?.description ?? "");
  const [type, setType] = React.useState<ProgramBlockType>(
    block?.type ?? "OTHER",
  );
  const [startTime, setStartTime] = React.useState(
    block ? toDatetimeLocal(block.start_time) : defaultStart,
  );
  const [endTime, setEndTime] = React.useState(
    block ? toDatetimeLocal(block.end_time) : defaultEnd,
  );
  const [speakers, setSpeakers] = React.useState<Speaker[]>(
    block?.speakers ?? [],
  );
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<Speaker[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    const term = query.trim().replace(/[,%]/g, " ");
    if (!term) return;
    let active = true;
    const handle = setTimeout(async () => {
      setSearching(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("speakers")
        .select("*")
        .eq("event_id", eventId)
        .or(
          `first_name.ilike.%${term}%,last_name.ilike.%${term}%,title.ilike.%${term}%`,
        )
        .order("first_name", { ascending: true })
        .limit(8);
      if (active) {
        const list = (data ?? []) as Speaker[];
        setResults(list.filter((s) => !speakers.some((sel) => sel.id === s.id)));
        setSearching(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [query, eventId, speakers]);

  function addSpeaker(speaker: Speaker) {
    setSpeakers((prev) =>
      prev.some((s) => s.id === speaker.id) ? prev : [...prev, speaker],
    );
    setQuery("");
    setResults([]);
    setSearching(false);
  }

  function removeSpeaker(id: string) {
    setSpeakers((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Please enter a title for this block.");
      return;
    }
    if (!startTime || !endTime) {
      toast.error("Please set the start and end time.");
      return;
    }
    if (new Date(endTime) <= new Date(startTime)) {
      toast.error("End time must be after the start time.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        event_id: eventId,
        day_number: dayNumber,
        title: title.trim(),
        description: description.trim() || null,
        type,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
      };

      let savedId = block?.id;
      let savedOrder = block?.display_order ?? nextOrder;

      if (block) {
        const { data, error } = await supabase
          .from("event_program_blocks")
          .update(payload)
          .eq("id", block.id)
          .select("*")
          .single();
        if (error) throw error;
        savedId = data.id;
        savedOrder = data.display_order;
      } else {
        const { data, error } = await supabase
          .from("event_program_blocks")
          .insert({ ...payload, display_order: nextOrder })
          .select("*")
          .single();
        if (error) throw error;
        savedId = data.id;
        savedOrder = data.display_order;
      }

      const blockId = savedId as string;
      await supabase
        .from("event_program_block_speakers")
        .delete()
        .eq("program_block_id", blockId);
      if (speakers.length > 0) {
        const { error: linkError } = await supabase
          .from("event_program_block_speakers")
          .insert(
            speakers.map((speaker) => ({
              program_block_id: blockId,
              speaker_id: speaker.id,
            })),
          );
        if (linkError) throw linkError;
      }

      onSaved({
        id: blockId,
        event_id: eventId,
        title: title.trim(),
        description: description.trim() || null,
        type,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        display_order: savedOrder,
        day_number: dayNumber,
        created_at: block?.created_at ?? new Date().toISOString(),
        speakers,
      });
      toast.success(block ? "Block updated." : "Block added.");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Could not save the block.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-6 overflow-y-auto p-7 sm:max-w-2xl sm:p-8">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-xl">
            {block ? "Edit programme block" : "Add programme block"}
          </DialogTitle>
          <DialogDescription>
            Day {dayNumber} · Schedule a session and assign speakers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Opening keynote"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(value) => setType(value as ProgramBlockType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROGRAM_BLOCK_TYPES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {PROGRAM_BLOCK_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start</Label>
              <Input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End</Label>
              <Input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details about this session."
              className="min-h-28"
            />
          </div>

          <div className="space-y-3">
            <Label>Speakers</Label>

            {speakers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {speakers.map((speaker) => (
                  <span
                    key={speaker.id}
                    className="flex items-center gap-2 rounded-full border border-gray-200 bg-slate-50 py-1 pl-1 pr-2"
                  >
                    <span className="relative size-7 overflow-hidden rounded-full bg-slate-200">
                      {speaker.avatar_url ? (
                        <Image
                          src={speaker.avatar_url}
                          alt={`${speaker.first_name} ${speaker.last_name}`}
                          fill
                          sizes="28px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-primary">
                          {initials(speaker.first_name, speaker.last_name)}
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-medium text-gray-700">
                      {[speaker.title, speaker.first_name, speaker.last_name]
                        .filter(Boolean)
                        .join(" ")}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSpeaker(speaker.id)}
                      className="rounded-full p-0.5 text-gray-400 hover:bg-slate-200 hover:text-gray-700"
                      aria-label="Remove speaker"
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search speakers for this event..."
                className="pl-10"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-gray-400" />
              )}

              {query.trim() !== "" && (
                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                  {searching ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">
                      Searching...
                    </p>
                  ) : results.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">
                      No speakers found for this event.
                    </p>
                  ) : (
                    results.map((speaker) => (
                      <button
                        key={speaker.id}
                        type="button"
                        onClick={() => addSpeaker(speaker)}
                        className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-slate-50"
                      >
                        <span className="relative size-9 shrink-0 overflow-hidden rounded-full bg-slate-100">
                          {speaker.avatar_url ? (
                            <Image
                              src={speaker.avatar_url}
                              alt={`${speaker.first_name} ${speaker.last_name}`}
                              fill
                              sizes="36px"
                              className="object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-primary">
                              {initials(speaker.first_name, speaker.last_name)}
                            </span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-gray-900">
                            {speaker.first_name} {speaker.last_name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {speaker.title || "Speaker"}
                          </span>
                        </span>
                        <Plus className="size-4 shrink-0 text-gray-400" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Search draws from the speakers you have added to this event.
            </p>
          </div>
        </div>

        <DialogFooter>
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
              <Plus className="size-4" />
            )}
            {saving ? "Saving..." : block ? "Save block" : "Add block"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function toDatetimeLocal(iso: string) {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}
