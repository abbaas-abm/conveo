"use client";

import * as React from "react";
import Image from "next/image";
import {
  CalendarPlus,
  Clock,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { cn, initials, formatTime } from "@/lib/utils";
import { PROGRAM_BLOCK_LABELS } from "@/lib/program";
import type { EventRecord, Speaker } from "@/lib/types";
import type { ProgramBlockWithSpeakers } from "@/lib/data";
import { ProgramBlockDialog } from "@/components/admin/ProgramBlockDialog";

function toLocalInput(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function EventProgramTab({ event }: { event: EventRecord }) {
  const [blocks, setBlocks] = React.useState<ProgramBlockWithSpeakers[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [days, setDays] = React.useState<number[]>([1]);
  const [activeDay, setActiveDay] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ProgramBlockWithSpeakers | null>(
    null,
  );
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("event_program_blocks")
        .select("*, event_program_block_speakers(speaker:speakers(*))")
        .eq("event_id", event.id)
        .order("day_number", { ascending: true })
        .order("display_order", { ascending: true });
      if (!active) return;
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      const mapped = (
        data as unknown as Array<
          ProgramBlockWithSpeakers & {
            event_program_block_speakers?: Array<{ speaker: Speaker }>;
          }
        >
      ).map(({ event_program_block_speakers, ...block }) => ({
        ...block,
        speakers: (event_program_block_speakers ?? [])
          .map((entry) => entry.speaker)
          .filter(Boolean),
      })) as ProgramBlockWithSpeakers[];

      setBlocks(mapped);
      const nums = Array.from(
        new Set(mapped.map((b) => b.day_number)),
      ).sort((a, b) => a - b);
      setDays(nums.length > 0 ? nums : [1]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [event.id]);

  const dayBlocks = blocks
    .filter((block) => block.day_number === activeDay)
    .sort(
      (a, b) =>
        a.display_order - b.display_order ||
        a.start_time.localeCompare(b.start_time),
    );

  function addDay() {
    const next = Math.max(1, ...days) + 1;
    setDays((prev) => [...prev, next]);
    setActiveDay(next);
  }

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(block: ProgramBlockWithSpeakers) {
    setEditing(block);
    setDialogOpen(true);
  }

  function handleSaved(saved: ProgramBlockWithSpeakers) {
    setBlocks((prev) => {
      const exists = prev.some((b) => b.id === saved.id);
      return exists
        ? prev.map((b) => (b.id === saved.id ? saved : b))
        : [...prev, saved];
    });
    setDays((prev) =>
      prev.includes(saved.day_number)
        ? prev
        : [...prev, saved.day_number].sort((a, b) => a - b),
    );
  }

  async function handleDelete(block: ProgramBlockWithSpeakers) {
    if (!window.confirm(`Delete "${block.title}"?`)) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("event_program_blocks")
        .delete()
        .eq("id", block.id);
      if (error) throw error;
      setBlocks((prev) => prev.filter((b) => b.id !== block.id));
      toast.success("Block deleted.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete block.",
      );
    }
  }

  async function swapBlocks(aId: string, bId: string) {
    if (aId === bId) return;
    const list = dayBlocks;
    const i = list.findIndex((b) => b.id === aId);
    const j = list.findIndex((b) => b.id === bId);
    if (i === -1 || j === -1) return;

    const aTimes = {
      start: list[i].start_time,
      end: list[i].end_time,
    };
    const bTimes = {
      start: list[j].start_time,
      end: list[j].end_time,
    };

    const next = list.map((b) => ({ ...b }));
    [next[i], next[j]] = [next[j], next[i]];
    // content moved, times stay with the position
    next[i] = { ...next[i], start_time: aTimes.start, end_time: aTimes.end };
    next[j] = { ...next[j], start_time: bTimes.start, end_time: bTimes.end };
    next.forEach((b, index) => {
      b.display_order = index;
    });

    const updates = new Map(next.map((b) => [b.id, b]));
    setBlocks((prev) =>
      prev.map((b) => {
        const upd = updates.get(b.id);
        return upd
          ? {
              ...b,
              display_order: upd.display_order,
              start_time: upd.start_time,
              end_time: upd.end_time,
            }
          : b;
      }),
    );

    try {
      const supabase = createClient();
      await Promise.all(
        next.map((b) =>
          supabase
            .from("event_program_blocks")
            .update({
              display_order: b.display_order,
              start_time: b.start_time,
              end_time: b.end_time,
            })
            .eq("id", b.id),
        ),
      );
    } catch (error) {
      toast.error("Could not save the new order.");
      console.error(error);
    }
  }

  const lastBlock = dayBlocks[dayBlocks.length - 1];
  const baseDate = new Date(event.start_date);
  baseDate.setDate(baseDate.getDate() + (activeDay - 1));
  const defaultStart = lastBlock
    ? toLocalInput(new Date(lastBlock.end_time))
    : toLocalInput(baseDate);
  const defaultEnd = lastBlock
    ? toLocalInput(new Date(new Date(lastBlock.end_time).getTime() + 3_600_000))
    : toLocalInput(new Date(baseDate.getTime() + 3_600_000));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-stretch overflow-x-auto">
          {days.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setActiveDay(day)}
              className={cn(
                "relative whitespace-nowrap px-5 py-2 text-sm font-medium transition-colors",
                activeDay === day
                  ? "text-primary"
                  : "text-gray-500 hover:text-gray-900",
              )}
            >
              Day {day}
              {activeDay === day && (
                <span className="absolute inset-x-3 -bottom-3 h-0.5 rounded-full bg-[#d9b45b]" />
              )}
            </button>
          ))}
        </div>
        <Button variant="outline" onClick={addDay}>
          <CalendarPlus className="size-4" />
          Add day
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Day {activeDay} programme
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Drag blocks to reorder. Times swap with the position.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="size-4" />
          Add block
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : dayBlocks.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed border-gray-300 bg-white px-6 py-14 text-center">
          <Clock className="size-6 text-gray-400" />
          <h4 className="mt-3 text-sm font-semibold text-gray-900">
            No blocks for Day {activeDay} yet
          </h4>
          <p className="mt-1 text-sm text-gray-600">
            Add a time slot to start building the schedule.
          </p>
          <Button className="mt-5" onClick={openNew}>
            <Plus className="size-4" />
            Add block
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {dayBlocks.map((block, index) => (
            <div
              key={block.id}
              draggable
              onDragStart={() => setDraggingId(block.id)}
              onDragEnd={() => {
                setDraggingId(null);
                setOverId(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setOverId(block.id);
              }}
              onDragLeave={() => setOverId((prev) => (prev === block.id ? null : prev))}
              onDrop={(e) => {
                e.preventDefault();
                if (draggingId) void swapBlocks(draggingId, block.id);
                setDraggingId(null);
                setOverId(null);
              }}
              className={cn(
                "flex items-center gap-4 rounded-xl border bg-white p-4 transition-colors",
                draggingId === block.id
                  ? "opacity-50"
                  : "border-gray-200 hover:border-gray-300",
                overId === block.id &&
                  draggingId !== block.id &&
                  "border-primary ring-1 ring-primary/30",
              )}
            >
              <span className="flex cursor-grab flex-col items-center text-gray-300 active:cursor-grabbing">
                <GripVertical className="size-5" />
              </span>

              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/5 text-xs font-semibold text-primary">
                {index + 1}
              </span>

              <div className="w-28 shrink-0 text-sm">
                <p className="font-medium text-gray-900">
                  {formatTime(block.start_time)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatTime(block.end_time)}
                </p>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium text-gray-900">
                    {block.title}
                  </p>
                  <Badge variant="secondary">
                    {PROGRAM_BLOCK_LABELS[block.type]}
                  </Badge>
                </div>
                {block.description && (
                  <p className="mt-0.5 truncate text-sm text-gray-600">
                    {block.description}
                  </p>
                )}
              </div>

              {block.speakers.length > 0 && (
                <div className="hidden items-center -space-x-2 sm:flex">
                  {block.speakers.slice(0, 4).map((speaker) => (
                    <span
                      key={speaker.id}
                      className="relative size-8 overflow-hidden rounded-full border-2 border-white bg-slate-100"
                      title={`${speaker.first_name} ${speaker.last_name}`}
                    >
                      {speaker.avatar_url ? (
                        <Image
                          src={speaker.avatar_url}
                          alt={`${speaker.first_name} ${speaker.last_name}`}
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-primary">
                          {initials(speaker.first_name, speaker.last_name)}
                        </span>
                      )}
                    </span>
                  ))}
                  {block.speakers.length > 4 && (
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-semibold text-gray-600">
                      +{block.speakers.length - 4}
                    </span>
                  )}
                </div>
              )}

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Edit block"
                  onClick={() => openEdit(block)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete block"
                  className="text-destructive hover:bg-red-50 hover:text-destructive"
                  onClick={() => handleDelete(block)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {dialogOpen && (
        <ProgramBlockDialog
          key={editing?.id ?? `new-${activeDay}`}
          eventId={event.id}
          dayNumber={activeDay}
          block={editing}
          nextOrder={dayBlocks.length}
          defaultStart={defaultStart}
          defaultEnd={defaultEnd}
          onOpenChange={setDialogOpen}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
