"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Stars } from "@/components/shared/stars";
import { Badge } from "@/components/ui/badge";
import {
  approveReviewAction,
  deleteReviewAction,
  type ActionResult,
} from "@/lib/admin/actions";

export interface AdminReview {
  id: string;
  rating: number;
  title: string;
  body: string;
  author: string;
  createdAt: string;
  verified: boolean;
  approved?: boolean;
  productName?: string;
  productImage?: string;
}

export function ReviewsList({ reviews }: { reviews: AdminReview[] }) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-pearl p-12 text-center text-warm-gray">
        No reviews yet.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {reviews.map((r) => (
        <ReviewCard key={r.id} review={r} />
      ))}
    </div>
  );
}

function ReviewCard({ review: r }: { review: AdminReview }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const act = (fn: () => Promise<ActionResult>) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) alert(res.error);
      else router.refresh();
    });

  return (
    <div className="rounded-2xl border border-border bg-pearl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {r.productImage && (
            <img src={r.productImage} alt="" className="h-14 w-14 rounded-lg object-cover" />
          )}
          <div>
            <div className="flex items-center gap-3">
              <Stars rating={r.rating} />
              {r.verified && <Badge tone="success">Verified</Badge>}
              {r.approved ? (
                <Badge tone="gold">Approved</Badge>
              ) : (
                <Badge tone="muted">Pending</Badge>
              )}
            </div>
            <p className="mt-1 font-medium text-obsidian">{r.title}</p>
            <p className="text-sm text-warm-gray">
              {r.productName ?? "Unknown product"} · {r.author} · {formatDate(r.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!r.approved && (
            <button
              onClick={() => act(() => approveReviewAction(r.id))}
              disabled={pending}
              className="grid h-9 w-9 place-items-center rounded-lg border border-border text-green-600 hover:bg-green-50 disabled:opacity-40"
              aria-label="Approve"
            >
              <Check size={16} />
            </button>
          )}
          <button
            onClick={() => {
              if (confirm("Delete this review?")) act(() => deleteReviewAction(r.id));
            }}
            disabled={pending}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border text-red-500 hover:bg-red-50 disabled:opacity-40"
            aria-label="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-elegant-gray">{r.body}</p>
    </div>
  );
}
