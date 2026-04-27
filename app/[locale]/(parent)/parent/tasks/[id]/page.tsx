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
import { fetchTaskById, rowToTask } from "@/lib/tasks"

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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CompanionProvider initial={initialCompanion} childId={sessionChildId}>
        <TaskHintShell
          task={rowToTask(row)}
          subject={row.subject}
          childId={sessionChildId}
          childGrade={childGrade}
          boardHref={backHref}
        />
      </CompanionProvider>
    </div>
  )
}
