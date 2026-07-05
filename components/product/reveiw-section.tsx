"use client";

import { useState } from "react";
import type { Review } from "@/types/product";
import { formatDate } from "@/lib/utils";
import { Stars } from "@/components/shared/stars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

export function ReviewSection({
  reviews: initial,
  rating,
  reviewCount,
}: {
  reviews: Review[];
  rating: number;
  reviewCount: number;
}) {
  const [reviews, setReviews] = useState(initial);
  const [form, setForm] = useState({ author: "", title: "", body: "", rating: 5 });
  const [open, setOpen] = useState(false);

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));
  const total = reviews.length || 1;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.author || !form.body) return;
    setReviews((r) => [
      {
        id: `local-${r.length}`,
        productId: "local",
        author: form.author,
        rating: form.rating,
        title: form.title || "Review",
        body: form.body,
        createdAt: "2026-07-04T00:00:00.000Z",
        verified: false,
      },
      ...r,
    ]);
    setForm({ author: "", title: "", body: "", rating: 5 });
    setOpen(false);
  };

  return (
    <section className="border-t border-border pt-14">
      <h2 className="font-display text-3xl text-obsidian">Customer Reviews</h2>

      <div className="mt-8 grid gap-10 md:grid-cols-[280px_1fr]">
        <div>
          <div className="text-5xl font-light text-obsidian">{rating.toFixed(1)}</div>
          <Stars rating={rating} size={18} className="mt-2" />
          <p className="mt-1 text-sm text-warm-gray">Based on {reviewCount} reviews</p>

          <div className="mt-6 space-y-2">
            {distribution.map((d) => (
              <div key={d.star} className="flex items-center gap-2 text-xs text-warm-gray">
                <span className="w-3">{d.star}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-beige">
                  <div
                    className="h-full bg-champagne"
                    style={{ width: `${(d.count / total) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right">{d.count}</span>
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" className="mt-6" onClick={() => setOpen((o) => !o)}>
            Write a review
          </Button>
        </div>

        <div className="space-y-6">
          {open && (
            <form onSubmit={submit} className="space-y-4 rounded-xl border border-border p-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-warm-gray">Your rating:</span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, rating: n }))}
                    className="text-champagne"
                    aria-label={`${n} stars`}
                  >
                    <Stars rating={n <= form.rating ? 1 : 0} size={20} />
                  </button>
                ))}
              </div>
              <Input
                label="Name"
                value={form.author}
                onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                required
              />
              <Input
                label="Title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
              <Textarea
                label="Review"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                required
              />
              <Button type="submit" size="sm">Submit review</Button>
            </form>
          )}

          {reviews.map((r) => (
            <article key={r.id} className="border-b border-border pb-6 last:border-0">
              <div className="flex items-center justify-between">
                <Stars rating={r.rating} />
                {r.verified && <Badge tone="success">Verified purchase</Badge>}
              </div>
              <h4 className="mt-2 font-medium text-obsidian">{r.title}</h4>
              <p className="mt-1 text-sm leading-relaxed text-elegant-gray">{r.body}</p>
              <p className="mt-2 text-xs text-warm-gray">
                {r.author} · {formatDate(r.createdAt)}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
