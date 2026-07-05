import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { towns, getTownBySlug } from "@/lib/data/towns";
import { getTownshipBySlug } from "@/lib/data/townships";
import { services } from "@/lib/data/services";
import { Button } from "@/components/Button";
import { PhotoBand } from "@/components/PhotoBand";

export async function generateStaticParams() {
  return towns.map((t) => ({ town: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ town: string }>;
}): Promise<Metadata> {
  const { town: slug } = await params;
  const town = getTownBySlug(slug);
  if (!town) return {};

  return {
    title: `Tree & Landscape Services in ${town.name}, NY`,
    description: `Professional tree removal, stump grinding, mulching, and landscape services in ${town.name}, Long Island. Serving ${town.township} Township with local expertise.`,
    openGraph: {
      title: `${town.name} Tree Services | Hamptons Tree Experts`,
      description: `Local tree and landscape services in ${town.name}, NY. ${town.township} Township.`,
      url: `https://hamptonstreeexperts.com/areas/${town.slug}`,
    },
  };
}

export default async function TownPage({
  params,
}: {
  params: Promise<{ town: string }>;
}) {
  const { town: slug } = await params;
  const town = getTownBySlug(slug);
  if (!town) notFound();

  const township = getTownshipBySlug(town.townshipSlug);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: `Tree & Landscape Services in ${town.name}`,
            description: `Professional tree removal, stump grinding, mulching, and landscape services in ${town.name}, Long Island.`,
            url: `https://hamptonstreeexperts.com/areas/${town.slug}`,
            areaServed: {
              "@type": "City",
              name: town.name,
              containedInPlace: {
                "@type": "AdministrativeArea",
                name: town.township,
              },
            },
            provider: {
              "@type": "LocalBusiness",
              "@id": "https://hamptonstreeexperts.com/#business",
              name: "Hamptons Tree Experts",
            },
          }),
        }}
      />

      {/* Hero */}
      <section className="bg-evergreen-dark px-6 py-20 text-white">
        <div className="mx-auto max-w-[800px]">
          <p className="text-sm font-medium uppercase tracking-wider text-sand-dark">
            {town.township} Township
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
            {town.headline}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-sand-light">
            {town.intro}
          </p>
          <Button href="/contact" size="lg" className="mt-8">
            Get a Quote in {town.name}
          </Button>
        </div>
      </section>

      {/* Town hero image band */}
      <PhotoBand
        src={town.image}
        alt={`Tree and landscape work by Hamptons Tree Experts in ${town.name}, NY`}
        height="h-64 sm:h-80 lg:h-[26rem]"
      />

      {/* Local Knowledge — the non-transferable content */}
      <section className="bg-hte-white px-6 py-16">
        <div className="mx-auto max-w-[720px]">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Local Tree Knowledge: {town.name}
          </h2>
          <div className="mt-8 space-y-6">
            {town.localReferences.map((ref) => (
              <div
                key={ref.text.slice(0, 40)}
                className="rounded-lg border-l-4 border-evergreen bg-sand-light p-5"
              >
                <span className="mb-1 inline-block text-xs font-semibold uppercase tracking-wider text-warm-gray-400">
                  {ref.type.replace("_", " ")}
                </span>
                <p className="text-warm-gray-600 leading-relaxed">{ref.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Common Trees */}
      <section className="bg-sand-light px-6 py-16">
        <div className="mx-auto max-w-[720px]">
          <h2 className="font-display text-2xl font-bold">
            Common Tree Species in {town.name}
          </h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {town.commonTrees.map((tree) => (
              <span
                key={tree}
                className="rounded-full border border-evergreen/20 bg-white px-4 py-1.5 text-sm text-evergreen-dark"
              >
                {tree}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Service Highlights for This Area */}
      <section className="bg-hte-white px-6 py-16">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Popular Services in {town.name}
          </h2>
          <ul className="mt-6 space-y-3">
            {town.serviceHighlights.map((highlight) => (
              <li key={highlight} className="flex items-start gap-3 text-warm-gray-600">
                <svg
                  className="mt-0.5 h-5 w-5 shrink-0 text-evergreen"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{highlight}</span>
              </li>
            ))}
          </ul>

          <h3 className="mt-12 font-display text-xl font-bold">
            All Services Available in {town.name}
          </h3>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Link
                key={service.slug}
                href={`/services/${service.slug}`}
                className="group rounded-lg border border-warm-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <h4 className="font-display font-bold text-evergreen-dark group-hover:text-evergreen">
                  {service.name}
                </h4>
                <p className="mt-1 text-xs text-warm-gray-400">
                  {service.shortDescription.slice(0, 80)}...
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Township Permit Link */}
      <section className="bg-sand-light px-6 py-12">
        <div className="mx-auto max-w-[720px] rounded-lg border border-warm-gray-200 bg-white p-6">
          <h3 className="font-display text-lg font-bold">
            Tree Permits in {town.township} Township
          </h3>
          <p className="mt-2 text-sm text-warm-gray-500">
            {town.name} falls under {town.township} Township for tree work
            permits. Some tree removal and land-clearing projects may require a
            permit from the town.
          </p>
          {township?.verified ? (
            <Link
              href={`/permits/${town.townshipSlug}`}
              className="mt-4 inline-block text-sm font-semibold text-evergreen transition-colors hover:text-evergreen-light"
            >
              View {town.township} Township permit information &rarr;
            </Link>
          ) : (
            <p className="mt-4 text-sm text-warm-gray-400">
              Detailed permit information for {town.township} Township is being
              verified and will be published soon. Contact us if you need permit
              guidance for your project.
            </p>
          )}
          {township?.jurisdictionNote && (
            <div className="mt-4 rounded border border-warning/30 bg-warning/5 p-3">
              <p className="text-xs font-semibold text-warning">
                Jurisdiction Note
              </p>
              <p className="mt-1 text-xs text-warm-gray-500">
                {township.jurisdictionNote}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-evergreen px-6 py-16 text-center">
        <div className="mx-auto max-w-[600px]">
          <h2 className="font-display text-3xl font-bold text-white">
            Need Tree Work in {town.name}?
          </h2>
          <p className="mt-4 text-sand-light">
            We know the trees, the soil, and the storms in {town.name}.
            Tell us about your project.
          </p>
          <Button href="/contact" size="lg" className="mt-8">
            Get a Quote
          </Button>
        </div>
      </section>
    </>
  );
}
