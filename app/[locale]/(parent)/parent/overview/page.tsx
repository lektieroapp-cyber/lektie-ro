import { notFound } from "next/navigation"
import { OnboardingForm } from "@/components/session/OnboardingForm"
import { isLocale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/auth/session"

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: boolean
}) {
  return (
    <div
      className="rounded-card bg-white p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <p className="text-sm text-muted">{label}</p>
      <p
        className={`mt-2 text-4xl font-bold ${accent ? "text-coral-deep" : "text-ink"}`}
        style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
      >
        {value}
      </p>
    </div>
  )
}

type Child = {
  id: string
  name: string
  grade: number
  avatar_emoji: string | null
  interests: string | null
  special_needs: string | null
}

export default async function ParentOverview({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const m = getMessages(locale)

  const user = (await getSessionUser())!
  const parentId = user.id

  const admin = createAdminClient()
  const { data } = await admin
    .from("children")
    .select("id, name, grade, avatar_emoji, interests, special_needs")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: true })
  const children: Child[] = data ?? []

  const formatGrade = (n: number) =>
    n === 0 ? m.overview.gradeKindergarten : m.overview.gradeLabel.replace("{n}", String(n))

  // Primary state: no children yet. Push them to add one — this page is
  // where they come specifically to manage kids, so we front-load the form.
  // Mirrors the first-run dashboard state (same layout, same centering) so
  // navigating between the two feels like one flow.
  if (children.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
        <div className="w-full max-w-xl">
          <OnboardingForm locale={locale} />
        </div>
      </div>
    )
  }

  const sessionsTotal = 0
  const streak = 0
  const lastActive: string | null = null

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1
          className="text-4xl md:text-5xl font-bold text-ink"
          style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
        >
          {m.overview.title}
        </h1>
        <p className="text-base text-muted max-w-xl">{m.overview.subtitle}</p>
      </header>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <StatCard label={m.overview.statsSessionsLabel} value={sessionsTotal} accent />
        <StatCard label={m.overview.statsStreakLabel} value={streak} />
        <StatCard
          label={m.overview.statsLastActiveLabel}
          value={lastActive ?? m.overview.statsLastActiveEmpty}
        />
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-ink">{m.overview.childrenTitle}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {children.map(c => (
            <div
              key={c.id}
              className="flex flex-col gap-3 rounded-card bg-white p-5"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex items-center gap-4">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-tint text-2xl" aria-hidden>
                  {c.avatar_emoji ?? "🙂"}
                </span>
                <div>
                  <p className="text-ink font-semibold">{c.name}</p>
                  <p className="text-sm text-muted">{formatGrade(c.grade)}</p>
                </div>
              </div>
              {(c.interests || c.special_needs) && (
                <dl className="border-t border-ink/5 pt-3 text-xs text-ink/75">
                  {c.interests && (
                    <div className="flex gap-2">
                      <dt className="shrink-0 text-muted">Interesser:</dt>
                      <dd>{c.interests}</dd>
                    </div>
                  )}
                  {c.special_needs && (
                    <div className="mt-1 flex gap-2">
                      <dt className="shrink-0 text-muted">Hensyn:</dt>
                      <dd>{c.special_needs}</dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-ink">{m.overview.recentTitle}</h2>
        <div
          className="mt-4 rounded-card bg-white p-8 text-center"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <p className="text-sm text-muted">{m.overview.recentEmpty}</p>
        </div>
      </section>
    </>
  )
}
