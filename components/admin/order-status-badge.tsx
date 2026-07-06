import { Badge } from "@/components/ui/badge";
import type { OrderStatus, PaymentStatus } from "@/types/order";

const STATUS_TONE: Record<OrderStatus, "gold" | "dark" | "muted" | "success" | "danger"> = {
  pending: "muted",
  confirmed: "gold",
  processing: "gold",
  shipped: "dark",
  out_for_delivery: "gold",
  delivered: "success",
  cancelled: "danger",
  returned: "danger",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]} className="capitalize">
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

const PAYMENT_TONE: Record<PaymentStatus, "gold" | "muted" | "success" | "danger"> = {
  unpaid: "muted",
  paid: "success",
  refunded: "gold",
  failed: "danger",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={PAYMENT_TONE[status]} className="capitalize">{status}</Badge>;
}
