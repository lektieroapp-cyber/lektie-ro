import type { Metadata } from "next"
import { Fraunces, Inter } from "next/font/google"
import { notFound } from "next/navigation"
import { hreflang, isLocale, locales, ogLocales } from "@/lib/i18n/config"

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
})

const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
})

export function generateStaticParams() {
  return locales.map(locale => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}

  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  const languages: Record<string, string> = Object.fromEntries(
    locales.map(l => [hreflang[l], `${base}/${l}`])
  )
  languages["x-default"] = `${base}/${locale}`

  return {
    title: { default: "LektieRo", template: "%s · LektieRo" },
    description:
      "LektieRo guider dit barn gennem lektierne uden at give facit – så læringen bliver ægte og familien får ro.",
    alternates: {
      canonical: `/${locale}`,
      languages,
    },
    openGraph: {
      type: "website",
      locale: ogLocales[locale],
      siteName: "LektieRo",
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  return (
    <html lang={locale} className={`${inter.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  )
}
