/**
 * Display masking for sensitive financial identifiers. Never send full account
 * numbers to the client — the server decrypts, masks, and only ships the mask.
 */

/** "1234567890123" → "•••• •••• 0123". Keeps the last 4 digits. */
export function maskAccountNumber(acct?: string | null): string {
  const digits = (acct ?? "").replace(/\s+/g, "");
  if (!digits) return "";
  const last4 = digits.slice(-4);
  return `•••• •••• ${last4}`;
}

/** "name@bank" → "na••@bank". Preserves the handle/bank suffix. */
export function maskUpiId(upi?: string | null): string {
  const v = (upi ?? "").trim();
  if (!v) return "";
  const at = v.indexOf("@");
  if (at <= 0) {
    return v.length <= 2 ? "••" : `${v.slice(0, 2)}${"•".repeat(Math.max(2, v.length - 2))}`;
  }
  const name = v.slice(0, at);
  const suffix = v.slice(at);
  const head = name.slice(0, Math.min(2, name.length));
  return `${head}${"•".repeat(Math.max(2, name.length - 2))}${suffix}`;
}
