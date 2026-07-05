"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";

const FAQS = [
  {
    q: "Are your diamonds and gemstones certified?",
    a: "Yes. Every diamond over 0.30ct ships with a GIA or IGI certificate, and all gold is BIS hallmarked. Coloured gemstones include an origin report where applicable.",
  },
  {
    q: "What is your return and exchange policy?",
    a: "We offer 30-day returns on unworn pieces in their original packaging. Engraved and bespoke items are final sale. Returns are free and fully insured.",
  },
  {
    q: "Do you offer ring resizing?",
    a: "Complimentary resizing is included within 60 days of purchase, and available at a nominal charge thereafter for the lifetime of the piece.",
  },
  {
    q: "How is my order shipped?",
    a: "Orders are dispatched via fully insured, signature-required courier. Shipping is complimentary on orders over ₹5,000 and typically arrives in 2–5 business days.",
  },
  {
    q: "Do you make custom or bespoke jewellery?",
    a: "We do. Contact our concierge to begin a bespoke commission — from redesigning heirloom pieces to creating something entirely new.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept UPI, all major cards, netbanking and wallets via Razorpay, international cards via Stripe, and cash on delivery within India.",
  },
];

export default function FaqPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <>
      <PageHeader
        eyebrow="Good to know"
        title="Frequently Asked"
        crumbs={[{ label: "Home", href: "/" }, { label: "FAQ" }]}
      />
      <div className="container-luxe mx-auto max-w-3xl py-14">
        <div className="divide-y divide-border">
          {FAQS.map((f, i) => (
            <div key={i}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 py-6 text-left"
              >
                <span className="font-display text-xl text-obsidian">{f.q}</span>
                {open === i ? (
                  <Minus size={20} className="shrink-0 text-champagne-dark" />
                ) : (
                  <Plus size={20} className="shrink-0 text-champagne-dark" />
                )}
              </button>
              {open === i && (
                <p className="pb-6 leading-relaxed text-elegant-gray">{f.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
