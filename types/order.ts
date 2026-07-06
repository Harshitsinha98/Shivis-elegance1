import type { Address } from "./user";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "returned";

export type PaymentStatus = "unpaid" | "paid" | "refunded" | "failed";

export type PaymentProvider = "stripe" | "razorpay" | "cod";

export interface OrderItem {
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

export interface Order {
  id: string;
  number: string;
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
