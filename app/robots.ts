import type { MetadataRoute } from "next";

const baseUrl = "https://aruzino.ir";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/panel", "/auth", "/quiz", "/result"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
