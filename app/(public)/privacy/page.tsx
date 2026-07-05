import { PageHeader } from "@/components/shared/page-header";
import { SITE } from "@/lib/constants";

export const metadata = { title: "Privacy Policy" };

const SECTIONS = [
  {
    h: "Information we collect",
    p: "We collect the details you provide when creating an account, placing an order or contacting us — including your name, email, phone, shipping address and payment information. We also collect limited usage data to improve our storefront.",
  },
  {
    h: "How we use your information",
    p: "Your information is used to process orders, arrange insured delivery, provide customer support, and — where you have opted in — to send you news about new collections and private-sale previews.",
  },
  {
    h: "Payments",
    p: "Payment details are processed securely by our payment partners (Razorpay and Stripe). We never store full card numbers on our servers.",
  },
  {
    h: "Data sharing",
    p: "We share data only with the service providers required to fulfil your order (payment, shipping and media partners), and never sell your personal information to third parties.",
  },
  {
    h: "Your rights",
    p: `You may request access to, correction of, or deletion of your personal data at any time by writing to ${SITE.email}.`,
  },
  {
    h: "Cookies",
    p: "We use essential cookies to keep your bag and preferences, and optional analytics cookies you can decline.",
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHeader title="Privacy Policy" eyebrow="Last updated July 2026" crumbs={[{ label: "Home", href: "/" }, { label: "Privacy" }]} />
      <div className="container-luxe mx-auto max-w-3xl space-y-10 py-14">
        <p className="leading-relaxed text-elegant-gray">
          {SITE.name} respects your privacy. This policy explains what we collect, why,
          and the choices you have. By using our website you agree to the practices
          described below.
        </p>
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
