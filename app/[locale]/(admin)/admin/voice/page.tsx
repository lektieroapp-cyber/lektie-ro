import { notFound } from "next/navigation"
import { VoiceAdminPanel } from "@/components/admin/VoiceAdminPanel"
import { isLocale } from "@/lib/i18n/config"
import { getVoiceDiagnostics, getVoiceMode } from "@/lib/voice-mode"

export default async function AdminVoicePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const mode = await getVoiceMode()
  const diagnostics = getVoiceDiagnostics(mode)

  return (
    <>
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-ink">Stemme — Azure Speech</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          LektieRo kører stemme gennem Azure AI Speech i Sweden Central — fuld
          GDPR under vores eksisterende Azure-tenant. Her vælger du den danske
          stemme, ser forbrugsoverblikket per barn og tester både
          tale-til-tekst og tekst-til-tale.
        </p>
      </section>

      <VoiceAdminPanel initialMode={mode} initialDiagnostics={diagnostics} />
    </>
  )
}
