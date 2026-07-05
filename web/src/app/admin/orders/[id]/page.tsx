"use client";

import { useState, useEffect, useCallback, use } from "react";
import { searchOrders, type OrderSearchResult } from "@/lib/admin-api";
import {
  HoldActionPanel,
  ReschedulePanel,
} from "@/components/admin/HoldActionPanel";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Pending Payment",
  authorized: "Authorized (Hold Active)",
  captured: "Captured (Charged)",
  confirmed_scheduled: "Confirmed & Scheduled",
  needs_reslot: "Needs Reslot",
  cancelled: "Cancelled",
  completed: "Completed",
  rescheduled: "Rescheduled",
  refunded: "Refunded",
};

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "bg-warm-gray-100 text-warm-gray-600",
  authorized: "bg-amber-100 text-amber-800",
  captured: "bg-evergreen/10 text-evergreen-dark",
  confirmed_scheduled: "bg-blue-100 text-blue-800",
  needs_reslot: "bg-red-100 text-red-800",
  cancelled: "bg-warm-gray-100 text-warm-gray-500",
  completed: "bg-evergreen/20 text-evergreen-dark",
  rescheduled: "bg-purple-100 text-purple-800",
  refunded: "bg-warm-gray-100 text-warm-gray-500",
};

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: orderId } = use(params);
  const [order, setOrder] = useState<OrderSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    const { data, error: apiError } = await searchOrders(orderId);
    if (apiError) {
      setError(apiError.error.message);
    } else if (data && data.length > 0) {
      const match = data.find((o) => o.order_id === orderId);
      setOrder(match || data[0]);
    } else {
      setError("Order not found");
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-warm-gray-400">Loading order...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-warm-gray-800">
          Order Not Found
        </h1>
        <p className="mt-2 text-error">{error}</p>
        <a
          href="/admin"
          className="mt-4 inline-block text-sm text-evergreen hover:underline"
        >
          Back to Dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <a
          href="/admin"
          className="text-sm text-warm-gray-400 hover:text-warm-gray-600"
        >
          &larr; Dashboard
        </a>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-warm-gray-800">
            {order.order_number}
          </h1>
          <p className="mt-1 text-warm-gray-500">{order.service_name}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[order.status] || "bg-warm-gray-100"}`}
        >
          {STATUS_LABELS[order.status] || order.status}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Order details */}
        <div className="rounded-lg border border-warm-gray-200 bg-white p-6">
          <h2 className="mb-4 font-display text-lg font-bold text-warm-gray-800">
            Order Details
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-warm-gray-500">Amount</dt>
              <dd className="font-medium text-warm-gray-800">
                {formatCents(order.amount_cents)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-warm-gray-500">Created</dt>
              <dd className="text-warm-gray-800">
                {new Date(order.created_at).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </dd>
            </div>
          </dl>
        </div>

        {/* Customer info */}
        <div className="rounded-lg border border-warm-gray-200 bg-white p-6">
          <h2 className="mb-4 font-display text-lg font-bold text-warm-gray-800">
            Customer
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-warm-gray-500">Name</dt>
              <dd className="text-warm-gray-800">{order.customer_name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-warm-gray-500">Phone</dt>
              <dd>
                <a
                  href={`tel:${order.customer_phone}`}
                  className="text-evergreen hover:underline"
                >
                  {order.customer_phone}
                </a>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-warm-gray-500">Email</dt>
              <dd>
                <a
                  href={`mailto:${order.customer_email}`}
                  className="text-evergreen hover:underline"
                >
                  {order.customer_email}
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Hold Action Panel (R-27) */}
      <div className="rounded-lg border border-warm-gray-200 bg-white p-6">
        <HoldActionPanel
          orderId={order.order_id}
          orderNumber={order.order_number}
          orderStatus={order.status}
          amountCents={order.amount_cents}
          onActionComplete={loadOrder}
        />
      </div>

      {/* Reschedule Panel */}
      <div className="rounded-lg border border-warm-gray-200 bg-white p-6">
        <ReschedulePanel
          orderId={order.order_id}
          orderNumber={order.order_number}
          orderStatus={order.status}
          onRescheduleComplete={loadOrder}
        />
      </div>
    </div>
  );
}
