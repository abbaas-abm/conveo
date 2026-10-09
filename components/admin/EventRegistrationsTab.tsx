"use client";

import * as React from "react";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Search,
  Send,
  Users,
  UserX,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { FACULTY_OPTIONS } from "@/lib/profile-options";
import { toast } from "sonner";
import type { Profile, UserPosition } from "@/lib/types";

const PAGE_SIZE = 25;
const BLUE = "#003366";
const GOLD = "#d9b45b";
const CHART_COLORS = ["#003366", "#d9b45b", "#4b7bb5", "#b08a3e", "#7c93b3", "#e0c47a"];

const POSITION_LABELS: Record<UserPosition, string> = {
  STUDENT: "Student",
  STAFF: "Staff",
  GUEST: "Guest",
  GUEST_SPEAKER: "Guest Speaker",
};

interface RegistrationRow {
  id: string;
  attendee_id: string;
  status: "CONFIRMED" | "CANCELLED";
  position: UserPosition | null;
  attendee_tag_url: string | null;
  created_at: string;
  attendee: Profile | null;
}

function normalizeGender(gender: string | null | undefined) {
  if (!gender) return "Unspecified";
  const g = gender.toLowerCase();
  if (g.startsWith("m")) return "Male";
  if (g.startsWith("f")) return "Female";
  return "Unspecified";
}

function countBy<T extends string>(values: T[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

export function EventRegistrationsTab({ event }: { event: { id: string } }) {
  const [rows, setRows] = React.useState<RegistrationRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [faculty, setFaculty] = React.useState("ALL");
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("registrations")
        .select(
          "id, attendee_id, status, position, attendee_tag_url, created_at, attendee:profiles(*)",
        )
        .eq("event_id", event.id)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }
      setRows((data ?? []) as unknown as RegistrationRow[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [event.id]);

  // Admin action: generate + email the attendee tag on their behalf, then
  // populate the row with the returned tag URL.
  const sendTag = React.useCallback(async (registrationId: string) => {
    const response = await fetch("/api/admin/send-tag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationId }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      attendeeTagUrl?: string;
    };
    if (!response.ok) {
      throw new Error(data.error ?? "Could not send the tag.");
    }
    setRows((prev) =>
      prev.map((row) =>
        row.id === registrationId
          ? {
              ...row,
              attendee_tag_url: data.attendeeTagUrl ?? row.attendee_tag_url,
            }
          : row,
      ),
    );
  }, []);

  const total = rows.length;

  const genderData = React.useMemo(() => {
    const counts = countBy(rows.map((r) => normalizeGender(r.attendee?.gender)));
    return ["Male", "Female"]
      .map((name) => ({ name, value: counts[name] ?? 0 }))
      .filter((d) => d.value > 0);
  }, [rows]);

  const positionData = React.useMemo(() => {
    const counts = countBy(
      rows.map((r) => (r.position ? POSITION_LABELS[r.position] : "Unknown")),
    );
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [rows]);

  const facultyData = React.useMemo(() => {
    const counts = countBy(
      rows.map((r) => r.attendee?.faculty || "Unspecified"),
    );
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [rows]);

  const yearData = React.useMemo(() => {
    const counts = countBy(
      rows.map((r) => r.attendee?.year_of_study || "Unspecified"),
    );
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [rows]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesFaculty =
        faculty === "ALL" || (r.attendee?.faculty ?? "") === faculty;
      if (!matchesFaculty) return false;
      if (!q) return true;
      const name =
        `${r.attendee?.first_name ?? ""} ${r.attendee?.last_name ?? ""}`.toLowerCase();
      return (
        name.includes(q) ||
        (r.attendee?.email ?? "").toLowerCase().includes(q) ||
        (r.attendee?.person_number ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, faculty]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function handleQuery(value: string) {
    setQuery(value);
    setPage(1);
  }

  function handleFaculty(value: string) {
    setFaculty(value);
    setPage(1);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (total === 0) {
    return (
      <Card className="mx-auto flex max-w-2xl flex-col items-center justify-center border-dashed border-gray-300 bg-white px-6 py-16 text-center">
        <Users className="size-6 text-gray-400" />
        <h3 className="mt-3 text-base font-semibold text-gray-900">
          No registrations yet
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Attendee registrations will appear here once people register.
        </p>
      </Card>
    );
  }

  const maleCount = genderData.find((d) => d.name === "Male")?.value ?? 0;
  const femaleCount = genderData.find((d) => d.name === "Female")?.value ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Summary statistics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total registrations" value={total} />
        <StatCard label="Male" value={maleCount} variant="male" />
        <StatCard label="Female" value={femaleCount} variant="female" />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Attendance by gender">
          <Donut data={genderData} />
        </ChartCard>
        <ChartCard title="Attendance by position">
          <Donut data={positionData} />
        </ChartCard>
        <ChartCard title="Attendance by faculty">
          <HBar data={facultyData} />
        </ChartCard>
        <ChartCard title="Attendance by year of study">
          <VBar data={yearData} />
        </ChartCard>
      </div>

      {/* List */}
      <Card className="border-gray-200 p-0">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="size-4" />
            {filtered.length} {filtered.length === 1 ? "registration" : "registrations"}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => handleQuery(e.target.value)}
                placeholder="Search attendees..."
                className="pl-10"
              />
            </div>
            <Select value={faculty} onValueChange={handleFaculty}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All faculties</SelectItem>
                {FACULTY_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {pageRows.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-gray-600">
            No attendees match your search.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {pageRows.map((row) => (
              <RegistrationListRow
                key={row.id}
                row={row}
                onSendTag={sendTag}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 p-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: number;
  variant?: "default" | "male" | "female";
}) {
  const styles: Record<
    "default" | "male" | "female",
    { card: string; label: string; value: string }
  > = {
    default: {
      card: "border-gray-200",
      label: "text-muted-foreground",
      value: "text-primary",
    },
    male: {
      card: "border-transparent bg-[#003366]",
      label: "text-white/70",
      value: "text-white",
    },
    female: {
      card: "border-transparent bg-[#C2185B]",
      label: "text-white/70",
      value: "text-white",
    },
  };
  const tone = styles[variant];
  return (
    <Card className={cn("p-5", tone.card)}>
      <p
        className={cn(
          "text-xs font-medium uppercase tracking-wide",
          tone.label,
        )}
      >
        {label}
      </p>
      <p className={cn("mt-2 text-3xl font-semibold", tone.value)}>{value}</p>
    </Card>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <div className="mt-4 h-56 w-full">{children}</div>
    </Card>
  );
}

function Donut({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No data
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell
              key={entry.name}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

function HBar({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
      >
        <XAxis type="number" allowDecimals={false} hide />
        <YAxis
          type="category"
          dataKey="name"
          width={150}
          tick={{ fontSize: 11 }}
        />
        <Tooltip />
        <Bar dataKey="value" fill={BLUE} radius={[0, 4, 4, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function VBar({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: -16, right: 8, top: 4, bottom: 4 }}>
        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="value" fill={GOLD} radius={[4, 4, 0, 0]} barSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function RegistrationListRow({
  row,
  onSendTag,
}: {
  row: RegistrationRow;
  onSendTag: (registrationId: string) => Promise<void>;
}) {
  const [sending, setSending] = React.useState(false);
  const name =
    [row.attendee?.first_name, row.attendee?.last_name]
      .filter(Boolean)
      .join(" ") || "Unknown attendee";
  const subtitle = [
    row.position ? POSITION_LABELS[row.position] : null,
    row.attendee?.year_of_study,
    row.attendee?.gender ? normalizeGender(row.attendee.gender) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  async function handleSendTag() {
    setSending(true);
    try {
      await onSendTag(row.id);
      toast.success(`Tag sent to ${row.attendee?.email ?? "attendee"}.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not send the tag.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <div className="relative size-11 shrink-0 overflow-hidden rounded-full bg-primary/10">
        <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-primary">
          {row.attendee
            ? initials(row.attendee.first_name, row.attendee.last_name)
            : "?"}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-gray-900">{name}</p>
          <Badge
            variant={row.status === "CONFIRMED" ? "success" : "destructive"}
          >
            {row.status === "CONFIRMED" ? "Confirmed" : "Cancelled"}
          </Badge>
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {subtitle || row.attendee?.email || "—"}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarCheck className="size-3.5" />
          Registered {formatDate(row.created_at)} · {formatTime(row.created_at)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {row.status === "CONFIRMED" && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendTag}
            disabled={sending}
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Send tag
          </Button>
        )}
        {row.status === "CONFIRMED" && row.attendee_tag_url ? (
          <Button asChild variant="outline" size="sm">
            <a
              href={`${row.attendee_tag_url}?download`}
              target="_blank"
              rel="noopener noreferrer"
              download
            >
              <Download className="size-4" />
              Tag
            </a>
          </Button>
        ) : (
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            <UserX className="size-3.5" />
            No tag
          </span>
        )}
      </div>
    </div>
  );
}
