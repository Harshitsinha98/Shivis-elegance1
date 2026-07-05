"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { Stars } from "@/components/shared/stars";
import { TESTIMONIALS } from "@/lib/mock-data";

export function Testimonials() {
  const [i, setI] = useState(0);
  const t = TESTIMONIALS[i];
  const go = (dir: number) =>
    setI((prev) => (prev + dir + TESTIMONIALS.length) % TESTIMONIALS.length);

  return (
    <section className="container-luxe section-padding">
      <div className="mx-auto max-w-3xl text-center">
        <Quote size={40} className="mx-auto text-champagne" />
        <AnimatePresence mode="wait">
          <motion.blockquote
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.5 }}
            className="mt-8"
          >
            <p className="font-display text-2xl leading-snug text-obsidian md:text-3xl">
              “{t.quote}”
            </p>
            <div className="mt-6 flex flex-col items-center gap-2">
              <Stars rating={t.rating} size={16} />
              <p className="text-sm font-medium text-obsidian">{t.author}</p>
              <p className="text-xs uppercase tracking-[0.16em] text-warm-gray">{t.location}</p>
            </div>
          </motion.blockquote>
        </AnimatePresence>

        <div className="mt-10 flex items-center justify-center gap-4">
          <button
            onClick={() => go(-1)}
            aria-label="Previous"
            className="grid h-10 w-10 place-items-center rounded-full border border-border text-warm-gray transition hover:border-champagne hover:text-obsidian"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex gap-2">
            {TESTIMONIALS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                aria-label={`Go to testimonial ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  idx === i ? "w-6 bg-champagne" : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => go(1)}
            aria-label="Next"
            className="grid h-10 w-10 place-items-center rounded-full border border-border text-warm-gray transition hover:border-champagne hover:text-obsidian"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
