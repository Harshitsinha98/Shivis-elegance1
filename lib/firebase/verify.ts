/**
 * Server-side Firebase ID-token verification via the Identity Toolkit REST API.
 *
 * The app avoids heavy SDKs (payments talk to Stripe/Razorpay over REST too),
 * so instead of firebase-admin we validate the client's ID token by asking
 * Google to look it up with the public web API key. Google rejects tampered or
 * expired tokens, and the response gives us the verified email / phone number.
 *
 * Requires only NEXT_PUBLIC_FIREBASE_API_KEY — no service-account JSON.
 */
const LOOKUP_ENDPOINT =
  "https://identitytoolkit.googleapis.com/v1/accounts:lookup";

export interface FirebaseUserInfo {
  uid: string;
  email?: string;
  emailVerified: boolean;
  phone?: string;
}

export const isFirebaseServerConfigured = (): boolean =>
  Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

/** Verify a Firebase ID token; returns the account info or null when invalid. */
export async function verifyFirebaseIdToken(
  idToken: string
): Promise<FirebaseUserInfo | null> {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!key || !idToken) return null;

  let res: Response;
  try {
    res = await fetch(`${LOOKUP_ENDPOINT}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  const data = (await res.json()) as {
    users?: Array<{
      localId: string;
      email?: string;
      emailVerified?: boolean;
      phoneNumber?: string;
    }>;
  };

  const user = data.users?.[0];
  if (!user) return null;

  return {
    uid: user.localId,
    email: user.email?.toLowerCase(),
    emailVerified: Boolean(user.emailVerified),
    phone: user.phoneNumber,
  };
}
