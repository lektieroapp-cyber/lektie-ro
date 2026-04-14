import { notFound } from "next/navigation"
import { isLocale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"

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

export default async function ParentOverview({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const m = getMessages(locale)

  // Phase 2 will wire these to the real sessions table; placeholder values for now.
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
        <h2 className="text-xl font-semibold text-ink">{m.overview.recentTitle}</h2>
        <div
          className="mt-4 rounded-card bg-white p-8 text-center"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <p className="text-sm text-muted">{m.overview.recentEmpty}</p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-ink">{m.overview.subjectsTitle}</h2>
        <div
          className="mt-4 rounded-card bg-white p-8"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <p className="text-sm text-muted">{m.overview.subjectsEmpty}</p>
        </div>
      </section>

    </>
  )
}
