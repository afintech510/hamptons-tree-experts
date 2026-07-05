import type { MetadataRoute } from "next";
import { services } from "@/lib/data/services";
import { towns } from "@/lib/data/towns";
import { getVerifiedTownships } from "@/lib/data/townships";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://hamptonstreeexperts.com";

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/emergency`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  const servicePages: MetadataRoute.Sitemap = services.map((service) => ({
    url: `${baseUrl}/services/${service.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const townPages: MetadataRoute.Sitemap = towns.map((town) => ({
    url: `${baseUrl}/areas/${town.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  // R-29: only verified townships appear in the sitemap
  const verifiedTownships = getVerifiedTownships();
  const permitPages: MetadataRoute.Sitemap = verifiedTownships.map((t) => ({
    url: `${baseUrl}/permits/${t.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticPages, ...servicePages, ...townPages, ...permitPages];
}
