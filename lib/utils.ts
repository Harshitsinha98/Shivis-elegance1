import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a price given in the smallest currency unit (paise / cents).
 * e.g. formatPrice(1250000, "INR") -> "₹12,500"
 */
export function formatPrice(
  amountMinor: number,
  currency: "INR" | "USD" = "INR",
  opts: { withDecimals?: boolean } = {}
) {
  const amount = amountMinor / 100;
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: opts.withDecimals ? 2 : 0,
    maximumFractionDigits: opts.withDecimals ? 2 : 0,
  }).format(amount);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function discountPercent(price: number, compareAt?: number) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export function truncate(text: string, max = 120) {
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

/** Deterministic pseudo-random from a string seed (SSR-safe, no Math.random). */
export function seededPick<T>(seed: string, list: T[]): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return list[Math.abs(hash) % list.length];
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
