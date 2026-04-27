import { notFound, redirect } from "next/navigation"
import { Companion } from "@/components/mascot/Companion"
import { COMPANIONS, DEFAULT_COMPANION, type CompanionType } from "@/components/mascot/types"
import { isLocale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/auth/session"
import { localePath } from "@/lib/i18n/routes"
import { RangeSelector } from "@/components/parent/RangeSelector"
import { isRangeKey, type RangeKey } from "@/components/parent/range"
import {
  StatCard,
  CalendarIcon,
  FlameIcon,
  StarIcon,
} from "@/components/overview/StatCard"
import Link from "next/link"
import {
  SubjectSummaryCard,
  MathGlyph,
  BookGlyph,
  DictionaryGlyph,
} from "@/components/overview/SubjectSummaryCard"
import { EditChildButton } from "@/components/overview/EditChildButton"

const VALID_COMPANIONS = new Set<string>(COMPANIONS.map(c => c.type))

function toCompanion(value: string | null): CompanionType {
  return value && VALID_COMPANIONS.has(value) ? (value as CompanionType) : DEFAULT_COMPANION
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Child = {
  id: string
  name: string
  grade: number
  avatar_emoji: string | null
  interests: string | null
  special_needs: string | null
  companion_type: string | null
  accommodations: string[] | null
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
  steps_done: number | null
  steps_total: number | null
  completion_kind: string | null
  concepts_solid: string[] | null
  concepts_struggled: string[] | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DIFFICULTY_LABEL: Record<number, { label: string; tone: "mint" | "ink" | "clay" | "muted" }> = {
  1: { label: "Nemt",       tone: "mint" },
  2: { label: "OK",         tone: "ink" },
  3: { label: "Lidt svært", tone: "clay" },
  4: { label: "Svært",      tone: "clay" },
  5: { label: "For svært",  tone: "muted" },
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("da-DK", { day: "numeric", month: "short" })
}

function daysAgo(iso: string) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const d = new Date(iso)
  d.setHours(0, 0, 0, 0)
  return Math.round((now.getTime() - d.getTime()) / 86_400_000)
}

const SUBJECT_TONE: Record<string, "mint" | "clay" | "plum"> = {
  matematik: "plum",
  dansk: "mint",
  engelsk: "clay",
  tysk: "clay",
}

const SUBJECT_GLYPH: Record<string, React.ReactNode> = {
  matematik: <MathGlyph />,
  dansk: <BookGlyph />,
  engelsk: <DictionaryGlyph />,
  tysk: <DictionaryGlyph />,
}

const CANONICAL_SUBJECTS = ["dansk", "engelsk", "matematik"] as const

// ─── Range plumbing ──────────────────────────────────────────────────────────

function rangeToWindow(range: RangeKey): { cutoff: string | null; limit: number; days: number | null } {
  const now = Date.now()
  const day = 86_400_000
  switch (range) {
    case "today": {
      // Local-midnight cutoff so "I dag" matches the wall-clock day in DK
      // rather than the last 24 hours rolling.
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      return { cutoff: startOfDay.toISOString(), limit: 50, days: 1 }
    }
    case "7d":  return { cutoff: new Date(now - 7   * day).toISOString(), limit: 100,  days: 7 }
    case "30d": return { cutoff: new Date(now - 30  * day).toISOString(), limit: 200,  days: 30 }
    case "90d": return { cutoff: new Date(now - 90  * day).toISOString(), limit: 300,  days: 90 }
    case "1y":  return { cutoff: new Date(now - 365 * day).toISOString(), limit: 500,  days: 365 }
    case "all": return { cutoff: null,                                     limit: 1000, days: null }
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const SESSIONS_PER_PAGE = 5

export default async function ParentOverview({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ range?: string; page?: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const m = getMessages(locale)

  const sp = await searchParams
  const range: RangeKey = isRangeKey(sp.range) ? sp.range : "30d"
  const pageRaw = parseInt(sp.page ?? "1", 10)
  const requestedPage = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const { cutoff, limit, days } = rangeToWindow(range)

  const user = (await getSessionUser())!
  const admin = createAdminClient()

  // Children.
  const { data: childrenData } = await admin
    .from("children")
    .select("id, name, grade, avatar_emoji, interests, special_needs, companion_type, accommodations")
    .eq("parent_id", user.id)
    .order("created_at", { ascending: true })
  const children: Child[] = childrenData ?? []
  if (children.length === 0) {
    redirect(localePath(locale, "parentOnboarding"))
  }

  // Sessions in the active window.
  const baseBuilder = admin
    .from("sessions")
    .select("id, child_id, subject, grade, problem_text, turn_count, completed, difficulty_score, created_at")
    .eq("parent_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit)
  const baseQuery = cutoff ? baseBuilder.gte("created_at", cutoff) : baseBuilder
  const { data: baseData } = await baseQuery
  const sessions: Session[] = (baseData ?? []).map(b => ({
    ...b,
    steps_done: null,
    steps_total: null,
    completion_kind: null,
    concepts_solid: null,
    concepts_struggled: null,
  }))

  // Previous-period sessions for delta. Same window length, shifted back.
  let prevTotal = 0
  if (cutoff && days) {
    const day = 86_400_000
    const prevCutoff = new Date(Date.now() - 2 * days * day).toISOString()
    const prevEnd = cutoff
    const { count } = await admin
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", user.id)
      .gte("created_at", prevCutoff)
      .lt("created_at", prevEnd)
    prevTotal = count ?? 0
  }

  // Aggregate stats.
  const sessionsTotal = sessions.length
  const completedSessions = sessions.filter(s => s.completed)
  const streak = computeStreak(completedSessions.map(s => s.created_at))
  const lastActiveSession = sessions[0] ?? null

  // Per-child session map.
  const sessionsByChild = new Map<string, Session[]>()
  for (const s of sessions) {
    const arr = sessionsByChild.get(s.child_id) ?? []
    arr.push(s)
    sessionsByChild.set(s.child_id, arr)
  }

  const formatGrade = (n: number) =>
    n === 0 ? m.overview.gradeKindergarten : m.overview.gradeLabel.replace("{n}", String(n))

  // Stat sublabels.
  const delta = sessionsTotal - prevTotal
  const sessionsSub =
    !cutoff
      ? undefined
      : delta > 0
        ? m.overview.statsSessionsDeltaPositive.replace("{n}", String(delta))
        : delta < 0
          ? m.overview.statsSessionsDeltaNegative.replace("{n}", String(delta))
          : m.overview.statsSessionsDeltaSame
  const streakSub =
    streak > 0 ? m.overview.statsStreakSubGood : m.overview.statsStreakSubGetGoing
  const lastActiveValue = lastActiveSession
    ? formatDate(lastActiveSession.created_at)
    : m.overview.statsLastActiveEmpty
  const lastActiveSub = lastActiveSession
    ? (() => {
        const d = daysAgo(lastActiveSession.created_at)
        if (d === 0) return m.overview.statsLastActiveAgoToday
        if (d === 1) return m.overview.statsLastActiveAgoYesterday
        return m.overview.statsLastActiveAgoDays.replace("{n}", String(d))
      })()
    : undefined

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

      {/* Stats — icon + label + big number + sublabel */}
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <StatCard
          icon={<CalendarIcon />}
          tone="mint"
          label={m.overview.statsSessionsLabel}
          value={sessionsTotal}
          sub={sessionsSub}
        />
        <StatCard
          icon={<FlameIcon />}
          tone="clay"
          label={m.overview.statsStreakLabel}
          value={streak}
          sub={streakSub}
        />
        <StatCard
          icon={<StarIcon />}
          tone="plum"
          label={m.overview.statsLastActiveLabel}
          value={lastActiveValue}
          sub={lastActiveSub}
        />
      </section>

      {/* Children — wide child card + per-subject summary cards */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-ink">{m.overview.childrenTitle}</h2>
        <div className="mt-4 flex flex-col gap-6">
          {children.map(c => {
            const childSessions = sessionsByChild.get(c.id) ?? []
            const childCompleted = childSessions.filter(s => s.completed).length
            const childPct =
              childSessions.length > 0
                ? Math.round((childCompleted / childSessions.length) * 100)
                : 0

            // Per-subject buckets (all canonical subjects always rendered so
            // the row width stays stable even if one is empty).
            const bySubject = new Map<string, Session[]>()
            for (const s of childSessions) {
              const arr = bySubject.get(s.subject) ?? []
              arr.push(s)
              bySubject.set(s.subject, arr)
            }
            const subjectSummaries = CANONICAL_SUBJECTS.map(subj => {
              const ss = bySubject.get(subj) ?? []
              const done = ss.filter(s => s.completed).length
              const avgDiff =
                ss.length === 0
                  ? 0
                  : ss.reduce((sum, x) => sum + (x.difficulty_score ?? 2), 0) /
                    ss.length
              const countLabel =
                ss.length === 0
                  ? m.overview.subjectOpgaverNone
                  : `${done}/${ss.length} ${
                      ss.length === 1
                        ? m.overview.subjectOpgaverSingular
                        : m.overview.subjectOpgaverPlural
                    }`
              return {
                subj,
                ss,
                done,
                total: ss.length,
                avgDiff,
                countLabel,
              }
            })

            return (
              <div
                key={c.id}
                className="grid gap-4 md:grid-cols-12"
              >
                {/* Wide child summary — md:col-span-5 */}
                <div
                  className="relative rounded-card bg-white p-5 md:col-span-5"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="absolute right-3 top-3">
                    <EditChildButton
                      child={{
                        id: c.id,
                        name: c.name,
                        grade: c.grade,
                        interests: c.interests,
                        special_needs: c.special_needs,
                        companion_type: c.companion_type,
                        accommodations: c.accommodations,
                      }}
                      messages={{
                        editChild: m.overview.editChild,
                        editTitle: m.overview.editTitle,
                        editName: m.overview.editName,
                        editGrade: m.overview.editGrade,
                        editInterests: m.overview.editInterests,
                        editInterestsPlaceholder: m.overview.editInterestsPlaceholder,
                        editSpecialNeeds: m.overview.editSpecialNeeds,
                        editSpecialNeedsPlaceholder: m.overview.editSpecialNeedsPlaceholder,
                        editAvatar: m.overview.editAvatar,
                        editAccommodations: m.overview.editAccommodations,
                        editAccommodationsHint: m.overview.editAccommodationsHint,
                        editAccDyslexia: m.overview.editAccDyslexia,
                        editAccDyslexiaBody: m.overview.editAccDyslexiaBody,
                        editAccAdhd: m.overview.editAccAdhd,
                        editAccAdhdBody: m.overview.editAccAdhdBody,
                        editSave: m.overview.editSave,
                        editSaving: m.overview.editSaving,
                        editCancel: m.overview.editCancel,
                        editError: m.overview.editError,
                        gradeKindergarten: m.overview.gradeKindergarten,
                        gradeLabel: m.overview.gradeLabel,
                      }}
                    />
                  </div>
                  <div className="flex items-start gap-4 pr-8">
                    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-tint">
                      <Companion type={toCompanion(c.companion_type)} size={44} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-lg font-semibold text-ink"
                        style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
                      >
                        {c.name}
                      </p>
                      <p className="text-sm text-muted">{formatGrade(c.grade)}</p>
                    </div>
                    <div className="flex flex-col items-end leading-tight">
                      <span className="text-sm font-medium text-ink tabular-nums">
                        {m.overview.childProgressFraction
                          .replace("{done}", String(childCompleted))
                          .replace("{total}", String(childSessions.length))}
                      </span>
                      <span className="text-xs text-muted tabular-nums">{childPct}%</span>
                    </div>
                  </div>

                  {/* Subject difficulty rows (always render the canonical
                      three so the card has stable height). */}
                  <div className="mt-4 flex flex-col gap-2 border-t border-ink/5 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                      {m.overview.subjectDifficultyLabel}
                    </p>
                    {subjectSummaries.map(({ subj, ss, total, avgDiff }) => (
                      <SubjectRow
                        key={subj}
                        subject={m.tavle.subjects[subj] ?? subj}
                        avg={avgDiff}
                        total={total}
                        tone={SUBJECT_TONE[subj] ?? "mint"}
                      />
                    ))}
                  </div>

                  {(c.interests || c.special_needs) && (
                    <dl className="mt-4 border-t border-ink/5 pt-3 text-xs text-ink/75">
                      {c.interests && (
                        <div className="flex gap-2">
                          <dt className="shrink-0 text-muted">{m.overview.subjectInterestsLabel}</dt>
                          <dd>{c.interests}</dd>
                        </div>
                      )}
                      {c.special_needs && (
                        <div className="mt-1 flex gap-2">
                          <dt className="shrink-0 text-muted">{m.overview.subjectHensynLabel}</dt>
                          <dd>{c.special_needs}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                </div>

                {/* Subject summary cards — md:col-span-7 split into 3 */}
                <div className="grid gap-3 md:col-span-7 md:grid-cols-3">
                  {subjectSummaries.map(({ subj, done, total, countLabel }) => (
                    <SubjectSummaryCard
                      key={subj}
                      subjectLabel={m.tavle.subjects[subj] ?? subj}
                      icon={SUBJECT_GLYPH[subj] ?? <BookGlyph />}
                      tone={SUBJECT_TONE[subj] ?? "mint"}
                      done={done}
                      total={total}
                      countLabel={countLabel}
                      href={`${localePath(locale, "parentDashboard")}?childId=${c.id}&subject=${subj}`}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Recent sessions — paginated, 5 per page. Server-rendered pager
          keeps the URL shareable and the page state recoverable on reload. */}
      {(() => {
        const pageCount = Math.max(1, Math.ceil(sessions.length / SESSIONS_PER_PAGE))
        const page = Math.min(requestedPage, pageCount)
        const start = (page - 1) * SESSIONS_PER_PAGE
        const slice = sessions.slice(start, start + SESSIONS_PER_PAGE)
        const buildPageHref = (p: number) => {
          const qs = new URLSearchParams()
          if (range !== "30d") qs.set("range", range)
          if (p !== 1) qs.set("page", String(p))
          const s = qs.toString()
          return s ? `?${s}` : "?"
        }
        return (
          <section className="mt-8">
            <h2 className="text-xl font-semibold text-ink">{m.overview.recentTitle}</h2>
            {sessions.length === 0 ? (
              <div
                className="mt-4 rounded-card bg-white p-8 text-center"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <p className="text-sm text-muted">{m.overview.recentEmpty}</p>
              </div>
            ) : (
              <>
                <div className="mt-4 flex flex-col gap-2">
                  {slice.map(s => {
                    const child = children.find(c => c.id === s.child_id)
                    const inProgress = !s.completed
                    const diff = s.difficulty_score ? DIFFICULTY_LABEL[s.difficulty_score] : null
                    const statusLabel = inProgress
                      ? m.overview.statusInProgress
                      : diff?.label ?? "-"
                    const statusTone = inProgress
                      ? "inprogress"
                      : diff?.tone ?? "muted"
                    return (
                      <div
                        key={s.id}
                        className="flex items-center gap-4 rounded-card bg-white px-5 py-3.5"
                        style={{ boxShadow: "var(--shadow-card)" }}
                      >
                        <span
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-tint"
                          aria-hidden
                        >
                          <Companion type={toCompanion(child?.companion_type ?? null)} size={32} />
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
                          <StatusPill tone={statusTone} label={statusLabel} />
                          <span className="text-[11px] text-muted">{formatDate(s.created_at)}</span>
                        </div>
                        <span aria-hidden className="text-ink/30">›</span>
                      </div>
                    )
                  })}
                </div>

                {pageCount > 1 && (
                  <nav
                    aria-label="Sider"
                    className="mt-4 flex items-center justify-between gap-3"
                  >
                    {page > 1 ? (
                      <Link
                        href={buildPageHref(page - 1)}
                        scroll={false}
                        className="inline-flex items-center gap-1 rounded-btn border border-ink/15 bg-white px-3 py-1.5 text-sm font-medium text-ink/80 transition hover:bg-canvas cursor-pointer"
                      >
                        ‹ {m.overview.pagerPrev}
                      </Link>
                    ) : <span />}
                    <span className="text-xs text-muted tabular-nums">
                      {m.overview.pagerOf
                        .replace("{page}", String(page))
                        .replace("{total}", String(pageCount))}
                    </span>
                    {page < pageCount ? (
                      <Link
                        href={buildPageHref(page + 1)}
                        scroll={false}
                        className="inline-flex items-center gap-1 rounded-btn border border-ink/15 bg-white px-3 py-1.5 text-sm font-medium text-ink/80 transition hover:bg-canvas cursor-pointer"
                      >
                        {m.overview.pagerNext} ›
                      </Link>
                    ) : <span />}
                  </nav>
                )}
              </>
            )}
          </section>
        )
      })()}
    </>
  )
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function SubjectRow({
  subject,
  avg,
  total,
  tone,
}: {
  subject: string
  avg: number
  total: number
  tone: "mint" | "clay" | "plum"
}) {
  const TONE_DOT: Record<string, string> = {
    mint: "#4F8E6B",
    clay: "#A05844",
    plum: "#7A5A9C",
  }
  const empty = total === 0
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="capitalize text-ink">{subject}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <span
            key={i}
            className="block h-1.5 w-1.5 rounded-full"
            style={{
              background: empty
                ? "rgba(31,45,26,0.12)"
                : i <= Math.round(avg)
                  ? TONE_DOT[tone]
                  : "rgba(31,45,26,0.12)",
            }}
          />
        ))}
      </div>
    </div>
  )
}

function StatusPill({ tone, label }: { tone: string; label: string }) {
  const styles: Record<string, { bg: string; fg: string }> = {
    mint:       { bg: "#E4F2EB", fg: "#4F8E6B" },
    ink:        { bg: "rgba(31,45,26,0.06)", fg: "rgba(31,45,26,0.7)" },
    clay:       { bg: "#F4DBD1", fg: "#A05844" },
    muted:      { bg: "rgba(31,45,26,0.06)", fg: "rgba(31,45,26,0.55)" },
    inprogress: { bg: "#F5E6BF", fg: "#7A5A1F" },
  }
  const s = styles[tone] ?? styles.muted
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ background: s.bg, color: s.fg }}
    >
      {label}
    </span>
  )
}

// ─── Streak ──────────────────────────────────────────────────────────────────

function computeStreak(timestamps: string[]): number {
  if (timestamps.length === 0) return 0
  const days = [...new Set(timestamps.map(ts => ts.slice(0, 10)))].sort((a, b) =>
    b.localeCompare(a),
  )
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
