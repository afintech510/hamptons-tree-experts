import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getVerifiedTownships,
  getTownshipBySlug,
} from "@/lib/data/townships";
import { towns } from "@/lib/data/towns";
import { Button } from "@/components/Button";
import Link from "next/link";

// R-29: ONLY verified townships generate static pages.
// Currently all townships are verified=false, so this returns an empty array
// and no permit pages are built. This is the structural publish gate.
export async function generateStaticParams() {
  const verified = getVerifiedTownships();
  return verified.map((t) => ({ township: t.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ township: string }>;
}): Promise<Metadata> {
  const { township: slug } = await params;
  const township = getTownshipBySlug(slug);
  if (!township || !township.verified) return {};

  return {
    title: `Tree Permits in ${township.name} Township, NY`,
    description: `Tree removal and land-clearing permit requirements for ${township.name} Township, Long Island. Know what you need before the crew arrives.`,
    openGraph: {
      title: `${township.name} Township Tree Permits | Hamptons Tree Experts`,
      description: `Permit information for tree work in ${township.name} Township.`,
      url: `https://hamptonstreeexperts.com/permits/${township.slug}`,
    },
  };
}

export default async function PermitPage({
  params,
}: {
  params: Promise<{ township: string }>;
}) {
  const { township: slug } = await params;
  const township = getTownshipBySlug(slug);

  // Double-check: never render unverified content even if somehow reached
  if (!township || !township.verified) notFound();

  const townshipTowns = towns.filter(
    (t) => t.townshipSlug === township.slug
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "GovernmentService",
            name: `${township.name} Township Tree Permits`,
            description: `Tree work permit requirements for ${township.name} Township, Suffolk County, NY.`,
            url: `https://hamptonstreeexperts.com/permits/${township.slug}`,
            serviceArea: {
              "@type": "AdministrativeArea",
              name: `${township.name} Township`,
            },
          }),
        }}
      />

      {/* Hero */}
      <section className="bg-evergreen-dark px-6 py-20 text-white">
        <div className="mx-auto max-w-[800px]">
          <p className="text-sm font-medium uppercase tracking-wider text-sand-dark">
            Permit Information
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
            Tree Permits in {township.name} Township
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-sand-light">
            Understand the permit requirements for tree removal and
            land-clearing work in {township.name} Township, Suffolk County.
          </p>
        </div>
      </section>

      {/* Permit Content */}
      <section className="bg-hte-white px-6 py-16">
        <div className="mx-auto max-w-[720px]">
          {township.permitContent ? (
            <div className="prose max-w-none text-warm-gray-600">
              <div
                dangerouslySetInnerHTML={{ __html: township.permitContent }}
              />
            </div>
          ) : (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-6">
              <p className="text-warm-gray-600">
                Permit content for {township.name} Township is being verified
                and will be published once confirmed. Contact us if you need
                permit guidance for your project.
              </p>
            </div>
          )}

          {township.jurisdictionNote && (
            <div className="mt-6 rounded-lg border border-warning/30 bg-warning/5 p-6">
              <p className="text-sm font-semibold text-warning">
                Jurisdiction Note
              </p>
              <p className="mt-1 text-sm text-warm-gray-600">
                {township.jurisdictionNote}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Towns in This Township */}
      <section className="bg-sand-light px-6 py-16">
        <div className="mx-auto max-w-[720px]">
          <h2 className="font-display text-2xl font-bold">
            Towns in {township.name} Township
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {townshipTowns.map((town) => (
              <Link
                key={town.slug}
                href={`/areas/${town.slug}`}
                className="rounded-lg border border-warm-gray-200 bg-white px-5 py-3 text-sm font-medium text-evergreen-dark transition-shadow hover:shadow-md"
              >
                {town.name} &rarr;
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-evergreen px-6 py-16 text-center">
        <div className="mx-auto max-w-[600px]">
          <h2 className="font-display text-3xl font-bold text-white">
            Need Help With Permits?
          </h2>
          <p className="mt-4 text-sand-light">
            We handle permit-required projects regularly in {township.name}{" "}
            Township and can guide you through the process.
          </p>
          <Button href="/contact" size="lg" className="mt-8">
            Contact Us
          </Button>
        </div>
      </section>
    </>
  );
}
