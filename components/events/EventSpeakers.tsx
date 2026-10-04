"use client";

import * as React from "react";
import Image from "next/image";
import { Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ExpandableSection } from "@/components/events/ExpandableSection";
import { cn, initials } from "@/lib/utils";
import type { Speaker } from "@/lib/types";

function fullName(speaker: Speaker) {
  return (
    [speaker.first_name, speaker.last_name].filter(Boolean).join(" ") ||
    "Speaker"
  );
}

export function EventSpeakers({ speakers }: { speakers: Speaker[] }) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

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
          {speakers.map((speaker) => {
            const expanded = expandedId === speaker.id;
            const isLong = (speaker.bio?.length ?? 0) > 140;
            return (
              <div
                key={speaker.id}
                className="flex gap-4 rounded-lg border border-gray-200 p-4"
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
                  <h3 className="text-base font-semibold text-gray-900">
                    {fullName(speaker)}
                  </h3>
                  {speaker.title && (
                    <p className="mt-0.5 text-sm font-medium text-[#C59B27]">
                      {speaker.title}
                    </p>
                  )}
                  {speaker.bio && (
                    <>
                      <p
                        className={cn(
                          "mt-1 text-justify text-sm leading-relaxed text-gray-600",
                          !expanded && isLong && "line-clamp-3",
                        )}
                      >
                        {speaker.bio}
                      </p>
                      {isLong && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(expanded ? null : speaker.id)
                          }
                          className="mt-1.5 text-xs font-semibold text-primary hover:underline"
                        >
                          {expanded ? "Show less" : "Read more"}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ExpandableSection>
    </Card>
  );
}
