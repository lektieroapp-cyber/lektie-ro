import { notFound } from "next/navigation"
import { Tavle } from "@/components/board/Tavle"
import { isLocale } from "@/lib/i18n/config"
import { localePath } from "@/lib/i18n/routes"
import { getMessages } from "@/lib/i18n/getMessages"
import { getSessionUser } from "@/lib/auth/session"
import { getActiveChild } from "@/lib/auth/active-child"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  fetchAllTasksForChild,
  fetchAllTasksForParent,
  isTaskSubject,
  type TaskSubject,
} from "@/lib/tasks"

export default async function ParentDashboard({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ childId?: string; subject?: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const user = (await getSessionUser())!
  const { activeChildId, activeChild } = await getActiveChild(user.id)
  const sp = await searchParams
  const m = getMessages(locale)

  const isKid = !!activeChild

  // All children for the parent — drives the top-right kid dropdown in the
  // Tavle. Kid mode skips this query (kid sees only their own anyway).
  const admin = createAdminClient()
  let allChildren: { id: string; name: string }[] = []
  if (!isKid) {
    const { data } = await admin
      .from("children")
      .select("id, name")
      .eq("parent_id", user.id)
      .order("created_at", { ascending: true })
    allChildren = ((data ?? []) as { id: string; name: string }[]).map(c => ({
      ...c,
      name: c.name.split(" ")[0],
    }))
  }

  // Optional URL filters (set by the dropdown's router.replace and by
  // Forældre Ro deep-links). Both ignored in kid mode.
  const filterChildId =
    !isKid && sp.childId && allChildren.some(c => c.id === sp.childId)
      ? sp.childId
      : null
  const initialSubject: TaskSubject | null =
    sp.subject && isTaskSubject(sp.subject) ? sp.subject : null

  let tasks = isKid
    ? await fetchAllTasksForChild(user.id, activeChildId!)
    : await fetchAllTasksForParent(user.id)
  if (filterChildId) {
    tasks = tasks.filter(t => t.childId === filterChildId)
  }

  // childId → first name map for the in-task badges in parent mode.
  let childNames: Record<string, string> | undefined
  if (!isKid) {
    childNames = Object.fromEntries(allChildren.map(c => [c.id, c.name]))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <Tavle
          locale={locale}
          mode={isKid ? "kid" : "parent"}
          tasks={tasks}
          childNames={childNames}
          children={allChildren}
          selectedChildId={filterChildId}
          initialSubject={initialSubject}
          newTaskHref={
            isKid
              ? localePath(locale, "parentNewTask")
              : localePath(locale, "parentAddToBoard")
          }
          messages={m.tavle}
        />
      </div>
    </div>
  )
}
