import { notFound, redirect } from "next/navigation"
import { isLocale } from "@/lib/i18n/config"
import { localePath } from "@/lib/i18n/routes"
import { getSessionUser } from "@/lib/auth/session"
import { getActiveChild } from "@/lib/auth/active-child"
import { fetchTasksByGroup, rowToTask } from "@/lib/tasks"
import { GroupTaskPicker } from "@/components/board/GroupTaskPicker"

// Multi-pick screen for a saved task bundle (tasks sharing one
// task_group_id from a single parent submission). The kid lands here
// when they tap "Start alle" on a bundle row in Tavle. Lets them choose
// which task in the set to do first; the existing per-task auto-sibling
// routing then carries them through the rest.
export default async function GroupPickerPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; groupId: string }>
  searchParams: Promise<{ just_done?: string }>
}) {
  const { locale, groupId } = await params
  const sp = await searchParams
  if (!isLocale(locale)) notFound()

  const user = (await getSessionUser())!
  const { activeChild } = await getActiveChild(user.id)

  const rows = await fetchTasksByGroup(user.id, groupId)
  if (rows.length === 0) notFound()

  // Kid mode: refuse if any task in the group isn't approved (parent
  // can still preview unapproved). Same gate as the single-task page.
  const visibleRows = activeChild
    ? rows.filter(r => r.approvedByParent && r.childId === activeChild.id)
    : rows
  if (visibleRows.length === 0) notFound()

  // Pass already-completed task ids so TaskPicker hides them from the
  // grid and switches to "X af N tilbage" instead of "Jeg fandt N
  // opgaver!". Computed here so the kid coming back from a finished
  // task instantly sees the trimmed list without a refresh.
  const completedTaskIds = visibleRows
    .filter(r => r.status === "done")
    .map(r => r.id)
  const remainingRows = visibleRows.filter(r => r.status !== "done")

  // If every task is finished, skip the picker — drop the kid back on
  // the board. Nothing to choose from here.
  if (remainingRows.length === 0) {
    const qs = new URLSearchParams()
    qs.set("subject", visibleRows[0].subject)
    if (!activeChild) qs.set("childId", visibleRows[0].childId)
    redirect(`${localePath(locale, "parentDashboard")}?${qs.toString()}`)
  }

  // If only one task is still open, skip the picker — drop straight
  // into that task. Single-option pickers waste a click.
  if (remainingRows.length === 1) {
    redirect(`/${locale}/parent/tasks/${remainingRows[0].id}`)
  }

  const subject = visibleRows[0].subject
  const backHref = (() => {
    const qs = new URLSearchParams()
    qs.set("subject", subject)
    if (!activeChild) qs.set("childId", visibleRows[0].childId)
    return `${localePath(locale, "parentDashboard")}?${qs.toString()}`
  })()

  // Look up the just-finished task (if the kid arrived from a task
  // completion redirect) so the picker can show a personalised "godt
  // klaret, {title}!" banner instead of a generic toast.
  const justDoneId = sp.just_done
  const justDoneTask = justDoneId
    ? visibleRows.find(r => r.id === justDoneId)
    : undefined
  const justDoneLabel = justDoneTask?.title ?? null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <GroupTaskPicker
        locale={locale}
        subject={subject}
        // Pass the FULL set of tasks plus completedTaskIds so TaskPicker's
        // "X af N færdige" headline reflects total progress (not just
        // what's remaining). Hidden-from-grid filtering happens inside.
        tasks={visibleRows.map(rowToTask)}
        completedTaskIds={completedTaskIds}
        justDoneLabel={justDoneLabel}
        backHref={backHref}
        taskHrefBase={`/${locale}/parent/tasks`}
      />
    </div>
  )
}
