"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { cn, initials } from "@/lib/utils";
import type { QnaQuestion, Speaker } from "@/lib/types";

interface CurrentUser {
  id: string;
  firstName: string;
  lastName: string;
}

function speakerLabel(speaker: Speaker) {
  return (
    [speaker.first_name, speaker.last_name].filter(Boolean).join(" ") ||
    "Speaker"
  );
}

export function EventQna({
  eventId,
  eventTitle,
  speakers,
  currentUser,
}: {
  eventId: string;
  eventTitle: string;
  speakers: Speaker[];
  currentUser: CurrentUser;
}) {
  const [tab, setTab] = React.useState<"ask" | "history">("ask");
  const [speakerId, setSpeakerId] = React.useState<string | null>(null);
  const [question, setQuestion] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [questions, setQuestions] = React.useState<QnaQuestion[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadQuestions = React.useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("qna")
        .select("*")
        .eq("event_id", eventId)
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });
      setQuestions((data ?? []) as QnaQuestion[]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [eventId, currentUser.id]);

  React.useEffect(() => {
    queueMicrotask(() => {
      void loadQuestions();
    });
  }, [loadQuestions]);

  async function submit() {
    const value = question.trim();
    if (!value) {
      toast.error("Please write your question first.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/qna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, speakerId, question: value }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        question?: QnaQuestion;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not submit your question.");
      }
      if (data.question) {
        setQuestions((prev) => [data.question as QnaQuestion, ...prev]);
      } else {
        void loadQuestions();
      }
      setQuestion("");
      setSpeakerId(null);
      toast.success("Question submitted.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not submit your question.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const speakerName = (id: string | null) => {
    if (!id) return null;
    const speaker = speakers.find((item) => item.id === id);
    if (!speaker) return null;
    return [speaker.title, speaker.first_name, speaker.last_name]
      .filter(Boolean)
      .join(" ");
  };

  return (
    <div className="flex min-h-screen flex-col bg-primary text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
          <Link
            href={`/events/${eventId}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Back to event
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-balance text-white sm:text-3xl">
            {eventTitle}
          </h1>
          <p className="mt-1 text-sm text-white/70">
            Ask the speakers a question.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-white/10 p-1">
            <button
              type="button"
              onClick={() => setTab("ask")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                tab === "ask"
                  ? "bg-white text-primary"
                  : "text-white/80 hover:text-white",
              )}
            >
              Ask Question
            </button>
            <button
              type="button"
              onClick={() => setTab("history")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                tab === "history"
                  ? "bg-white text-primary"
                  : "text-white/80 hover:text-white",
              )}
            >
              My Questions
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 pb-32">
        {tab === "ask" ? (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#d9b45b]">
                Ask a specific speaker (optional)
              </p>
              <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                <button
                  type="button"
                  onClick={() => setSpeakerId(null)}
                  className={cn(
                    "flex w-20 shrink-0 flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors",
                    !speakerId
                      ? "border-[#d9b45b] bg-white/10"
                      : "border-white/15 hover:bg-white/5",
                  )}
                >
                  <span className="flex size-12 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-white">
                    All
                  </span>
                  <span className="text-[11px] font-medium leading-tight text-white/80">
                    General
                  </span>
                </button>

                {speakers.map((speaker) => (
                  <button
                    key={speaker.id}
                    type="button"
                    onClick={() => setSpeakerId(speaker.id)}
                    className={cn(
                      "flex w-20 shrink-0 flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors",
                      speakerId === speaker.id
                        ? "border-[#d9b45b] bg-white/10"
                        : "border-white/15 hover:bg-white/5",
                    )}
                  >
                    <span className="relative size-12 overflow-hidden rounded-full bg-white/15">
                      {speaker.avatar_url ? (
                        <Image
                          src={speaker.avatar_url}
                          alt={speakerLabel(speaker)}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
                          {initials(speaker.first_name, speaker.last_name)}
                        </span>
                      )}
                    </span>
                    <span className="line-clamp-2 text-[11px] font-medium leading-tight text-white/80">
                      {speakerLabel(speaker)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#d9b45b]">
                Your question
              </label>
              <Textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Type your question..."
                className="mt-3 min-h-40 border-white/20 bg-white/5 text-white placeholder:text-white/40 focus-visible:border-[#d9b45b] focus-visible:ring-[#d9b45b]/40"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {loading ? (
              <p className="py-12 text-center text-sm text-white/60">
                Loading your questions…
              </p>
            ) : questions.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-6 py-16 text-center">
                <Send className="size-6 text-[#d9b45b]" />
                <p className="mt-3 text-base font-medium text-white">
                  No questions yet
                </p>
                <p className="mt-1 text-sm text-white/70">
                  Ask the speakers something on the Ask Question tab.
                </p>
              </div>
            ) : (
              questions.map((item) => {
                const speaker = speakerName(item.speaker_id);
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-white/15 bg-white/5 p-4"
                  >
                    <p className="whitespace-pre-line text-sm leading-relaxed text-white/90">
                      {item.question}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {item.answered ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                          <CheckCircle2 className="size-3" />
                          Answered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white/60">
                          <Clock className="size-3" />
                          Pending
                        </span>
                      )}
                      {speaker && (
                        <span className="text-xs font-medium text-[#d9b45b]">
                          To {speaker}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {tab === "ask" && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-primary/95 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur">
          <div className="mx-auto max-w-3xl">
            <Button
              onClick={submit}
              disabled={submitting}
              className="h-12 w-full bg-[#d9b45b] text-white hover:bg-[#C59B27]"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {submitting ? "Submitting..." : "Submit Question"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
