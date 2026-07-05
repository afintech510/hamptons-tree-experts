import type { Metadata } from "next";
import { LeadForm } from "@/components/LeadForm";
import { PhotoBand } from "@/components/PhotoBand";

export const metadata: Metadata = {
  title: "Contact Us | Get a Free Quote",
  description:
    "Request a quote for tree removal, stump grinding, mulching, or any landscape service on Long Island's East End. We'll get back to you promptly.",
  openGraph: {
    title: "Contact Hamptons Tree Experts",
    description:
      "Get a free quote for tree and landscape services on the East End.",
    url: "https://hamptonstreeexperts.com/contact",
  },
};

export default function ContactPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-evergreen-dark px-6 py-16 text-white">
        <div className="mx-auto max-w-[800px] text-center">
          <h1 className="font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
            Get a Free Quote
          </h1>
          <p className="mt-4 text-lg text-sand-light">
            Tell us about your project and we&apos;ll get back to you with a
            plan and pricing.
          </p>
        </div>
      </section>

      {/* Fleet / equipment band */}
      <PhotoBand
        src="/photos/contact-fleet.webp"
        alt="Hamptons Tree Experts spider lift and branded truck staged on an East End street"
        height="h-56 sm:h-72 lg:h-80"
      />

      {/* Form Section */}
      <section className="bg-hte-white px-6 py-16">
        <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <LeadForm />
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-lg border border-warm-gray-200 bg-sand-light p-6">
              <h3 className="font-display text-lg font-bold">
                What Happens Next
              </h3>
              <ol className="mt-4 space-y-4">
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-evergreen font-mono text-xs font-bold text-white">
                    1
                  </span>
                  <p className="text-sm text-warm-gray-600">
                    We review your request and reach out within one business day.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-evergreen font-mono text-xs font-bold text-white">
                    2
                  </span>
                  <p className="text-sm text-warm-gray-600">
                    For straightforward services, we&apos;ll send you a link to
                    book and pay online. For tree removal, we&apos;ll schedule an
                    on-site assessment.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-evergreen font-mono text-xs font-bold text-white">
                    3
                  </span>
                  <p className="text-sm text-warm-gray-600">
                    We show up, do the work, and leave your property better than
                    we found it.
                  </p>
                </li>
              </ol>
            </div>

            <div className="mt-6 rounded-lg border border-warm-gray-200 bg-sand-light p-6">
              <h3 className="font-display text-lg font-bold">Service Area</h3>
              <p className="mt-2 text-sm text-warm-gray-600">
                We serve the East End of Long Island, including:
              </p>
              <ul className="mt-3 space-y-1 text-sm text-warm-gray-600">
                <li>Westhampton &middot; Quogue &middot; Remsenburg</li>
                <li>Speonk &middot; Riverhead &middot; Manorville</li>
              </ul>
              <p className="mt-3 text-sm text-warm-gray-600">
                Across Southampton, Riverhead, and Brookhaven Townships.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
