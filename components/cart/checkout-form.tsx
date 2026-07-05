"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Wallet, Banknote, ShieldCheck, ArrowLeft, Mail, Smartphone } from "lucide-react";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/shared/loading-screen";
import { useCart } from "@/hooks/use-cart";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { sendPhoneOtp, confirmPhoneAndGetIdToken } from "@/lib/firebase/auth-actions";
import type { ConfirmationResult } from "firebase/auth";
import type { PaymentProvider } from "@/types/order";

const PAYMENT_METHODS: { id: PaymentProvider; label: string; desc: string; Icon: typeof CreditCard }[] = [
  { id: "razorpay", label: "Razorpay", desc: "UPI, cards, netbanking & wallets", Icon: Wallet },
  { id: "stripe", label: "Card (Stripe)", desc: "International credit/debit cards", Icon: CreditCard },
  { id: "cod", label: "Cash on delivery", desc: "Pay when it arrives (₹100 fee)", Icon: Banknote },
];

/** Razorpay Checkout is loaded on demand from their CDN. */
interface RazorpayCheckout {
  open(): void;
  on(event: string, handler: (resp: unknown) => void): void;
}
interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (resp: RazorpayHandlerResponse) => void;
  modal?: { ondismiss?: () => void };
}
interface RazorpayHandlerResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayCheckout;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

interface Me {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
}

/** Normalise a phone number to E.164 (defaults to +91). */
function toE164(raw: string): string | null {
  const digits = raw.trim().replace(/[^\d+]/g, "");
  if (!/^\+?\d{10,14}$/.test(digits)) return null;
  return digits.startsWith("+") ? digits : `+91${digits.slice(-10)}`;
}

const isSyntheticEmail = (email: string) => /@phone\.luxejewels$/i.test(email);

export function CheckoutForm() {
  const router = useRouter();
  const { items, totals, clear } = useCart();
  const firebaseOn = isFirebaseConfigured();

  const [method, setMethod] = useState<PaymentProvider>("razorpay");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  });

  // Auth state — decides whether we need to verify a guest before ordering.
  const [me, setMe] = useState<Me | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  // Guest OTP verification state.
  const [phase, setPhase] = useState<"form" | "verify">("form");
  const [emailCode, setEmailCode] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [emailDevCode, setEmailDevCode] = useState<string | null>(null);
  const [phoneDevCode, setPhoneDevCode] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);

  // Load the signed-in user (if any) and prefill their details.
  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        const user: Me | null = d?.data?.user ?? null;
        setMe(user);
        if (user) {
          setForm((f) => ({
            ...f,
            fullName: user.name && user.name !== "Shivis Elegance Member" ? user.name : f.fullName,
            email: user.email && !isSyntheticEmail(user.email) ? user.email : f.email,
            phone: user.phone ?? f.phone,
          }));
        }
      })
      .catch(() => {})
      .finally(() => active && setAuthLoaded(true));
    return () => {
      active = false;
    };
  }, []);

  const isVerifiedMember = Boolean(me && me.phone);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const finish = (orderNumber: string) => {
    clear();
    router.push(`/checkout/success?order=${orderNumber}`);
  };

  /** Open the Razorpay Checkout modal for a live order, then verify the payment. */
  const payWithRazorpay = async (
    orderNumber: string,
    payment: { id?: string; keyId?: string | null; amount?: number; currency?: string }
  ): Promise<boolean> => {
    const loaded = await loadRazorpayScript();
    if (!loaded || !window.Razorpay || !payment.id || !payment.keyId) {
      setError("Could not load the payment gateway. Please try again.");
      return false;
    }

    return new Promise<boolean>((resolve) => {
      const rzp = new window.Razorpay!({
        key: payment.keyId!,
        amount: payment.amount ?? totals.total,
        currency: payment.currency ?? "INR",
        order_id: payment.id!,
        name: "Shivis Elegance",
        description: `Order ${orderNumber}`,
        prefill: { name: form.fullName, email: form.email, contact: form.phone },
        theme: { color: "#C9A96E" },
        handler: async (resp) => {
          try {
            const verifyRes = await fetch("/api/payments/razorpay", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "verify",
                orderId: resp.razorpay_order_id,
                paymentId: resp.razorpay_payment_id,
                signature: resp.razorpay_signature,
                orderNumber,
              }),
            });
            const verify = await verifyRes.json();
            if (verify?.data?.verified) {
              finish(orderNumber);
              resolve(true);
            } else {
              setError("Payment could not be verified. If you were charged, contact support.");
              resolve(false);
            }
          } catch {
            setError("Payment verification failed. Please contact support.");
            resolve(false);
          }
        },
        modal: {
          ondismiss: () => {
            setError("Payment was cancelled. Your order is saved and unpaid.");
            resolve(false);
          },
        },
      });
      rzp.open();
    });
  };

  /** Create + pay for the order. Runs once the user is authenticated. */
  const placeOrder = async (): Promise<void> => {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({
          productId: i.productId,
          slug: i.slug,
          name: i.name,
          image: i.image,
          variantLabel: i.variantLabel,
          unitPrice: i.price,
          quantity: i.quantity,
        })),
        shippingAddress: form,
        paymentProvider: method,
        totals,
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      setError(data.error ?? "Could not place the order. Please try again.");
      setLoading(false);
      return;
    }

    const orderNumber: string = data.data?.number ?? "LJ-DEMO";
    const payment = data.data?.payment as
      | { id?: string; keyId?: string | null; amount?: number; currency?: string; mock?: boolean }
      | undefined;

    if (method === "razorpay" && payment?.keyId && payment.id) {
      const paid = await payWithRazorpay(orderNumber, payment);
      if (!paid) setLoading(false);
      return;
    }

    finish(orderNumber);
  };

  /** Send OTPs to the guest's phone (Firebase or server) and email (server). */
  const sendGuestOtps = async (): Promise<boolean> => {
    const phoneE164 = toE164(form.phone);
    if (!phoneE164) {
      setError("Enter a valid 10-digit mobile number.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Enter a valid email address.");
      return false;
    }

    // Email OTP — always via the app's own server.
    const emailRes = await fetch("/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: form.email }),
    });
    const emailData = await emailRes.json();
    if (!emailData.ok) {
      setError(emailData.error ?? "Could not send the email code.");
      return false;
    }
    setEmailDevCode(emailData.data?.devCode ?? null);

    // Phone OTP — Firebase SMS, falling back to the server OTP.
    setPhoneDevCode(null);
    setConfirmation(null);
    if (firebaseOn) {
      try {
        const conf = await sendPhoneOtp(phoneE164, "recaptcha-container-checkout");
        setConfirmation(conf);
        return true;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("Firebase SMS failed, falling back to server OTP:", err);
      }
    }
    const phoneRes = await fetch("/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: phoneE164 }),
    });
    const phoneData = await phoneRes.json();
    if (!phoneData.ok) {
      setError(phoneData.error ?? "Could not send the phone code.");
      return false;
    }
    setPhoneDevCode(phoneData.data?.devCode ?? null);
    return true;
  };

  // ── Address form submit ─────────────────────────────────────────
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Signed-in members: their mobile is already verified — order directly.
      if (isVerifiedMember) {
        await placeOrder();
        return;
      }
      // Guests: verify email + phone right here before creating the order.
      const sent = await sendGuestOtps();
      if (sent) {
        setPhase("verify");
        setEmailCode("");
        setPhoneCode("");
      }
      setLoading(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  // ── Guest verification submit ───────────────────────────────────
  const verifyAndOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (emailCode.trim().length !== 6 || phoneCode.trim().length !== 6) {
      setError("Enter both 6-digit codes.");
      return;
    }
    setLoading(true);
    try {
      const phoneE164 = toE164(form.phone)!;
      const payload: Record<string, unknown> = {
        name: form.fullName,
        email: form.email,
        emailCode: emailCode.trim(),
        phone: phoneE164,
        address: {
          line1: form.line1,
          line2: form.line2,
          city: form.city,
          state: form.state,
          postalCode: form.postalCode,
          country: form.country,
        },
      };

      // Prove the phone: Firebase idToken when available, else server OTP code.
      if (confirmation) {
        try {
          payload.idToken = await confirmPhoneAndGetIdToken(confirmation, phoneCode.trim());
        } catch {
          setError("The phone code is incorrect. Please try again.");
          setLoading(false);
          return;
        }
      } else {
        payload.phoneCode = phoneCode.trim();
      }

      const res = await fetch("/api/auth/guest-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Verification failed. Please try again.");
        setLoading(false);
        return;
      }

      // Account created + session set — now place the order as that user.
      setMe(data.data?.user ?? null);
      await placeOrder();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  // ── Guest verification screen ───────────────────────────────────
  if (phase === "verify") {
    return (
      <form onSubmit={verifyAndOrder} className="space-y-8">
        <button
          type="button"
          onClick={() => { setPhase("form"); setError(""); }}
          className="flex items-center gap-2 text-sm text-warm-gray hover:text-obsidian"
        >
          <ArrowLeft size={15} /> Back to details
        </button>

        <div>
          <h3 className="font-display text-2xl text-obsidian">Verify it&apos;s you</h3>
          <p className="mt-1 text-sm text-warm-gray">
            We&apos;ve sent a 6-digit code to your email and mobile. Enter both to
            confirm your order — your account will be created automatically.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <Input
              label="Email code"
              name="emailCode"
              inputMode="numeric"
              maxLength={6}
              placeholder="######"
              value={emailCode}
              onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              autoFocus
            />
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-warm-gray">
              <Mail size={13} /> Sent to {form.email}
            </p>
            {emailDevCode && (
              <button
                type="button"
                onClick={() => setEmailCode(emailDevCode)}
                className="mt-1 font-mono text-xs tracking-widest text-champagne-dark hover:underline"
              >
                Demo code: {emailDevCode}
              </button>
            )}
          </div>

          <div>
            <Input
              label="Mobile code"
              name="phoneCode"
              inputMode="numeric"
              maxLength={6}
              placeholder="######"
              value={phoneCode}
              onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-warm-gray">
              <Smartphone size={13} /> Sent to {form.phone}
            </p>
            {phoneDevCode && (
              <button
                type="button"
                onClick={() => setPhoneCode(phoneDevCode)}
                className="mt-1 font-mono text-xs tracking-widest text-champagne-dark hover:underline"
              >
                Demo code: {phoneDevCode}
              </button>
            )}
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" fullWidth disabled={loading}>
          {loading ? <Spinner /> : "Verify & place order"}
        </Button>
        <button
          type="button"
          onClick={async () => { setError(""); setLoading(true); await sendGuestOtps(); setLoading(false); }}
          disabled={loading}
          className="w-full text-center text-sm text-champagne-dark hover:underline"
        >
          Resend codes
        </button>
        <div id="recaptcha-container-checkout" />
      </form>
    );
  }

  // ── Address / contact form ──────────────────────────────────────
  return (
    <form onSubmit={submit} className="space-y-8">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-2xl text-obsidian">Contact</h3>
          {authLoaded && isVerifiedMember && (
            <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
              <ShieldCheck size={14} /> Mobile verified
            </span>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Full name" name="fullName" value={form.fullName} onChange={update("fullName")} required />
          <div>
            <Input
              label="Phone"
              name="phone"
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={update("phone")}
              required
              readOnly={isVerifiedMember}
              className={isVerifiedMember ? "opacity-70" : undefined}
            />
            {isVerifiedMember && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-green-700">
                <ShieldCheck size={13} /> Verified — no OTP needed
              </p>
            )}
          </div>
          <Input
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={update("email")}
            required
            className="sm:col-span-2"
          />
        </div>
        {authLoaded && !isVerifiedMember && (
          <p className="mt-3 text-xs text-warm-gray">
            Not signed in — we&apos;ll send a code to your email and mobile to
            confirm the order and create your account automatically.
          </p>
        )}
      </section>

      <section>
        <h3 className="mb-4 font-display text-2xl text-obsidian">Shipping address</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Address line 1" name="line1" value={form.line1} onChange={update("line1")} required className="sm:col-span-2" />
          <Input label="Address line 2" name="line2" value={form.line2} onChange={update("line2")} className="sm:col-span-2" />
          <Input label="City" name="city" value={form.city} onChange={update("city")} required />
          <Input label="State" name="state" value={form.state} onChange={update("state")} required />
          <Input label="Postal code" name="postalCode" value={form.postalCode} onChange={update("postalCode")} required />
          <Select label="Country" name="country" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}>
            <option>India</option>
            <option>United States</option>
            <option>United Arab Emirates</option>
            <option>United Kingdom</option>
          </Select>
        </div>
      </section>

      <section>
        <h3 className="mb-4 font-display text-2xl text-obsidian">Payment</h3>
        <div className="space-y-3">
          {PAYMENT_METHODS.map(({ id, label, desc, Icon }) => (
            <label
              key={id}
              className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition ${
                method === id ? "border-champagne bg-champagne/5" : "border-border hover:border-champagne/40"
              }`}
            >
              <input
                type="radio"
                name="payment"
                checked={method === id}
                onChange={() => setMethod(id)}
                className="accent-[var(--color-champagne)]"
              />
              <Icon size={20} className="text-champagne-dark" />
              <span className="flex-1">
                <span className="block text-sm font-medium text-obsidian">{label}</span>
                <span className="block text-xs text-warm-gray">{desc}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-warm-gray">
          Razorpay runs in test mode — use test card 4111 1111 1111 1111, any future
          expiry & CVV. No real charge is made.
        </p>
      </section>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" fullWidth disabled={loading || items.length === 0}>
        {loading ? <Spinner /> : isVerifiedMember ? "Place order" : "Continue to verification"}
      </Button>
      <div id="recaptcha-container-checkout" />
    </form>
  );
}
