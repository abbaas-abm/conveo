"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

interface CurrentUser {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
}

export function ReflectionsBoard({
  eventId,
  eventTitle,
  currentUser,
  initialReflections,
}: {
  eventId: string | null;
  eventTitle: string | null;
  currentUser: CurrentUser | null;
  initialReflections: ReflectionWithUser[];
}) {
  const router = useRouter();
  const [notes, setNotes] = React.useState(initialReflections);
  const [text, setText] = React.useState("");
  const [posting, setPosting] = React.useState(false);

  const signInHref = `/login?redirectTo=${encodeURIComponent(
    eventId ? `/reflections?event=${eventId}` : "/reflections",
  )}`;

  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`reflections:${eventId ?? "all"}`);
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "reflections",
        ...(eventId ? { filter: `event_id=eq.${eventId}` } : {}),
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

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) {
      router.push(signInHref);
      return;
    }
    const value = text.trim();
    if (!value) return;
    setPosting(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("reflections")
        .insert({
          event_id: eventId,
          user_id: currentUser.id,
          content: value,
        })
        .select("*")
        .single();
      if (error) throw error;
      const row = data as Reflection;
      setNotes((prev) =>
        prev.some((n) => n.id === row.id)
          ? prev
          : [
              {
                ...row,
                user: {
                  first_name: currentUser.firstName,
                  last_name: currentUser.lastName,
                },
              },
              ...prev,
            ],
      );
      setText("");
      toast.success("Reflection added.");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not add your reflection.",
      );
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="min-h-screen bg-primary pb-40 sm:pb-16">
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
          <h1 className="mt-3 text-3xl font-semibold text-balance text-white sm:text-4xl">
            {eventTitle ?? "Reflections Wall"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">
            Share a thought, a takeaway or a moment from the event. Your note
            appears on the wall instantly for everyone.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <form
          onSubmit={post}
          className="fixed inset-x-0 bottom-0 z-40 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:static sm:mb-8 sm:p-0 sm:pb-0"
        >
          <div
            className="relative rounded-xl border-t-4 border-amber-300 bg-[#FEF3C7] p-4 shadow-xl"
            style={{ transform: "rotate(-0.6deg)" }}
          >
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                currentUser
                  ? "Write your reflection..."
                  : "Sign in to add your reflection..."
              }
              disabled={!currentUser}
              className="min-h-[52px] resize-none border-0 bg-transparent px-1 text-base text-amber-950 shadow-none placeholder:text-amber-900/40 focus-visible:ring-0 sm:min-h-24"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="truncate text-xs text-amber-900/70">
                {currentUser ? `Posting as ${currentUser.name}` : "Not signed in"}
              </span>
              {currentUser ? (
                <Button type="submit" disabled={posting || !text.trim()}>
                  {posting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Post
                </Button>
              ) : (
                <Button asChild>
                  <Link href={signInHref}>Sign in to post</Link>
                </Button>
              )}
            </div>
          </div>
        </form>

        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-6 py-16 text-center backdrop-blur">
            <Sparkles className="size-6 text-[#d9b45b]" />
            <p className="mt-3 text-base font-medium text-white">
              No reflections yet
            </p>
            <p className="mt-1 text-sm text-white/70">
              Be the first to share one.
            </p>
          </div>
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
            {notes.map((note, index) => {
              const name =
                [note.user?.first_name, note.user?.last_name]
                  .filter(Boolean)
                  .join(" ") || "Anonymous";
              return (
                <div
                  key={note.id}
                  className="mb-4 break-inside-avoid rounded-lg border-t-4 border-black/10 p-4 shadow-lg"
                  style={{
                    backgroundColor: colorFor(note.id),
                    transform: `rotate(${
                      NOTE_ROTATIONS[index % NOTE_ROTATIONS.length]
                    })`,
                  }}
                >
                  <p className="whitespace-pre-line text-sm leading-relaxed text-gray-800">
                    {note.content}
                  </p>
                  <p className="mt-3 text-xs font-semibold text-gray-600">
                    {name}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
