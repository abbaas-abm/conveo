"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ResidenceStat } from "@/lib/data";

type Phase = "idle" | "countdown" | "revealed";

const COUNTDOWN_FROM = 5;

export function ResidencePresent({ stats }: { stats: ResidenceStat[] }) {
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [count, setCount] = React.useState(COUNTDOWN_FROM);

  const total = stats.reduce((sum, r) => sum + r.count, 0);
  const winner = stats[0] ?? null;
  const max = winner?.count ?? 1;
  const leaderboard = stats.slice(0, 6);
  const pct = (value: number) => (total ? Math.round((value / total) * 100) : 0);

  React.useEffect(() => {
    if (phase !== "countdown") return;
    if (count <= 0) {
      const t = setTimeout(() => setPhase("revealed"), 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, count]);

  function start() {
    setCount(COUNTDOWN_FROM);
    setPhase("countdown");
  }

  function reset() {
    setPhase("idle");
    setCount(COUNTDOWN_FROM);
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-primary text-white">
      {/* Thin gold rule under the top edge — the only decorative accent. */}
      <div className="h-1 w-full bg-[#d9b45b]" />

      <header className="flex items-center justify-between px-6 py-6 sm:px-10">
        <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/60">
          Wits Residence
        </span>
        <Link
          href="/admin/residence"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:border-white/40 hover:text-white"
        >
          <X className="size-3.5" />
          Exit
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-20">
        <AnimatePresence mode="wait">
          {phase === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-3xl text-center"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#d9b45b]">
                Residences
              </p>
              <h1 className="mt-6 text-4xl font-semibold leading-tight text-white text-balance sm:text-6xl">
                Which residence has the most attendees?
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-base text-white/60 sm:text-lg">
                {stats.length > 0
                  ? `${stats.length} residences`
                  : "No residence data yet."}
              </p>
              <Button
                onClick={start}
                disabled={stats.length === 0}
                className="mt-12 h-12 rounded-full border border-white/25 bg-transparent px-9 text-base font-semibold text-white hover:bg-white/10 hover:text-white"
              >
                Reveal
              </Button>
            </motion.div>
          )}

          {phase === "countdown" && (
            <motion.div
              key="countdown"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#d9b45b]">
                Revealing in
              </p>
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={count}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.3 }}
                  className="mt-3 text-[8rem] font-semibold leading-none tabular-nums text-white sm:text-[12rem]"
                >
                  {Math.max(count, 0)}
                </motion.span>
              </AnimatePresence>
              <div className="mt-12 h-px w-64 overflow-hidden bg-white/15 sm:w-80">
                <div
                  className="h-full bg-[#d9b45b] transition-[width] duration-1000 ease-linear"
                  style={{ width: `${(Math.max(count, 0) / COUNTDOWN_FROM) * 100}%` }}
                />
              </div>
            </motion.div>
          )}

          {phase === "revealed" && winner && (
            <motion.div
              key="revealed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-3xl"
            >
              <div className="text-center">
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="text-xs font-semibold uppercase tracking-[0.35em] text-[#d9b45b]"
                >
                  Most members
                </motion.p>
                <motion.h1
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="mt-5 text-5xl font-semibold leading-tight text-white text-balance sm:text-7xl"
                >
                  {winner.residence}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 text-2xl font-semibold tabular-nums text-white sm:text-3xl"
                >
                  {pct(winner.count)}%
                  <span className="ml-2 text-base font-normal text-white/50">
                    of residents
                  </span>
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-14 border-t border-white/10 pt-8"
              >
                <div className="space-y-4">
                  {leaderboard.map((r, i) => (
                    <div key={r.residence} className="flex items-center gap-4">
                      <span className="w-5 shrink-0 text-right text-sm tabular-nums text-white/35">
                        {i + 1}
                      </span>
                      <span className="w-40 shrink-0 truncate text-sm font-medium text-white sm:w-56">
                        {r.residence}
                      </span>
                      <span className="h-px flex-1 bg-white/10">
                        <span
                          className="block h-px bg-[#d9b45b]"
                          style={{ width: `${(r.count / max) * 100}%` }}
                        />
                      </span>
                      <span className="w-10 shrink-0 text-right text-sm tabular-nums text-white/70">
                        {pct(r.count)}%
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>

              <div className="mt-14 text-center">
                <Button
                  onClick={reset}
                  className="rounded-full border border-white/25 bg-transparent px-6 text-sm font-medium text-white hover:bg-white/10 hover:text-white"
                >
                  <RotateCcw className="size-4" />
                  Reveal again
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
