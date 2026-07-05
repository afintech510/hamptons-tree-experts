interface LocalBusinessSchemaProps {
  url?: string;
}

export function LocalBusinessSchema({ url = "https://hamptonstreeexperts.com" }: LocalBusinessSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${url}/#business`,
    name: "Hamptons Tree Experts",
    description:
      "Professional tree removal, stump grinding, mulching, and landscape services for Long Island's East End.",
    url,
    areaServed: [
      { "@type": "City", name: "Westhampton", containedInPlace: { "@type": "AdministrativeArea", name: "Southampton" } },
      { "@type": "City", name: "Quogue", containedInPlace: { "@type": "AdministrativeArea", name: "Southampton" } },
      { "@type": "City", name: "Remsenburg", containedInPlace: { "@type": "AdministrativeArea", name: "Southampton" } },
      { "@type": "City", name: "Speonk", containedInPlace: { "@type": "AdministrativeArea", name: "Southampton" } },
      { "@type": "City", name: "Riverhead", containedInPlace: { "@type": "AdministrativeArea", name: "Riverhead" } },
      { "@type": "City", name: "Manorville", containedInPlace: { "@type": "AdministrativeArea", name: "Brookhaven" } },
    ],
    address: {
      "@type": "PostalAddress",
      addressRegion: "NY",
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 40.8268,
      longitude: -72.6468,
    },
    priceRange: "$$",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface ServiceSchemaProps {
  name: string;
  description: string;
  url: string;
  provider?: string;
}

export function ServiceSchema({
  name,
  description,
  url,
  provider = "Hamptons Tree Experts",
}: ServiceSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    url,
    provider: {
      "@type": "LocalBusiness",
      "@id": "https://hamptonstreeexperts.com/#business",
      name: provider,
    },
    areaServed: {
      "@type": "Place",
      name: "East End, Long Island, NY",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
