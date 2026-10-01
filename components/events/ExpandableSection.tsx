"use client";

import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function ExpandableSection({
  children,
  enabled = true,
  collapsedClassName = "max-h-72",
}: {
  children: React.ReactNode;
  enabled?: boolean;
  collapsedClassName?: string;
}) {
  const [open, setOpen] = React.useState(false);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div>
      <div
        className={cn(
          "relative",
          !open && `${collapsedClassName} overflow-hidden`,
        )}
      >
        {children}
        {!open && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent" />
        )}
      </div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        {open ? "Show less" : "Show more"}
        {open ? (
          <ChevronUp className="size-4" />
        ) : (
          <ChevronDown className="size-4" />
        )}
      </button>
    </div>
  );
}
