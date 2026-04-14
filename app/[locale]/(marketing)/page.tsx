import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { BenefitCards } from "@/components/marketing/BenefitCards"
import { Hero } from "@/components/marketing/Hero"
import { JsonLd } from "@/components/seo/JsonLd"
import { PricingTeaser } from "@/components/marketing/PricingTeaser"
import { PromiseBand } from "@/components/marketing/PromiseBand"
import { hreflang, isLocale, locales, ogLocales } from "@/lib/i18n/config"

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
    title: "LektieRo – fra lektiekonflikt til hjertelig kontakt",
    description:
      "AI-lektiehjælp til danske folkeskoleelever: vi guider barnet uden at give facit, så læringen bliver ægte og familien får ro.",
    alternates: { canonical: `/${locale}`, languages },
    openGraph: {
      type: "website",
      url: `${base}/${locale}`,
      locale: ogLocales[locale],
      siteName: "LektieRo",
      title: "LektieRo – fra lektiekonflikt til hjertelig kontakt",
      description:
        "AI-lektiehjælp til danske folkeskoleelever. Vejledning, ikke facit.",
    },
    twitter: {
      card: "summary_large_image",
      title: "LektieRo",
      description: "AI-lektiehjælp til danske folkeskoleelever. Vejledning, ikke facit.",
    },
  }
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "LektieRo",
          url: base,
          logo: `${base}/icon.png`,
          sameAs: [],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "LektieRo",
          url: `${base}/${locale}`,
          inLanguage: "da-DK",
        }}
      />
      <Hero locale={locale} />
      <PromiseBand locale={locale} />
      <BenefitCards locale={locale} />
      <PricingTeaser locale={locale} />
    </>
  )
}
