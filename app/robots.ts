import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://termcatch.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/business/", "/customer/", "/admin/", "/api/", "/auth/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
