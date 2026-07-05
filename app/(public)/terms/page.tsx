import { PageHeader } from "@/components/shared/page-header";
import { SITE } from "@/lib/constants";

export const metadata = { title: "Terms of Service" };

const SECTIONS = [
  {
    h: "1. Overview",
    p: `These terms govern your use of ${SITE.name} and any purchase made through our website. By placing an order you accept these terms in full.`,
  },
  {
    h: "2. Products & pricing",
    p: "We take care to display products and prices accurately, but colours may vary by screen and errors may occasionally occur. We reserve the right to correct pricing errors and cancel affected orders with a full refund.",
  },
  {
    h: "3. Orders",
    p: "An order is confirmed once payment is authorised and you receive an order confirmation. We reserve the right to refuse or cancel any order.",
  },
  {
    h: "4. Shipping & risk",
    p: "Title and risk pass to you on delivery. All shipments are fully insured until signed for at the delivery address you provide.",
  },
  {
    h: "5. Returns",
    p: "Unworn pieces may be returned within 30 days in original condition and packaging. Engraved and bespoke items are non-returnable.",
  },
  {
    h: "6. Warranty",
    p: "Our pieces carry a lifetime warranty against manufacturing defects. The warranty does not cover normal wear, accidental damage or unauthorised repairs.",
  },
  {
    h: "7. Governing law",
    p: "These terms are governed by the laws of India, with exclusive jurisdiction of the courts of Mumbai, Maharashtra.",
  },
];

export default function TermsPage() {
  return (
    <>
      <PageHeader title="Terms of Service" eyebrow="Last updated July 2026" crumbs={[{ label: "Home", href: "/" }, { label: "Terms" }]} />
      <div className="container-luxe mx-auto max-w-3xl space-y-10 py-14">
        {SECTIONS.map((s) => (
          <section key={s.h}>
            <h2 className="font-display text-2xl text-obsidian">{s.h}</h2>
            <p className="mt-3 leading-relaxed text-elegant-gray">{s.p}</p>
          </section>
        ))}
      </div>
    </>
  );
}
