"use client";

import * as React from "react";
import { Megaphone, X } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";
import type { Announcement } from "@/lib/types";

export function EventAnnouncementsButton({
  announcements,
}: {
  announcements: Announcement[];
}) {
  const [open, setOpen] = React.useState(false);

  if (announcements.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="View announcements"
        className="fixed right-4 top-44 z-40 flex size-12 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 hover:bg-wits-blue-dark"
      >        <Megaphone className="size-5" />
        <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-[#d9b45b] text-[10px] font-bold text-primary">
          {announcements.length}
        </span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close announcements"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-black/5"
          />
          <div className="fixed right-4 top-56 z-50 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 bg-primary px-4 py-3 text-white">
              <div>
                <p className="text-sm font-semibold">Announcements</p>
                <p className="text-xs text-white/70">From the CSD Team</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-full p-1 transition-colors hover:bg-white/10"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="max-h-[24rem] space-y-3 overflow-y-auto p-4">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="rounded-2xl rounded-tl-sm border border-gray-200 bg-slate-50 p-3"
                >
                  <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
                    {announcement.text}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDate(announcement.created_at)} ·{" "}
                    {formatTime(announcement.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
