"use client";

/**
 * Client helpers wrapping Firebase passwordless sign-in:
 *  - Phone  → SMS 6-digit OTP (invisible reCAPTCHA + signInWithPhoneNumber)
 *  - Email  → magic sign-in link (sendSignInLinkToEmail / signInWithEmailLink)
 *
 * After Firebase confirms identity we exchange the ID token for a Shivis Elegance
 * session cookie via POST /api/auth/session.
 */
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  type ConfirmationResult,
  type UserCredential,
} from "firebase/auth";
import { getFirebaseAuth } from "./client";

const EMAIL_KEY = "lj_emailForSignIn";

/** Establish the server session from a completed Firebase credential. */
async function exchangeSession(cred: UserCredential): Promise<{
  redirect: string;
}> {
  const idToken = await cred.user.getIdToken();
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Sign-in failed");
  return { redirect: data.data.redirect as string };
}

// ─────────────────────────────── phone ───────────────────────────────

let recaptcha: RecaptchaVerifier | null = null;

/**
 * Tear down any existing reCAPTCHA verifier. Firebase throws
 * "reCAPTCHA has already been rendered in this element" if you reuse a stale
 * verifier (e.g. after a failed send or when the container re-mounts), so we
 * always clear before creating a fresh one and after every failure.
 */
export function resetRecaptcha() {
  if (recaptcha) {
    try {
      recaptcha.clear();
    } catch {
      /* already gone */
    }
    recaptcha = null;
  }
}

/** Create a fresh invisible reCAPTCHA bound to the given container id. */
function freshRecaptcha(containerId: string): RecaptchaVerifier {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase is not configured");
  resetRecaptcha();
  recaptcha = new RecaptchaVerifier(auth, containerId, { size: "invisible" });
  return recaptcha;
}

/** Send an SMS OTP to an E.164 phone number; returns a confirmation handle. */
export async function sendPhoneOtp(
  phoneE164: string,
  recaptchaContainerId: string
): Promise<ConfirmationResult> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase is not configured");
  const verifier = freshRecaptcha(recaptchaContainerId);
  try {
    return await signInWithPhoneNumber(auth, phoneE164, verifier);
  } catch (err) {
    // A failed attempt leaves the verifier unusable — clear it so the next
    // try (or a fallback path) starts clean.
    resetRecaptcha();
    throw err;
  }
}

/** Confirm the SMS code and establish the session. */
export async function confirmPhoneOtp(
  confirmation: ConfirmationResult,
  code: string
): Promise<{ redirect: string }> {
  const cred = await confirmation.confirm(code);
  return exchangeSession(cred);
}

/**
 * Confirm the SMS code and return the Firebase ID token WITHOUT establishing a
 * session. Used by guest checkout, where the server verifies phone + email
 * together and creates the account itself.
 */
export async function confirmPhoneAndGetIdToken(
  confirmation: ConfirmationResult,
  code: string
): Promise<string> {
  const cred = await confirmation.confirm(code);
  return cred.user.getIdToken();
}

// ─────────────────────────────── email ───────────────────────────────

/** Send an email magic-link. The link returns to /auth/verify. */
export async function sendEmailLink(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase is not configured");
  const url = `${window.location.origin}/auth/verify`;
  await sendSignInLinkToEmail(auth, email, {
    url,
    handleCodeInApp: true,
  });
  window.localStorage.setItem(EMAIL_KEY, email);
}

/** True if the current URL is a Firebase email sign-in link. */
export function isEmailLink(url: string): boolean {
  const auth = getFirebaseAuth();
  return auth ? isSignInWithEmailLink(auth, url) : false;
}

/** Complete an email-link sign-in from the return URL and start the session. */
export async function completeEmailLink(
  url: string,
  fallbackEmail?: string
): Promise<{ redirect: string }> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase is not configured");
  const email =
    window.localStorage.getItem(EMAIL_KEY) || fallbackEmail || "";
  if (!email) throw new Error("MISSING_EMAIL");
  const cred = await signInWithEmailLink(auth, email, url);
  window.localStorage.removeItem(EMAIL_KEY);
  return exchangeSession(cred);
}

export const storedEmail = () =>
  typeof window !== "undefined"
    ? window.localStorage.getItem(EMAIL_KEY)
    : null;
