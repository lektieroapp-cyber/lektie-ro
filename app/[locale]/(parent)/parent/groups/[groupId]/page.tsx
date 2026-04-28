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
}: {
  params: Promise<{ locale: string; groupId: string }>
}) {
  const { locale, groupId } = await params
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

  // If only one task survives the visibility filter, skip the picker
  // entirely — drop straight into that task. Same place a "Start alle"
  // would have landed after the kid picked the lone option.
  if (visibleRows.length === 1) {
    redirect(`/${locale}/parent/tasks/${visibleRows[0].id}`)
  }

  const subject = visibleRows[0].subject
  const backHref = (() => {
    const qs = new URLSearchParams()
    qs.set("subject", subject)
    if (!activeChild) qs.set("childId", visibleRows[0].childId)
    return `${localePath(locale, "parentDashboard")}?${qs.toString()}`
  })()

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <GroupTaskPicker
        locale={locale}
        subject={subject}
        tasks={visibleRows.map(rowToTask)}
        backHref={backHref}
        taskHrefBase={`/${locale}/parent/tasks`}
      />
    </div>
  )
}
