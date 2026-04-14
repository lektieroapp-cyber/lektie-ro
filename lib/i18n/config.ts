export const locales = ["da"] as const
export const defaultLocale: Locale = "da"
export type Locale = (typeof locales)[number]

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}

// OpenGraph locale codes for metadata.
export const ogLocales: Record<Locale, string> = {
  da: "da_DK",
}

// BCP-47 hreflang codes for <link rel="alternate">.
export const hreflang: Record<Locale, string> = {
  da: "da-DK",
}
