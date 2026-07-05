import Link from "next/link";

const navLinks = [
  { href: "/services/tree-removal", label: "Tree Removal" },
  { href: "/services/stump-grinding", label: "Stump Grinding" },
  { href: "/services/mulching", label: "Mulching" },
  { href: "/emergency", label: "Emergency" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  return (
    <header className="bg-evergreen text-hte-white">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
        <Link href="/" className="flex flex-col">
          <span className="font-display text-xl font-bold tracking-tight sm:text-2xl">
            Hamptons Tree Experts
          </span>
          <span className="text-sm text-sand-dark opacity-80">
            East End Tree &amp; Landscape Services
          </span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-sand-light transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/contact"
            className="rounded bg-rust px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rust-hover"
          >
            Get a Quote
          </Link>
        </nav>
        <MobileMenuButton />
      </div>
    </header>
  );
}

function MobileMenuButton() {
  return (
    <details className="group relative md:hidden">
      <summary className="flex h-10 w-10 cursor-pointer items-center justify-center rounded list-none">
        <svg
          className="h-6 w-6 text-sand-light"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </summary>
      <div className="absolute right-0 top-12 z-50 w-56 rounded-lg border border-warm-gray-200 bg-hte-white p-4 shadow-lg">
        <nav className="flex flex-col gap-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-warm-gray-700 transition-colors hover:text-evergreen"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/contact"
            className="mt-2 rounded bg-rust px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-rust-hover"
          >
            Get a Quote
          </Link>
        </nav>
      </div>
    </details>
  );
}
