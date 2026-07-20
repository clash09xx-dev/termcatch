import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { publicDiscoveryWhere } from "@/lib/publication";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://termcatch.com";

  const staticPages: MetadataRoute.Sitemap = [
    "",
    "/search",
    "/categories",
    "/pricing",
    "/for-business",
    "/about",
    "/contact",
    "/careers",
    "/terms",
    "/privacy",
    "/cookies",
    "/gdpr",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" || path === "/search" ? "daily" : "weekly",
    priority: path === "" ? 1 : path === "/search" ? 0.9 : 0.5,
  }));

  let businessPages: MetadataRoute.Sitemap = [];
  try {
    const businesses = await prisma.business.findMany({
      where: publicDiscoveryWhere(),
      select: { slug: true, updatedAt: true },
      take: 5000,
    });
    businessPages = businesses.map((b) => ({
      url: `${base}/b/${b.slug}`,
      lastModified: b.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
  } catch {
    // DB unavailable — return static pages only
  }

  return [...staticPages, ...businessPages];
}
