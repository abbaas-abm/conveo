"use client";

import * as React from "react";
import { splitDuration } from "@/lib/utils";

export function HeroCountdown({ initialSeconds }: { initialSeconds: number }) {
  const [seconds, setSeconds] = React.useState(initialSeconds);

  React.useEffect(() => {
    const id = setInterval(() => {
      setSeconds((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  if (seconds <= 0) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-[#d9b45b] px-4 py-2 text-sm font-semibold text-primary">
        Happening now
      </span>
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
    <div className="flex gap-2.5 sm:gap-3">
      {units.map((unit) => (
        <div
          key={unit.label}
          className="min-w-[4rem] rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-center backdrop-blur-sm sm:min-w-[4.5rem]"
        >
          <div className="text-xl font-semibold tabular-nums text-white sm:text-2xl">
            {String(unit.value).padStart(2, "0")}
          </div>
          <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-white/70">
            {unit.label}
          </div>
        </div>
      ))}
    </div>
  );
}
