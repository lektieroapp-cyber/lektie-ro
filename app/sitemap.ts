import type { MetadataRoute } from "next"
import { hreflang, locales } from "@/lib/i18n/config"
import { routeSlugs } from "@/lib/i18n/routes"

type RouteKey = keyof (typeof routeSlugs)["da"]

// Per-route SEO weights + refresh signals. Keep the `lastModified` dates
// pinned so Googlebot doesn't treat every crawl as a re-publish.
const ROUTE_META: Record<RouteKey, {
  priority: number
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]
  lastModified: string
} | null> = {
  home: { priority: 1.0, changeFrequency: "weekly", lastModified: "2026-04-14" },
  faq: { priority: 0.8, changeFrequency: "monthly", lastModified: "2026-04-14" },
  pricing: { priority: 0.7, changeFrequency: "monthly", lastModified: "2026-04-14" },
  privacy: { priority: 0.4, changeFrequency: "yearly", lastModified: "2026-04-14" },
  terms: { priority: 0.4, changeFrequency: "yearly", lastModified: "2026-04-14" },
  // Everything below is non-public or user-area — omit from sitemap.
  login: null,
  signup: null,
  parentDashboard: null,
  parentOverview: null,
  admin: null,
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "")

  const buildUrl = (locale: string, key: RouteKey): string => {
    const slug = routeSlugs[locale as keyof typeof routeSlugs][key]
    return slug ? `${base}/${locale}/${slug}` : `${base}/${locale}`
  }

  const entries: MetadataRoute.Sitemap = []
  for (const locale of locales) {
    for (const key of Object.keys(ROUTE_META) as RouteKey[]) {
      const meta = ROUTE_META[key]
      if (!meta) continue

      // hreflang alternates — empty today (only `da`), future-proofed for sv/nb.
      const languages: Record<string, string> = {}
      for (const l of locales) languages[hreflang[l]] = buildUrl(l, key)
      languages["x-default"] = buildUrl(locale, key)

      entries.push({
        url: buildUrl(locale, key),
        lastModified: new Date(meta.lastModified),
        changeFrequency: meta.changeFrequency,
        priority: meta.priority,
        alternates: { languages },
      })
    }
  }
  return entries
}
