export interface Township {
  name: string;
  slug: string;
  permitContent: string | null;
  verified: boolean;
  jurisdictionNote: string | null;
}

export const townships: Township[] = [
  {
    name: "Southampton",
    slug: "southampton",
    permitContent: null,
    verified: false,
    jurisdictionNote: null,
  },
  {
    name: "Riverhead",
    slug: "riverhead",
    permitContent: null,
    verified: false,
    jurisdictionNote: null,
  },
  {
    name: "Brookhaven",
    slug: "brookhaven",
    permitContent: null,
    verified: false,
    jurisdictionNote:
      "Manorville straddles township lines; jurisdiction for permitting is not yet confirmed (SOW N2). Do not publish until verified.",
  },
];

export function getVerifiedTownships(): Township[] {
  return townships.filter((t) => t.verified);
}

export function getTownshipBySlug(slug: string): Township | undefined {
  return townships.find((t) => t.slug === slug);
}
