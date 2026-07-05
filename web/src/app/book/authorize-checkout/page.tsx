"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { getServiceBySlug } from "@/lib/data/services";
import { PriceDisplay } from "@/components/PriceDisplay";
import { PolicyDisclosure } from "@/components/PolicyDisclosure";
import { Button } from "@/components/Button";
import { fetchQuote, submitAuthorizeConfirm } from "@/lib/api";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
);

const TIER_LABELS: Record<string, string> = {
  tomorrow: "Tomorrow",
  "2_5_day": "2–5 Days",
  "6_14_day": "6–14 Days",
};

function AuthorizeCheckoutForm({
  serviceSlug,
  config,
  tier,
  date,
  slot,
  totalCents,
}: {
  serviceSlug: string;
  config: Record<string, unknown>;
  tier: string;
  date: string;
  slot: "am" | "pm";
  totalCents: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [policyAck, setPolicyAck] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const service = getServiceBySlug(serviceSlug);

  const canSubmit =
    stripe &&
    elements &&
    name.trim() &&
    email.trim() &&
    phone.trim() &&
    address.trim() &&
    policyAck &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

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
        billing_details: { name, email, phone },
      });

    if (stripeError || !paymentMethod) {
      setErrorMsg(stripeError?.message || "Failed to process card");
      setSubmitting(false);
      return;
    }

    const idempotencyKey = crypto.randomUUID();

    const { data, error } = await submitAuthorizeConfirm(
      {
        service_slug: serviceSlug,
        config,
        urgency_tier: tier,
        requested_date: date,
        slot,
        customer_email: email,
        customer_phone: phone,
        customer_name: name,
        service_address: address,
        payment_method_id: paymentMethod.id,
        policy_acknowledged: policyAck,
      },
      idempotencyKey,
    );

    if (error) {
      setErrorMsg(error.error.message);
      setSubmitting(false);
      return;
    }

    if (data) {
      const params = new URLSearchParams({
        order: data.order_number,
        email: data.customer_email,
      });
      router.push(`/book/confirmation?${params.toString()}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Order summary */}
      <div className="rounded-lg border border-warm-gray-200 bg-warm-gray-50 p-6">
        <h2 className="font-display text-lg font-bold text-warm-gray-800">
          Order Summary
        </h2>
        <div className="mt-4 space-y-2 text-sm text-warm-gray-600">
          <div className="flex justify-between">
            <span>Service</span>
            <span className="font-medium text-warm-gray-800">
              {service?.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Urgency</span>
            <span className="font-medium text-warm-gray-800">
              {TIER_LABELS[tier] || tier}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Date</span>
            <span className="font-medium text-warm-gray-800">
              {new Date(date + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Time</span>
            <span className="font-medium text-warm-gray-800">
              {slot === "am" ? "Morning" : "Afternoon"}
            </span>
          </div>
          <div className="mt-3 border-t border-warm-gray-200 pt-3">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold text-warm-gray-800">
                Authorization Hold
              </span>
              <PriceDisplay
                cents={totalCents}
                className="text-2xl font-bold text-evergreen-dark"
              />
            </div>
            <p className="mt-1 text-xs text-warm-gray-400">
              Your card will be authorized but not charged until stock
              availability is confirmed.
            </p>
          </div>
        </div>
      </div>

      {/* Customer info */}
      <div>
        <h2 className="mb-4 font-display text-lg font-bold text-warm-gray-800">
          Your Information
        </h2>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="customer-name"
              className="block text-sm font-medium text-warm-gray-700"
            >
              Full Name
            </label>
            <input
              id="customer-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border-2 border-warm-gray-200 px-3 focus:border-evergreen focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="customer-email"
              className="block text-sm font-medium text-warm-gray-700"
            >
              Email
            </label>
            <input
              id="customer-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border-2 border-warm-gray-200 px-3 focus:border-evergreen focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="customer-phone"
              className="block text-sm font-medium text-warm-gray-700"
            >
              Phone
            </label>
            <input
              id="customer-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border-2 border-warm-gray-200 px-3 focus:border-evergreen focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="service-address"
              className="block text-sm font-medium text-warm-gray-700"
            >
              Service Address
            </label>
            <input
              id="service-address"
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, Westhampton Beach, NY 11978"
              className="mt-1 h-10 w-full rounded-lg border-2 border-warm-gray-200 px-3 focus:border-evergreen focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Payment */}
      <div>
        <h2 className="mb-4 font-display text-lg font-bold text-warm-gray-800">
          Payment (Authorization Hold)
        </h2>
        <p className="mb-3 text-sm text-warm-gray-500">
          Your card will be authorized but not charged until we confirm stock
          availability.
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

      {/* Policy — BLOCKED: F-020 wording pending legal review */}
      <PolicyDisclosure
        acknowledged={policyAck}
        onAcknowledge={setPolicyAck}
      />

      {errorMsg && (
        <div className="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error">
          {errorMsg}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={!canSubmit}
        className="w-full"
      >
        {submitting ? "Processing..." : "Place Order (Authorize Hold)"}
      </Button>
    </form>
  );
}

function AuthorizeCheckoutContent() {
  const searchParams = useSearchParams();
  const serviceSlug = searchParams.get("service") || "";
  const configStr = searchParams.get("config") || "{}";
  const tier = searchParams.get("tier") || "";
  const date = searchParams.get("date") || "";
  const slot = (searchParams.get("slot") as "am" | "pm") || "am";

  const [totalCents, setTotalCents] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  let config: Record<string, unknown>;
  try {
    config = JSON.parse(configStr);
  } catch {
    config = {};
  }

  const service = getServiceBySlug(serviceSlug);

  useEffect(() => {
    async function reQuote() {
      setLoading(true);
      const { data, error: quoteError } = await fetchQuote(
        serviceSlug,
        config,
        date || undefined,
      );
      if (quoteError) {
        setError(quoteError.error.message);
      } else if (data && tier && data.tier_prices[tier]) {
        setTotalCents(data.tier_prices[tier].total_cents);
      } else {
        setError("Could not confirm pricing. Please go back and try again.");
      }
      setLoading(false);
    }
    if (serviceSlug && tier) {
      reQuote();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!service || service.fulfillmentType !== "authorize_confirm") {
    return (
      <div className="mx-auto max-w-[600px] px-6 py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Invalid Checkout</h1>
        <p className="mt-4 text-warm-gray-500">
          This checkout link is invalid. Please start from a service page.
        </p>
        <Button href="/" className="mt-6">
          Back to Home
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-warm-gray-400">Confirming your price...</p>
      </div>
    );
  }

  if (error || totalCents === null) {
    return (
      <div className="mx-auto max-w-[600px] px-6 py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Pricing Error</h1>
        <p className="mt-4 text-error">{error}</p>
        <Button
          href={`/book/configure?service=${serviceSlug}`}
          className="mt-6"
        >
          Back to Configuration
        </Button>
      </div>
    );
  }

  return (
    <>
      <section className="bg-evergreen-dark px-6 py-10 text-white">
        <div className="mx-auto max-w-[600px]">
          <p className="text-sm font-medium uppercase tracking-wider text-sand-dark">
            Authorize &amp; Hold
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold">
            {service.name}
          </h1>
        </div>
      </section>

      <section className="bg-hte-white px-6 py-12">
        <div className="mx-auto max-w-[600px]">
          <Elements stripe={stripePromise}>
            <AuthorizeCheckoutForm
              serviceSlug={serviceSlug}
              config={config}
              tier={tier}
              date={date}
              slot={slot}
              totalCents={totalCents}
            />
          </Elements>
        </div>
      </section>
    </>
  );
}

export default function AuthorizeCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <p className="text-warm-gray-400">Loading checkout...</p>
        </div>
      }
    >
      <AuthorizeCheckoutContent />
    </Suspense>
  );
}
