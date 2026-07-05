"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { PriceDisplay } from "@/components/PriceDisplay";
import { Button } from "@/components/Button";
import { lookupOrder } from "@/lib/api";
import type { OrderLookupResponse } from "@/lib/api";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order") || "";
  const email = searchParams.get("email") || "";

  const [order, setOrder] = useState<OrderLookupResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!orderNumber || !email) {
        setError("Missing order information.");
        setLoading(false);
        return;
      }

      const { data, error: lookupError } = await lookupOrder(
        orderNumber,
        email,
      );
      if (lookupError) {
        setError(lookupError.error.message);
      } else if (data) {
        setOrder(data);
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-warm-gray-400">Loading your order...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-[600px] px-6 py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Order Not Found</h1>
        <p className="mt-4 text-warm-gray-500">
          {error || "We couldn't find your order."}
        </p>
        <Button href="/" className="mt-6">
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <>
      <section className="bg-evergreen-dark px-6 py-12 text-white">
        <div className="mx-auto max-w-[600px] text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold">
            Booking Confirmed
          </h1>
          <p className="mt-2 text-sand-light">
            Your order has been placed successfully.
          </p>
        </div>
      </section>

      <section className="bg-hte-white px-6 py-12">
        <div className="mx-auto max-w-[600px]">
          <div className="rounded-lg border border-warm-gray-200 bg-white p-6">
            <div className="space-y-4">
              <div className="flex justify-between border-b border-warm-gray-100 pb-4">
                <span className="text-sm text-warm-gray-500">
                  Order Number
                </span>
                <span className="font-mono font-bold text-warm-gray-800">
                  {order.order_number}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-warm-gray-500">Service</span>
                <span className="font-medium text-warm-gray-800">
                  {order.service_name}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-warm-gray-500">Status</span>
                <span className="inline-flex items-center rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                  {order.status === "captured" ? "Paid" : order.status}
                </span>
              </div>

              {order.slot_day && (
                <div className="flex justify-between">
                  <span className="text-sm text-warm-gray-500">
                    Scheduled
                  </span>
                  <span className="font-medium text-warm-gray-800">
                    {new Date(
                      order.slot_day + "T12:00:00",
                    ).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}{" "}
                    &middot;{" "}
                    {order.slot_time === "am" ? "Morning" : "Afternoon"}
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-sm text-warm-gray-500">
                  Service Address
                </span>
                <span className="text-right font-medium text-warm-gray-800">
                  {order.service_address}
                </span>
              </div>

              <div className="flex items-baseline justify-between border-t border-warm-gray-100 pt-4">
                <span className="font-semibold text-warm-gray-800">
                  Total Paid
                </span>
                <PriceDisplay
                  cents={order.amount_cents}
                  className="text-2xl font-bold text-evergreen-dark"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-lg border border-warm-gray-200 bg-warm-gray-50 p-6">
            <h2 className="font-display text-lg font-bold text-warm-gray-800">
              What Happens Next
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-warm-gray-600">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-evergreen text-xs font-bold text-white">
                  1
                </span>
                <span>
                  A confirmation email will be sent to {email} with your
                  order details.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-evergreen text-xs font-bold text-white">
                  2
                </span>
                <span>
                  Our crew will arrive at your service address during the
                  scheduled window.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-evergreen text-xs font-bold text-white">
                  3
                </span>
                <span>
                  Need to reschedule? Call us before the crew departs for a
                  free date change.
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-8 flex justify-center gap-4">
            <Button href="/" variant="outline">
              Back to Home
            </Button>
            <Button
              href={`/order-status?order=${orderNumber}&email=${encodeURIComponent(email)}`}
              variant="secondary"
            >
              Track Order
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <p className="text-warm-gray-400">Loading confirmation...</p>
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
