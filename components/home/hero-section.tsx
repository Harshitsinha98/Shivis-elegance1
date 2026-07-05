"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative flex min-h-[92vh] items-center overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=2000&q=80"
          alt="Shivis Elegance fine jewellery"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-obsidian/70 via-obsidian/30 to-transparent" />
      </div>

      <div className="container-luxe relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl text-ivory"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-champagne-light">
            The 2026 Collection
          </p>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] md:text-7xl">
            Jewellery made to be inherited
          </h1>
          <p className="mt-6 max-w-md text-lg text-ivory/80">
            Ethically sourced diamonds and 18K gold, handcrafted into pieces you'll
            pass down for generations.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <ButtonLink href="/shop" size="lg">
              Shop the collection
            </ButtonLink>
            <ButtonLink
              href="/collections"
              size="lg"
              variant="outline"
              className="border-ivory/40 text-ivory hover:border-champagne hover:text-champagne"
            >
              Explore collections
            </ButtonLink>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-10 flex items-center gap-3"
          >
            <div className="flex gap-0.5 text-champagne-light">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
              ))}
            </div>
            <p className="text-sm text-ivory/80">
              4.9/5 from 2,000+ customers
            </p>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-ivory/70"
      >
        Scroll to discover
      </motion.div>
    </section>
  );
}
