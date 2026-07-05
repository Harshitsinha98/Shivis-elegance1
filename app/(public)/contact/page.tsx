"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Check } from "lucide-react";
import { SITE } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <>
      <PageHeader
        eyebrow="We're here to help"
        title="Contact Concierge"
        subtitle="Questions about a piece, a custom commission, or an order? Our team responds within one business day."
        crumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]}
      />

      <section className="container-luxe grid gap-12 py-16 md:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl text-obsidian">Get in touch</h2>
          <ul className="mt-6 space-y-5 text-elegant-gray">
            <li className="flex items-start gap-4">
              <MapPin className="mt-1 text-champagne-dark" size={20} />
              <span>{SITE.address}</span>
            </li>
            <li className="flex items-center gap-4">
              <Phone className="text-champagne-dark" size={20} />
              <a href={`tel:${SITE.phone}`} className="hover:text-obsidian">{SITE.phone}</a>
            </li>
            <li className="flex items-center gap-4">
              <Mail className="text-champagne-dark" size={20} />
              <a href={`mailto:${SITE.email}`} className="hover:text-obsidian">{SITE.email}</a>
            </li>
          </ul>
          <div className="mt-8 rounded-2xl bg-cream p-6">
            <h3 className="font-display text-xl text-obsidian">Book a private appointment</h3>
            <p className="mt-2 text-sm text-warm-gray">
              Visit our Mumbai atelier for a one-to-one consultation with a master jeweller.
            </p>
          </div>
        </div>

        {sent ? (
          <div className="grid place-items-center rounded-2xl border border-border bg-pearl p-10 text-center">
            <Check size={40} className="text-champagne" />
            <h3 className="mt-4 font-display text-2xl text-obsidian">Message received</h3>
            <p className="mt-2 text-sm text-warm-gray">
              Thank you — our concierge will be in touch shortly.
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
            className="space-y-4 rounded-2xl border border-border bg-pearl p-8"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Name" name="name" required />
              <Input label="Email" name="email" type="email" required />
            </div>
            <Input label="Subject" name="subject" />
            <Textarea label="How can we help?" name="message" required />
            <Button type="submit" size="lg" fullWidth>
              Send message
            </Button>
          </form>
        )}
      </section>
    </>
  );
}
