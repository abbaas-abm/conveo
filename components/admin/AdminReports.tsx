"use client";

import * as React from "react";
import {
  CalendarDays,
  CheckCircle2,
  FileText,
  Loader2,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatDate } from "@/lib/utils";
import type { EventRecord } from "@/lib/types";

export function AdminReports({ events }: { events: EventRecord[] }) {
  const [selected, setSelected] = React.useState<EventRecord | null>(null);
  const [email, setEmail] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [sentTo, setSentTo] = React.useState<string | null>(null);

  function openEvent(event: EventRecord) {
    setSelected(event);
    setEmail("");
    setSentTo(null);
  }

  function close(open: boolean) {
    if (!open) {
      setSelected(null);
      setEmail("");
      setSentTo(null);
    }
  }

  async function send() {
    if (!selected) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSending(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: selected.id, email: email.trim() }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Could not start the report.");
      }
      setSentTo(email.trim());
      toast.success("Report is being generated and sent.");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Could not send the report.",
      );
    } finally {
      setSending(false);
    }
  }

  if (events.length === 0) {
    return (
      <Card className="mx-auto flex max-w-2xl flex-col items-center justify-center border-dashed border-gray-300 bg-white px-6 py-16 text-center">
        <FileText className="size-6 text-gray-400" />
        <h3 className="mt-3 text-base font-semibold text-gray-900">
          No events yet
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Reports can be generated once events exist.
        </p>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h2 className="text-lg font-semibold text-gray-900">Reports</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Select an event to generate a PDF report and email it.
      </p>

      <Card className="mt-5 divide-y divide-gray-100 border-gray-200 p-0">
        {events.map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={() => openEvent(event)}
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-gray-900">
                {event.title || "Untitled event"}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="size-3.5" />
                {formatDate(event.start_date)}
              </p>
            </div>
            <FileText className="size-5 shrink-0 text-gray-400" />
          </button>
        ))}
      </Card>

      <Sheet open={Boolean(selected)} onOpenChange={close}>
        <SheetContent side="bottom" className="rounded-t-2xl p-6 pb-8">
          <div className="mx-auto w-full max-w-lg">
            <SheetHeader className="space-y-1.5 text-left">
              <SheetTitle>Email report</SheetTitle>
              <SheetDescription>
                {selected?.title}
              </SheetDescription>
            </SheetHeader>

            {sentTo ? (
              <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
                <CheckCircle2 className="size-8 text-emerald-600" />
                <p className="text-base font-semibold text-emerald-900">
                  Report on its way
                </p>
                <p className="text-sm text-emerald-800">
                  We&apos;re generating the PDF and sending it to{" "}
                  <span className="font-medium">{sentTo}</span>. You can close
                  this panel.
                </p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => setSelected(null)}
                >
                  Done
                </Button>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="report-email">Recipient email</Label>
                  <Input
                    id="report-email"
                    type="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  The report is generated and sent in the background, so it may
                  take a moment for large events.
                </p>
                <Button
                  className="w-full"
                  onClick={send}
                  disabled={sending}
                >
                  {sending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  {sending ? "Starting..." : "Send"}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
