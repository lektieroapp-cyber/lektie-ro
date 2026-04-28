import { notFound } from "next/navigation"
import { CompanionProvider } from "@/components/mascot/CompanionContext"
import { COMPANIONS, type CompanionType } from "@/components/mascot/types"
import { TaskHintShell } from "@/components/board/TaskHintShell"
import { ParentTaskPreview } from "@/components/board/ParentTaskPreview"
import { isLocale } from "@/lib/i18n/config"
import { localePath } from "@/lib/i18n/routes"
import { getMessages } from "@/lib/i18n/getMessages"
import { getSessionUser } from "@/lib/auth/session"
import { getActiveChild } from "@/lib/auth/active-child"
import { createAdminClient } from "@/lib/supabase/admin"
import { fetchTaskById, nextOpenSiblingInGroup, rowToTask } from "@/lib/tasks"
import {
  isEnglishTutoringLanguage,
  resolveEnglishTutoringLanguage,
} from "@/lib/english-tutoring"

const VALID_COMPANIONS = new Set<string>(COMPANIONS.map(c => c.type))

export default async function TaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ try?: string }>
}) {
  const { locale, id } = await params
  if (!isLocale(locale)) notFound()
  const sp = await searchParams
  const m = getMessages(locale)

  const user = (await getSessionUser())!
  const { activeChildId, activeChild } = await getActiveChild(user.id)

  const row = await fetchTaskById(user.id, id)
  if (!row) notFound()

  // Refuse to serve a kid a task that wasn't approved by the parent.
  // Parents (no active child) can still preview unapproved tasks.
  if (activeChild && !row.approvedByParent) notFound()

  // Parent mode renders the read-only overview by default. The "Prøv selv"
  // button on the overview links to ?try=1 which drops into the same
  // HintChat the kid sees — useful for sanity-checking what the AI does
  // without having to switch profiles.
  const isParentMode = !activeChild
  const tryAsParent = isParentMode && sp.try === "1"

  // Look up the kid's first name (parent overview header badge).
  let childName: string | null = null
  if (isParentMode) {
    const { data } = await createAdminClient()
      .from("children")
      .select("name")
      .eq("id", row.childId)
      .eq("parent_id", user.id)
      .maybeSingle()
    if (data) childName = (data as { name: string }).name.split(" ")[0]
  }

  // "Back" should land the user where they came from — the subject
  // detail panel in Tavle, not the empty subject picker. Carry ?subject=
  // through (and ?childId= for parent mode multi-child filtering) so the
  // Tavle re-opens the right view on mount.
  const dashboardBase = localePath(locale, "parentDashboard")
  const backHref = (() => {
    const qs = new URLSearchParams()
    qs.set("subject", row.subject)
    if (isParentMode) qs.set("childId", row.childId)
    return `${dashboardBase}?${qs.toString()}`
  })()

  if (isParentMode && !tryAsParent) {
    // Recent sessions for this task, newest first. Migration-009 columns
    // (steps_done/total, completion_kind) are nullable so pre-009 sessions
    // still render — just show turn count fallback.
    const { data: sessionRows } = await createAdminClient()
      .from("sessions")
      .select(
        "id, created_at, ended_at, turn_count, completed, difficulty_score, steps_done, steps_total, completion_kind",
      )
      .eq("parent_id", user.id)
      .eq("task_id", row.id)
      .order("created_at", { ascending: false })
      .limit(20)

    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <ParentTaskPreview
          task={row}
          childName={childName}
          sessions={(sessionRows ?? []) as Parameters<typeof ParentTaskPreview>[0]["sessions"]}
          boardHref={backHref}
          tryItHref={`/${locale}/parent/tasks/${row.id}?try=1`}
          messages={{
            back: m.tavle.previewBack,
            subjectLabel: m.tavle.previewSubjectLabel,
            childLabel: m.tavle.previewChildLabel,
            statusLabel: m.tavle.previewStatusLabel,
            createdLabel: m.tavle.previewCreatedLabel,
            textLabel: m.tavle.previewTextLabel,
            goalLabel: m.tavle.previewGoalLabel,
            stepsLabel: m.tavle.previewStepsLabel,
            sessionsLabel: m.tavle.previewSessionsLabel,
            sessionsEmpty: m.tavle.previewSessionsEmpty,
            dismiss: m.tavle.previewDismiss,
            dismissConfirm: m.tavle.previewDismissConfirm,
            delete: m.tavle.previewDelete,
            deleteConfirm: m.tavle.previewDeleteConfirm,
            tryIt: m.tavle.previewTryItYourself,
            tryItHint: m.tavle.previewTryItHint,
            subjects: m.tavle.subjects,
            statusPending: m.tavle.statusPending,
            statusInProgress: m.tavle.statusInProgress,
            statusDone: m.tavle.statusDone,
            progressLabel: m.tavle.previewProgressLabel,
            progressFraction: m.tavle.previewProgressFraction,
            progressNoneYet: m.tavle.previewProgressNoneYet,
          }}
        />
      </div>
    )
  }

  // Kid path (or parent in ?try=1 mode) — drop into the tutoring shell.
  const childGrade = activeChild?.grade ?? null
  const rawCompanion = activeChild?.companion_type
  const initialCompanion: CompanionType | null =
    rawCompanion && VALID_COMPANIONS.has(rawCompanion)
      ? (rawCompanion as CompanionType)
      : null

  // Kid mode → use the active child as the session owner. Parent "Prøv
  // selv" → pass the task's child so sessions still link correctly.
  const sessionChildId = activeChildId ?? row.childId

  // If this task was submitted as part of a group (parent uploaded a photo
  // with multiple tasks, or kid took the photo themselves), the
  // "Mere lektie" CTA after the celebration screen routes back to the
  // bundle's multi-pick screen — not directly into the next task.
  // Auto-jumping into the next task without showing the kid the rest
  // of the set is disorienting and removes their agency over which
  // task to do next. Skip in parent "Prøv selv" mode — that's a
  // one-shot demo. Only set when there's actually another open
  // sibling to go to; nextOpenSiblingInGroup returning null means
  // every task in the group is done → fall back to the board.
  let nextSiblingHref: string | null = null
  if (activeChild && row.taskGroupId) {
    const sibling = await nextOpenSiblingInGroup(
      user.id,
      row.childId,
      row.taskGroupId,
      row.id,
    )
    if (sibling) {
      // ?just_done=<taskId> tells the picker to render a celebration
      // banner naming the task the kid just finished. Without it, the
      // kid lands at the picker with no acknowledgement of what they
      // just accomplished — the "first then send back, no praise"
      // bug pattern reported by the parent.
      nextSiblingHref =
        `/${locale}/parent/groups/${row.taskGroupId}?just_done=${row.id}`
    }
  }

  // Resolve the kid's engelsk-tutoring preference (auto/danish/english)
  // against their grade so the TTS pipeline gets a concrete value to
  // pick a voice from. Only meaningful for engelsk subject — passed on
  // every task so the prop shape stays uniform.
  const rawEnglishLang = activeChild?.english_tutoring_language ?? null
  const englishTutoringLanguage = resolveEnglishTutoringLanguage(
    isEnglishTutoringLanguage(rawEnglishLang) ? rawEnglishLang : "auto",
    childGrade,
  )

  // Look up the highest steps_done across this task's prior sessions so
  // the kid resumes mid-task instead of restarting at step 1. Only
  // meaningful in kid mode (parent "Prøv selv" gets a fresh demo each
  // time). Skipped for completed tasks — those start fresh on retry.
  let resumeFromStep = 0
  if (activeChild && row.status !== "done") {
    const { data: progressRows } = await createAdminClient()
      .from("sessions")
      .select("steps_done, completed")
      .eq("parent_id", user.id)
      .eq("task_id", row.id)
      .order("created_at", { ascending: false })
      .limit(20)
    if (progressRows && progressRows.length > 0) {
      let bestDone = 0
      for (const r of progressRows as Array<{
        steps_done: number | null
        completed: boolean | null
      }>) {
        if (r.completed) { bestDone = 0; break }
        bestDone = Math.max(bestDone, r.steps_done ?? 0)
      }
      resumeFromStep = bestDone
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CompanionProvider initial={initialCompanion} childId={sessionChildId}>
        <TaskHintShell
          task={rowToTask(row)}
          subject={row.subject}
          childId={sessionChildId}
          childGrade={childGrade}
          boardHref={backHref}
          nextSiblingHref={nextSiblingHref}
          englishTutoringLanguage={englishTutoringLanguage}
          resumeFromStep={resumeFromStep}
        />
      </CompanionProvider>
    </div>
  )
}
