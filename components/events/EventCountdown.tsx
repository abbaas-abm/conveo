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
          "rounded-xl bg-primary p-6 text-center text-white",
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
        "rounded-xl bg-primary p-6 text-white shadow-sm",
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-[#d9b45b]">
        Event starts in
      </p>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {units.map((unit) => (
          <div
            key={unit.label}
            className="rounded-lg bg-white/10 py-3 text-center"
          >
            <div className="text-2xl font-semibold tabular-nums text-white">
              {String(unit.value).padStart(2, "0")}
            </div>
            <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-white/70">
              {unit.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
