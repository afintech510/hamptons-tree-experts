import Link from "next/link";
import { services } from "@/lib/data/services";
import { towns } from "@/lib/data/towns";

export function Footer() {
  return (
    <footer className="bg-evergreen-dark text-sand-light">
      <div className="mx-auto max-w-[1200px] px-6 py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="font-display text-lg font-bold text-white">
              Hamptons Tree Experts
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-warm-gray-300">
              Professional tree and landscape services for Long Island&apos;s
              East End. One crew, one standard of work.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-sand">
              Services
            </h4>
            <ul className="mt-3 space-y-2">
              {services.map((service) => (
                <li key={service.slug}>
                  <Link
                    href={`/services/${service.slug}`}
                    className="text-sm text-warm-gray-300 transition-colors hover:text-white"
                  >
                    {service.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/emergency"
                  className="text-sm text-warm-gray-300 transition-colors hover:text-white"
                >
                  Emergency / Storm Response
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-sand">
              Service Areas
            </h4>
            <ul className="mt-3 space-y-2">
              {towns.map((town) => (
                <li key={town.slug}>
                  <Link
                    href={`/areas/${town.slug}`}
                    className="text-sm text-warm-gray-300 transition-colors hover:text-white"
                  >
                    {town.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-sand">
              Contact
            </h4>
            <div className="mt-3 space-y-2 text-sm text-warm-gray-300">
              <p>Serving the East End of Long Island</p>
              <p>Southampton &middot; Riverhead &middot; Brookhaven</p>
              <Link
                href="/contact"
                className="mt-4 inline-block rounded bg-rust px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rust-hover"
              >
                Request a Quote
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-evergreen-light pt-8 text-center text-xs text-warm-gray-400">
          <p>
            &copy; {new Date().getFullYear()} Hamptons Tree Experts. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
