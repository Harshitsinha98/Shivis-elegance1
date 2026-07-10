/**
 * Transactional email via the Resend REST API (no SDK dependency, matching the
 * razorpay/stripe integrations). Falls back to a logged stub when RESEND_API_KEY
 * is not configured, so notifications never break the request flow.
 *
 * Env: RESEND_API_KEY, EMAIL_FROM, ADMIN_EMAIL, NEXT_PUBLIC_SITE_URL.
 */
import { SITE } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import type { Order, ReturnRequest, ReturnStatus } from "@/types/order";
import type { Address } from "@/types/user";

export const isEmailEnabled = () => Boolean(process.env.RESEND_API_KEY);

const FROM = () => process.env.EMAIL_FROM || `${SITE.name} <onboarding@resend.dev>`;
export const ADMIN_EMAIL = () => process.env.ADMIN_EMAIL || SITE.email;

export interface EmailInput {
  to: string | string[];
  subject: string;
  html: string;
}

/** Send an email. Best-effort — resolves `ok:false` instead of throwing. */
export async function sendEmail(
  input: EmailInput
): Promise<{ ok: boolean; message?: string }> {
  const to = Array.isArray(input.to) ? input.to.filter(Boolean) : [input.to].filter(Boolean);
  if (!to.length) return { ok: false, message: "No recipient" };

  if (!isEmailEnabled()) {
    console.info(`[email:stub] → ${to.join(", ")} · ${input.subject}`);
    return { ok: true, message: "Email stub (Resend not configured)" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM(), to, subject: input.subject, html: input.html }),
    });
    if (!res.ok) return { ok: false, message: `Resend error: ${res.status} ${await res.text()}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

// ───────────────────────────── templates ─────────────────────────────

const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
  requested: "Return requested",
  approved: "Return approved",
  rejected: "Return rejected",
  pickup_scheduled: "Pickup scheduled",
  picked_up: "Picked up",
  refund_initiated: "Refund initiated",
  refund_completed: "Refund completed",
  completed: "Return completed",
};

export function returnStatusLabel(status: ReturnStatus): string {
  return RETURN_STATUS_LABEL[status] ?? status;
}

function shell(title: string, bodyHtml: string): string {
  return `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a">
    <div style="padding:24px 0;text-align:center;border-bottom:1px solid #eee">
      <span style="font-size:22px;letter-spacing:3px;text-transform:uppercase">${SITE.name}</span>
    </div>
    <div style="padding:28px 8px">
      <h1 style="font-size:20px;margin:0 0 16px">${title}</h1>
      ${bodyHtml}
    </div>
    <div style="padding:20px 8px;border-top:1px solid #eee;font-size:12px;color:#888;text-align:center">
      ${SITE.name} · ${SITE.email}
    </div>
  </div>`;
}

function itemsTable(items: { name: string; quantity: number; unitPrice: number }[]): string {
  return `<table style="width:100%;border-collapse:collapse;margin:12px 0">${items
    .map(
      (it) =>
        `<tr><td style="padding:6px 0;font-size:14px">${it.name} × ${it.quantity}</td>
         <td style="padding:6px 0;font-size:14px;text-align:right">${formatPrice(
           it.unitPrice * it.quantity
         )}</td></tr>`
    )
    .join("")}</table>`;
}

function orderSummary(order: Order): string {
  return `${itemsTable(order.items)}
    <table style="width:100%;border-collapse:collapse;margin:8px 0;border-top:1px solid #eee">
      <tr><td style="padding:4px 0;font-size:13px;color:#666">Subtotal</td><td style="padding:4px 0;font-size:13px;text-align:right">${formatPrice(order.subtotal)}</td></tr>
      ${order.discount ? `<tr><td style="padding:4px 0;font-size:13px;color:#666">Discount</td><td style="padding:4px 0;font-size:13px;text-align:right">−${formatPrice(order.discount)}</td></tr>` : ""}
      <tr><td style="padding:4px 0;font-size:13px;color:#666">Shipping</td><td style="padding:4px 0;font-size:13px;text-align:right">${order.shipping ? formatPrice(order.shipping) : "Free"}</td></tr>
      ${order.tax ? `<tr><td style="padding:4px 0;font-size:13px;color:#666">Tax</td><td style="padding:4px 0;font-size:13px;text-align:right">${formatPrice(order.tax)}</td></tr>` : ""}
      <tr><td style="padding:8px 0;font-size:15px;font-weight:bold">Total</td><td style="padding:8px 0;font-size:15px;font-weight:bold;text-align:right">${formatPrice(order.total)}</td></tr>
    </table>`;
}

function addressBlock(order: Order): string {
  const a = order.shippingAddress as Address;
  if (!a?.fullName) return "";
  return `<p style="font-size:13px;color:#555;line-height:1.6;margin:8px 0">
    <strong>Ship to:</strong><br/>${a.fullName}<br/>
    ${[a.line1, a.line2].filter(Boolean).join(", ")}<br/>
    ${[a.city, a.state, a.postalCode].filter(Boolean).join(", ")}<br/>
    ${a.country ?? ""}${a.phone ? `<br/>${a.phone}` : ""}</p>`;
}

const PAYMENT_LABEL: Record<string, string> = {
  razorpay: "Razorpay",
  stripe: "Card",
  cod: "Cash on Delivery",
};

/** Order-received confirmation to the customer. */
export function orderPlacedCustomerEmail(order: Order): EmailInput {
  const to = (order.shippingAddress as any)?.email || order.email || "";
  const url = `${SITE.url}/account/orders/${order.number}`;
  const paid = order.paymentStatus === "paid";
  return {
    to,
    subject: `Order confirmed · ${order.number}`,
    html: shell(
      "Thank you for your order",
      `<p style="font-size:14px">Hi ${
        (order.shippingAddress as any)?.fullName?.split(" ")[0] || "there"
      }, we've received your order <strong>${order.number}</strong>${
        paid ? " and your payment is confirmed" : ""
      }. Here's your summary:</p>
      ${orderSummary(order)}
      <p style="font-size:13px;color:#555">Payment: <strong>${
        PAYMENT_LABEL[order.paymentProvider] ?? order.paymentProvider
      }</strong>${paid ? " · Paid" : order.paymentProvider === "cod" ? " · Pay on delivery" : " · Awaiting confirmation"}</p>
      ${addressBlock(order)}
      <p style="margin-top:16px"><a href="${url}" style="font-size:14px">Track your order →</a></p>`
    ),
  };
}

/** New-order alert to the admin/store team. */
export function orderPlacedAdminEmail(order: Order): EmailInput {
  const url = `${SITE.url}/admin/orders/${order.number}`;
  return {
    to: ADMIN_EMAIL(),
    subject: `New order · ${order.number} · ${formatPrice(order.total)}`,
    html: shell(
      "New order received",
      `<p style="font-size:14px">A new order <strong>${order.number}</strong> was just placed for <strong>${formatPrice(
        order.total
      )}</strong>.</p>
      <p style="font-size:13px;color:#555">Payment: <strong>${
        PAYMENT_LABEL[order.paymentProvider] ?? order.paymentProvider
      }</strong> · ${order.paymentStatus} · Status: ${order.status}</p>
      ${order.email ? `<p style="font-size:13px;color:#555">Customer: ${order.email}</p>` : ""}
      ${orderSummary(order)}
      ${addressBlock(order)}
      <p style="margin-top:16px"><a href="${url}" style="font-size:14px">Open in admin →</a></p>`
    ),
  };
}

const SHIPPING_STATUS_COPY: Partial<Record<Order["status"], { title: string; body: string }>> = {
  shipped: { title: "Your order is on its way", body: "has been shipped and is on its way to you" },
  out_for_delivery: { title: "Out for delivery", body: "is out for delivery and should arrive today" },
  delivered: { title: "Delivered", body: "has been delivered" },
};

/** Shipment-status alert to the customer (shipped / out for delivery / delivered). */
export function orderShippingUpdateEmail(order: Order): EmailInput | null {
  const copy = SHIPPING_STATUS_COPY[order.status];
  if (!copy) return null;
  const to = (order.shippingAddress as any)?.email || order.email || "";
  const url = `${SITE.url}/account/orders/${order.number}`;
  const tracking =
    order.awb || order.trackingNumber
      ? `<p style="font-size:13px;color:#555">Tracking: <strong>${order.awb || order.trackingNumber}</strong>${
          order.courier ? ` · ${order.courier}` : ""
        }</p>`
      : "";
  return {
    to,
    subject: `${copy.title} · ${order.number}`,
    html: shell(
      copy.title,
      `<p style="font-size:14px">Your order <strong>${order.number}</strong> ${copy.body}.</p>
      ${tracking}
      <p style="margin-top:16px"><a href="${url}" style="font-size:14px">Track your order →</a></p>`
    ),
  };
}

export function orderCancelledEmail(order: Order): EmailInput {
  const to = (order.shippingAddress as any)?.email || order.email || "";
  const refundLine =
    order.paymentStatus === "refunded"
      ? `<p style="font-size:14px">A refund of <strong>${formatPrice(
          order.total
        )}</strong> has been initiated to your original payment method.</p>`
      : "";
  return {
    to,
    subject: `Your order ${order.number} has been cancelled`,
    html: shell(
      "Order cancelled",
      `<p style="font-size:14px">Your order <strong>${order.number}</strong> has been cancelled${
        order.cancelReason ? ` (${order.cancelReason})` : ""
      }.</p>
      ${itemsTable(order.items)}
      ${refundLine}
      <p style="font-size:14px">If this wasn't you, please contact us right away.</p>`
    ),
  };
}

export function returnRequestedCustomerEmail(order: Order, ret: ReturnRequest): EmailInput {
  const to = (order.shippingAddress as any)?.email || order.email || "";
  return {
    to,
    subject: `Return request received for ${order.number}`,
    html: shell(
      "Return request received",
      `<p style="font-size:14px">We've received your return request for order <strong>${order.number}</strong>. Our team will review it shortly.</p>
      <p style="font-size:14px"><strong>Reason:</strong> ${ret.reason}</p>
      ${itemsTable(ret.items)}`
    ),
  };
}

export function returnRequestedAdminEmail(order: Order, ret: ReturnRequest): EmailInput {
  const url = `${SITE.url}/admin/returns`;
  return {
    to: ADMIN_EMAIL(),
    subject: `New return request · ${order.number}`,
    html: shell(
      "New return request",
      `<p style="font-size:14px">A customer has requested a return on order <strong>${order.number}</strong>.</p>
      <p style="font-size:14px"><strong>Reason:</strong> ${ret.reason}</p>
      ${ret.description ? `<p style="font-size:14px">${ret.description}</p>` : ""}
      ${itemsTable(ret.items)}
      <p><a href="${url}" style="font-size:14px">Review in admin →</a></p>`
    ),
  };
}

export function returnStatusUpdateEmail(
  ret: ReturnRequest,
  status: ReturnStatus
): EmailInput {
  const label = returnStatusLabel(status);
  return {
    to: ret.customerEmail || "",
    subject: `Return update: ${label} · ${ret.orderNumber ?? ""}`.trim(),
    html: shell(
      label,
      `<p style="font-size:14px">Your return for order <strong>${ret.orderNumber ?? ""}</strong> is now: <strong>${label}</strong>.</p>
      ${ret.adminNotes ? `<p style="font-size:14px">${ret.adminNotes}</p>` : ""}
      ${
        status === "refund_completed" && ret.refundAmount
          ? `<p style="font-size:14px">Refunded: <strong>${formatPrice(ret.refundAmount)}</strong>.</p>`
          : ""
      }`
    ),
  };
}

// ───────────────── reverse-logistics & refund lifecycle ─────────────────

/** Copy per reverse-shipment / refund milestone. `null` = no email for it. */
const REVERSE_EMAIL_COPY: Record<
  string,
  { title: string; body: (ctx: ReverseEmailInput) => string } | null
> = {
  pickup_scheduled: {
    title: "Return pickup scheduled",
    body: (c) =>
      `Good news — a courier pickup has been scheduled for your return on order <strong>${c.orderNumber}</strong>.${
        c.reverseAwb ? ` Your reverse tracking number is <strong>${c.reverseAwb}</strong>${c.courier ? ` (${c.courier})` : ""}.` : ""
      } Please keep the item ready in its original packaging.`,
  },
  out_for_pickup: { title: "Courier on the way", body: (c) => `The courier is out to collect your return for order <strong>${c.orderNumber}</strong>.` },
  picked_up: { title: "Return picked up", body: (c) => `Your return for order <strong>${c.orderNumber}</strong> has been picked up and is on its way back to us.` },
  in_transit: { title: "Return in transit", body: (c) => `Your return for order <strong>${c.orderNumber}</strong> is in transit to our warehouse.` },
  out_for_delivery: null,
  delivered: { title: "Return received", body: (c) => `We've received your return for order <strong>${c.orderNumber}</strong> at our warehouse and are processing your refund.` },
  pickup_failed: { title: "Pickup attempt failed", body: (c) => `We couldn't collect your return for order <strong>${c.orderNumber}</strong>. We'll reattempt shortly — no action needed.` },
  cod_required: {
    title: "Action needed — add your refund details",
    body: (c) =>
      `Your return for order <strong>${c.orderNumber}</strong> was approved. As this was a Cash-on-Delivery order, please add your UPI or bank details in your dashboard so we can process the refund securely once the item reaches us.`,
  },
  refund_initiated: { title: "Refund initiated", body: (c) => `We've initiated the refund${c.refundAmount ? ` of <strong>${formatPrice(c.refundAmount)}</strong>` : ""} for your return on order <strong>${c.orderNumber}</strong>.` },
  refund_completed: {
    title: "Refund completed",
    body: (c) =>
      `Your refund${c.refundAmount ? ` of <strong>${formatPrice(c.refundAmount)}</strong>` : ""} for order <strong>${c.orderNumber}</strong> is complete.${
        c.refundReference ? ` Reference: <strong>${c.refundReference}</strong>.` : ""
      } It may take 5–7 business days to reflect in your account.`,
  },
  refund_failed: { title: "Refund needs attention", body: (c) => `We hit a snag processing your refund for order <strong>${c.orderNumber}</strong>. Our team has been alerted and will resolve it shortly.` },
};

export interface ReverseEmailInput {
  to: string;
  orderNumber: string;
  code: string;
  reverseAwb?: string;
  courier?: string;
  refundAmount?: number;
  refundReference?: string;
}

/**
 * Reverse-logistics / refund milestone email. Returns `null` for milestones we
 * don't notify on (so callers can `if (email) sendEmail(email)`).
 */
export function returnReverseUpdateEmail(input: ReverseEmailInput): EmailInput | null {
  if (!input.to) return null;
  const copy = REVERSE_EMAIL_COPY[input.code];
  if (!copy) return null;
  const track = `${SITE.url}/dashboard/returns`;
  return {
    to: input.to,
    subject: `${copy.title} · ${input.orderNumber}`,
    html: shell(
      copy.title,
      `<p style="font-size:14px">${copy.body(input)}</p>
      <p style="margin-top:16px"><a href="${track}" style="font-size:14px">View your return →</a></p>`
    ),
  };
}
