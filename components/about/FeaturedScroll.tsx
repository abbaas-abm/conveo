"use client";

import * as React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { EventFeatured } from "@/lib/types";

/**
 * Alternating image/content rows that animate into view on scroll
 * (image left → text right, then image right → text left, …).
 */
export function FeaturedScroll({ items }: { items: EventFeatured[] }) {
  return (
    <div className="space-y-16 sm:space-y-24">
      {items.map((item, index) => {
        const reversed = index % 2 === 1;
        return (
          <div
            key={item.id}
            className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16"
          >
            <motion.div
              initial={{ opacity: 0, x: reversed ? 48 : -48 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={cn(
                "relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-gray-200 shadow-xl",
                reversed && "lg:order-2",
              )}
            >
              <Image
                src={item.image_url}
                alt={item.title}
                fill
                sizes="(max-width: 1024px) 100vw, 560px"
                className="object-cover"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: reversed ? -48 : 48 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.08 }}
              className={cn(reversed && "lg:order-1")}
            >
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C59B27]">
                Featured
              </span>
              <h3 className="mt-3 text-2xl font-semibold leading-tight text-gray-900 sm:text-3xl">
                {item.title}
              </h3>
              {item.description && (
                <p className="mt-4 text-base leading-relaxed text-gray-600">
                  {item.description}
                </p>
              )}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
