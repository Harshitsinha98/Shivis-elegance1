import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "gold" | "dark" | "muted" | "success" | "danger" | "outline";

const tones: Record<Tone, string> = {
  gold: "bg-champagne/20 text-champagne-dark",
  dark: "bg-obsidian text-ivory",
  muted: "bg-beige text-warm-gray",
  success: "bg-green-100 text-green-700",
  danger: "bg-red-100 text-red-600",
  outline: "border border-border text-warm-gray",
};

export function Badge({
  className,
  tone = "gold",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em]",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
