"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Info, Lock, X } from "lucide-react";
import { cn, formatTime, initials } from "@/lib/utils";
import { hasMarkup, sanitizeHtml } from "@/lib/rich-text";
import { PROGRAM_BLOCK_LABELS } from "@/lib/program";
import type { Speaker, EventFeatured } from "@/lib/types";
import type { ProgramBlockWithSpeakers } from "@/lib/data";

interface EnabledSections {
  about: boolean;
  programme: boolean;
  speakers: boolean;
  featured: boolean;
}

interface EventSideTabsProps {
  enabled: EnabledSections;
  about: { description: string | null; about: string | null };
  program: ProgramBlockWithSpeakers[];
  speakers: Speaker[];
  featured: EventFeatured[];
  isAuthenticated: boolean;
  eventId: string;
}

const SECTIONS = [
  { key: "about", label: "About event", color: "#003366" },
  { key: "programme", label: "Programme agenda", color: "#C59B27" },
  { key: "speakers", label: "Speakers & facilitators", color: "#003366" },
  { key: "featured", label: "Featured", color: "#C59B27" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

export function EventSideTabs({
  enabled,
  about,
  program,
  speakers,
  featured,
  isAuthenticated,
  eventId,
}: EventSideTabsProps) {
  const [openKey, setOpenKey] = React.useState<SectionKey | null>(null);
  const [notchesOpen, setNotchesOpen] = React.useState(false);

  const tabs = SECTIONS.filter((section) => enabled[section.key]);
  const open = tabs.find((tab) => tab.key === openKey) ?? null;

  // Open by default on desktop, closed by default on mobile.
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    queueMicrotask(() => setNotchesOpen(mq.matches));
    const onChange = (event: MediaQueryListEvent) =>
      setNotchesOpen(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  React.useEffect(() => {
    if (!openKey) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenKey(null);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openKey]);

  if (tabs.length === 0) return null;

  const renderNotch = (tab: (typeof SECTIONS)[number]) => (
    <button
      key={tab.key}
      type="button"
      onClick={() => setOpenKey(tab.key)}
      aria-label={`Open ${tab.label}`}
      style={{ backgroundColor: tab.color }}
      className="flex items-center rounded-r-lg py-3.5 pl-1.5 pr-2 text-white shadow-lg ring-1 ring-black/5 transition-all duration-200 hover:pr-3.5 hover:shadow-xl"
    >
      <span className="rotate-180 text-[11px] font-semibold uppercase tracking-wider [writing-mode:vertical-rl]">
        {tab.label}
      </span>
    </button>
  );

  return (
    <>
      {/* Info toggle button (all screen sizes) */}
      <button
        type="button"
        onClick={() => setNotchesOpen((value) => !value)}
        aria-label={notchesOpen ? "Close section menu" : "Open section menu"}
        className="fixed right-4 top-60 z-40 flex size-12 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105"
      >
        {notchesOpen ? <X className="size-5" /> : <Info className="size-5" />}
      </button>

      {/* Desktop notches — open by default */}
      <AnimatePresence>
        {notchesOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed left-0 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-start gap-2 lg:flex"
          >
            {tabs.map(renderNotch)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile notches — start below the navbar and scroll if tall */}
      <AnimatePresence>
        {notchesOpen && (
          <motion.div
            initial={{ x: -160, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -160, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed left-0 top-20 z-40 flex max-h-[calc(100dvh-6.5rem)] flex-col items-start gap-2 overflow-y-auto lg:hidden"
          >
            {tabs.map(renderNotch)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-colour, blended section panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key={open.key}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] overflow-y-auto"
            style={{ backgroundColor: open.color }}
          >
            <div className="mx-auto max-w-2xl px-5 pb-24 pt-20 sm:px-8 sm:pt-24">
              <div className="flex items-start justify-between gap-4">
                <motion.h2
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-2xl font-semibold text-white sm:text-3xl"
                >
                  {open.label}
                </motion.h2>
                <button
                  type="button"
                  onClick={() => setOpenKey(null)}
                  aria-label="Close section"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
                >
                  <X className="size-5" />
                </button>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
                className="mt-8"
              >
                {open.key === "about" && <AboutContent {...about} />}
                {open.key === "programme" &&
                  (isAuthenticated ? (
                    <ProgrammeContent program={program} />
                  ) : (
                    <LockedProgramme eventId={eventId} />
                  ))}
                {open.key === "speakers" && <SpeakersContent speakers={speakers} />}
                {open.key === "featured" && <FeaturedContent featured={featured} />}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-white/70">{children}</p>;
}

function LockedProgramme({ eventId }: { eventId: string }) {
  return (
    <div className="flex flex-col items-center gap-5 py-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-white/15">
        <Lock className="size-6 text-white" />
      </span>
      <div>
        <p className="text-base font-semibold text-white">
          The programme is locked
        </p>
        <p className="mt-1 text-sm leading-relaxed text-white/80">
          Sign in to view the full agenda for this event.
        </p>
      </div>
      <Link
        href={`/login?redirectTo=${encodeURIComponent(`/events/${eventId}`)}`}
        className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-slate-100"
      >
        Sign in
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

function AboutContent({
  description,
  about,
}: {
  description: string | null;
  about: string | null;
}) {
  if (!description && !about) {
    return <Empty>Full event details will be published shortly.</Empty>;
  }
  return (
    <div className="space-y-4">
      {description && (
        <p className="text-base leading-relaxed text-white/90">{description}</p>
      )}
      {about &&
        (hasMarkup(about) ? (
          <div
            className="prose prose-invert max-w-none prose-a:text-[#f0d98a] prose-headings:text-white prose-strong:text-white"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(about) }}
          />
        ) : (
          <p className="whitespace-pre-line text-base leading-relaxed text-white/90">
            {about}
          </p>
        ))}
    </div>
  );
}

function ProgrammeContent({ program }: { program: ProgramBlockWithSpeakers[] }) {
  if (program.length === 0) {
    return <Empty>The programme for this event is being finalised.</Empty>;
  }

  const days = Array.from(
    program
      .reduce((map, block) => {
        const list = map.get(block.day_number) ?? [];
        list.push(block);
        map.set(block.day_number, list);
        return map;
      }, new Map<number, ProgramBlockWithSpeakers[]>())
      .entries(),
  ).sort((a, b) => a[0] - b[0]);

  return (
    <div className="space-y-10">
      {days.map(([day, blocks]) => (
        <div key={day}>
          {days.length > 1 && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/60">
              Day {day}
            </p>
          )}
          <ol className="divide-y divide-white/15">
            {blocks.map((block) => (
              <li key={block.id} className="py-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/70">
                  <span className="font-semibold text-white">
                    {formatTime(block.start_time)} – {formatTime(block.end_time)}
                  </span>
                  <span className="rounded-full bg-white/15 px-2 py-0.5 font-medium uppercase tracking-wide">
                    {PROGRAM_BLOCK_LABELS[block.type]}
                  </span>
                </div>
                <h3 className="mt-1.5 text-base font-semibold text-white">
                  {block.title}
                </h3>
                {block.description && (
                  <p className="mt-1 text-sm leading-relaxed text-white/75">
                    {block.description}
                  </p>
                )}
                {block.speakers.length > 0 && (
                  <p className="mt-1.5 text-xs text-white/60">
                    {block.speakers
                      .map((speaker) =>
                        [speaker.first_name, speaker.last_name]
                          .filter(Boolean)
                          .join(" "),
                      )
                      .join(", ")}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

function SpeakersContent({ speakers }: { speakers: Speaker[] }) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  if (speakers.length === 0) {
    return <Empty>Speakers and facilitators will be announced soon.</Empty>;
  }

  const ordered = [...speakers].sort((a, b) => {
    const aOrder = a.speaker_order ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.speaker_order ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.created_at.localeCompare(b.created_at);
  });

  return (
    <ul className="divide-y divide-white/15">
      {ordered.map((speaker) => {
        const name =
          [speaker.first_name, speaker.last_name].filter(Boolean).join(" ") ||
          "Speaker";
        const expanded = expandedId === speaker.id;
        const isLong = (speaker.bio?.length ?? 0) > 140;
        return (
          <li key={speaker.id} className="flex gap-4 py-4">
            <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 text-sm font-semibold text-white">
              {speaker.avatar_url ? (
                <Image
                  src={speaker.avatar_url}
                  alt={name}
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              ) : (
                initials(speaker.first_name, speaker.last_name)
              )}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-white">{name}</p>
              {speaker.title && (
                <p className="text-sm text-[#f0d98a]">{speaker.title}</p>
              )}
              {speaker.bio && (
                <>
                  <p
                    className={cn(
                      "mt-1 text-sm leading-relaxed text-white/75",
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
                      className="mt-1.5 text-xs font-semibold text-white hover:underline"
                    >
                      {expanded ? "Show less" : "Read more"}
                    </button>
                  )}
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function FeaturedContent({ featured }: { featured: EventFeatured[] }) {
  if (featured.length === 0) {
    return <Empty>The event organizers are still working on this.</Empty>;
  }

  return (
    <ul className="space-y-8">
      {featured.map((item) => (
        <li key={item.id}>
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-black/20">
            <Image
              src={item.image_url}
              alt={item.title}
              fill
              sizes="(max-width: 768px) 100vw, 640px"
              className="object-cover"
            />
          </div>
          <h3 className="mt-3 text-lg font-semibold text-white">
            {item.title}
          </h3>
          {item.description && (
            <p className="mt-1 text-sm leading-relaxed text-white/80">
              {item.description}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
