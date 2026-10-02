"use client";

import * as React from "react";
import { cn, splitDuration } from "@/lib/utils";

export function EventCountdown({
  initialSeconds,
  className,
}: {
  initialSeconds: number;
  className?: string;
}) {
  const [seconds, setSeconds] = React.useState(initialSeconds);

  React.useEffect(() => {
    const id = setInterval(() => {
      setSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  if (seconds <= 0) {
    return (
      <div
        className={cn(
          "rounded-xl bg-primary p-4 text-center text-white sm:p-6",
          className,
        )}
      >
        <p className="text-sm font-medium uppercase tracking-wider text-[#d9b45b]">
          Happening now
        </p>
        <p className="mt-1 text-lg font-semibold">The event has started</p>
      </div>
    );
  }

  const { days, hours, minutes, seconds: secs } = splitDuration(seconds);
  const units = [
    { label: "Days", value: days },
    { label: "Hours", value: hours },
    { label: "Minutes", value: minutes },
    { label: "Seconds", value: secs },
  ];

  return (
    <div
      className={cn(
        "rounded-xl bg-primary p-4 text-white shadow-sm sm:p-6",
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-[#d9b45b]">
        Event starts in
      </p>
      <div className="mt-4 grid grid-cols-4 gap-1.5 sm:gap-2">
        {units.map((unit) => (
          <div
            key={unit.label}
            className="min-w-0 rounded-lg bg-white/10 py-2.5 text-center sm:py-3"
          >
            <div className="text-xl font-semibold tabular-nums text-white sm:text-2xl">
              {String(unit.value).padStart(2, "0")}
            </div>
            <div className="mt-0.5 truncate text-[9px] font-medium uppercase tracking-wide text-white/70 sm:text-[10px]">
              {unit.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
