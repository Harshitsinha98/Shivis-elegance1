import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarsProps {
  rating: number;
  size?: number;
  className?: string;
  showValue?: boolean;
}

/** Read-only star rating display with fractional fill. */
export function Stars({ rating, size = 14, className, showValue }: StarsProps) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="inline-flex">
        {Array.from({ length: 5 }).map((_, i) => {
          const fill = Math.max(0, Math.min(1, rating - i));
          return (
            <span key={i} className="relative" style={{ width: size, height: size }}>
              <Star size={size} className="absolute inset-0 text-champagne/30" />
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star size={size} className="text-champagne" fill="currentColor" />
              </span>
            </span>
          );
        })}
      </span>
      {showValue && (
        <span className="text-xs text-warm-gray">{rating.toFixed(1)}</span>
      )}
    </span>
  );
}
