import { notFound } from "next/navigation"
import { PricingTeaser } from "@/components/marketing/PricingTeaser"
import { isLocale } from "@/lib/i18n/config"

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  return <PricingTeaser locale={locale} />
}
