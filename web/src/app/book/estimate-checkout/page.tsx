"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { PolicyDisclosure } from "@/components/PolicyDisclosure";
import { Button } from "@/components/Button";
import { submitEstimate } from "@/lib/api";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
);

interface EstimateData {
  service: string;
  config: {
    approx_height_stories: string;
    access_difficulty: string;
    distance_to_structure_ft: number;
    access_notes: string;
  };
  date: string;
  slot: "am" | "pm";
  range_low_cents: number;
  range_high_cents: number;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

function EstimateCheckoutForm({ data }: { data: EstimateData }) {
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

  // Retrieve photos from sessionStorage-referenced file input
  // Photos are passed via the configure page — we read them here
  const [photos] = useState<File[]>(() => {
    // Photos can't be serialized to sessionStorage, so they were kept
    // in memory during the configure → checkout navigation.
    // For now, we proceed without photos (they're optional).
    return [];
  });

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

    const formData = new FormData();
    formData.append("service_slug", data.service);
    formData.append(
      "approx_height_stories",
      data.config.approx_height_stories,
    );
    formData.append("access_difficulty", data.config.access_difficulty);
    formData.append(
      "distance_to_structure_ft",
      String(data.config.distance_to_structure_ft),
    );
    formData.append("access_notes", data.config.access_notes || "");
    formData.append("requested_date", data.date);
    formData.append("slot", data.slot);
    formData.append("customer_email", email);
    formData.append("customer_phone", phone);
    formData.append("customer_name", name);
    formData.append("service_address", address);
    formData.append("payment_method_id", paymentMethod.id);
    formData.append("acknowledged", "true");
    formData.append("policy_acknowledged", "true");

    for (const photo of photos) {
      formData.append("photos", photo);
    }

    const { data: result, error } = await submitEstimate(
      formData,
      idempotencyKey,
    );

    if (error) {
      setErrorMsg(error.error.message);
      setSubmitting(false);
      return;
    }

    if (result) {
      const params = new URLSearchParams({
        order: result.order_number,
        email: result.customer_email,
      });
      router.push(`/book/confirmation?${params.toString()}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Order summary */}
      <div className="rounded-lg border border-warm-gray-200 bg-warm-gray-50 p-6">
        <h2 className="font-display text-lg font-bold text-warm-gray-800">
          Estimate Summary
        </h2>
        <div className="mt-4 space-y-2 text-sm text-warm-gray-600">
          <div className="flex justify-between">
            <span>Service</span>
            <span className="font-medium text-warm-gray-800">
              Tree Removal
            </span>
          </div>
          <div className="flex justify-between">
            <span>Date</span>
            <span className="font-medium text-warm-gray-800">
              {new Date(data.date + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Time</span>
            <span className="font-medium text-warm-gray-800">
              {data.slot === "am" ? "Morning" : "Afternoon"}
            </span>
          </div>
          <div className="mt-3 border-t border-warm-gray-200 pt-3">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold text-warm-gray-800">
                Estimated Range
              </span>
              <span className="text-lg font-bold text-evergreen-dark">
                {formatCents(data.range_low_cents)} –{" "}
                {formatCents(data.range_high_cents)}
              </span>
            </div>
            <p className="mt-1 text-xs text-warm-gray-400">
              An authorization hold of{" "}
              <strong>{formatCents(data.range_high_cents)}</strong> will be
              placed on your card. You will not be charged until the final price
              is confirmed on-site.
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
          Your card will be authorized for{" "}
          {formatCents(data.range_high_cents)} but will not be charged until the
          crew confirms the final price on-site.
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
        {submitting ? "Processing..." : "Submit Estimate Request"}
      </Button>
    </form>
  );
}

function EstimateCheckoutContent() {
  const router = useRouter();
  const [data, setData] = useState<EstimateData | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("estimate_data");
    if (stored) {
      try {
        setData(JSON.parse(stored));
      } catch {
        router.push("/book/configure?service=tree-removal");
      }
    } else {
      router.push("/book/configure?service=tree-removal");
    }
  }, [router]);

  if (!data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-warm-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <section className="bg-evergreen-dark px-6 py-10 text-white">
        <div className="mx-auto max-w-[600px]">
          <p className="text-sm font-medium uppercase tracking-wider text-sand-dark">
            Estimate Checkout
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold">
            Tree Removal
          </h1>
        </div>
      </section>

      <section className="bg-hte-white px-6 py-12">
        <div className="mx-auto max-w-[600px]">
          <Elements stripe={stripePromise}>
            <EstimateCheckoutForm data={data} />
          </Elements>
        </div>
      </section>
    </>
  );
}

export default function EstimateCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <p className="text-warm-gray-400">Loading checkout...</p>
        </div>
      }
    >
      <EstimateCheckoutContent />
    </Suspense>
  );
}
