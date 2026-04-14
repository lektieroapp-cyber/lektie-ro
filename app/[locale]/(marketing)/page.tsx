import { notFound } from "next/navigation"
import { BenefitCards } from "@/components/marketing/BenefitCards"
import { Hero } from "@/components/marketing/Hero"
import { PricingTeaser } from "@/components/marketing/PricingTeaser"
import { PromiseBand } from "@/components/marketing/PromiseBand"
import { isLocale } from "@/lib/i18n/config"

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  return (
    <>
      <Hero locale={locale} />
      <PromiseBand locale={locale} />
      <BenefitCards locale={locale} />
      <PricingTeaser locale={locale} />
    </>
  )
}
