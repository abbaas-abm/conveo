"use client";

import * as React from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { EventFeatured } from "@/lib/types";

export function EventFeatured({ items }: { items: EventFeatured[] }) {
  const [index, setIndex] = React.useState(0);
  const [selected, setSelected] = React.useState<EventFeatured | null>(null);
  const count = items.length;

  React.useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => clearInterval(id);
  }, [count]);

  if (count === 0) return null;

  const safeIndex = Math.min(index, count - 1);
  const current = items[safeIndex];

  function go(delta: number) {
    setIndex((i) => (i + delta + count) % count);
  }

  return (
    <>
      <Card className="overflow-hidden border-gray-200 p-0">
        <div className="grid md:grid-cols-2">
          <button
            type="button"
            onClick={() => setSelected(current)}
            className="relative aspect-[3/2] w-full overflow-hidden bg-slate-100 md:aspect-auto md:min-h-[280px]"
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={current.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="absolute inset-0"
              >
                <Image
                  src={current.image_url}
                  alt={current.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </motion.span>
            </AnimatePresence>
          </button>

          <div className="flex flex-col justify-center p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#C59B27]">
              Featured
            </p>

            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <h3 className="mt-2 text-xl font-semibold text-gray-900">
                  {current.title}
                </h3>
                {current.description && (
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-600">
                    {current.description}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setSelected(current)}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Read more
                  <ArrowRight className="size-4" />
                </button>
              </motion.div>
            </AnimatePresence>

            {count > 1 && (
              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Previous featured moment"
                  className="flex size-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <div className="flex items-center gap-1.5">
                  {items.map((item, i) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setIndex(i)}
                      aria-label={`Go to featured ${i + 1}`}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        i === safeIndex
                          ? "w-6 bg-primary"
                          : "w-1.5 bg-gray-300 hover:bg-gray-400",
                      )}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Next featured moment"
                  className="flex size-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={() => setSelected(null)}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-2xl">
          {selected && (
            <div className="grid md:grid-cols-2">
              <div className="relative aspect-[3/2] w-full bg-slate-100 md:aspect-auto md:min-h-[320px]">
                <Image
                  src={selected.image_url}
                  alt={selected.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#C59B27]">
                  Featured
                </p>
                <DialogHeader className="mt-2 space-y-1 text-left">
                  <DialogTitle className="text-xl leading-snug">
                    {selected.title}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Details for {selected.title}
                  </DialogDescription>
                </DialogHeader>
                {selected.description ? (
                  <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-gray-600">
                    {selected.description}
                  </p>
                ) : (
                  <p className="mt-4 text-sm italic text-muted-foreground">
                    No further details.
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
