import { hreflang, locales } from "@/lib/i18n/config"
import { routeSlugs } from "@/lib/i18n/routes"

type RouteKey = keyof (typeof routeSlugs)["da"]

const ROUTE_META: Record<RouteKey, {
  priority: number
  changeFrequency: "weekly" | "monthly" | "yearly"
  lastModified: string
} | null> = {
  home: { priority: 1.0, changeFrequency: "weekly", lastModified: "2026-04-14" },
  faq: { priority: 0.8, changeFrequency: "monthly", lastModified: "2026-04-14" },
  pricing: { priority: 0.7, changeFrequency: "monthly", lastModified: "2026-04-14" },
  privacy: { priority: 0.4, changeFrequency: "yearly", lastModified: "2026-04-14" },
  terms: { priority: 0.4, changeFrequency: "yearly", lastModified: "2026-04-14" },
  login: null,
  signup: null,
  parentDashboard: null,
  parentOverview: null,
  admin: null,
}

export async function GET() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "")

  const buildUrl = (locale: string, key: RouteKey): string => {
    const slug = routeSlugs[locale as keyof typeof routeSlugs][key]
    return slug ? `${base}/${locale}/${slug}` : `${base}/${locale}`
  }

  const urls: string[] = []
  for (const locale of locales) {
    for (const key of Object.keys(ROUTE_META) as RouteKey[]) {
      const meta = ROUTE_META[key]
      if (!meta) continue
      const loc = buildUrl(locale, key)
      const alternates = locales
        .map(l => `    <xhtml:link rel="alternate" hreflang="${hreflang[l]}" href="${buildUrl(l, key)}" />`)
        .join("\n")
      urls.push(
        [
          `  <url>`,
          `    <loc>${loc}</loc>`,
          alternates,
          `    <xhtml:link rel="alternate" hreflang="x-default" href="${loc}" />`,
          `    <lastmod>${meta.lastModified}</lastmod>`,
          `    <changefreq>${meta.changeFrequency}</changefreq>`,
          `    <priority>${meta.priority}</priority>`,
          `  </url>`,
        ].join("\n")
      )
    }
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>
`

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}
