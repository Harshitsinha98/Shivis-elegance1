"use client";

import { Check, Circle } from "lucide-react";
import type { OrderTimelineEvent } from "@/types/order";
import { formatDate } from "@/lib/utils";

/** Vertical status timeline for an order (file name kept from scaffold). */
export function OrderTimeline({ events }: { events: OrderTimelineEvent[] }) {
  return (
    <ol className="relative space-y-6 border-l border-border pl-6">
      {events.map((e) => (
        <li key={e.status} className="relative">
          <span
            className={`absolute -left-[31px] grid h-6 w-6 place-items-center rounded-full border ${
              e.done
                ? "border-champagne bg-champagne text-pearl"
                : "border-border bg-ivory text-warm-gray"
            }`}
          >
            {e.done ? <Check size={13} /> : <Circle size={8} />}
          </span>
          <p className={`text-sm font-medium ${e.done ? "text-obsidian" : "text-warm-gray"}`}>
            {e.label}
          </p>
          {e.at && <p className="text-xs text-warm-gray">{formatDate(e.at)}</p>}
        </li>
      ))}
    </ol>
  );
}
