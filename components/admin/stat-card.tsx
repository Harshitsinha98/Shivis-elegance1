"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  trend: string;
  icon: ReactNode;
  index: number;
}

export function StatCard({ label, value, trend, icon, index }: StatCardProps) {
  return (
    <motion.div
      className="rounded-2xl border border-border bg-pearl p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-hover)]"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-champagne/10">
          {icon}
        </span>
        <span className="text-xs text-champagne-dark">{trend}</span>
      </div>
      <p className="mt-4 font-display text-3xl text-obsidian">{value}</p>
      <p className="text-sm text-warm-gray">{label}</p>
    </motion.div>
  );
}
