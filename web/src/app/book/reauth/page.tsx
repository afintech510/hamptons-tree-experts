"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/Button";
import { submitReauthorize } from "@/lib/api";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
);

function ReauthForm({
  orderId,
  token,
}: {
  orderId: string;
  token: string;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || submitting) return;

    setSubmitting(true);
    setErrorMsg(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setErrorMsg("Card element not ready");
      setSubmitting(false);
      return;
    }

    const { error: stripeError, paymentMethod } =
      await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
      });

    if (stripeError || !paymentMethod) {
      setErrorMsg(stripeError?.message || "Failed to process card");
      setSubmitting(false);
      return;
    }

    const { data, error } = await submitReauthorize({
      order_id: orderId,
      token,
      payment_method_id: paymentMethod.id,
    });

    if (error) {
      setErrorMsg(error.error.message);
      setSubmitting(false);
      return;
    }

    if (data) {
      setOrderNumber(data.order_number);
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-evergreen/10">
          <svg
            className="h-8 w-8 text-evergreen"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-bold text-warm-gray-800">
          Authorization Extended
        </h2>
        <p className="mt-3 text-warm-gray-600">
          Your authorization hold has been renewed for order{" "}
          <strong>{orderNumber}</strong>. You&apos;ll receive a confirmation
          email shortly.
        </p>
        <Button href="/" className="mt-8">
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="rounded-lg border border-warm-gray-200 bg-warm-gray-50 p-6">
        <h2 className="font-display text-lg font-bold text-warm-gray-800">
          What&apos;s happening?
        </h2>
        <p className="mt-2 text-sm text-warm-gray-600">
          Your original authorization hold is expiring. To keep your appointment
          scheduled, we need to place a new authorization hold on your card for
          the same amount.
        </p>
        <p className="mt-2 text-sm text-warm-gray-500">
          You will <strong>not</strong> be charged twice. The original hold will
          be released, and a new hold will be placed.
        </p>
      </div>

      <div>
        <h2 className="mb-4 font-display text-lg font-bold text-warm-gray-800">
          Enter Card Details
        </h2>
        <p className="mb-3 text-sm text-warm-gray-500">
          You may use the same card or a different one.
        </p>
        <div className="rounded-lg border-2 border-warm-gray-200 p-4">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  fontFamily: "Inter, sans-serif",
                  color: "#252119",
                  "::placeholder": { color: "#8A8278" },
                },
                invalid: { color: "#A63D2F" },
              },
            }}
          />
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error">
          {errorMsg}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={!stripe || !elements || submitting}
        className="w-full"
      >
        {submitting ? "Processing..." : "Renew Authorization Hold"}
      </Button>
    </form>
  );
}

function ReauthContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") || "";
  const token = searchParams.get("token") || "";

  if (!orderId || !token) {
    return (
      <div className="mx-auto max-w-[600px] px-6 py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Invalid Link</h1>
        <p className="mt-4 text-warm-gray-500">
          This re-authorization link is invalid or has expired. Please contact us
          if you need assistance.
        </p>
        <Button href="/" className="mt-6">
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <>
      <section className="bg-evergreen-dark px-6 py-10 text-white">
        <div className="mx-auto max-w-[600px]">
          <p className="text-sm font-medium uppercase tracking-wider text-sand-dark">
            Extend Authorization
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold">
            Renew Your Hold
          </h1>
        </div>
      </section>

      <section className="bg-hte-white px-6 py-12">
        <div className="mx-auto max-w-[600px]">
          <Elements stripe={stripePromise}>
            <ReauthForm orderId={orderId} token={token} />
          </Elements>
        </div>
      </section>
    </>
  );
}

export default function ReauthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <p className="text-warm-gray-400">Loading...</p>
        </div>
      }
    >
      <ReauthContent />
    </Suspense>
  );
}
