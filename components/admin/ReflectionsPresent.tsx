"use client";

import * as React from "react";
import Link from "next/link";
import { Maximize, Minimize, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Reflection, ReflectionWithUser } from "@/lib/types";

const NOTE_COLORS = [
  "#FEF3C7",
  "#DBEAFE",
  "#DCFCE7",
  "#FCE7F3",
  "#EDE9FE",
  "#FFEDD5",
  "#CFFAFE",
];

const NOTE_ROTATIONS = ["-1.5deg", "1deg", "-0.5deg", "1.5deg", "-1deg"];

function colorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return NOTE_COLORS[hash % NOTE_COLORS.length];
}

export function ReflectionsPresent({
  eventId,
  eventTitle,
  eventDescription,
  initialReflections,
}: {
  eventId: string;
  eventTitle: string;
  eventDescription: string | null;
  initialReflections: ReflectionWithUser[];
}) {
  const [notes, setNotes] = React.useState(initialReflections);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    onChange();
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Fullscreen may be blocked; ignore.
    }
  }

  // Live wall for the projector — the only realtime connection in the app.
  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`present:${eventId}`);
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "reflections",
        filter: `event_id=eq.${eventId}`,
      },
      async (payload) => {
        const row = payload.new as Reflection;
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name,last_name")
          .eq("id", row.user_id ?? "")
          .maybeSingle();
        setNotes((prev) =>
          prev.some((n) => n.id === row.id)
            ? prev
            : [{ ...row, user: profile ?? null }, ...prev],
        );
      },
    );
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventId]);

  return (
    <div className="min-h-screen bg-primary text-white">
      <header className="border-b border-white/10 px-6 py-8 sm:px-10 sm:py-10">
        <div className="mx-auto max-w-7xl">
          <div className="absolute right-6 top-6 flex items-center gap-2 sm:right-10 sm:top-8">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            >
              {isFullscreen ? (
                <Minimize className="size-3.5" />
              ) : (
                <Maximize className="size-3.5" />
              )}
              {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            </button>
            <Link
              href={`/admin/reflections/${eventId}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            >
              <X className="size-3.5" />
              Exit
            </Link>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#d9b45b]">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-2 animate-ping rounded-full bg-[#d9b45b] opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-[#d9b45b]" />
            </span>
            Live reflections
          </div>

          <h1 className="mt-3 text-3xl font-semibold text-white text-shadow-soft sm:text-5xl">
            {eventTitle}
          </h1>
          {eventDescription && (
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-white/80 sm:text-lg">
              {eventDescription}
            </p>
          )}
        </div>
      </header>

      <main className="px-6 py-8 sm:px-10">
        <div className="mx-auto max-w-7xl">
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-6 py-24 text-center">
              <p className="text-lg font-medium text-white">
                Waiting for reflections…
              </p>
              <p className="mt-1 text-sm text-white/70">
                New notes appear here in real time.
              </p>
            </div>
          ) : (
            <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4">
              {notes.map((note, index) => {
                const name =
                  [note.user?.first_name, note.user?.last_name]
                    .filter(Boolean)
                    .join(" ") || "Anonymous";
                return (
                  <div
                    key={note.id}
                    className="mb-5 break-inside-avoid rounded-xl border-t-4 border-black/10 p-5 shadow-2xl"
                    style={{
                      backgroundColor: colorFor(note.id),
                      transform: `rotate(${
                        NOTE_ROTATIONS[index % NOTE_ROTATIONS.length]
                      })`,
                    }}
                  >
                    <p className="whitespace-pre-line text-lg leading-relaxed text-gray-800">
                      {note.content}
                    </p>
                    <p className="mt-3 text-sm font-semibold text-gray-600">
                      {name}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
