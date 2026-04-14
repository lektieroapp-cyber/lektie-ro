import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { PricingTeaser } from "@/components/marketing/PricingTeaser"
import { isLocale } from "@/lib/i18n/config"

export const metadata: Metadata = {
  title: "Priser",
  description:
    "Se kommende medlemskaber til LektieRo: Standard og Family Premium. Priserne er vejledende og aktiveres ved lancering.",
  alternates: { canonical: "/da/pricing" },
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  return <PricingTeaser locale={locale} />
}
