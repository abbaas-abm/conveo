"use client";

import * as React from "react";
import {
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { cn, formatDate, formatTime, initials } from "@/lib/utils";
import type { QnaQuestionWithRelations } from "@/lib/types";

type Filter = "ALL" | "UNANSWERED" | "ANSWERED";

const QNA_SELECT =
  "*, user:profiles!user_id(first_name,last_name), speaker:speakers!speaker_id(first_name,last_name,title,avatar_url)";

export function EventQuestionsTab({ event }: { event: { id: string } }) {
  const [questions, setQuestions] = React.useState<QnaQuestionWithRelations[]>(
    [],
  );
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<Filter>("ALL");
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("qna")
        .select(QNA_SELECT)
        .eq("event_id", event.id)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      setQuestions((data ?? []) as unknown as QnaQuestionWithRelations[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [event.id]);

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

  async function remove(question: QnaQuestionWithRelations) {
    if (!window.confirm("Delete this question?")) return;
    setDeletingId(question.id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("qna")
        .delete()
        .eq("id", question.id);
      if (error) throw error;
      setQuestions((prev) => prev.filter((item) => item.id !== question.id));
      toast.success("Question deleted.");
    } catch {
      toast.error("Could not delete the question.");
    } finally {
      setDeletingId(null);
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
    <div className="mx-auto max-w-3xl space-y-5">
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
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <MessageSquare className="size-6 text-gray-400" />
          <p className="mt-3 text-sm text-gray-600">
            {questions.length === 0
              ? "No questions for this event yet."
              : "No questions match this filter."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((question) => {
            const name =
              [question.user?.first_name, question.user?.last_name]
                .filter(Boolean)
                .join(" ") || "Attendee";
            const speaker = question.speaker
              ? [
                  question.speaker.title,
                  question.speaker.first_name,
                  question.speaker.last_name,
                ]
                  .filter(Boolean)
                  .join(" ")
              : null;
            return (
              <Card key={question.id} className="border-gray-200 p-5">
                <div className="flex items-start gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {initials(question.user?.first_name, question.user?.last_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium text-gray-900">
                        {name}
                      </p>
                      <Badge
                        variant={question.answered ? "success" : "secondary"}
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
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-700">
                      {question.question}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {speaker ? `To ${speaker} · ` : "General · "}
                      {formatDate(question.created_at)} ·{" "}
                      {formatTime(question.created_at)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant={question.answered ? "outline" : "default"}
                    onClick={() => toggleAnswered(question)}
                  >
                    {question.answered ? "Mark as pending" : "Mark as answered"}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete question"
                    className="text-destructive hover:bg-red-50 hover:text-destructive"
                    onClick={() => remove(question)}
                    disabled={deletingId === question.id}
                  >
                    {deletingId === question.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
