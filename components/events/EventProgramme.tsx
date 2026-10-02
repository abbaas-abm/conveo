"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock, Lock, LockOpen, Users } from "lucide-react";
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

function speakerName(speaker: Speaker) {
  return [speaker.title, speaker.first_name, speaker.last_name]
    .filter(Boolean)
    .join(" ");
}

export function EventProgramme({
  program,
  isAuthenticated,
}: {
  program: ProgramBlockWithSpeakers[];
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [revealed, setRevealed] = React.useState(isAuthenticated);
  const [selectedSpeaker, setSelectedSpeaker] = React.useState<Speaker | null>(
    null,
  );
  const [selectedBlock, setSelectedBlock] =
    React.useState<ProgramBlockWithSpeakers | null>(null);

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
          collapsedClassName="max-h-[36rem]"
        >
          <div className="mt-6 space-y-10">
            {programDays.map(([day, dayBlocks]) => (
              <div key={day}>
                {programDays.length > 1 && (
                  <div className="mb-5 flex items-center gap-3">
                    <span className="inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white shadow-sm">
                      <span className="mr-2 size-1.5 rounded-full bg-[#d9b45b]" />
                      Day {day}
                    </span>
                    <span className="h-px flex-1 bg-gradient-to-r from-primary/40 via-[#d9b45b]/40 to-transparent" />
                  </div>
                )}
                <ol className="space-y-3">
                  {dayBlocks.map((block, index) => (
                    <li
                      key={block.id}
                      className="overflow-hidden rounded-xl bg-primary text-white shadow-sm ring-1 ring-black/5"
                    >
                      <div className="flex gap-4 p-4 sm:p-5">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-base font-semibold text-white">
                          {index + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#d9b45b]">
                              <Clock className="size-3.5" />
                              {formatTime(block.start_time)} –{" "}
                              {formatTime(block.end_time)}
                            </span>
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
                              {PROGRAM_BLOCK_LABELS[block.type]}
                            </span>
                          </div>

                          <h3 className="mt-2 font-semibold leading-snug text-white">
                            {block.title}
                          </h3>

                          {block.description && (
                            <p className="mt-1 line-clamp-1 text-sm text-white/70">
                              {block.description}
                            </p>
                          )}

                          <div className="mt-3 flex items-end justify-between gap-3">
                            <div className="flex min-w-0 items-center -space-x-2">
                              {block.speakers.slice(0, 4).map((speaker) => (
                                <span
                                  key={speaker.id}
                                  className="relative size-7 overflow-hidden rounded-full border-2 border-primary bg-white/10"
                                  title={speakerName(speaker)}
                                >
                                  {speaker.avatar_url ? (
                                    <Image
                                      src={speaker.avatar_url}
                                      alt={speakerName(speaker)}
                                      fill
                                      sizes="28px"
                                      className="object-cover"
                                    />
                                  ) : (
                                    <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-[#d9b45b]">
                                      {initials(
                                        speaker.first_name,
                                        speaker.last_name,
                                      )}
                                    </span>
                                  )}
                                </span>
                              ))}
                              {block.speakers.length > 4 && (
                                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-white/10 text-[10px] font-semibold text-white/80">
                                  +{block.speakers.length - 4}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedBlock(block)}
                              className="shrink-0 text-xs font-semibold text-white underline decoration-white/40 underline-offset-4 transition-colors hover:decoration-white"
                            >
                              Read more
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </ExpandableSection>
      )}

      {/* Programme block detail */}
      <Dialog
        open={Boolean(selectedBlock)}
        onOpenChange={() => setSelectedBlock(null)}
      >
        <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
          {selectedBlock && (
            <>
              <div className="bg-primary px-6 py-5 text-white">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#d9b45b]">
                    <CalendarDays className="size-3.5" />
                    Day {selectedBlock.day_number}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#d9b45b]">
                    <Clock className="size-3.5" />
                    {formatTime(selectedBlock.start_time)} –{" "}
                    {formatTime(selectedBlock.end_time)}
                  </span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
                    {PROGRAM_BLOCK_LABELS[selectedBlock.type]}
                  </span>
                </div>
                <DialogHeader className="mt-3 space-y-1 text-left">
                  <DialogTitle className="text-xl leading-snug text-white">
                    {selectedBlock.title}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Session details for {selectedBlock.title}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="max-h-[60vh] space-y-6 overflow-y-auto px-6 py-5">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    About this session
                  </h4>
                  {selectedBlock.description ? (
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-700">
                      {selectedBlock.description}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm italic text-muted-foreground">
                      No description provided.
                    </p>
                  )}
                </div>

                {selectedBlock.speakers.length > 0 && (
                  <div>
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <Users className="size-3.5" />
                      Speakers
                    </h4>
                    <div className="mt-3 space-y-2">
                      {selectedBlock.speakers.map((speaker) => (
                        <button
                          key={speaker.id}
                          type="button"
                          onClick={() => {
                            setSelectedBlock(null);
                            setSelectedSpeaker(speaker);
                          }}
                          className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:border-primary/40 hover:bg-slate-50"
                        >
                          <span className="relative size-10 shrink-0 overflow-hidden rounded-full bg-slate-100">
                            {speaker.avatar_url ? (
                              <Image
                                src={speaker.avatar_url}
                                alt={speakerName(speaker)}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-primary">
                                {initials(
                                  speaker.first_name,
                                  speaker.last_name,
                                )}
                              </span>
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-gray-900">
                              {[speaker.first_name, speaker.last_name]
                                .filter(Boolean)
                                .join(" ")}
                            </span>
                            {speaker.title && (
                              <span className="mt-0.5 block truncate text-xs text-gray-500">
                                {speaker.title}
                              </span>
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Speaker profile */}
      <Dialog
        open={Boolean(selectedSpeaker)}
        onOpenChange={() => setSelectedSpeaker(null)}
      >
        <DialogContent className="sm:max-w-md">
          {selectedSpeaker && (
            <div className="flex flex-col items-center text-center">
              <div className="relative size-24 overflow-hidden rounded-full bg-slate-100">
                {selectedSpeaker.avatar_url ? (
                  <Image
                    src={selectedSpeaker.avatar_url}
                    alt={`${selectedSpeaker.first_name} ${selectedSpeaker.last_name}`}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-primary">
                    {initials(
                      selectedSpeaker.first_name,
                      selectedSpeaker.last_name,
                    )}
                  </span>
                )}
              </div>

              <DialogHeader className="mt-4 items-center space-y-1">
                <DialogTitle className="text-xl">
                  {[selectedSpeaker.first_name, selectedSpeaker.last_name]
                    .filter(Boolean)
                    .join(" ")}
                </DialogTitle>
                {selectedSpeaker.title && (
                  <DialogDescription className="font-medium text-primary">
                    {selectedSpeaker.title}
                  </DialogDescription>
                )}
              </DialogHeader>

              {selectedSpeaker.bio ? (
                <p className="mt-4 text-sm leading-relaxed text-gray-600">
                  {selectedSpeaker.bio}
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
