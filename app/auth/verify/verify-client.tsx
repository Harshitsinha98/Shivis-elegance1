"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/shared/loading-screen";
import {
  isEmailLink,
  completeEmailLink,
  storedEmail,
} from "@/lib/firebase/auth-actions";

/**
 * Completes an email magic-link sign-in. Firebase redirects the user here; we
 * finish the credential exchange and forward to the dashboard. If the link was
 * opened on a different device (so the email isn't in localStorage) we ask for
 * it before completing.
 */
export function EmailLinkVerify() {
  const router = useRouter();
  const [status, setStatus] = useState<"working" | "need-email" | "error">(
    "working"
  );
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const ran = useRef(false);

  const finish = async (fallbackEmail?: string) => {
    setStatus("working");
    setError("");
    try {
      const { redirect } = await completeEmailLink(
        window.location.href,
        fallbackEmail
      );
      router.push(redirect);
      router.refresh();
    } catch (err) {
      if (err instanceof Error && err.message === "MISSING_EMAIL") {
        setStatus("need-email");
        return;
      }
      setError("This sign-in link is invalid or has expired. Please try again.");
      setStatus("error");
    }
  };

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!isEmailLink(window.location.href)) {
      setError("This page completes email sign-in links.");
      setStatus("error");
      return;
    }
    if (storedEmail()) finish();
    else setStatus("need-email");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "need-email") {
    return (
      <div>
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-champagne/15">
          <Mail size={24} className="text-champagne-dark" />
        </div>
        <h1 className="font-display text-4xl text-obsidian">Confirm your email</h1>
        <p className="mt-2 text-sm text-warm-gray">
          Please re-enter the email address this link was sent to.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            finish(email);
          }}
          className="mt-6 space-y-4"
        >
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <Button type="submit" size="lg" fullWidth>
            Continue
          </Button>
        </form>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="text-center">
        <h1 className="font-display text-3xl text-obsidian">Sign-in failed</h1>
        <p className="mt-3 text-sm text-warm-gray">{error}</p>
        <Button className="mt-6" onClick={() => router.push("/auth/sign-in")}>
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <Spinner />
      <p className="text-sm text-warm-gray">Signing you in…</p>
    </div>
  );
}
