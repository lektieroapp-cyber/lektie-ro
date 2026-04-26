import { notFound, redirect } from "next/navigation"
import { Companion } from "@/components/mascot/Companion"
import { COMPANIONS, DEFAULT_COMPANION, type CompanionType } from "@/components/mascot/types"
import { isLocale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/auth/session"
import { localePath } from "@/lib/i18n/routes"
import { lookupSkill } from "@/lib/curriculum/taxonomy"
import { RangeSelector } from "@/components/parent/RangeSelector"
import { isRangeKey, type RangeKey } from "@/components/parent/range"

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
  turn_count: number
  completed: boolean
  difficulty_score: number | null
  created_at: string
  // Migration 009. Columns are nullable so pre-009 rows + sessions that
  // skipped analysis (too few turns, model failure) just fall through.
  steps_done: number | null
  steps_total: number | null
  completion_kind: string | null
  concepts_solid: string[] | null
  concepts_struggled: string[] | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Labels are adjectives describing the difficulty of the session as it
// played out — not verbs describing what the kid did. "Opgav" used to be
// here for 5 but read awkwardly: it's the past tense of "opgive", a verb
// without a subject, where every other label is an adjective. "For svært"
// keeps the parent's mental model on "how hard was this" rather than
// implying the kid failed.
const DIFFICULTY_LABEL: Record<number, { label: string; color: string }> = {
  1: { label: "Nemt",       color: "text-mint-deep" },
  2: { label: "OK",         color: "text-ink/70" },
  3: { label: "Lidt svært", color: "text-clay/80" },
  4: { label: "Svært",      color: "text-clay" },
  5: { label: "For svært",  color: "text-muted" },
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

/**
 * Compute per-skill mastery from a child's session history.
 *
 * For every skill the kid has touched (anywhere in concepts_solid or
 * concepts_struggled across their sessions), produces:
 *   - solid:    times the skill was demonstrated successfully
 *   - struggle: times the skill was a challenge
 *   - score:    Laplace-smoothed mastery, 0–100 percent
 *               score = (solid + 1) / (solid + struggle + 2) × 100
 *
 * Smoothing means a skill seen once-solid reads ~67% rather than 100%,
 * preventing single-data-point overconfidence. As more sessions accumulate
 * the score tightens around the true ratio.
 */
type SkillMastery = {
  id: string
  label: string
  domain: string
  subject: string
  solid: number
  struggle: number
  score: number // 0–100
}

function computeSkillMastery(sessions: Session[]): SkillMastery[] {
  const counts = new Map<string, { solid: number; struggle: number }>()
  for (const s of sessions) {
    for (const id of s.concepts_solid ?? []) {
      const c = counts.get(id) ?? { solid: 0, struggle: 0 }
      c.solid++
      counts.set(id, c)
    }
    for (const id of s.concepts_struggled ?? []) {
      const c = counts.get(id) ?? { solid: 0, struggle: 0 }
      c.struggle++
      counts.set(id, c)
    }
  }
  const out: SkillMastery[] = []
  for (const [id, c] of counts) {
    const skill = lookupSkill(id)
    if (!skill) continue // taxonomy may have removed an old id; skip silently
    const score = ((c.solid + 1) / (c.solid + c.struggle + 2)) * 100
    out.push({
      id,
      label: skill.label,
      domain: skill.domain,
      subject: skill.subject,
      solid: c.solid,
      struggle: c.struggle,
      score: Math.round(score),
    })
  }
  return out
}

function masteryColor(score: number): string {
  if (score >= 70) return "bg-mint-deep"
  if (score >= 45) return "bg-clay-soft"
  return "bg-clay"
}

function masteryColorText(score: number): string {
  if (score >= 70) return "text-mint-deep"
  if (score >= 45) return "text-clay/80"
  return "text-clay"
}

/**
 * Subject-scoped mastery card. Shows the average mastery score for the
 * subject overall, grouped by curriculum domain (Tal og algebra,
 * Geometri og måling, …) with each domain expanding to its skills.
 * Comparable across subjects because every score is on the same 0–100
 * scale, computed from the same Laplace-smoothed ratio.
 */
function MasteryBreakdown({ skills }: { skills: SkillMastery[] }) {
  if (skills.length === 0) return null

  // Group by subject → domain → skills.
  const bySubject = new Map<string, Map<string, SkillMastery[]>>()
  for (const sk of skills) {
    let domains = bySubject.get(sk.subject)
    if (!domains) {
      domains = new Map()
      bySubject.set(sk.subject, domains)
    }
    const arr = domains.get(sk.domain) ?? []
    arr.push(sk)
    domains.set(sk.domain, arr)
  }

  return (
    <div className="flex flex-col gap-3 border-t border-ink/5 pt-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
        Mestring pr. fag
      </p>
      <div className="flex flex-col gap-3">
        {Array.from(bySubject.entries()).map(([subject, domains]) => {
          const subjectSkills = Array.from(domains.values()).flat()
          const subjectAvg = Math.round(
            subjectSkills.reduce((s, x) => s + x.score, 0) / subjectSkills.length
          )
          return (
            <div key={subject} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="capitalize font-semibold text-ink">{subject}</span>
                <span className={`tabular-nums font-semibold ${masteryColorText(subjectAvg)}`}>
                  {subjectAvg}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/8">
                <div
                  className={`h-full ${masteryColor(subjectAvg)}`}
                  style={{ width: `${subjectAvg}%` }}
                />
              </div>
              <ul className="ml-1 flex flex-col gap-1 pt-1">
                {Array.from(domains.entries()).map(([domain, list]) => {
                  const domainAvg = Math.round(
                    list.reduce((s, x) => s + x.score, 0) / list.length
                  )
                  // Show top 3 skills per domain, ordered by lowest score
                  // first (challenges the parent should know about).
                  const topSkills = [...list]
                    .sort((a, b) => a.score - b.score)
                    .slice(0, 3)
                  return (
                    <li key={domain} className="flex flex-col gap-0.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-ink/70">{domain}</span>
                        <span className={`tabular-nums ${masteryColorText(domainAvg)}`}>
                          {domainAvg}%
                        </span>
                      </div>
                      <div className="ml-2 flex flex-wrap gap-1.5">
                        {topSkills.map(s => (
                          <span
                            key={s.id}
                            title={`${s.solid} solid, ${s.struggle} struggle - ${s.score}%`}
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                              s.score >= 70
                                ? "bg-mint-soft text-mint-deep"
                                : s.score >= 45
                                  ? "bg-clay-soft/70 text-ink/75"
                                  : "bg-clay-soft text-clay"
                            }`}
                          >
                            {s.label}
                            <span className="opacity-70 tabular-nums">{s.score}%</span>
                          </span>
                        ))}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Per-subject difficulty dots + completion ratio for a single child. */
function SubjectRow({ subject, sessions }: { subject: string; sessions: Session[] }) {
  const avg = sessions.reduce((s, x) => s + (x.difficulty_score ?? 2), 0) / sessions.length
  const color = avg <= 1.5 ? "bg-mint-deep" : avg <= 2.5 ? "bg-clay-soft" : "bg-clay"
  const completed = sessions.filter(s => s.completed).length
  const pct = sessions.length > 0 ? Math.round((completed / sessions.length) * 100) : 0
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="capitalize text-ink">{subject}</span>
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(i => (
            <span key={i} className={`block h-2 w-2 rounded-full ${i <= Math.round(avg) ? color : "bg-ink/10"}`} />
          ))}
        </div>
        <span className="text-xs text-muted tabular-nums">
          {completed}/{sessions.length} · {pct}%
        </span>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// Map a RangeKey to an ISO cutoff timestamp (or null = all time) and a
// row limit appropriate for that window. The limits are deliberately
// generous: a busy kid doing 5 sessions/day produces ~150 rows in a
// month — well under any of these caps. If we ever blow through 1000
// for "all time" we'll need pagination, but that's a quality problem.
function rangeToWindow(range: RangeKey): { cutoff: string | null; limit: number } {
  const now = Date.now()
  const day = 86_400_000
  switch (range) {
    case "7d":  return { cutoff: new Date(now - 7   * day).toISOString(), limit: 100  }
    case "30d": return { cutoff: new Date(now - 30  * day).toISOString(), limit: 200  }
    case "90d": return { cutoff: new Date(now - 90  * day).toISOString(), limit: 300  }
    case "1y":  return { cutoff: new Date(now - 365 * day).toISOString(), limit: 500  }
    case "all": return { cutoff: null,                                     limit: 1000 }
  }
}

export default async function ParentOverview({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ range?: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const m = getMessages(locale)

  const sp = await searchParams
  const range: RangeKey = isRangeKey(sp.range) ? sp.range : "30d"
  const { cutoff, limit } = rangeToWindow(range)

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
  //
  // Split into two queries deliberately:
  //   1. baseQuery — only columns guaranteed to exist post-008. If this
  //      ever requests a missing column the page silently shows "0
  //      sessioner" (same bug we fixed when `mode` was still in the
  //      select), so this list stays minimal and audited.
  //   2. insightQuery — columns added in migration 009. Wrapped so that a
  //      missing-column error on a pre-009 deployment falls back to []
  //      and the page still renders the old session view + completion
  //      ratios. The Mastery Breakdown panel just won't appear until the
  //      migration is applied.
  //
  // Without this split, pushing the code before applying 009 in Supabase
  // would repeat the exact same "blank page" failure mode as the `mode`
  // column bug — defeating the whole point of fixing it.
  const baseBuilder = admin
    .from("sessions")
    .select("id, child_id, subject, grade, problem_text, turn_count, completed, difficulty_score, created_at")
    .eq("parent_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit)
  const baseQuery = cutoff
    ? baseBuilder.gte("created_at", cutoff)
    : baseBuilder

  const insightBuilder = admin
    .from("sessions")
    .select("id, steps_done, steps_total, completion_kind, concepts_solid, concepts_struggled")
    .eq("parent_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit)
  const insightQuery = (cutoff
    ? insightBuilder.gte("created_at", cutoff)
    : insightBuilder
  ).then(r => r, () => ({ data: [] as Array<{
    id: string
    steps_done: number | null
    steps_total: number | null
    completion_kind: string | null
    concepts_solid: string[] | null
    concepts_struggled: string[] | null
  }> }))

  const [{ data: baseData }, { data: insightData }] = await Promise.all([
    baseQuery,
    insightQuery,
  ])
  const insightById = new Map(
    (insightData ?? []).map(r => [r.id, r])
  )
  const sessions: Session[] = (baseData ?? []).map(b => {
    const ins = insightById.get(b.id)
    return {
      ...b,
      steps_done: ins?.steps_done ?? null,
      steps_total: ins?.steps_total ?? null,
      completion_kind: ins?.completion_kind ?? null,
      concepts_solid: ins?.concepts_solid ?? null,
      concepts_struggled: ins?.concepts_struggled ?? null,
    }
  })

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
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <h1
            className="text-4xl md:text-5xl font-bold text-ink"
            style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
          >
            {m.overview.title}
          </h1>
          <p className="text-base text-muted max-w-xl">{m.overview.subtitle}</p>
        </div>
        <RangeSelector current={range} />
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

            const childCompleted = childSessions.filter(s => s.completed).length
            const childPct =
              childSessions.length > 0
                ? Math.round((childCompleted / childSessions.length) * 100)
                : 0
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
                  <div className="ml-auto flex flex-col items-end leading-tight">
                    <span className="text-sm font-medium text-ink tabular-nums">
                      {childCompleted}/{childSessions.length} klaret
                    </span>
                    <span className="text-xs text-muted tabular-nums">{childPct}%</span>
                  </div>
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

                {/* Mastery breakdown — per-subject score 0–100 with a
                    domain → skill drill-down. Computed from the
                    canonical-skill-id arrays the analyze pass writes after
                    each completed session, so scores are comparable across
                    subjects and over time. Only renders when at least one
                    session for this child has been analyzed. */}
                <MasteryBreakdown skills={computeSkillMastery(childSessions)} />

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
                      {s.problem_text ?? `${s.subject} · ${s.grade}. klasse`}
                    </p>
                    <p className="text-xs text-muted capitalize">
                      {child?.name} · {s.subject}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`text-xs font-semibold ${diff?.color ?? "text-muted"}`}>
                      {diff?.label ?? "-"}
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
