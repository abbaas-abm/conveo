"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Megaphone, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Announcement } from "@/lib/types";

const POLL_MS = 10_000;
const AUTO_DISMISS_MS = 9_000;

/**
 * Near real-time pop-up notifications for announcements. Polls for new rows
 * (websocket-free, so it scales) and shows a Google-style toast. Only announces
 * announcements posted while the visitor is on the site.
 */
export function AnnouncementToaster() {
  const [popups, setPopups] = React.useState<Announcement[]>([]);
  const lastSeenRef = React.useRef<string | null>(null);
  const timers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = React.useCallback((id: string) => {
    setPopups((prev) => prev.filter((p) => p.id !== id));
    const timer = timers.current[id];
    if (timer) {
      clearTimeout(timer);
      delete timers.current[id];
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    const supabase = createClient();
    const pending = timers.current;

    (async () => {
      const { data } = await supabase
        .from("announcements")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (active) {
        lastSeenRef.current = data?.created_at ?? new Date(0).toISOString();
      }
    })();

    async function poll() {
      if (typeof document !== "undefined" && document.hidden) return;
      if (!lastSeenRef.current) return;
      try {
        const { data } = await supabase
          .from("announcements")
          .select("*")
          .gt("created_at", lastSeenRef.current)
          .order("created_at", { ascending: false })
          .limit(3);
        if (!active || !data || data.length === 0) return;

        lastSeenRef.current = data[0].created_at;

        // If the visitor has browser push enabled, the OS notification handles
        // it — avoid showing a duplicate in-page toast.
        if (
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          return;
        }

        const incoming = (data as Announcement[]).slice().reverse();
        setPopups((prev) => [...prev, ...incoming].slice(-4));
        incoming.forEach((announcement) => {
          timers.current[announcement.id] = setTimeout(
            () => dismiss(announcement.id),
            AUTO_DISMISS_MS,
          );
        });
      } catch {
        // Ignore transient polling errors.
      }
    }

    const id = setInterval(poll, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
      Object.values(pending).forEach(clearTimeout);
    };
  }, [dismiss]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[70] flex flex-col items-center gap-2 px-4 print:hidden">
      <AnimatePresence>
        {popups.map((popup) => (
          <motion.div
            key={popup.id}
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-xl"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-white">
              <Megaphone className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#C59B27]">
                Centre for Student Development
              </p>
              <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-gray-700">
                {popup.text}
              </p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(popup.id)}
              aria-label="Dismiss notification"
              className="rounded-full p-1 text-gray-400 transition-colors hover:bg-slate-100 hover:text-gray-700"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
