"use client";

import * as React from "react";
import {
  Bell,
  CheckCircle2,
  Loader2,
  Mail,
  Search,
  Send,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { cn, initials } from "@/lib/utils";
import type { UserPosition } from "@/lib/types";

const PAGE_SIZE = 25;
const BATCH_SIZE = 25;

const POSITION_LABELS: Record<UserPosition, string> = {
  STUDENT: "Student",
  STAFF: "Staff",
  GUEST: "Guest",
  GUEST_SPEAKER: "Guest Speaker",
};

interface ReminderRow {
  id: string;
  status: "CONFIRMED" | "CANCELLED";
  position: UserPosition | null;
  attendee_tag_url: string | null;
  attendee: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

interface QueueCounts {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function EventRemindersTab({
  event,
}: {
  event: { id: string; title: string };
}) {
  const [rows, setRows] = React.useState<ReminderRow[]>([]);
  const [listTotal, setListTotal] = React.useState(0);
  const [listLoading, setListLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [term, setTerm] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [sendingId, setSendingId] = React.useState<string | null>(null);

  // "Send to all" progress state.
  const [running, setRunning] = React.useState(false);
  const [mode, setMode] = React.useState<"inline" | "queued" | null>(null);
  const [total, setTotal] = React.useState(0);
  const [sent, setSent] = React.useState(0);
  const [failed, setFailed] = React.useState(0);
  const [queued, setQueued] = React.useState(0);
  const [log, setLog] = React.useState<{ label: string; status: string }[]>([]);

  // Debounce search; reset to first page.
  React.useEffect(() => {
    const id = setTimeout(() => {
      setTerm(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  // Server-side paginated list.
  React.useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let request = supabase
        .from("registrations")
        .select(
          "id, status, position, attendee_tag_url, attendee:profiles!attendee_id!inner(first_name, last_name, email)",
          { count: "exact" },
        )
        .eq("event_id", event.id)
        .order("created_at", { ascending: false })
        .range(from, to);

      const safe = term.replace(/[,()%\\*]/g, " ").trim();
      if (safe) {
        request = request.or(
          `first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,email.ilike.%${safe}%`,
          { referencedTable: "profiles" },
        );
      }

      const { data, count, error } = await request;
      if (!active) return;
      if (error) {
        console.error(error);
        setRows([]);
        setListTotal(0);
        setListLoading(false);
        return;
      }
      setRows((data ?? []) as unknown as ReminderRow[]);
      setListTotal(count ?? 0);
      setListLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [event.id, term, page]);

  const totalPages = Math.max(1, Math.ceil(listTotal / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  async function sendOne(registrationId: string, email: string) {
    setSendingId(registrationId);
    try {
      const response = await fetch("/api/admin/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationIds: [registrationId] }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        mode?: string;
        results?: { status: string; error?: string }[];
      };
      if (!response.ok) throw new Error(data.error ?? "Could not send reminder.");
      if (data.mode === "queued") {
        toast.success(`Reminder queued for ${email}.`);
      } else if (data.results?.[0]?.status === "sent") {
        toast.success(`Reminder sent to ${email}.`);
      } else {
        throw new Error(data.results?.[0]?.error ?? "Could not send reminder.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not send reminder.",
      );
    } finally {
      setSendingId(null);
    }
  }

  async function sendToAll() {
    if (running) return;
    setRunning(true);
    setMode(null);
    setTotal(0);
    setSent(0);
    setFailed(0);
    setQueued(0);
    setLog([]);

    try {
      // 1. All registration ids for this event.
      const supabase = createClient();
      const ids: string[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from("registrations")
          .select("id")
          .eq("event_id", event.id)
          .range(from, from + 999);
        if (error) throw error;
        for (const r of data ?? []) ids.push(r.id as string);
        if (!data || data.length < 1000) break;
      }
      setTotal(ids.length);

      // 2. Send in batches. Queued on the VPS (worker drains); inline locally.
      let queuedMode = false;
      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);
        const response = await fetch("/api/admin/send-reminder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registrationIds: batch }),
        });
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          mode?: string;
          results?: { status: string; email?: string; error?: string }[];
        };
        if (!response.ok) {
          throw new Error(data.error ?? "Could not send reminders.");
        }
        if (data.mode === "queued") {
          queuedMode = true;
          setMode("queued");
          setQueued((q) => q + batch.length);
        } else {
          setMode("inline");
          for (const r of data.results ?? []) {
            if (r.status === "sent") setSent((s) => s + 1);
            else setFailed((f) => f + 1);
            setLog((l) =>
              [
                { label: r.email ?? "attendee", status: r.status },
                ...l,
              ].slice(0, 60),
            );
          }
          // Pace inline sending so we never hammer Plunk.
          await sleep(250);
        }
      }

      // 3. For the queued path, poll the worker's progress until it drains.
      if (queuedMode) {
        for (;;) {
          const response = await fetch("/api/admin/reminders/status");
          const data = (await response.json().catch(() => ({}))) as {
            counts?: QueueCounts | null;
          };
          const c = data.counts;
          if (!c) break;
          setSent(c.completed);
          setFailed(c.failed);
          setQueued(c.waiting + c.active + c.delayed);
          if (c.waiting + c.active + c.delayed === 0) break;
          await sleep(2000);
        }
      }

      toast.success("Reminders finished sending.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not send reminders.",
      );
    } finally {
      setRunning(false);
    }
  }

  const done = sent + failed;
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Send to all */}
      <Card className="border-gray-200 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Reminders</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Send a branded reminder email (with the attendee tag attached) to
              everyone registered for{" "}
              <span className="font-medium text-gray-700">{event.title}</span>.
            </p>
          </div>
          <Button
            size="lg"
            onClick={sendToAll}
            disabled={running || listTotal === 0}
            className="shrink-0 bg-primary text-white hover:bg-primary/90"
          >
            {running ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Send className="size-5" />
            )}
            {running ? "Sending…" : "Send to all"}
          </Button>
        </div>

        {(running || done > 0 || total > 0) && (
          <div className="mt-5 rounded-xl border border-gray-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">
                {running ? "Sending reminders…" : "Finished"}
                {mode === "queued" && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    via background worker
                  </span>
                )}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {done} / {total}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-[#d9b45b] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1.5 text-emerald-600">
                <CheckCircle2 className="size-3.5" /> Sent {sent}
              </span>
              <span className="inline-flex items-center gap-1.5 text-rose-600">
                <XCircle className="size-3.5" /> Failed {failed}
              </span>
              {queued > 0 && (
                <span className="inline-flex items-center gap-1.5 text-amber-600">
                  <Loader2 className="size-3.5 animate-spin" /> In queue {queued}
                </span>
              )}
            </div>

            {log.length > 0 && (
              <div className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2">
                {log.map((entry, i) => (
                  <div
                    key={`${entry.label}-${i}`}
                    className="flex items-center justify-between gap-3 px-2 py-1 text-xs"
                  >
                    <span className="truncate text-gray-600">
                      {entry.label}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 font-medium",
                        entry.status === "sent"
                          ? "text-emerald-600"
                          : "text-rose-600",
                      )}
                    >
                      {entry.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* List */}
      <Card className="border-gray-200 p-0">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="size-4" />
            {listTotal} {listTotal === 1 ? "registration" : "registrations"}
            {listLoading && <Loader2 className="size-3.5 animate-spin" />}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => {
                setListLoading(true);
                setQuery(e.target.value);
              }}
              placeholder="Search attendees..."
              className="pl-10"
            />
          </div>
        </div>

        {listLoading && rows.length === 0 ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-gray-600">
            No attendees match your search.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {rows.map((row) => {
              const name =
                [row.attendee?.first_name, row.attendee?.last_name]
                  .filter(Boolean)
                  .join(" ") || "Attendee";
              const email = row.attendee?.email ?? "";
              return (
                <div key={row.id} className="flex items-center gap-4 px-5 py-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {initials(
                      row.attendee?.first_name,
                      row.attendee?.last_name,
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-gray-900">
                        {name}
                      </p>
                      {row.attendee_tag_url ? (
                        <Badge variant="secondary" className="shrink-0">
                          Tag
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="shrink-0">
                          No tag
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {email || "—"}
                      {row.position
                        ? ` · ${POSITION_LABELS[row.position]}`
                        : ""}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendOne(row.id, email)}
                    disabled={sendingId === row.id}
                    className="shrink-0"
                  >
                    {sendingId === row.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Mail className="size-4" />
                    )}
                    Send reminder
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {listTotal > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 p-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, listTotal)} of {listTotal}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setListLoading(true);
                    setPage(Math.max(1, currentPage - 1));
                  }}
                  disabled={currentPage === 1 || listLoading}
                >
                  Previous
                </Button>
                <span className="px-1 text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setListLoading(true);
                    setPage(Math.min(totalPages, currentPage + 1));
                  }}
                  disabled={currentPage === totalPages || listLoading}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Bell className="size-3.5" />
        Emails are sent from reminders@witscsd.co.za via Plunk. Attendee tags are
        attached when available.
      </p>
    </div>
  );
}
