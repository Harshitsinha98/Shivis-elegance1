import { Badge } from "@/components/ui/badge";
import type { OrderStatus, PaymentStatus, ReturnStatus } from "@/types/order";

const STATUS_TONE: Record<OrderStatus, "gold" | "dark" | "muted" | "success" | "danger"> = {
  pending: "muted",
  confirmed: "gold",
  processing: "gold",
  shipped: "dark",
  out_for_delivery: "gold",
  delivered: "success",
  cancelled: "danger",
  return_requested: "gold",
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

const RETURN_TONE: Record<ReturnStatus, "gold" | "dark" | "muted" | "success" | "danger"> = {
  requested: "muted",
  approved: "gold",
  rejected: "danger",
  pickup_scheduled: "gold",
  picked_up: "dark",
  refund_initiated: "gold",
  refund_completed: "success",
  completed: "success",
};

const RETURN_LABEL: Record<ReturnStatus, string> = {
  requested: "Return requested",
  approved: "Approved",
  rejected: "Rejected",
  pickup_scheduled: "Pickup scheduled",
  picked_up: "Picked up",
  refund_initiated: "Refund initiated",
  refund_completed: "Refund completed",
  completed: "Return completed",
};

export function ReturnStatusBadge({ status }: { status: ReturnStatus }) {
  return <Badge tone={RETURN_TONE[status]}>{RETURN_LABEL[status]}</Badge>;
}
