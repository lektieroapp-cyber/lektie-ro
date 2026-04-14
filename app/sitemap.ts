import type { MetadataRoute } from "next"
import { locales } from "@/lib/i18n/config"
import { routeSlugs } from "@/lib/i18n/routes"

const PUBLIC_ROUTE_KEYS: (keyof (typeof routeSlugs)["da"])[] = [
  "home",
  "pricing",
  "privacy",
  "terms",
]

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  const now = new Date()

  const entries: MetadataRoute.Sitemap = []
  for (const locale of locales) {
    for (const key of PUBLIC_ROUTE_KEYS) {
      const slug = routeSlugs[locale][key]
      const url = slug ? `${base}/${locale}/${slug}` : `${base}/${locale}`
      entries.push({
        url,
        lastModified: now,
        changeFrequency: "monthly",
        priority: key === "home" ? 1 : 0.6,
      })
    }
  }
  return entries
}
