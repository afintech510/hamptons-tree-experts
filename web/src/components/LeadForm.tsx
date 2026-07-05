"use client";

import { useState, useEffect, type FormEvent } from "react";
import { services } from "@/lib/data/services";
import { trackLeadFormSubmit } from "./Analytics";
import { Button } from "./Button";

interface CapacityStatus {
  paused: boolean;
  message: string;
}

export function LeadForm() {
  const [capacityStatus, setCapacityStatus] = useState<CapacityStatus | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/capacity-status")
      .then((r) => r.json())
      .then((data: CapacityStatus) => setCapacityStatus(data))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          service: data.get("service"),
          message: data.get("message"),
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Something went wrong.");
      }

      trackLeadFormSubmit();
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-8 text-center">
        <h3 className="font-display text-2xl font-bold text-evergreen-dark">
          Thank You
        </h3>
        <p className="mt-2 text-warm-gray-600">
          We&apos;ve received your information and will get back to you shortly.
        </p>
      </div>
    );
  }

  return (
    <div>
      {capacityStatus?.paused && (
        <div className="mb-6 rounded-lg border border-warning/30 bg-warning/10 p-4">
          <p className="text-sm font-semibold text-warning">
            Limited Availability
          </p>
          <p className="mt-1 text-sm text-warm-gray-600">
            {capacityStatus.message ||
              "We're currently booked to capacity this week. Leave your details and we'll reach out when a slot opens."}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-warm-gray-700"
          >
            Name <span className="text-error">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            className="mt-1 block w-full rounded border border-warm-gray-200 bg-white px-4 py-2.5 text-warm-gray-800 outline-none transition-colors focus:border-evergreen focus:ring-1 focus:ring-evergreen"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-warm-gray-700"
            >
              Email <span className="text-error">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="mt-1 block w-full rounded border border-warm-gray-200 bg-white px-4 py-2.5 text-warm-gray-800 outline-none transition-colors focus:border-evergreen focus:ring-1 focus:ring-evergreen"
            />
          </div>
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-warm-gray-700"
            >
              Phone <span className="text-error">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              required
              className="mt-1 block w-full rounded border border-warm-gray-200 bg-white px-4 py-2.5 text-warm-gray-800 outline-none transition-colors focus:border-evergreen focus:ring-1 focus:ring-evergreen"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="service"
            className="block text-sm font-medium text-warm-gray-700"
          >
            Service Interest
          </label>
          <select
            id="service"
            name="service"
            className="mt-1 block w-full rounded border border-warm-gray-200 bg-white px-4 py-2.5 text-warm-gray-800 outline-none transition-colors focus:border-evergreen focus:ring-1 focus:ring-evergreen"
          >
            <option value="">Select a service (optional)</option>
            {services.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
            <option value="emergency">Emergency / Storm Response</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="message"
            className="block text-sm font-medium text-warm-gray-700"
          >
            Tell Us About Your Project
          </label>
          <textarea
            id="message"
            name="message"
            rows={4}
            className="mt-1 block w-full rounded border border-warm-gray-200 bg-white px-4 py-2.5 text-warm-gray-800 outline-none transition-colors focus:border-evergreen focus:ring-1 focus:ring-evergreen"
          />
        </div>

        {error && (
          <p className="text-sm text-error">{error}</p>
        )}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Sending..." : "Send Request"}
        </Button>
      </form>
    </div>
  );
}
