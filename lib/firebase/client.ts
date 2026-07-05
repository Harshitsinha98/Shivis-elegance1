"use client";

/**
 * Firebase Web SDK singleton (client-side only).
 *
 * Powers passwordless sign-in: phone-number SMS OTP and email magic-links.
 * Reads the public web config from NEXT_PUBLIC_FIREBASE_* env vars. When those
 * are absent the helpers return null and the sign-in UI falls back to the local
 * dev-code flow, so the app still runs with zero setup.
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** True when the public Firebase web config is present. */
export const isFirebaseConfigured = (): boolean =>
  Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);

let cached: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;
  if (!cached) {
    cached = getApps().length
      ? getApp()
      : initializeApp(config as Required<typeof config>);
  }
  return cached;
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}
