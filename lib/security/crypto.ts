/**
 * Authenticated symmetric encryption for PII at rest (COD bank / UPI details).
 *
 * AES-256-GCM. The 32-byte key is derived with scrypt from `ENCRYPTION_KEY`
 * (preferred — set a long random string in production) or, as a fallback so the
 * app keeps working with zero extra setup, from `AUTH_SESSION_SECRET`. Rotating
 * either value makes previously-stored ciphertext undecryptable, so treat them
 * as durable secrets.
 *
 * Ciphertext format (single string, safe to store in a text column):
 *   v1.<saltB64url>.<ivB64url>.<tagB64url>.<cipherB64url>
 */
import crypto from "crypto";

const VERSION = "v1";
const KEY_LEN = 32;
const IV_LEN = 12; // GCM standard nonce length
const SALT_LEN = 16;

function secretMaterial(): string {
  return (
    process.env.ENCRYPTION_KEY ||
    process.env.AUTH_SESSION_SECRET ||
    "luxejewels-dev-secret-change-me-in-production"
  );
}

/** True when a dedicated ENCRYPTION_KEY is configured (recommended for prod). */
export const isEncryptionKeyConfigured = () => Boolean(process.env.ENCRYPTION_KEY);

function deriveKey(salt: Buffer): Buffer {
  return crypto.scryptSync(secretMaterial(), salt, KEY_LEN);
}

const b64u = (b: Buffer) => b.toString("base64url");
const fromB64u = (s: string) => Buffer.from(s, "base64url");

/** Encrypt a UTF-8 string. Returns a self-describing token (see file header). */
export function encrypt(plain: string): string {
  if (plain == null) throw new Error("encrypt: nothing to encrypt");
  const salt = crypto.randomBytes(SALT_LEN);
  const iv = crypto.randomBytes(IV_LEN);
  const key = deriveKey(salt);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, b64u(salt), b64u(iv), b64u(tag), b64u(enc)].join(".");
}

/**
 * Decrypt a token produced by {@link encrypt}. Throws on tamper / wrong key.
 * Returns `null` for empty input so callers can treat "no value stored" simply.
 */
export function decrypt(token: string | null | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== VERSION) {
    throw new Error("decrypt: malformed or unsupported ciphertext");
  }
  const [, saltB, ivB, tagB, dataB] = parts;
  const key = deriveKey(fromB64u(saltB));
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, fromB64u(ivB));
  decipher.setAuthTag(fromB64u(tagB));
  const dec = Buffer.concat([decipher.update(fromB64u(dataB)), decipher.final()]);
  return dec.toString("utf8");
}

/** Best-effort decrypt — returns null instead of throwing (for display paths). */
export function tryDecrypt(token: string | null | undefined): string | null {
  try {
    return decrypt(token);
  } catch {
    return null;
  }
}
