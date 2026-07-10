/**
 * Maps coded ReturnError messages (thrown by the return service in
 * lib/db/repo.ts) to HTTP status + human copy for the API layer.
 */
import { fail } from "@/lib/api";

const RETURN_ERROR: Record<string, { status: number; message: string }> = {
  DB_DISABLED: { status: 503, message: "Returns are unavailable in demo mode." },
  NOT_FOUND: { status: 404, message: "Return request not found." },
  INVALID_TRANSITION: { status: 409, message: "That action isn't allowed for this return's status." },
  NO_REVERSE_SHIPMENT: { status: 409, message: "Create the reverse pickup first." },
  NO_REVERSE_AWB: { status: 409, message: "No reverse AWB yet — generate the pickup first." },
  WAREHOUSE_NOT_RECEIVED: { status: 409, message: "The item must be received at the warehouse before refunding." },
  COD_NOT_VERIFIED: { status: 409, message: "COD payout details must be verified before the refund." },
  NOT_COD: { status: 400, message: "This isn't a COD order." },
  NOT_APPROVED: { status: 409, message: "The return must be approved first." },
  NO_COD_DETAILS: { status: 409, message: "No payout details have been submitted yet." },
  REFERENCE_REQUIRED: { status: 400, message: "A transaction reference is required." },
  FORBIDDEN: { status: 403, message: "Not authorised." },
};

/** Turn a caught ReturnError into a NextResponse via fail(). */
export function failFromReturnError(e: unknown) {
  const msg = (e as Error)?.message ?? "";
  if (msg.startsWith("INVALID_DETAILS:")) {
    return fail(msg.slice("INVALID_DETAILS:".length), 422, "INVALID_DETAILS");
  }
  const mapped = RETURN_ERROR[msg];
  if (mapped) return fail(mapped.message, mapped.status, msg);
  return fail("Could not complete that action.", 500);
}
