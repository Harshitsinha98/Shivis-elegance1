"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  Gift,
  Sparkles,
  Heart,
  Coins,
  Wand2,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/shared/loading-screen";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { sendPhoneOtp, confirmPhoneOtp } from "@/lib/firebase/auth-actions";
import type { ConfirmationResult } from "firebase/auth";

type Step = "identifier" | "code";

/** Normalise a phone number to E.164 (defaults to +91). Emails are rejected. */
function classifyPhone(raw: string): string | null {
  const digits = raw.trim().replace(/[^\d+]/g, "");
  if (!/^\+?\d{10,14}$/.test(digits)) return null;
  return digits.startsWith("+") ? digits : `+91${digits.slice(-10)}`;
}

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") || "";
  const firebaseOn = isFirebaseConfigured();

  const [step, setStep] = useState<Step>("identifier");
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneValue, setPhoneValue] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  // Non-null while a Firebase SMS confirmation is in flight; null means we fell
  // back to the server dev-code path.
  const confirmation = useRef<ConfirmationResult | null>(null);

  const goToCodeStep = () => {
    setStep("code");
    setDigits(Array(6).fill(""));
    setTimeout(() => inputs.current[0]?.focus(), 50);
  };

  /** Request an OTP via the app's own server (SMS provider hook / dev code). */
  const requestServerOtp = async (phone: string) => {
    const res = await fetch("/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: phone }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Could not send the code.");
    confirmation.current = null;
    setDevCode(data.data.devCode ?? null);
  };

  // ── Request step ──────────────────────────────────────────────
  const requestOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      const phone = classifyPhone(phoneInput);
      if (!phone) {
        setError("Enter a valid 10-digit mobile number");
        return;
      }
      setPhoneValue(phone);

      if (firebaseOn) {
        try {
          confirmation.current = await sendPhoneOtp(phone, "recaptcha-container");
          setDevCode(null);
          goToCodeStep();
          return;
        } catch (err) {
          // Firebase SMS can fail when the Phone provider / billing isn't set up
          // in the console. Fall back to the server OTP so sign-in still works.
          // eslint-disable-next-line no-console
          console.warn("Firebase SMS failed, falling back to server OTP:", err);
        }
      }

      await requestServerOtp(phone);
      goToCodeStep();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Verify step ───────────────────────────────────────────────
  const verify = async (code: string) => {
    setError("");
    setLoading(true);
    try {
      let redirect = "/dashboard";
      if (confirmation.current) {
        ({ redirect } = await confirmPhoneOtp(confirmation.current, code));
      } else {
        const res = await fetch("/api/auth/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: phoneValue, code }),
        });
        const data = await res.json();
        if (!data.ok) {
          setError(data.error);
          setDigits(Array(6).fill(""));
          inputs.current[0]?.focus();
          return;
        }
        redirect = data.data.redirect;
      }
      router.push(redirectTo || redirect);
      router.refresh();
    } catch (err) {
      setError(friendlyError(err));
      setDigits(Array(6).fill(""));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const setDigit = (i: number, val: string) => {
    const v = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 5) inputs.current[i + 1]?.focus();
    if (next.every((d) => d) && next.join("").length === 6) verify(next.join(""));
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length) {
      e.preventDefault();
      const next = text.split("").concat(Array(6).fill("")).slice(0, 6);
      setDigits(next);
      if (text.length === 6) verify(text);
      else inputs.current[text.length]?.focus();
    }
  };

  return (
    <div className="grid w-full overflow-hidden rounded-[28px] border border-champagne/20 bg-pearl shadow-[var(--shadow-hover)] lg:grid-cols-[1.05fr_1fr]">
      <PromoPanel />

      {/* ── Right: phone / code ── */}
      <div className="flex flex-col justify-center px-7 py-10 sm:px-12">
        {step === "identifier" ? (
          <>
            <h1 className="font-display text-4xl leading-tight text-obsidian">
              Welcome to Shivis&nbsp;Elegance!
            </h1>
            <p className="mt-2 text-sm text-warm-gray">
              Login / Signup to unlock exclusive privileges
            </p>

            <form onSubmit={requestOtp} className="mt-8">
              <div className="flex items-center gap-1 rounded-full border border-border bg-blush/50 p-1.5 focus-within:border-wine/40">
                <span className="flex select-none items-center gap-1 rounded-full bg-pearl px-3 py-2.5 text-sm font-medium text-obsidian shadow-sm">
                  <span className="text-base leading-none">🇮🇳</span>
                  +91
                  <ChevronDown size={14} className="text-warm-gray" />
                </span>
                <input
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="Enter mobile number"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                  autoFocus
                  className="min-w-0 flex-1 bg-transparent px-3 text-[15px] tracking-wide text-obsidian placeholder:text-warm-gray/70 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="shrink-0 rounded-full bg-wine px-6 py-3 text-sm font-medium text-pearl shadow-sm transition hover:bg-wine-dark disabled:opacity-60"
                >
                  {loading ? <Spinner /> : "Request OTP"}
                </button>
              </div>
              {error && <p className="mt-3 pl-2 text-sm text-wine">{error}</p>}
            </form>

            <p className="mt-10 text-xs leading-relaxed text-warm-gray">
              By continuing, I agree to the{" "}
              <a href="/terms" className="font-medium text-wine hover:underline">
                Terms of Use
              </a>{" "}
              &amp;{" "}
              <a href="/privacy" className="font-medium text-wine hover:underline">
                Privacy Notice
              </a>
              .
            </p>
            <div id="recaptcha-container" />
          </>
        ) : (
          <>
            <button
              onClick={() => {
                setStep("identifier");
                setError("");
              }}
              className="mb-5 flex w-fit items-center gap-2 text-sm text-warm-gray transition hover:text-obsidian"
            >
              <ArrowLeft size={15} /> Back
            </button>

            <h1 className="font-display text-4xl leading-tight text-obsidian">
              Verify your number
            </h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-warm-gray">
              <Smartphone size={15} className="text-wine" /> Code sent to{" "}
              <span className="font-medium text-obsidian">{phoneValue || phoneInput}</span>
            </p>

            <div className="mt-8 flex gap-2 sm:gap-3" onPaste={onPaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputs.current[i] = el;
                  }}
                  value={d}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => onKey(i, e)}
                  inputMode="numeric"
                  maxLength={1}
                  aria-label={`Digit ${i + 1}`}
                  className="h-14 w-full rounded-xl border border-border bg-blush/40 text-center font-display text-2xl text-obsidian focus:border-wine focus:outline-none focus:ring-2 focus:ring-wine/25"
                />
              ))}
            </div>

            {error && <p className="mt-3 text-sm text-wine">{error}</p>}

            {devCode && (
              <div className="mt-4 rounded-xl border border-dashed border-wine/40 bg-blush px-4 py-3 text-sm">
                <span className="text-warm-gray">Demo mode — your code is </span>
                <button
                  onClick={() => verify(devCode)}
                  className="font-mono font-semibold tracking-widest text-wine hover:underline"
                >
                  {devCode}
                </button>
              </div>
            )}

            <button
              disabled={loading || digits.join("").length !== 6}
              onClick={() => verify(digits.join(""))}
              className="mt-6 w-full rounded-full bg-wine py-3.5 text-sm font-medium uppercase tracking-[0.12em] text-pearl transition hover:bg-wine-dark disabled:opacity-50"
            >
              {loading ? <Spinner /> : "Verify & continue"}
            </button>

            <button
              onClick={() => requestOtp()}
              disabled={loading}
              className="mt-4 w-full text-center text-sm text-wine hover:underline"
            >
              Resend code
            </button>
            <div id="recaptcha-container" />
          </>
        )}
      </div>
    </div>
  );
}

/** Left promotional panel — first-order reward + membership benefits. */
function PromoPanel() {
  const benefits = [
    { Icon: Coins, label: "Member rewards & coins" },
    { Icon: Heart, label: "Unlock your wishlist" },
    { Icon: Wand2, label: "Personalised styling" },
  ];
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-cream via-blush to-cream p-8 lg:flex lg:flex-col lg:justify-between">
      {/* sparkles */}
      <Sparkles className="absolute right-10 top-10 text-champagne/60" size={18} />
      <Sparkles className="absolute left-8 top-28 text-champagne/40" size={14} />
      <Sparkles className="absolute bottom-24 right-16 text-champagne/50" size={16} />

      <div className="mx-auto mt-2 grid h-40 w-40 place-items-center rounded-full bg-pearl/70 shadow-inner ring-1 ring-champagne/30">
        <div className="grid h-24 w-24 place-items-center rounded-2xl bg-gradient-to-br from-wine to-wine-dark text-champagne-light shadow-lg">
          <Gift size={46} strokeWidth={1.5} />
        </div>
      </div>

      {/* reward banner */}
      <div className="relative mx-auto mt-6 w-full max-w-xs rounded-2xl border border-champagne/40 bg-pearl/70 px-6 py-5 text-center backdrop-blur-sm">
        <p className="text-sm text-elegant-gray">On your first order get</p>
        <p className="font-display text-5xl font-semibold text-wine">
          ₹500 <span className="text-3xl tracking-wide">OFF</span>
        </p>
      </div>

      <div className="mt-8">
        <p className="text-center font-display text-2xl text-champagne-dark">
          And other benefits
        </p>
        <ul className="mt-4 grid gap-3">
          {benefits.map(({ Icon, label }) => (
            <li
              key={label}
              className="flex items-center gap-3 rounded-full bg-pearl/60 px-4 py-2.5 text-sm text-elegant-gray"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-wine/10 text-wine">
                <Icon size={15} />
              </span>
              {label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function friendlyError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-phone-number":
      return "That phone number looks invalid. Include your country code.";
    case "auth/invalid-verification-code":
      return "That code is incorrect. Please try again.";
    case "auth/code-expired":
      return "This code has expired. Please request a new one.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/quota-exceeded":
      return "SMS quota exceeded. Please try again later.";
    case "auth/billing-not-enabled":
      return "SMS sign-in isn't enabled yet. Please try again shortly.";
    default:
      return err instanceof Error && err.message.includes("configured")
        ? "Authentication is not configured."
        : err instanceof Error && err.message
          ? err.message
          : "Something went wrong. Please try again.";
  }
}
