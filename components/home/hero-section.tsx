"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

const IMG = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=2000&q=80`;

const SLIDES = [
  {
    image: IMG("photo-1515562141207-7a88fb7ce338"),
    eyebrow: "The 2026 Collection",
    title: "Jewellery made to be inherited",
    description:
      "Ethically sourced diamonds and 18K gold, handcrafted into pieces you'll pass down for generations.",
    ctaLabel: "Shop the collection",
    ctaHref: "/shop",
  },
  {
    image: IMG("photo-1599643478518-a784e5dc4c8f"),
    eyebrow: "Bridal Edit",
    title: "Say forever in fine gold",
    description:
      "Rivière necklaces and solitaire sets designed for the most important day of your life.",
    ctaLabel: "Explore bridal",
    ctaHref: "/collections",
  },
  {
    image: IMG("photo-1605100804763-247f67b3557e"),
    eyebrow: "New Arrivals",
    title: "Statement rings for everyday luxury",
    description:
      "Cocktail rings and eternity bands crafted with certified diamonds and rhodium-finished settings.",
    ctaLabel: "Shop new arrivals",
    ctaHref: "/new-arrivals",
  },
  {
    image: IMG("photo-1535632066927-ab7c9ab60908"),
    eyebrow: "Best Sellers",
    title: "Earrings that catch the light",
    description:
      "From everyday studs to chandelier drops — our most loved silhouettes, reimagined.",
    ctaLabel: "Shop best sellers",
    ctaHref: "/best-sellers",
  },
];

const AUTOPLAY_MS = 6000;

export function HeroSection() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback((next: number) => {
    setDirection(next > index ? 1 : -1);
    setIndex((next + SLIDES.length) % SLIDES.length);
  }, [index]);

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setDirection(1);
      setIndex((i) => (i + 1) % SLIDES.length);
    }, AUTOPLAY_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [index]);

  const slide = SLIDES[index];

  return (
    <section className="relative flex min-h-[100dvh] items-center overflow-hidden sm:min-h-[92vh]">
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={index}
          custom={direction}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={(_, info) => {
            if (info.offset.x < -60) next();
            else if (info.offset.x > 60) prev();
          }}
        >
          <img
            src={slide.image}
            alt={slide.title}
            draggable={false}
            className="h-full w-full select-none object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-obsidian/70 via-obsidian/30 to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="container-luxe relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-xl text-ivory"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-champagne-light">
              {slide.eyebrow}
            </p>
            <h1 className="mt-4 font-display text-3xl leading-[1.1] sm:text-5xl md:text-7xl">
              {slide.title}
            </h1>
            <p className="mt-4 max-w-md text-sm text-ivory/80 sm:mt-6 sm:text-lg">
              {slide.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-3 sm:mt-10 sm:gap-4">
              <ButtonLink href={slide.ctaHref} size="lg" className="h-11 px-6 text-xs sm:h-14 sm:px-9 sm:text-sm">
                {slide.ctaLabel}
              </ButtonLink>
              <ButtonLink
                href="/collections"
                size="lg"
                variant="outline"
                className="h-11 border-ivory/40 px-6 text-xs text-ivory hover:border-champagne-light hover:text-champagne-light sm:h-14 sm:px-9 sm:text-sm"
              >
                Explore collections
              </ButtonLink>
            </div>

            <div className="mt-6 flex items-center gap-3 sm:mt-10">
              <div className="flex gap-0.5 text-champagne-light">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
                ))}
              </div>
              <p className="text-sm text-ivory/80">
                4.9/5 from 2,000+ customers
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Arrow controls — bottom corners on small screens (clear of the text column), vertically centered from lg up */}
      <button
        onClick={prev}
        aria-label="Previous slide"
        className="absolute bottom-6 left-4 z-10 rounded-full bg-ivory/10 p-2 text-ivory backdrop-blur-sm transition hover:bg-ivory/20 sm:left-8 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:p-2.5"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={next}
        aria-label="Next slide"
        className="absolute bottom-6 right-4 z-10 rounded-full bg-ivory/10 p-2 text-ivory backdrop-blur-sm transition hover:bg-ivory/20 sm:right-8 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:p-2.5"
      >
        <ChevronRight size={20} />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2 sm:bottom-16 sm:gap-2.5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === index ? "w-7 bg-champagne-light" : "w-2 bg-ivory/40 hover:bg-ivory/60"
            }`}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 1 }}
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-ivory/70 sm:block"
      >
        Scroll to discover
      </motion.div>
    </section>
  );
}
