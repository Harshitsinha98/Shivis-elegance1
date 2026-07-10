import type { Address } from "./user";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "return_requested"
  | "returned";

export type PaymentStatus = "unpaid" | "paid" | "refunded" | "failed";

export type ReturnStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "pickup_scheduled"
  | "picked_up"
  | "refund_initiated"
  | "refund_completed"
  | "completed";

/** Terminal return states — a new return request may be raised once here. */
export const RETURN_TERMINAL_STATUSES: ReturnStatus[] = ["rejected"];

export const RETURN_REASONS = [
  "Damaged Product",
  "Wrong Product Received",
  "Quality Issue",
  "Size Issue",
  "Other",
] as const;

export type ReturnReason = (typeof RETURN_REASONS)[number];

export type PaymentProvider = "stripe" | "razorpay" | "cod";

export interface OrderItem {
  /** OrderItem row id — needed to reference specific lines in a return. */
  id?: string;
  productId: string;
  slug: string;
  name: string;
  image: string;
  variantLabel?: string;
  unitPrice: number;
  quantity: number;
}

export interface OrderTimelineEvent {
  status: OrderStatus;
  label: string;
  at: string;
  done: boolean;
}

export interface ReturnItem {
  orderItemId?: string;
  name: string;
  image: string;
  unitPrice: number;
  quantity: number;
}

/** Normalised reverse-shipment lifecycle codes (mirrors ReverseTrackingCode). */
export type ReverseTrackingCode =
  | "pickup_pending"
  | "pickup_scheduled"
  | "out_for_pickup"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "pickup_failed"
  | "cancelled"
  | "lost"
  | "damaged"
  | "unknown";

/** Free-text lifecycle for the refund side of a return. */
export type RefundLifecycle =
  | "awaiting_details"
  | "details_submitted"
  | "verification_pending"
  | "verified"
  | "processing"
  | "completed"
  | "failed"
  | "rejected";

export interface ReturnTimelineEvent {
  code: string;
  label: string;
  at: string;
  note?: string;
  actor?: string;
}

export type RefundMethod = "razorpay" | "upi" | "bank" | "cod_manual" | "original";

export interface ReturnRequest {
  id: string;
  orderId: string;
  orderNumber?: string;
  userId?: string;
  status: ReturnStatus;
  reason: string;
  description?: string;
  images: string[];
  adminNotes?: string;
  refundAmount?: number;
  items: ReturnItem[];
  approvedAt?: string;
  rejectedAt?: string;
  refundedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  /** Customer/contact snapshot for the admin table. */
  customerName?: string;
  customerEmail?: string;

  // ── Payment context (from the parent order) ──
  paymentProvider?: PaymentProvider;
  isPrepaid?: boolean;

  // ── Reverse logistics ──
  reverseShipmentId?: string;
  reverseOrderId?: string;
  reverseAwb?: string;
  reverseCourier?: string;
  pickupId?: string;
  pickupScheduledDate?: string;
  reverseLabelUrl?: string;
  reverseTrackingStatus?: string;
  reverseTrackingCode?: ReverseTrackingCode;
  reverseTrackingUrl?: string;
  estimatedPickupAt?: string;
  estimatedDeliveryAt?: string;
  warehouseReceivedAt?: string;
  warehouseReceivedBy?: string;
  timeline?: ReturnTimelineEvent[];

  // ── Refund ──
  refundMethod?: RefundMethod;
  refundStatus?: RefundLifecycle;
  refundId?: string;
  refundReference?: string;
  refundProcessedAt?: string;
  refundError?: string;

  // ── COD refund collection (masked for display; PII never leaves the server raw) ──
  codDetailsSubmitted?: boolean;
  maskedUpiId?: string;
  maskedAccountNumber?: string;
  ifscCode?: string;
  bankHolderName?: string;
  bankName?: string;
  financeRemarks?: string;
}

export interface Order {
  id: string;
  number: string;
  /** Owner user id + contact email — used for ownership checks (not shown in UI). */
  userId?: string;
  email?: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  tax: number;
  total: number;
  currency: "INR" | "USD";
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentProvider: PaymentProvider;
  shippingAddress: Address;
  trackingNumber?: string;
  /** Air Waybill number assigned by the courier / Shiprocket */
  awb?: string;
  courier?: string;
  /** Shiprocket's own shipment id (needed for pickup/label calls) */
  shipmentId?: string;
  /** Real courier-generated shipping-label PDF, when Shiprocket returns one */
  labelUrl?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  returnRequestedAt?: string;
  returnedAt?: string;
  /** The latest return request on this order, if any. */
  returnRequest?: ReturnRequest | null;
  timeline: OrderTimelineEvent[];
  createdAt: string;
}

export interface Coupon {
  code: string;
  description: string;
  type: "percentage" | "fixed";
  value: number;
  minSubtotal?: number;
  active: boolean;
  expiresAt?: string;
}
