import { notFound } from "next/navigation"
import { CostCalculator } from "@/components/admin/CostCalculator"
import { isLocale } from "@/lib/i18n/config"

export default async function AdminCostsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  return (
    <>
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-ink">AI-omkostninger per barn</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Estimér hvad AI-inference koster os per barn baseret på forbrug og
          valgte Azure-modeller. Tallene er rå Azure pay-as-you-go pris — ingen
          margen, ingen fast infrastruktur.
        </p>
      </section>

      <section className="mt-6">
        <CostCalculator />
      </section>
    </>
  )
}
