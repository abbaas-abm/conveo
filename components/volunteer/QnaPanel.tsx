"use client";

import * as React from "react";
import Image from "next/image";
import { CheckCircle2, ChevronDown, Clock, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { cn, formatDate, formatTime, initials } from "@/lib/utils";
import type {
  EventRecord,
  QnaQuestion,
  QnaQuestionWithRelations,
} from "@/lib/types";

type Filter = "ALL" | "UNANSWERED" | "ANSWERED";

const QNA_SELECT =
  "*, user:profiles!user_id(first_name,last_name), speaker:speakers!speaker_id(first_name,last_name,title,avatar_url)";

export function QnaPanel() {
  const [events, setEvents] = React.useState<EventRecord[]>([]);
  const [eventId, setEventId] = React.useState("");
  const [questions, setQuestions] = React.useState<QnaQuestionWithRelations[]>(
    [],
  );
  const [filter, setFilter] = React.useState<Filter>("ALL");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("events")
        .select("*")
        .order("start_date", { ascending: false });
      if (!active) return;
      const list = (data ?? []) as EventRecord[];
      setEvents(list);
      setEventId((prev) => prev || list[0]?.id || "");
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!eventId) return;
    const supabase = createClient();
    let active = true;

    (async () => {
      const { data } = await supabase
        .from("qna")
        .select(QNA_SELECT)
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });
      if (active) {
        setQuestions((data ?? []) as unknown as QnaQuestionWithRelations[]);
      }
    })();

    const channel = supabase.channel(`qna:${eventId}`);

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "qna",
        filter: `event_id=eq.${eventId}`,
      },
      async (payload) => {
        const row = payload.new as QnaQuestion;
        const [{ data: user }, speakerRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("first_name,last_name")
            .eq("id", row.user_id)
            .maybeSingle(),
          row.speaker_id
            ? supabase
                .from("speakers")
                .select("first_name,last_name,title,avatar_url")
                .eq("id", row.speaker_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        setQuestions((prev) =>
          prev.some((item) => item.id === row.id)
            ? prev
            : [
                ...prev,
                {
                  ...row,
                  user: user ?? null,
                  speaker: speakerRes.data ?? null,
                } as QnaQuestionWithRelations,
              ],
        );
      },
    );

    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "qna",
        filter: `event_id=eq.${eventId}`,
      },
      (payload) => {
        const row = payload.new as QnaQuestion;
        setQuestions((prev) =>
          prev.map((item) =>
            item.id === row.id
              ? { ...item, answered: row.answered, updated_at: row.updated_at }
              : item,
          ),
        );
      },
    );

    channel.subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [eventId]);

  async function toggleAnswered(question: QnaQuestionWithRelations) {
    const next = !question.answered;
    const previous = questions;
    setQuestions((prev) =>
      prev.map((item) =>
        item.id === question.id ? { ...item, answered: next } : item,
      ),
    );
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("qna")
        .update({ answered: next })
        .eq("id", question.id);
      if (error) throw error;
    } catch {
      setQuestions(previous);
      toast.error("Could not update the question.");
    }
  }

  const filtered = questions.filter((question) =>
    filter === "ALL"
      ? true
      : filter === "ANSWERED"
        ? question.answered
        : !question.answered,
  );

  const counts = {
    all: questions.length,
    unanswered: questions.filter((q) => !q.answered).length,
    answered: questions.filter((q) => q.answered).length,
  };

  return (
    <div className="space-y-5">
      <Select value={eventId} onValueChange={setEventId}>
        <SelectTrigger className="h-11 w-full bg-white">
          <SelectValue placeholder="Select an event" />
        </SelectTrigger>
        <SelectContent>
          {events.map((event) => (
            <SelectItem key={event.id} value={event.id}>
              {event.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: "ALL", label: `All (${counts.all})` },
            { key: "UNANSWERED", label: `Unanswered (${counts.unanswered})` },
            { key: "ANSWERED", label: `Answered (${counts.answered})` },
          ] as { key: Filter; label: string }[]
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              filter === tab.key
                ? "border-primary bg-primary text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-primary/40",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : !eventId ? (
        <Card className="flex flex-col items-center justify-center border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <MessageSquare className="size-6 text-gray-400" />
          <p className="mt-3 text-sm text-gray-600">
            No events to show questions for yet.
          </p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <MessageSquare className="size-6 text-gray-400" />
          <p className="mt-3 text-sm text-gray-600">
            {questions.length === 0
              ? "No questions yet for this event."
              : "No questions match this filter."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((question) => {
            const expanded = expandedId === question.id;
            const name =
              [question.user?.first_name, question.user?.last_name]
                .filter(Boolean)
                .join(" ") || "Attendee";
            const speakerName = question.speaker
              ? [question.speaker.first_name, question.speaker.last_name]
                  .filter(Boolean)
                  .join(" ")
              : null;
            const speakerTitle = question.speaker?.title ?? null;
            return (
              <Card key={question.id} className="border-gray-200 p-3.5">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : question.id)}
                  className="flex w-full items-start gap-3 text-left"
                >
                  <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    {question.speaker?.avatar_url ? (
                      <Image
                        src={question.speaker.avatar_url}
                        alt={speakerName ?? ""}
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    ) : question.speaker ? (
                      initials(
                        question.speaker.first_name,
                        question.speaker.last_name,
                      )
                    ) : (
                      <MessageSquare className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {speakerName ?? "General question"}
                      </p>
                      <Badge
                        variant={question.answered ? "success" : "secondary"}
                        className="shrink-0"
                      >
                        {question.answered ? (
                          <>
                            <CheckCircle2 className="size-3" /> Answered
                          </>
                        ) : (
                          <>
                            <Clock className="size-3" /> Pending
                          </>
                        )}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      From {name}
                    </p>
                    <p
                      className={cn(
                        "mt-1.5 text-sm leading-relaxed text-gray-700",
                        !expanded && "line-clamp-2",
                      )}
                    >
                      {question.question}
                    </p>
                    {expanded ? (
                      <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                        {speakerTitle ? <p>{speakerTitle}</p> : null}
                        <p>
                          {formatDate(question.created_at)} ·{" "}
                          {formatTime(question.created_at)}
                        </p>
                      </div>
                    ) : null}
                  </div>
                  <ChevronDown
                    className={cn(
                      "mt-1 size-4 shrink-0 text-gray-400 transition-transform",
                      expanded && "rotate-180",
                    )}
                  />
                </button>

                {expanded ? (
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      variant={question.answered ? "outline" : "default"}
                      onClick={() => toggleAnswered(question)}
                    >
                      {question.answered
                        ? "Mark as pending"
                        : "Mark as answered"}
                    </Button>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
