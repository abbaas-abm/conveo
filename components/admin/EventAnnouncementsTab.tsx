"use client";

import * as React from "react";
import { Loader2, Megaphone, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatTime } from "@/lib/utils";
import type { Announcement } from "@/lib/types";

export function EventAnnouncementsTab({ event }: { event: { id: string } }) {
  const [items, setItems] = React.useState<Announcement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [text, setText] = React.useState("");
  const [posting, setPosting] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("event_id", event.id)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }
      setItems((data ?? []) as Announcement[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [event.id]);

  async function post() {
    const value = text.trim();
    if (!value) {
      toast.error("Please write an announcement first.");
      return;
    }
    setPosting(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("announcements")
        .insert({ event_id: event.id, text: value })
        .select("*")
        .single();
      if (error) throw error;
      setItems((prev) => [data as Announcement, ...prev]);
      setText("");
      toast.success("Announcement posted.");
      void sendPush(value);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not post the announcement.",
      );
    } finally {
      setPosting(false);
    }
  }

  async function sendPush(message: string) {
    try {
      const response = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message, eventId: event.id }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        toast.error(data.error ?? "Push notification failed to send.");
        return;
      }
      toast.success("Notification sent successfully.");
    } catch {
      toast.error("Push notification failed to send.");
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this announcement?")) return;
    setDeletingId(id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success("Announcement deleted.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not delete the announcement.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="border-gray-200 p-6">
        <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <Megaphone className="size-4 text-primary" />
          New announcement
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Posted announcements appear on the events page and on this event&apos;s
          page, signed “From the CSD Team”.
        </p>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write an announcement for attendees..."
          className="mt-4 min-h-28"
        />
        <div className="mt-4 flex justify-end">
          <Button onClick={post} disabled={posting}>
            {posting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {posting ? "Posting..." : "Post announcement"}
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Posted announcements
        </h3>
        {loading ? (
          <>
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </>
        ) : items.length === 0 ? (
          <Card className="flex flex-col items-center justify-center border-dashed border-gray-300 bg-white px-6 py-12 text-center">
            <Megaphone className="size-6 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              No announcements posted yet.
            </p>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id} className="border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    From the CSD Team
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-700">
                    {item.text}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {formatDate(item.created_at)} · {formatTime(item.created_at)}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete announcement"
                  className="shrink-0 text-destructive hover:bg-red-50 hover:text-destructive"
                  onClick={() => remove(item.id)}
                  disabled={deletingId === item.id}
                >
                  {deletingId === item.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
