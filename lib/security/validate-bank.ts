/**
 * Server-side validation for COD refund payout details. The client validates
 * too for UX, but this is the authoritative check — never trust the frontend.
 */

/** VPA / UPI handle: `name@bank`, letters/digits/.-_ in the name part. */
export const UPI_RE = /^[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z][a-zA-Z0-9.\-_]{1,32}$/;

/** Indian IFSC: 4 letters, 0, then 6 alphanumerics (e.g. HDFC0001234). */
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/** Indian bank account numbers run ~9–18 digits. */
export const ACCOUNT_RE = /^\d{9,18}$/;

export function isValidUpi(v?: string | null): boolean {
  return UPI_RE.test((v ?? "").trim());
}

export function isValidIfsc(v?: string | null): boolean {
  return IFSC_RE.test((v ?? "").trim().toUpperCase());
}

export function isValidAccountNumber(v?: string | null): boolean {
  return ACCOUNT_RE.test((v ?? "").replace(/\s+/g, ""));
}

export interface UpiRefundInput {
  method: "upi";
  upiId: string;
  holderName: string;
}
export interface BankRefundInput {
  method: "bank";
  holderName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifsc: string;
  bankName?: string;
}
export type CodRefundInput = UpiRefundInput | BankRefundInput;

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

/** Validate a COD refund payload. Returns the first problem, if any. */
export function validateCodRefundInput(input: CodRefundInput): ValidationResult {
  if (!input || (input.method !== "upi" && input.method !== "bank")) {
    return { ok: false, error: "Choose a refund method." };
  }
  if (input.method === "upi") {
    if (!input.holderName?.trim()) return { ok: false, error: "Account holder name is required." };
    if (!isValidUpi(input.upiId)) return { ok: false, error: "Enter a valid UPI ID (e.g. name@bank)." };
    return { ok: true };
  }
  // bank
  if (!input.holderName?.trim()) return { ok: false, error: "Account holder name is required." };
  if (!isValidAccountNumber(input.accountNumber)) {
    return { ok: false, error: "Enter a valid account number (9–18 digits)." };
  }
  if (input.accountNumber.replace(/\s+/g, "") !== input.confirmAccountNumber?.replace(/\s+/g, "")) {
    return { ok: false, error: "Account numbers do not match." };
  }
  if (!isValidIfsc(input.ifsc)) {
    return { ok: false, error: "Enter a valid IFSC code (e.g. HDFC0001234)." };
  }
  return { ok: true };
}
