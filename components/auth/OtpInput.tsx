"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onComplete?: (value: string) => void;
}

export function OtpInput({
  value,
  onChange,
  disabled,
  onComplete,
}: OtpInputProps) {
  const inputs = React.useRef<Array<HTMLInputElement | null>>([]);
  const digits = React.useMemo(() => {
    const chars = value.split("");
    return Array.from({ length: 6 }, (_, i) => chars[i] ?? "");
  }, [value]);

  function focusIndex(index: number) {
    inputs.current[index]?.focus();
    inputs.current[index]?.select();
  }

  function commit(next: string[]) {
    const joined = next.join("").slice(0, 6);
    onChange(joined);
    if (joined.length === 6) onComplete?.(joined);
  }

  function handleChange(index: number, raw: string) {
    const numeric = raw.replace(/\D/g, "");
    if (!numeric) {
      const next = [...digits];
      next[index] = "";
      commit(next);
      return;
    }

    const next = [...digits];
    const chars = numeric.split("");
    for (let i = 0; i < chars.length && index + i < 6; i++) {
      next[index + i] = chars[i];
    }
    commit(next);
    focusIndex(Math.min(index + chars.length, 5));
  }

  function handleKeyDown(
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      const next = [...digits];
      next[index - 1] = "";
      commit(next);
      focusIndex(index - 1);
    }
    if (event.key === "ArrowLeft" && index > 0) focusIndex(index - 1);
    if (event.key === "ArrowRight" && index < 5) focusIndex(index + 1);
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!pasted) return;
    const next = Array.from({ length: 6 }, (_, i) => pasted[i] ?? "");
    commit(next);
    focusIndex(Math.min(pasted.length, 5));
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-3">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputs.current[index] = el;
          }}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          disabled={disabled}
          aria-label={`Digit ${index + 1}`}
          className={cn(
            "size-12 rounded-lg border border-gray-300 bg-white text-center text-xl font-semibold text-gray-900 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 sm:size-14 sm:text-2xl",
          )}
        />
      ))}
    </div>
  );
}
