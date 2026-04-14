import { notFound } from "next/navigation"
import { isLocale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { DEV_BYPASS_AUTH, DEV_USER } from "@/lib/dev-user"

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

type Child = { id: string; name: string; grade: number; avatar_emoji: string | null }

export default async function ParentOverview({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const m = getMessages(locale)

  let parentId: string
  if (DEV_BYPASS_AUTH) {
    parentId = DEV_USER.id
  } else {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    parentId = user!.id
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from("children")
    .select("id, name, grade, avatar_emoji")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: true })
  const children: Child[] = data ?? []

  const sessionsTotal = 0
  const streak = 0
  const lastActive: string | null = null

  const formatGrade = (n: number) =>
    n === 0 ? m.overview.gradeKindergarten : m.overview.gradeLabel.replace("{n}", String(n))

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
        {children.length === 0 ? (
          <div
            className="mt-4 rounded-card bg-white p-8 text-center"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <p className="text-sm text-muted">{m.overview.childrenEmpty}</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {children.map(c => (
              <div
                key={c.id}
                className="flex items-center gap-4 rounded-card bg-white p-5"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-tint text-2xl" aria-hidden>
                  {c.avatar_emoji ?? "🙂"}
                </span>
                <div>
                  <p className="text-ink font-semibold">{c.name}</p>
                  <p className="text-sm text-muted">{formatGrade(c.grade)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
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
