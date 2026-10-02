"use client";

import * as React from "react";
import Image from "next/image";
import { Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ExpandableSection } from "@/components/events/ExpandableSection";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { initials } from "@/lib/utils";
import type { Speaker } from "@/lib/types";

function fullName(speaker: Speaker) {
  return (
    [speaker.first_name, speaker.last_name].filter(Boolean).join(" ") ||
    "Speaker"
  );
}

export function EventSpeakers({ speakers }: { speakers: Speaker[] }) {
  const [selected, setSelected] = React.useState<Speaker | null>(null);

  return (
    <Card className="border-gray-200 p-6 sm:p-8">
      <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
        <Users className="size-5 text-gray-400" />
        Speakers &amp; facilitators
      </h2>

      <ExpandableSection
        enabled={speakers.length > 4}
        collapsedClassName="max-h-72"
      >
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {speakers.map((speaker) => (
            <button
              key={speaker.id}
              type="button"
              onClick={() => setSelected(speaker)}
              className="flex gap-4 rounded-lg border border-gray-200 p-4 text-left transition-colors hover:border-primary/40 hover:bg-slate-50"
            >
              {speaker.avatar_url ? (
                <Image
                  src={speaker.avatar_url}
                  alt={fullName(speaker)}
                  width={56}
                  height={56}
                  className="size-14 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-slate-100 font-medium text-gray-600">
                  {initials(speaker.first_name, speaker.last_name)}
                </span>
              )}
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-gray-900">
                  {fullName(speaker)}
                </h3>
                {speaker.title && (
                  <p className="mt-0.5 text-sm font-medium text-[#C59B27]">
                    {speaker.title}
                  </p>
                )}
                {speaker.bio && (
                  <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-gray-600">
                    {speaker.bio}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </ExpandableSection>

      <Dialog open={Boolean(selected)} onOpenChange={() => setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          {selected && (
            <div className="flex flex-col items-center text-center">
              <div className="relative size-24 overflow-hidden rounded-full bg-slate-100">
                {selected.avatar_url ? (
                  <Image
                    src={selected.avatar_url}
                    alt={fullName(selected)}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-primary">
                    {initials(selected.first_name, selected.last_name)}
                  </span>
                )}
              </div>

              <DialogHeader className="mt-4 items-center space-y-1">
                <DialogTitle className="text-xl">
                  {fullName(selected)}
                </DialogTitle>
                {selected.title && (
                  <DialogDescription className="font-medium text-[#C59B27]">
                    {selected.title}
                  </DialogDescription>
                )}
              </DialogHeader>

              {selected.bio ? (
                <p className="mt-4 text-sm leading-relaxed text-gray-600">
                  {selected.bio}
                </p>
              ) : (
                <p className="mt-4 text-sm italic text-muted-foreground">
                  No biography available.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
