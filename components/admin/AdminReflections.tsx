"use client";

import * as React from "react";
import { Search, StickyNote } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate, formatTime } from "@/lib/utils";
import type { ReflectionWithUser } from "@/lib/types";

const NOTE_COLORS = [
  "#FEF3C7",
  "#DBEAFE",
  "#DCFCE7",
  "#FCE7F3",
  "#EDE9FE",
  "#FFEDD5",
  "#CFFAFE",
];

function colorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return NOTE_COLORS[hash % NOTE_COLORS.length];
}

export function AdminReflections({
  reflections,
}: {
  reflections: ReflectionWithUser[];
}) {
  const [query, setQuery] = React.useState("");

  const filtered = reflections.filter((note) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const name = [note.user?.first_name, note.user?.last_name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return name.includes(q) || note.content.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <StickyNote className="size-4" />
          {reflections.length}{" "}
          {reflections.length === 1 ? "reflection" : "reflections"}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or text..."
            className="pl-10"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <StickyNote className="size-6 text-gray-400" />
          <h3 className="mt-3 text-base font-semibold text-gray-900">
            {reflections.length === 0
              ? "No reflections yet"
              : "No reflections match your search"}
          </h3>
        </Card>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {filtered.map((note) => {
            const name =
              [note.user?.first_name, note.user?.last_name]
                .filter(Boolean)
                .join(" ") || "Anonymous";
            return (
              <div
                key={note.id}
                className="mb-4 break-inside-avoid rounded-lg border-t-4 border-black/10 p-4 shadow-md"
                style={{ backgroundColor: colorFor(note.id) }}
              >
                <p className="whitespace-pre-line text-sm leading-relaxed text-gray-800">
                  {note.content}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-semibold text-gray-600">
                    {name}
                  </p>
                  <p className="shrink-0 text-[11px] text-gray-500">
                    {formatDate(note.created_at)} · {formatTime(note.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
