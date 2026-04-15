import { notFound } from "next/navigation"
import { isLocale } from "@/lib/i18n/config"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/auth/session"
import { EditChildCard } from "@/components/children/EditChildCard"
import { OnboardingForm } from "@/components/session/OnboardingForm"
import { type Locale } from "@/lib/i18n/config"

type Child = {
  id: string
  name: string
  grade: number
  avatar_emoji: string | null
  interests: string | null
  special_needs: string | null
}

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const user = (await getSessionUser())!
  const admin = createAdminClient()
  const { data } = await admin
    .from("children")
    .select("id, name, grade, avatar_emoji, interests, special_needs")
    .eq("parent_id", user.id)
    .order("created_at", { ascending: true })
  const children: Child[] = data ?? []

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1
          className="text-4xl md:text-5xl font-bold text-ink"
          style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
        >
          Indstillinger
        </h1>
        <p className="text-base text-muted">Administrer din konto og dine børns profiler.</p>
      </header>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink">Min konto</h2>
        <div
          className="mt-3 rounded-card bg-white p-5"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Email</p>
            <p className="text-[15px] text-ink">{user.email}</p>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink">
          {children.length === 0 ? "Tilføj dit første barn" : `Dine børn (${children.length})`}
        </h2>

        {children.length > 0 && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {children.map(c => (
              <EditChildCard key={c.id} child={c} />
            ))}
          </div>
        )}

        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-muted">
            {children.length > 0 ? "Tilføj endnu et barn" : ""}
          </h3>
          <OnboardingForm locale={locale as Locale} />
        </div>
      </section>
    </>
  )
}
