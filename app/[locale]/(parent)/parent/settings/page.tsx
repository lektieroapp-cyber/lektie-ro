import { notFound } from "next/navigation"
import Link from "next/link"
import { isLocale, type Locale } from "@/lib/i18n/config"
import { localePath } from "@/lib/i18n/routes"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/auth/session"
import { EditChildCard } from "@/components/children/EditChildCard"
import { AddChildSection } from "@/components/children/AddChildSection"

const TIER_LABELS: Record<string, string> = {
  free: "Gratis",
  standard: "Enkelt",
  family: "Familie",
}
const TIER_LIMITS: Record<string, number> = { free: 0, standard: 1, family: 4 }

type Child = {
  id: string; name: string; grade: number
  avatar_emoji: string | null; companion_type: string | null
  interests: string | null; special_needs: string | null
}

export default async function SettingsPage({
  params,
}: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const user = (await getSessionUser())!
  const admin = createAdminClient()

  const [{ data: profileData }, { data: childrenData }] = await Promise.all([
    admin.from("profiles").select("role, subscription_tier").eq("id", user.id).single(),
    admin.from("children").select("id, name, grade, avatar_emoji, companion_type, interests, special_needs")
      .eq("parent_id", user.id).order("created_at", { ascending: true }),
  ])

  const children: Child[] = childrenData ?? []
  const isAdmin = profileData?.role === "admin"
  const tier: string = profileData?.subscription_tier ?? "standard"
  const limit = isAdmin ? Infinity : (TIER_LIMITS[tier] ?? 1)
  const atLimit = children.length >= limit

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold text-ink md:text-5xl"
          style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}>
          Indstillinger
        </h1>
        <p className="text-base text-muted">Administrer din konto og dine børns profiler.</p>
      </header>

      {/* Account */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink">Min konto</h2>
        <div className="mt-3 rounded-card bg-white p-5" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Email</p>
              <p className="text-[15px] text-ink">{user.email}</p>
            </div>
            <div className="flex flex-col gap-1 sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Abonnement</p>
              <div className="flex items-center gap-2 sm:justify-end">
                <span className="rounded-full bg-mint-soft px-2.5 py-0.5 text-[12px] font-semibold text-mint-deep">
                  {isAdmin ? "Admin" : TIER_LABELS[tier] ?? tier}
                </span>
                {!isAdmin && (
                  <span className="text-[13px] text-muted">
                    {children.length}/{limit === Infinity ? "∞" : limit} barn
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Billing placeholder */}
      <section className="mt-6">
        <div className="rounded-card border border-dashed border-ink/15 bg-white/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-semibold text-ink">Fakturering</p>
              <p className="mt-0.5 text-[13px] text-muted">Administrer dit abonnement og betalingsoplysninger.</p>
            </div>
            <span className="rounded-full bg-canvas-warm px-2.5 py-1 text-[11px] font-semibold text-ink/60">
              Kommer snart
            </span>
          </div>
        </div>
      </section>

      {/* Children */}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">
            Dine børn ({children.length}/{limit === Infinity ? "∞" : limit})
          </h2>
          {children.length > 0 && (
            <Link
              href={localePath(locale, "parentProfiles")}
              className="text-[13px] font-medium text-mint-deep hover:text-ink"
            >
              Skift profil →
            </Link>
          )}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {children.map(c => <EditChildCard key={c.id} child={c} />)}
        </div>

        <div className="mt-4">
          <AddChildSection locale={locale as Locale} atLimit={atLimit} tier={tier} isAdmin={isAdmin} />
        </div>
      </section>
    </>
  )
}
