"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { splitDuration } from "@/lib/utils";

interface TopEvent {
  id: string;
  title: string;
  startDate: string;
}

export function TopEventBar({ event }: { event: TopEvent | null }) {
  const [seconds, setSeconds] = React.useState<number | null>(null);
  const [hidden, setHidden] = React.useState(false);
  const pathname = usePathname();

  // Live countdown.
  React.useEffect(() => {
    if (!event) return;
    const target = new Date(event.startDate).getTime();
    const tick = () =>
      setSeconds(Math.max(0, Math.floor((target - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [event]);

  // Hide once, non-blocking, if the signed-in user is already registered.
  React.useEffect(() => {
    if (!event || typeof window === "undefined") return;

    // Never run in the installed app (the bar is hidden there anyway).
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    if (standalone) {
      queueMicrotask(() => setHidden(true));
      return;
    }

    let active = true;

    function hideForThisEvent(e: Event) {
      const detail = (e as CustomEvent<{ eventId?: string }>).detail;
      if (detail?.eventId === event!.id) setHidden(true);
    }
    window.addEventListener("csd:registered", hideForThisEvent);

    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!active || !session?.user) return; // logged out → keep showing

        const key = `csd:reg:${session.user.id}:${event.id}`;
        if (sessionStorage.getItem(key) === "1") {
          setHidden(true);
          return;
        }

        const { data } = await supabase
          .from("registrations")
          .select("status")
          .eq("event_id", event.id)
          .eq("attendee_id", session.user.id)
          .maybeSingle();
        if (!active) return;

        if (data?.status === "CONFIRMED") {
          sessionStorage.setItem(key, "1");
          setHidden(true);
        }
      } catch {
        // Fail open: if the check errors, just keep the bar visible.
      }
    })();

    return () => {
      active = false;
      window.removeEventListener("csd:registered", hideForThisEvent);
    };
  }, [event]);

  // The homepage has its own full event hero, so the bar would be redundant.
  if (pathname === "/" || !event || hidden) return null;

  const duration = seconds === null ? null : splitDuration(seconds);
  const countdown =
    duration === null
      ? null
      : duration.days > 0
        ? `${duration.days}d ${duration.hours}h ${duration.minutes}m`
        : duration.hours > 0
          ? `${duration.hours}h ${duration.minutes}m ${duration.seconds}s`
          : `${duration.minutes}m ${duration.seconds}s`;

  return (
    <Link
      href={`/events/${event.id}`}
      aria-label={`${event.title} — register now`}
      className="group block bg-primary text-white pwa:hidden"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden shrink-0 items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-white/70 sm:inline-flex">
            <CalendarDays className="size-3.5" />
            Up next
          </span>
          <span className="truncate text-sm font-semibold">{event.title}</span>
          {seconds === null ? (
            <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white/80">
              Starts soon
            </span>
          ) : seconds > 0 ? (
            <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-white">
              {countdown}
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-[#d9b45b] px-2.5 py-0.5 text-xs font-semibold text-primary">
              Happening now
            </span>
          )}
        </div>

        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-primary transition-colors group-hover:bg-slate-100">
          Register now
          <ArrowRight className="size-3.5" />
        </span>
      </div>
    </Link>
  );
}
