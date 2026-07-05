import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { services, getServiceBySlug } from "@/lib/data/services";
import { Button } from "@/components/Button";
import { PhotoBand } from "@/components/PhotoBand";
import { ServiceSchema } from "@/components/SchemaOrg";

export async function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return {};

  return {
    title: `${service.name} Services | East End, Long Island`,
    description: service.shortDescription,
    openGraph: {
      title: `${service.name} | Hamptons Tree Experts`,
      description: service.shortDescription,
      url: `https://hamptonstreeexperts.com/services/${service.slug}`,
    },
  };
}

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();

  const fulfillmentLabel =
    service.fulfillmentType === "bin_immediate"
      ? "Book & Pay Instantly"
      : service.fulfillmentType === "authorize_confirm"
        ? "Reserve & Confirm"
        : "Get an Estimate";

  return (
    <>
      <ServiceSchema
        name={service.name}
        description={service.shortDescription}
        url={`https://hamptonstreeexperts.com/services/${service.slug}`}
      />

      {/* Hero */}
      <section className="bg-evergreen-dark px-6 py-20 text-white">
        <div className="mx-auto max-w-[800px]">
          <p className="text-sm font-medium uppercase tracking-wider text-sand-dark">
            {fulfillmentLabel}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
            {service.name}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-sand-light">
            {service.shortDescription}
          </p>
          {/* CTA into booking flow or contact form */}
          <Button
            href={
              service.fulfillmentType === "bin_immediate"
                ? `/book/configure?service=${service.slug}`
                : "/contact"
            }
            size="lg"
            className="mt-8"
          >
            {service.ctaText}
          </Button>
        </div>
      </section>

      {/* Service hero image band */}
      <PhotoBand
        src={service.heroImage}
        alt={`${service.name} on Long Island's East End by Hamptons Tree Experts`}
        height="h-64 sm:h-80 lg:h-[28rem]"
      />

      {/* Description */}
      <section className="bg-hte-white px-6 py-16">
        <div className="mx-auto max-w-[720px]">
          <p className="text-lg leading-relaxed text-warm-gray-600">
            {service.description}
          </p>
        </div>
      </section>

      {/* Features + Process */}
      <section className="bg-sand-light px-6 py-16">
        <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-bold">
              What&apos;s Included
            </h2>
            <ul className="mt-6 space-y-3">
              {service.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-3 text-warm-gray-600"
                >
                  <svg
                    className="mt-0.5 h-5 w-5 shrink-0 text-success"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold">How It Works</h2>
            <ol className="mt-6 space-y-6">
              {service.process.map((step, i) => (
                <li key={step} className="flex items-start gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-evergreen font-mono text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="pt-1 text-warm-gray-600">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-evergreen px-6 py-16 text-center">
        <div className="mx-auto max-w-[600px]">
          <h2 className="font-display text-3xl font-bold text-white">
            Ready for {service.name}?
          </h2>
          <p className="mt-4 text-sand-light">
            Tell us about your project and we&apos;ll handle the rest.
          </p>
          <Button
            href={
              service.fulfillmentType === "bin_immediate"
                ? `/book/configure?service=${service.slug}`
                : "/contact"
            }
            size="lg"
            className="mt-8"
          >
            {service.ctaText}
          </Button>
        </div>
      </section>
    </>
  );
}
