"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock, LockOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExpandableSection } from "@/components/events/ExpandableSection";
import { PROGRAM_BLOCK_LABELS } from "@/lib/program";
import { formatTime, initials } from "@/lib/utils";
import type { Speaker } from "@/lib/types";
import type { ProgramBlockWithSpeakers } from "@/lib/data";

export function EventProgramme({
  program,
  isAuthenticated,
}: {
  program: ProgramBlockWithSpeakers[];
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [revealed, setRevealed] = React.useState(false);
  const [selected, setSelected] = React.useState<Speaker | null>(null);

  const programDays = Array.from(
    program
      .reduce((map, block) => {
        const list = map.get(block.day_number) ?? [];
        list.push(block);
        map.set(block.day_number, list);
        return map;
      }, new Map<number, ProgramBlockWithSpeakers[]>())
      .entries(),
  ).sort((a, b) => a[0] - b[0]);

  function handleReveal() {
    if (!isAuthenticated) {
      const redirect =
        typeof window !== "undefined" ? window.location.pathname : "/events";
      router.push(`/login?redirectTo=${encodeURIComponent(redirect)}`);
      return;
    }
    setRevealed(true);
  }

  const previewBlocks = program.slice(0, 3);

  return (
    <>
      {!revealed ? (
        <div className="mt-5">
          <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-slate-50">
            <div className="space-y-2.5 p-4">
              {previewBlocks.map((block) => (
                <div
                  key={block.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="truncate font-medium text-gray-800">
                    {block.title}
                  </span>
                  <span className="shrink-0 text-xs text-gray-500">
                    {formatTime(block.start_time)}
                  </span>
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white to-transparent" />
          </div>

          <Button
            variant="outline"
            className="mt-3 w-full"
            onClick={handleReveal}
          >
            {isAuthenticated ? (
              <>
                <LockOpen className="size-4" />
                View full programme
              </>
            ) : (
              <>
                <Lock className="size-4" />
                Sign in to view the full programme
              </>
            )}
          </Button>
        </div>
      ) : (
        <ExpandableSection
          enabled={program.length > 2}
          collapsedClassName="max-h-96"
        >
          <div className="mt-6 space-y-10">
            {programDays.map(([day, dayBlocks]) => (
              <div key={day}>
                {programDays.length > 1 && (
                  <div className="mb-5 flex items-center gap-3">
                    <span className="rounded-md bg-[#d9b45b]/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-[#8a6d2f]">
                      Day {day}
                    </span>
                    <span className="h-px flex-1 bg-gray-200" />
                  </div>
                )}
                <ol className="space-y-6">
                  {dayBlocks.map((block, index) => (
                    <li key={block.id} className="relative flex gap-5">
                      <div className="flex flex-col items-center">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-white">
                          {index + 1}
                        </span>
                        {index < dayBlocks.length - 1 && (
                          <span className="mt-1 w-px flex-1 bg-gray-200" />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">
                            {PROGRAM_BLOCK_LABELS[block.type]}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatTime(block.start_time)} –{" "}
                            {formatTime(block.end_time)}
                          </span>
                        </div>
                        <h3 className="mt-2 font-medium text-gray-900">
                          {block.title}
                        </h3>
                        {block.description && (
                          <p className="mt-1 text-sm leading-relaxed text-gray-600">
                            {block.description}
                          </p>
                        )}
                        {block.speakers.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {block.speakers.map((speaker) => (
                              <button
                                key={speaker.id}
                                type="button"
                                onClick={() => setSelected(speaker)}
                                className="flex items-center gap-2 rounded-full border border-gray-200 py-1 pl-1 pr-3 transition-colors hover:border-primary/40 hover:bg-slate-50"
                              >
                                {speaker.avatar_url ? (
                                  <Image
                                    src={speaker.avatar_url}
                                    alt={`${speaker.first_name} ${speaker.last_name}`}
                                    width={28}
                                    height={28}
                                    className="size-7 rounded-full object-cover"
                                  />
                                ) : (
                                  <span className="flex size-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-medium text-gray-600">
                                    {initials(
                                      speaker.first_name,
                                      speaker.last_name,
                                    )}
                                  </span>
                                )}
                                <span className="text-xs text-gray-700">
                                  {[
                                    speaker.title,
                                    speaker.first_name,
                                    speaker.last_name,
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </ExpandableSection>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={() => setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          {selected && (
            <div className="flex flex-col items-center text-center">
              <div className="relative size-24 overflow-hidden rounded-full bg-slate-100">
                {selected.avatar_url ? (
                  <Image
                    src={selected.avatar_url}
                    alt={`${selected.first_name} ${selected.last_name}`}
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
                  {[selected.first_name, selected.last_name]
                    .filter(Boolean)
                    .join(" ")}
                </DialogTitle>
                {selected.title && (
                  <DialogDescription className="font-medium text-primary">
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
    </>
  );
}
