"use client";

import * as React from "react";
import { Download, FileSignature, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate, formatTime, initials } from "@/lib/utils";
import type { PledgeWithUser } from "@/lib/types";

export function AdminPledges({ pledges }: { pledges: PledgeWithUser[] }) {
  const [query, setQuery] = React.useState("");

  const filtered = pledges.filter((pledge) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const name =
      `${pledge.user?.first_name ?? ""} ${pledge.user?.last_name ?? ""}`.toLowerCase();
    return (
      name.includes(q) ||
      (pledge.user?.email ?? "").toLowerCase().includes(q) ||
      pledge.pledge_text.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileSignature className="size-4" />
          {pledges.length} {pledges.length === 1 ? "pledge" : "pledges"}
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
          <FileSignature className="size-6 text-gray-400" />
          <h3 className="mt-3 text-base font-semibold text-gray-900">
            {pledges.length === 0
              ? "No pledges yet"
              : "No pledges match your search"}
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Pledges signed by attendees will appear here.
          </p>
        </Card>
      ) : (
        <Card className="divide-y divide-gray-100 border-gray-200 p-0">
          {filtered.map((pledge) => {
            const name =
              [pledge.user?.first_name, pledge.user?.last_name]
                .filter(Boolean)
                .join(" ") || "Attendee";
            return (
              <div
                key={pledge.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {initials(pledge.user?.first_name, pledge.user?.last_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">{name}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-gray-600">
                    {pledge.pledge_text}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Signed {formatDate(pledge.created_at)} ·{" "}
                    {formatTime(pledge.created_at)}
                  </p>
                </div>
                {pledge.pledge_document_url ? (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                  >
                    <a
                      href={`${pledge.pledge_document_url}?download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                    >
                      <Download className="size-4" />
                      Certificate
                    </a>
                  </Button>
                ) : (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    Processing…
                  </span>
                )}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
