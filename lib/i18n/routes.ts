import { type Locale } from "./config"

// Canonical route slugs. We deliberately keep slugs in **English across all
// locales** for SEO consistency (shorter, recognisable, shared link anchors)
// and to avoid per-locale URL churn. Content on the page is still localised
// via messages/{locale}.json; only the URL stays English.
//
// If a locale ever needs a localised slug (rare), override it in the locale
// map below and update sitemap/hreflang tags accordingly.
const SHARED_SLUGS = {
  home: "",
  privacy: "privacy",
  terms: "terms",
  pricing: "pricing",
  login: "login",
  signup: "signup",
  parentDashboard: "parent/dashboard",
  parentOverview: "parent/overview",
  admin: "admin",
} as const

export const routeSlugs: Record<Locale, typeof SHARED_SLUGS> = {
  da: SHARED_SLUGS,
}

export function localePath(
  locale: Locale,
  routeKey: keyof typeof SHARED_SLUGS
): string {
  const slug = routeSlugs[locale][routeKey]
  return slug ? `/${locale}/${slug}` : `/${locale}`
}
