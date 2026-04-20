import { notFound, redirect } from "next/navigation"
import { Companion } from "@/components/mascot/Companion"
import { COMPANIONS, DEFAULT_COMPANION, type CompanionType } from "@/components/mascot/types"
import { isLocale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/auth/session"
import { localePath } from "@/lib/i18n/routes"

const VALID_COMPANIONS = new Set<string>(COMPANIONS.map(c => c.type))

function toCompanion(value: string | null): CompanionType {
  return value && VALID_COMPANIONS.has(value) ? (value as CompanionType) : DEFAULT_COMPANION
}
// CoachPanel — Phase 2: will be powered by Azure OpenAI

// ─── Types ────────────────────────────────────────────────────────────────────

type Child = {
  id: string
  name: string
  grade: number
  avatar_emoji: string | null
  interests: string | null
  special_needs: string | null
  companion_type: string | null
}

type Session = {
  id: string
  child_id: string
  subject: string
  grade: number
  problem_text: string | null
  mode: string
  turn_count: number
  completed: boolean
  difficulty_score: number | null
  created_at: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DIFFICULTY_LABEL: Record<number, { label: string; color: string }> = {
  1: { label: "Nemt",      color: "text-mint-deep" },
  2: { label: "OK",        color: "text-ink/70" },
  3: { label: "Lidt svært", color: "text-clay/80" },
  4: { label: "Svært",     color: "text-clay" },
  5: { label: "Opgav",     color: "text-muted" },
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("da-DK", { day: "numeric", month: "short" })
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-card bg-white p-6" style={{ boxShadow: "var(--shadow-card)" }}>
      <p className="text-sm text-muted">{label}</p>
      <p
        className={`mt-2 text-4xl font-bold ${accent ? "text-mint-deep" : "text-ink"}`}
        style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
      >
        {value}
      </p>
    </div>
  )
}

/** Per-subject difficulty dots for a single child. */
function SubjectRow({ subject, sessions }: { subject: string; sessions: Session[] }) {
  const avg = sessions.reduce((s, x) => s + (x.difficulty_score ?? 2), 0) / sessions.length
  const color = avg <= 1.5 ? "bg-mint-deep" : avg <= 2.5 ? "bg-clay-soft" : "bg-clay"
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="capitalize text-ink">{subject}</span>
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(i => (
            <span key={i} className={`block h-2 w-2 rounded-full ${i <= Math.round(avg) ? color : "bg-ink/10"}`} />
          ))}
        </div>
        <span className="text-xs text-muted">{sessions.length} session{sessions.length !== 1 ? "er" : ""}</span>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ParentOverview({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const m = getMessages(locale)

  const user = (await getSessionUser())!
  const admin = createAdminClient()

  // Load children.
  const { data: childrenData } = await admin
    .from("children")
    .select("id, name, grade, avatar_emoji, interests, special_needs, companion_type")
    .eq("parent_id", user.id)
    .order("created_at", { ascending: true })
  const children: Child[] = childrenData ?? []

  if (children.length === 0) {
    redirect(localePath(locale, "parentOnboarding"))
  }

  // Load recent sessions (last 30).
  const { data: sessionsData } = await admin
    .from("sessions")
    .select("id, child_id, subject, grade, problem_text, mode, turn_count, completed, difficulty_score, created_at")
    .eq("parent_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30)
  const sessions: Session[] = sessionsData ?? []

  // Aggregate stats.
  const sessionsTotal = sessions.length
  const completedSessions = sessions.filter(s => s.completed)

  // Streak: consecutive days with at least one completed session.
  const streak = computeStreak(completedSessions.map(s => s.created_at))

  const lastActive = sessions[0]
    ? formatDate(sessions[0].created_at)
    : null

  // Per-child session map.
  const sessionsByChild = new Map<string, Session[]>()
  for (const s of sessions) {
    const arr = sessionsByChild.get(s.child_id) ?? []
    arr.push(s)
    sessionsByChild.set(s.child_id, arr)
  }

  // Per-subject map for difficulty view.
  const subjectSessions = new Map<string, Session[]>()
  for (const s of sessions) {
    const arr = subjectSessions.get(s.subject) ?? []
    arr.push(s)
    subjectSessions.set(s.subject, arr)
  }

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

      {/* Stats */}
      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <StatCard label={m.overview.statsSessionsLabel} value={sessionsTotal} accent />
        <StatCard label={m.overview.statsStreakLabel} value={streak} />
        <StatCard
          label={m.overview.statsLastActiveLabel}
          value={lastActive ?? m.overview.statsLastActiveEmpty}
        />
      </section>

      {/* Children cards + per-subject difficulty */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-ink">{m.overview.childrenTitle}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {children.map(c => {
            const childSessions = sessionsByChild.get(c.id) ?? []
            const childSubjects = new Map<string, Session[]>()
            for (const s of childSessions) {
              const arr = childSubjects.get(s.subject) ?? []
              arr.push(s)
              childSubjects.set(s.subject, arr)
            }

            return (
              <div
                key={c.id}
                className="flex flex-col gap-4 rounded-card bg-white p-5"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="flex items-center gap-4">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-tint">
                    <Companion type={toCompanion(c.companion_type)} size={44} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{c.name}</p>
                    <p className="text-sm text-muted">{formatGrade(c.grade)}</p>
                  </div>
                  <p className="ml-auto text-sm font-medium text-muted">
                    {childSessions.length} session{childSessions.length !== 1 ? "er" : ""}
                  </p>
                </div>

                {/* Subject difficulty dots */}
                {childSubjects.size > 0 ? (
                  <div className="flex flex-col gap-2 border-t border-ink/5 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">Sværhedsgrad pr. fag</p>
                    {Array.from(childSubjects.entries()).map(([subj, ss]) => (
                      <SubjectRow key={subj} subject={subj} sessions={ss} />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted border-t border-ink/5 pt-3">
                    Ingen sessioner endnu.
                  </p>
                )}

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
            )
          })}
        </div>
      </section>

      {/* Recent sessions */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-ink">{m.overview.recentTitle}</h2>
        {sessions.length === 0 ? (
          <div className="mt-4 rounded-card bg-white p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
            <p className="text-sm text-muted">{m.overview.recentEmpty}</p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {sessions.slice(0, 10).map(s => {
              const child = children.find(c => c.id === s.child_id)
              const diff = s.difficulty_score ? DIFFICULTY_LABEL[s.difficulty_score] : null
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-4 rounded-card bg-white px-5 py-4"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-tint" aria-hidden>
                    <Companion type={toCompanion(child?.companion_type ?? null)} size={30} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {s.problem_text ?? `${s.subject} — ${s.grade}. klasse`}
                    </p>
                    <p className="text-xs text-muted capitalize">
                      {child?.name} · {s.subject} · {s.mode === "explain" ? "Forstå" : "Hint"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`text-xs font-semibold ${diff?.color ?? "text-muted"}`}>
                      {diff?.label ?? "—"}
                    </span>
                    <span className="text-[11px] text-muted">{formatDate(s.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Parent coaching — Phase 2: will be powered by Azure OpenAI */}
    </>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeStreak(timestamps: string[]): number {
  if (timestamps.length === 0) return 0
  const days = [
    ...new Set(timestamps.map(ts => ts.slice(0, 10))),
  ].sort((a, b) => b.localeCompare(a)) // descending

  let streak = 0
  let cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  for (const day of days) {
    const d = new Date(day)
    const diff = Math.round((cursor.getTime() - d.getTime()) / 86_400_000)
    if (diff > 1) break
    streak++
    cursor = d
  }
  return streak
}
