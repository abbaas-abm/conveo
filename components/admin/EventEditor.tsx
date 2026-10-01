"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { cn, formatDate } from "@/lib/utils";
import type { EventRecord, EventMode, EventStatus } from "@/lib/types";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { AdminSpeakers } from "@/components/admin/AdminSpeakers";
import { EventMediaTab } from "@/components/admin/EventMediaTab";
import { EventProgramTab } from "@/components/admin/EventProgramTab";
import { EventRsvpsTab } from "@/components/admin/EventRsvpsTab";
import { EventFeedbackTab } from "@/components/admin/EventFeedbackTab";
import { EventAttendanceTab } from "@/components/admin/EventAttendanceTab";
import { EventAnnouncementsTab } from "@/components/admin/EventAnnouncementsTab";

const TABS = [
  "Information",
  "About",
  "Programme",
  "Speakers",
  "Media",
  "RSVPs",
  "Attendance",
  "Feedback",
  "Announcements",
] as const;

type Tab = (typeof TABS)[number];

const MODES: EventMode[] = ["IN_PERSON", "ONLINE"];
const STATUSES: EventStatus[] = ["OPEN", "CLOSED", "ENDED"];

interface FormState {
  title: string;
  theme: string;
  description: string;
  about: string;
  start_date: string;
  end_date: string;
  venue: string;
  mode: EventMode;
  status: EventStatus;
}

function toLocalInput(iso: string) {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function toForm(event: EventRecord): FormState {
  return {
    title: event.title,
    theme: event.theme ?? "",
    description: event.description ?? "",
    about: event.about ?? "",
    start_date: toLocalInput(event.start_date),
    end_date: toLocalInput(event.end_date),
    venue: event.venue ?? "",
    mode: event.mode,
    status: event.status,
  };
}

export function EventEditor({
  event,
  initialTab,
}: {
  event: EventRecord;
  initialTab?: string;
}) {
  const [tab, setTab] = React.useState<Tab>(() =>
    initialTab && (TABS as readonly string[]).includes(initialTab)
      ? (initialTab as Tab)
      : "Information",
  );
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(toForm(event));

  function selectTab(next: Tab) {
    setTab(next);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", next);
      window.history.replaceState(null, "", url.toString());
    }
  }

  async function save(draft?: FormState) {
    const data = draft ?? form;
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: updated, error } = await supabase
        .from("events")
        .update({
          title: data.title.trim() || "Draft",
          theme: data.theme.trim() || null,
          description: data.description.trim() || null,
          about: data.about.trim() || null,
          start_date: new Date(data.start_date).toISOString(),
          end_date: new Date(data.end_date).toISOString(),
          venue: data.venue.trim() || null,
          mode: data.mode,
          status: data.status,
        })
        .eq("id", event.id)
        .select("*")
        .single();
      if (error) throw error;
      setForm(toForm(updated as EventRecord));
      toast.success("Event saved.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save event.",
      );
    } finally {
      setSaving(false);
    }
  }

  function update(patch: Partial<FormState>, persist = false) {
    const next = { ...form, ...patch };
    setForm(next);
    if (persist) void save(next);
  }

  const isDraft = form.title.trim().toLowerCase() === "draft";

  return (
    <div className="flex flex-col">
      <div className="border-b border-gray-200 bg-white px-4 pt-5 sm:px-6">
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Back to events
        </Link>

        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-gray-900">
                {form.title || "Untitled event"}
              </h2>
              {isDraft && <Badge variant="warning">Draft</Badge>}
              <Badge
                variant={
                  form.status === "OPEN"
                    ? "success"
                    : form.status === "CLOSED"
                      ? "warning"
                      : "destructive"
                }
              >
                {form.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Event ID {event.id.slice(0, 8).toUpperCase()} · Updated{" "}
              {formatDate(event.updated_at)}
            </p>
          </div>
          <Button onClick={() => save()} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>

        <nav className="mt-5 -mb-px flex items-stretch overflow-x-auto">
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => selectTab(item)}
              className={cn(
                "relative whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                tab === item
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-600 hover:text-gray-900",
              )}
            >
              {item}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-4 sm:p-6">
        {tab === "Information" ? (
          <div className="mx-auto max-w-3xl space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  placeholder="Draft"
                  onChange={(e) => update({ title: e.target.value })}
                  onBlur={() => save()}
                />
              </div>
              <div className="space-y-2">
                <Label>Theme</Label>
                <Input
                  value={form.theme}
                  placeholder="e.g. Leadership"
                  onChange={(e) => update({ theme: e.target.value })}
                  onBlur={() => save()}
                />
              </div>
              <div className="space-y-2">
                <Label>Venue</Label>
                <Input
                  value={form.venue}
                  placeholder="e.g. Matrix, East Campus"
                  onChange={(e) => update({ venue: e.target.value })}
                  onBlur={() => save()}
                />
              </div>
              <div className="space-y-2">
                <Label>Starts</Label>
                <Input
                  type="datetime-local"
                  value={form.start_date}
                  onChange={(e) => update({ start_date: e.target.value })}
                  onBlur={() => save()}
                />
              </div>
              <div className="space-y-2">
                <Label>Ends</Label>
                <Input
                  type="datetime-local"
                  value={form.end_date}
                  onChange={(e) => update({ end_date: e.target.value })}
                  onBlur={() => save()}
                />
              </div>
              <div className="space-y-2">
                <Label>Mode</Label>
                <Select
                  value={form.mode}
                  onValueChange={(value) =>
                    update({ mode: value as EventMode }, true)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODES.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode === "IN_PERSON" ? "In Person" : "Online"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    update({ status: value as EventStatus }, true)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Short description</Label>
                <Textarea
                  value={form.description}
                  placeholder="A short summary shown on event cards."
                  onChange={(e) => update({ description: e.target.value })}
                  onBlur={() => save()}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Changes save automatically when you leave a field, or click Save
              changes.
            </p>
          </div>
        ) : tab === "About" ? (
          <div className="mx-auto max-w-3xl space-y-3">
            <div>
              <Label>About this event</Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Use the toolbar to format headings, lists, links and emphasis.
                This content is shown on the public event page.
              </p>
            </div>
            <RichTextEditor
              value={form.about}
              onChange={(html) => update({ about: html })}
              onBlur={() => save()}
              placeholder="Write a rich description of the event, its objectives, what attendees will gain..."
            />
            <p className="text-xs text-muted-foreground">
              Changes save automatically when you leave the editor, or click
              Save changes.
            </p>
          </div>
        ) : tab === "Speakers" ? (
          <div className="mx-auto max-w-6xl">
            <AdminSpeakers eventId={event.id} />
          </div>
        ) : tab === "Media" ? (
          <EventMediaTab event={event} />
        ) : tab === "Programme" ? (
          <EventProgramTab event={event} />
        ) : tab === "RSVPs" ? (
          <EventRsvpsTab event={event} />
        ) : tab === "Feedback" ? (
          <EventFeedbackTab event={event} />
        ) : tab === "Attendance" ? (
          <EventAttendanceTab event={event} />
        ) : tab === "Announcements" ? (
          <EventAnnouncementsTab event={event} />
        ) : null}
      </div>
    </div>
  );
}
