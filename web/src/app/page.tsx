import { Button } from "@/components/Button";
import { PhotoBand } from "@/components/PhotoBand";
import { services } from "@/lib/data/services";
import { towns } from "@/lib/data/towns";
import Link from "next/link";

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="bg-evergreen-dark px-6 py-24 text-center text-white sm:py-32">
        <div className="mx-auto max-w-[800px]">
          <h1 className="font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
            Professional Tree &amp; Landscape Services for Long Island&apos;s
            East End
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-sand-light">
            One crew. One standard of work. From storm damage cleanup to
            precision stump grinding, we handle every job ourselves—no
            subcontractors, no handoffs.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button href="/contact" size="lg">
              Get a Free Quote
            </Button>
            <Button href="/emergency" variant="outline" size="lg" className="border-sand-light text-sand-light hover:bg-sand-light hover:text-evergreen-dark">
              Storm Emergency?
            </Button>
          </div>
        </div>
      </section>

      {/* Hero image band */}
      <PhotoBand
        src="/photos/home-hero.webp"
        alt="Hamptons Tree Experts arborist roped into the top of a tall oak on Long Island's East End"
        position="center 25%"
        height="h-72 sm:h-96 lg:h-[32rem]"
        caption="One crew, on the ropes—every job done by the team that quoted it."
      />

      {/* Services Grid */}
      <section className="bg-hte-white px-6 py-20">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">
            Our Services
          </h2>
          <p className="mx-auto mt-4 max-w-[600px] text-center text-warm-gray-500">
            Every service priced upfront or estimated on-site. No surprises, no
            hidden fees.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Link
                key={service.slug}
                href={`/services/${service.slug}`}
                className="group overflow-hidden rounded-lg border border-warm-gray-200 bg-white transition-shadow hover:shadow-md"
              >
                <div className="h-44 w-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={service.image}
                    alt={`${service.name} service by Hamptons Tree Experts`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-display text-xl font-bold text-evergreen-dark group-hover:text-evergreen">
                    {service.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-warm-gray-500">
                    {service.shortDescription}
                  </p>
                  <span className="mt-4 inline-block text-sm font-semibold text-rust">
                    {service.ctaText} &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-sand-light px-6 py-20">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">
            Why the East End Trusts Us
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-evergreen text-white">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mt-4 font-display text-lg font-bold">
                One Crew, Every Job
              </h3>
              <p className="mt-2 text-sm text-warm-gray-500">
                The same team that gives you a quote does the work. No
                subcontractors, no surprises.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-evergreen text-white">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mt-4 font-display text-lg font-bold">
                Book Online, Instantly
              </h3>
              <p className="mt-2 text-sm text-warm-gray-500">
                Pick your service, choose your date, and lock it in. Two slots
                per day—when it&apos;s booked, it&apos;s booked.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-evergreen text-white">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
              <h3 className="mt-4 font-display text-lg font-bold">
                East End Local
              </h3>
              <p className="mt-2 text-sm text-warm-gray-500">
                We know the species, the soil, the salt, and the storms. From
                Westhampton to Riverhead, this is our backyard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Service Areas */}
      <section className="bg-hte-white px-6 py-20">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">
            Areas We Serve
          </h2>
          <p className="mx-auto mt-4 max-w-[600px] text-center text-warm-gray-500">
            Dedicated coverage across the East End&apos;s towns and hamlets.
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {towns.map((town) => (
              <Link
                key={town.slug}
                href={`/areas/${town.slug}`}
                className="group flex items-center justify-between rounded-lg border border-warm-gray-200 bg-white px-6 py-4 transition-shadow hover:shadow-md"
              >
                <div>
                  <span className="font-display text-lg font-bold text-evergreen-dark group-hover:text-evergreen">
                    {town.name}
                  </span>
                  <span className="ml-2 text-sm text-warm-gray-400">
                    {town.township} Township
                  </span>
                </div>
                <span className="text-warm-gray-300 transition-colors group-hover:text-rust">
                  &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Crew band */}
      <PhotoBand
        src="/photos/home-crew.webp"
        alt="The Hamptons Tree Experts crew on-site in branded gear"
        position="center 35%"
        height="h-64 sm:h-80 lg:h-[26rem]"
        caption="The same faces from quote to cleanup—no subcontractors, no handoffs."
      />

      {/* CTA */}
      <section className="bg-evergreen px-6 py-20 text-center">
        <div className="mx-auto max-w-[600px]">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Ready to Get Started?
          </h2>
          <p className="mt-4 text-lg text-sand-light">
            Tell us about your project and we&apos;ll get back to you with a
            plan.
          </p>
          <Button href="/contact" size="lg" className="mt-8">
            Request a Quote
          </Button>
        </div>
      </section>
    </>
  );
}
