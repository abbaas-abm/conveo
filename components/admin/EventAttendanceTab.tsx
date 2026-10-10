"use client";

import * as React from "react";
import {
  CalendarCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Search,
  UserCheck,
  Users,
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

interface AttendanceRow {
  id: string;
  event_id: string;
  attendee_id: string;
  volunteer_id: string;
  created_at: string;
  attendee: Profile | null;
  volunteer: Profile | null;
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

function dayKey(dateISO: string) {
  // Group by the South African calendar day (matches how dates are shown
  // everywhere else), not the browser's local timezone.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateISO));
}

export function EventAttendanceTab({
  event,
}: {
  event: { id: string };
}) {
  const [rows, setRows] = React.useState<AttendanceRow[]>([]);
  const [positions, setPositions] = React.useState<Record<string, UserPosition>>(
    {},
  );
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [faculty, setFaculty] = React.useState("ALL");
  const [dayFilter, setDayFilter] = React.useState<"ALL" | number>("ALL");
  const [page, setPage] = React.useState(1);

  // Distinct calendar dates that actually have attendance, in chronological
  // order. Day 1 = first date with a check-in, Day 2 = the next, etc.
  const dayKeys = React.useMemo(() => {
    const set = new Set(rows.map((r) => dayKey(r.created_at)));
    return Array.from(set).sort();
  }, [rows]);

  React.useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const pageSize = 1000;

      // Attendance is fetched in full (paginated past PostgREST's 1000-row cap)
      // so totals and per-day counts are correct.
      const all: AttendanceRow[] = [];
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from("attendance")
          .select(
            "id, event_id, attendee_id, volunteer_id, created_at, attendee:profiles!attendee_id(first_name, last_name, email, gender, faculty, year_of_study, person_number), volunteer:profiles!volunteer_id(first_name, last_name)",
          )
          .eq("event_id", event.id)
          .order("created_at", { ascending: false })
          .range(from, from + pageSize - 1);
        if (!active) return;
        if (error) {
          console.error(error);
          setLoading(false);
          return;
        }
        for (const r of data ?? []) all.push(r as unknown as AttendanceRow);
        if (!data || data.length < pageSize) break;
      }

      // Registrant positions (also paginated).
      const map: Record<string, UserPosition> = {};
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from("registrations")
          .select("attendee_id, position")
          .eq("event_id", event.id)
          .range(from, from + pageSize - 1);
        if (!active) return;
        if (error) break;
        for (const r of (data ?? []) as Array<{
          attendee_id: string;
          position: UserPosition | null;
        }>) {
          if (r.position) map[r.attendee_id] = r.position;
        }
        if (!data || data.length < pageSize) break;
      }

      if (!active) return;
      setPositions(map);
      setRows(all);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [event.id]);

  const total = rows.length;

  // Per-day check-in counts (sum to the total).
  const dayCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rows) {
      const key = dayKey(r.created_at);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [rows]);

  const dayRows = React.useMemo(() => {
    if (dayFilter === "ALL") return rows;
    const key = dayKeys[dayFilter - 1];
    if (!key) return [];
    return rows.filter((r) => dayKey(r.created_at) === key);
  }, [rows, dayFilter, dayKeys]);

  const genderData = React.useMemo(() => {
    const counts = countBy(
      dayRows.map((r) => normalizeGender(r.attendee?.gender)),
    );
    return ["Male", "Female"]
      .map((name) => ({ name, value: counts[name] ?? 0 }))
      .filter((d) => d.value > 0);
  }, [dayRows]);

  const positionData = React.useMemo(() => {
    const counts = countBy(
      dayRows.map((r) => {
        const p = positions[r.attendee_id];
        return p ? POSITION_LABELS[p] : "Unknown";
      }),
    );
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [dayRows, positions]);

  const facultyData = React.useMemo(() => {
    const counts = countBy(
      dayRows.map((r) => r.attendee?.faculty || "Unspecified"),
    );
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [dayRows]);

  const yearData = React.useMemo(() => {
    const counts = countBy(
      dayRows.map((r) => r.attendee?.year_of_study || "Unspecified"),
    );
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [dayRows]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return dayRows.filter((r) => {
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
  }, [dayRows, query, faculty]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
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
          No attendance yet
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Attendees checked in by the support team will appear here.
        </p>
      </Card>
    );
  }

  const maleCount = genderData.find((d) => d.name === "Male")?.value ?? 0;
  const femaleCount = genderData.find((d) => d.name === "Female")?.value ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total attended" value={dayRows.length} />
        <StatCard label="Male" value={maleCount} variant="male" />
        <StatCard label="Female" value={femaleCount} variant="female" />
      </div>

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

      <Card className="border-gray-200 p-0">
        {dayKeys.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 p-4">
            <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <CalendarDays className="size-3.5" />
              Day
            </span>
            <DayPill
              active={dayFilter === "ALL"}
              onClick={() => {
                setDayFilter("ALL");
                setPage(1);
              }}
            >
              All days ({total})
            </DayPill>
            {dayKeys.map((key, index) => (
              <DayPill
                key={key}
                active={dayFilter === index + 1}
                onClick={() => {
                  setDayFilter(index + 1);
                  setPage(1);
                }}
              >
                Day {index + 1} ({dayCounts[key] ?? 0})
              </DayPill>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserCheck className="size-4" />
            {filtered.length} {filtered.length === 1 ? "check-in" : "check-ins"}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search attendees..."
                className="pl-10"
              />
            </div>
            <Select
              value={faculty}
              onValueChange={(value) => {
                setFaculty(value);
                setPage(1);
              }}
            >
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
            {pageRows.map((row) => {
              const name =
                [row.attendee?.first_name, row.attendee?.last_name]
                  .filter(Boolean)
                  .join(" ") || "Unknown attendee";
              const position = positions[row.attendee_id];
              const subtitle = [
                position ? POSITION_LABELS[position] : null,
                row.attendee?.year_of_study,
                row.attendee?.gender
                  ? normalizeGender(row.attendee.gender)
                  : null,
              ]
                .filter(Boolean)
                .join(" · ");
              const volunteerName =
                [row.volunteer?.first_name, row.volunteer?.last_name]
                  .filter(Boolean)
                  .join(" ") || "Support Team";

              return (
                <div
                  key={row.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {initials(
                        row.attendee?.first_name,
                        row.attendee?.last_name,
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-gray-900">
                          {name}
                        </p>
                        <Badge variant="success">Attended</Badge>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {subtitle || row.attendee?.email || "—"}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarCheck className="size-3.5" />
                          {formatDate(row.created_at)} ·{" "}
                          {formatTime(row.created_at)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <UserCheck className="size-3.5" />
                          Checked in by {volunteerName}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
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

function DayPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-white"
          : "border-gray-200 bg-white text-gray-600 hover:border-primary/40 hover:text-primary",
      )}
    >
      {children}
    </button>
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
      <p className={cn("text-xs font-medium uppercase tracking-wide", tone.label)}>
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
