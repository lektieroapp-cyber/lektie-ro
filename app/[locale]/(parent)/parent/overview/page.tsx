import { notFound, redirect } from "next/navigation"
import { Companion } from "@/components/mascot/Companion"
import { COMPANIONS, DEFAULT_COMPANION, type CompanionType } from "@/components/mascot/types"
import { isLocale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/auth/session"
import { localePath } from "@/lib/i18n/routes"
import { RangeSelector } from "@/components/parent/RangeSelector"
import { ChildSelector } from "@/components/parent/ChildSelector"
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
  english_tutoring_language: string | null
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
  ended_at: string | null
  last_active_at: string | null
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

// Mirror SUBJECT_DEF in components/board/Tavle.tsx so the Forældre Ro
// summary cards and the Tavle subject grid use the SAME tint per subject.
// Previously: math=plum, engelsk=clay (Forældre Ro) vs math=honey,
// engelsk=plum (Tavle). Parents see the same subjects in two places and
// the colour shift was confusing.
const SUBJECT_TONE: Record<string, "mint" | "clay" | "plum" | "honey"> = {
  matematik: "honey",
  dansk: "mint",
  engelsk: "plum",
  tysk: "clay",
}

const SUBJECT_GLYPH: Record<string, React.ReactNode> = {
  matematik: <MathGlyph />,
  dansk: <BookGlyph />,
  engelsk: <DictionaryGlyph />,
  tysk: <DictionaryGlyph />,
}

// Subject background tints for the recent-sessions strip — match the
// SUBJECT_DEF tints used in the Tavle subject grid so the visual
// identity is consistent across the two surfaces.
const SUBJECT_TINT: Record<string, string> = {
  matematik: "#FBEFD7",
  dansk: "#E1EEDD",
  engelsk: "#E8DEF1",
  tysk: "#F4DBD1",
}

// What actually happened in the session — drives the status pill on
// the recent-sessions strip. Done > partial > abandoned > in-progress.
type SessionOutcome = "done" | "partial" | "abandoned" | "inprogress"
type RecentSessionLite = {
  completed: boolean
  steps_done: number | null
  steps_total: number | null
  completion_kind: string | null
  ended_at: string | null
  last_active_at: string | null
}
// Sessions stuck "I gang" with no activity for this long are treated as
// abandoned even when the abandoned-PATCH never landed (pre-fix rows, or
// devices that never fired pagehide reliably — iOS background suspension
// can swallow it). 30 minutes is generous: a kid who's been quiet that
// long isn't coming back to this session.
const STALE_INPROGRESS_MS = 30 * 60_000
function sessionOutcome(s: RecentSessionLite): SessionOutcome {
  if (s.completed) return "done"
  if (s.ended_at) {
    if (s.completion_kind === "abandoned") return "abandoned"
    if ((s.steps_done ?? 0) > 0) return "partial"
    return "abandoned"
  }
  // No ended_at yet — could be genuinely active OR a ghost row the close
  // beacon never reached. Use last_active_at to disambiguate.
  const ref = s.last_active_at ?? null
  if (ref) {
    const inactiveMs = Date.now() - new Date(ref).getTime()
    if (Number.isFinite(inactiveMs) && inactiveMs > STALE_INPROGRESS_MS) {
      return (s.steps_done ?? 0) > 0 ? "partial" : "abandoned"
    }
  }
  return "inprogress"
}
const OUTCOME_INFO: Record<SessionOutcome, { tone: string; label: string }> = {
  done:       { tone: "mint",       label: "Færdig" },
  partial:    { tone: "ink",        label: "Delvist løst" },
  abandoned:  { tone: "muted",      label: "Afbrudt" },
  inprogress: { tone: "inprogress", label: "I gang" },
}

// Time-on-task = (last_active_at OR ended_at) − created_at.
// Pre-013 rows without last_active_at fall back to ended_at, then to
// "kid never actually did anything" → null so the chip hides. We deliberately
// do NOT use `now()` for in-progress rows: that's wall-clock time since the
// session opened, which over-reports engagement for kids who walked away
// after a few minutes ("Aktiv i 39 min" when they engaged for 4).
//
// Returns null on unusable data so the chip just hides instead of showing
// "0 min" on rows where the kid hasn't engaged at all.
function formatDuration(
  startIso: string,
  endIso: string | null,
  lastActiveIso: string | null,
): string | null {
  const startMs = new Date(startIso).getTime()
  if (!Number.isFinite(startMs)) return null
  // Effective end: prefer ended_at (session closed), then last_active_at
  // (still open but we know when the kid last engaged). Without either,
  // we have no honest duration to show.
  const endIsoEffective = endIso ?? lastActiveIso
  if (!endIsoEffective) return null
  const endMs = new Date(endIsoEffective).getTime()
  if (!Number.isFinite(endMs) || endMs < startMs) return null
  const ms = endMs - startMs
  const totalMin = Math.round(ms / 60_000)
  // Kid opened the session but never produced a turn — `last_active_at`
  // sits at created_at and the diff rounds to 0. Hide rather than render
  // a misleading "1 min".
  if (totalMin < 1) return null
  const text =
    totalMin < 60
      ? `${totalMin} min`
      : totalMin % 60 === 0
        ? `${Math.floor(totalMin / 60)} t`
        : `${Math.floor(totalMin / 60)} t ${totalMin % 60} min`
  return endIso ? text : `Aktiv i ${text}`
}

// Steps progress label. Prefers explicit steps_done/total (set by the
// session-finish path on tasks with curated step lists). Falls back to
// raw turn count for older sessions or tasks without steps.
function formatStepsLabel(
  done: number | null,
  total: number | null,
  turnCount: number,
): string | null {
  if (total != null && total > 0) {
    return `${done ?? 0} af ${total} trin`
  }
  if (turnCount > 0) {
    return `${turnCount} svar`
  }
  return null
}

function shorten(text: string | null, max: number): string | null {
  if (!text) return null
  const clean = text.replace(/\s+/g, " ").trim()
  if (clean.length <= max) return clean
  return clean.slice(0, max).trimEnd() + "…"
}

function capitalize(s: string): string {
  return s.length > 0 ? s[0].toUpperCase() + s.slice(1) : s
}

function ClockGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

function CheckGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="5 12 10 17 19 7" />
    </svg>
  )
}

// Order must mirror SUBJECT_ORDER in components/board/Tavle.tsx so the
// same subjects appear in the same column order on Forældre Ro and on
// the Tavle empty-state / subject grid. Previously: dansk-engelsk-
// matematik here vs dansk-matematik-engelsk there — the parent's eye
// had to re-scan for "is engelsk on the left or in the middle?".
const CANONICAL_SUBJECTS = ["dansk", "matematik", "engelsk"] as const

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
  searchParams: Promise<{ range?: string; page?: string; childId?: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const m = getMessages(locale)

  const sp = await searchParams
  const range: RangeKey = isRangeKey(sp.range) ? sp.range : "30d"
  const pageRaw = parseInt(sp.page ?? "1", 10)
  const requestedPage = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const { cutoff, limit, days } = rangeToWindow(range)
  // Per-child filter from `?childId=`. Validated against the parent's
  // children below — an unknown id falls back to "all kids" so a stale
  // bookmark can't surface another family's data.
  const requestedChildId = sp.childId ?? null

  const user = (await getSessionUser())!
  const admin = createAdminClient()

  // Children.
  const { data: childrenData } = await admin
    .from("children")
    .select("id, name, grade, avatar_emoji, interests, special_needs, companion_type, accommodations, english_tutoring_language")
    .eq("parent_id", user.id)
    .order("created_at", { ascending: true })
  const allChildren: Child[] = childrenData ?? []
  if (allChildren.length === 0) {
    redirect(localePath(locale, "parentOnboarding"))
  }

  // Resolve the active child filter. With a single child we always render
  // their view (and hide the picker entirely); with multiple kids we honour
  // ?childId= when it matches one we own.
  const selectedChildId =
    allChildren.length === 1
      ? allChildren[0].id
      : requestedChildId && allChildren.some(c => c.id === requestedChildId)
        ? requestedChildId
        : null

  // `children` drives the per-child summary section below. When a kid is
  // selected we collapse it to just that one card; otherwise it's the full
  // list. `allChildren` stays around for the recent-sessions name lookup
  // and for the picker dropdown.
  const children: Child[] = selectedChildId
    ? allChildren.filter(c => c.id === selectedChildId)
    : allChildren

  // Sessions in the active window. Includes the migration-009 session-
  // insight columns (steps_done/total, completion_kind, ended_at) so the
  // recent-sessions strip can show actual progress + duration instead of
  // just an in-progress pill.
  let baseBuilder = admin
    .from("sessions")
    .select(
      "id, child_id, subject, grade, problem_text, turn_count, completed, difficulty_score, created_at, ended_at, last_active_at, steps_done, steps_total, completion_kind",
    )
    .eq("parent_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (selectedChildId) baseBuilder = baseBuilder.eq("child_id", selectedChildId)
  const baseQuery = cutoff ? baseBuilder.gte("created_at", cutoff) : baseBuilder
  const { data: baseData } = await baseQuery
  const sessions: Session[] = (baseData ?? []).map(b => ({
    ...b,
    concepts_solid: null,
    concepts_struggled: null,
  }))

  // Previous-period sessions for delta. Same window length, shifted back.
  // Honour the same child filter so the delta reflects the same kid's
  // baseline, not the whole family's.
  let prevTotal = 0
  if (cutoff && days) {
    const day = 86_400_000
    const prevCutoff = new Date(Date.now() - 2 * days * day).toISOString()
    const prevEnd = cutoff
    let prevBuilder = admin
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", user.id)
      .gte("created_at", prevCutoff)
      .lt("created_at", prevEnd)
    if (selectedChildId) prevBuilder = prevBuilder.eq("child_id", selectedChildId)
    const { count } = await prevBuilder
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

  // Per-child task counts. The summary cards on each child row label themselves
  // "X/Y opgaver" — that has to be tasks (Tavle items) NOT sessions, otherwise
  // every retry of the same task inflates the number and "0/7" reads as "the
  // kid has 7 unfinished tasks" when really there's 1 in_progress + 6 sessions
  // against it. Pull from public.tasks, scope to the parent + child filter,
  // exclude dismissed (matches Tavle's `fetchAllTasksForChild` semantics).
  let tasksBuilder = admin
    .from("tasks")
    .select("id, child_id, subject, status, task_steps")
    .eq("parent_id", user.id)
    .eq("approved_by_parent", true)
    .neq("status", "dismissed")
  if (selectedChildId) tasksBuilder = tasksBuilder.eq("child_id", selectedChildId)
  const { data: taskRows } = await tasksBuilder
  type TaskRowLite = {
    id: string
    child_id: string
    subject: string
    status: string
    task_steps: Array<{ label: string; prompt: string }> | null
  }
  const tasksByChild = new Map<string, TaskRowLite[]>()
  for (const t of (taskRows ?? []) as TaskRowLite[]) {
    const arr = tasksByChild.get(t.child_id) ?? []
    arr.push(t)
    tasksByChild.set(t.child_id, arr)
  }

  // Per-task best step progress, used by the per-subject bars below to
  // show granular step-level work rather than just "X tasks done". Falls
  // back gracefully on tasks with no sessions yet (bestDone stays 0).
  const taskStepProgress = new Map<string, number>()
  // Need task_id on sessions to bucket — pull a lean second pass that
  // only reads the columns we want. Keeps the main session query (which
  // drives stats / recent strip) untouched.
  let sessionStepsBuilder = admin
    .from("sessions")
    .select("task_id, steps_done, completed")
    .eq("parent_id", user.id)
    .not("task_id", "is", null)
  if (selectedChildId) sessionStepsBuilder = sessionStepsBuilder.eq("child_id", selectedChildId)
  const { data: sessionStepsRows } = await sessionStepsBuilder
  for (const s of (sessionStepsRows ?? []) as Array<{
    task_id: string | null
    steps_done: number | null
    completed: boolean
  }>) {
    if (!s.task_id) continue
    const prev = taskStepProgress.get(s.task_id) ?? 0
    const candidate = s.completed
      ? Number.MAX_SAFE_INTEGER // pinned to "all" until we cap by task length below
      : (s.steps_done ?? 0)
    if (candidate > prev) taskStepProgress.set(s.task_id, candidate)
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
        {/* Filters live in a single horizontal cluster so they share an
            eyeline. ChildSelector hides itself when there's only one kid
            (nothing to filter) — the whole concept disappears for
            single-child families. */}
        <div className="flex flex-wrap items-end gap-3">
          {allChildren.length > 1 && (
            <ChildSelector
              children={allChildren.map(c => ({ id: c.id, name: c.name }))}
              current={selectedChildId}
              allLabel={m.overview.childPickerAll}
              label={m.overview.childPickerLabel}
            />
          )}
          <RangeSelector current={range} />
        </div>
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
            // Top-right "X/Y klaret" fraction = approved tasks the kid has
            // marked done vs total approved tasks. Uses tasks (Tavle items)
            // as the denominator so the number on this card matches what
            // the kid sees on their board.
            const childTasks = tasksByChild.get(c.id) ?? []
            const childTaskTotal = childTasks.length
            const childTaskDone = childTasks.filter(t => t.status === "done").length
            const childPct =
              childTaskTotal > 0
                ? Math.round((childTaskDone / childTaskTotal) * 100)
                : 0

            // Per-subject buckets — sessions still drive average difficulty
            // (one task can have many sessions, each with its own score),
            // but the visible "X/Y opgaver" count is task-based so it
            // matches the Tavle.
            const sessionsBySubject = new Map<string, Session[]>()
            for (const s of childSessions) {
              const arr = sessionsBySubject.get(s.subject) ?? []
              arr.push(s)
              sessionsBySubject.set(s.subject, arr)
            }
            const tasksBySubject = new Map<string, typeof childTasks>()
            for (const t of childTasks) {
              const arr = tasksBySubject.get(t.subject) ?? []
              arr.push(t)
              tasksBySubject.set(t.subject, arr)
            }
            const subjectSummaries = CANONICAL_SUBJECTS.map(subj => {
              const ss = sessionsBySubject.get(subj) ?? []
              const tt = tasksBySubject.get(subj) ?? []
              const taskTotal = tt.length
              const taskDone = tt.filter(t => t.status === "done").length
              const avgDiff =
                ss.length === 0
                  ? 0
                  : ss.reduce((sum, x) => sum + (x.difficulty_score ?? 2), 0) /
                    ss.length
              const countLabel =
                taskTotal === 0
                  ? m.overview.subjectOpgaverNone
                  : `${taskDone}/${taskTotal} ${
                      taskTotal === 1
                        ? m.overview.subjectOpgaverSingular
                        : m.overview.subjectOpgaverPlural
                    }`
              // Aggregate step-level progress across all tasks in this
              // subject. Drives the bar so a kid who's done 4 of 23 steps
              // on the only task shows ~17% — not 0% just because no
              // task is fully `done` yet.
              let totalSteps = 0
              let doneSteps = 0
              for (const task of tt) {
                const stepCount = task.task_steps?.length ?? 0
                if (stepCount === 0) continue
                totalSteps += stepCount
                const best = taskStepProgress.get(task.id) ?? 0
                doneSteps += Math.min(best, stepCount)
              }
              const stepPct =
                totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : null
              return {
                subj,
                ss,
                done: taskDone,
                total: taskTotal,
                avgDiff,
                countLabel,
                stepPct,
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
                        english_tutoring_language: c.english_tutoring_language,
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
                        editEnglishLanguage: m.overview.editEnglishLanguage,
                        editEnglishLanguageHint: m.overview.editEnglishLanguageHint,
                        editEnglishLanguageDanish: m.overview.editEnglishLanguageDanish,
                        editEnglishLanguageEnglish: m.overview.editEnglishLanguageEnglish,
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
                          .replace("{done}", String(childTaskDone))
                          .replace("{total}", String(childTaskTotal))}
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
                  {subjectSummaries.map(({ subj, done, total, countLabel, stepPct }) => (
                    <SubjectSummaryCard
                      key={subj}
                      subjectLabel={m.tavle.subjects[subj] ?? subj}
                      icon={SUBJECT_GLYPH[subj] ?? <BookGlyph />}
                      tone={SUBJECT_TONE[subj] ?? "mint"}
                      done={done}
                      total={total}
                      countLabel={countLabel}
                      pctOverride={stepPct}
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
          if (selectedChildId) qs.set("childId", selectedChildId)
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
                    // Use the unfiltered child list for name lookup so the
                    // recent-sessions row still resolves a name even when
                    // the visible `children` array is narrowed to one kid.
                    const child = allChildren.find(c => c.id === s.child_id)
                    const subjectLabel = capitalize(s.subject)
                    const subjectTone = SUBJECT_TONE[s.subject] ?? "ink"
                    const subjectGlyph = SUBJECT_GLYPH[s.subject] ?? null
                    const subjectTint = SUBJECT_TINT[s.subject] ?? "#EDE2CD"

                    // Outcome: was the kid's effort productive? Drives the
                    // status pill. Done > partial > abandoned > in-progress.
                    const outcome = sessionOutcome(s)
                    const statusInfo = OUTCOME_INFO[outcome]
                    // Title prefers the curated task title via problem_text;
                    // fall back to a short subject/grade label so we never
                    // render an empty row.
                    const title =
                      shorten(s.problem_text, 70) ??
                      `${subjectLabel} · ${s.grade}. klasse`
                    const duration = formatDuration(s.created_at, s.ended_at, s.last_active_at)
                    const stepsLabel = formatStepsLabel(
                      s.steps_done,
                      s.steps_total,
                      s.turn_count,
                    )
                    return (
                      <div
                        key={s.id}
                        className="flex items-center gap-4 rounded-card bg-white px-4 py-3 sm:px-5 sm:py-4"
                        style={{ boxShadow: "var(--shadow-card)" }}
                      >
                        {/* Subject glyph in tinted square — replaces the
                            generic companion avatar so the parent sees
                            the SUBJECT at a glance, which is what they're
                            scanning for. */}
                        <span
                          aria-hidden
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                          style={{ background: subjectTint }}
                        >
                          {subjectGlyph}
                        </span>

                        <div className="min-w-0 flex-1">
                          {/* Subject + child + date on top — meta line. */}
                          <p className="text-xs text-muted">
                            <span className="font-semibold text-ink/75">{subjectLabel}</span>
                            {child?.name ? <> · {child.name}</> : null}
                            <> · {formatDate(s.created_at)}</>
                          </p>
                          {/* Task title second — the actual thing they
                              worked on. Truncated so long task texts
                              don't push the meta off-screen. */}
                          <p className="mt-0.5 truncate text-sm font-medium text-ink">
                            {title}
                          </p>
                          {/* Inline progress chips: duration + steps.
                              These two numbers answer "how much work did
                              the kid actually do?" without the parent
                              having to drill into the task. */}
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                            {duration && (
                              <span className="inline-flex items-center gap-1">
                                <ClockGlyph /> {duration}
                              </span>
                            )}
                            {stepsLabel && (
                              <span className="inline-flex items-center gap-1">
                                <CheckGlyph /> {stepsLabel}
                              </span>
                            )}
                          </div>
                          {/* Subject-tone bar serves no functional role
                              — kept the visual identity hook in case we
                              wire deep-links later. */}
                          <span className="sr-only">{subjectTone}</span>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <StatusPill tone={statusInfo.tone} label={statusInfo.label} />
                        </div>
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
  tone: "mint" | "clay" | "plum" | "honey"
}) {
  // Mirrors TONE_BAR in components/overview/SubjectSummaryCard.tsx.
  const TONE_DOT: Record<string, string> = {
    mint: "#4F8E6B",
    clay: "#A05844",
    plum: "#7A5A9C",
    honey: "#D6B850",
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
