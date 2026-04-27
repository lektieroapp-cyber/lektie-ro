import Link from "next/link"
import { notFound } from "next/navigation"
import { CompanionProvider } from "@/components/mascot/CompanionContext"
import { COMPANIONS, type CompanionType } from "@/components/mascot/types"
import { NewTaskForm } from "@/components/board/NewTaskForm"
import { isLocale } from "@/lib/i18n/config"
import { localePath } from "@/lib/i18n/routes"
import { getMessages } from "@/lib/i18n/getMessages"
import { getSessionUser } from "@/lib/auth/session"
import { getActiveChild } from "@/lib/auth/active-child"
import { createAdminClient } from "@/lib/supabase/admin"

const VALID_COMPANIONS = new Set<string>(COMPANIONS.map(c => c.type))

export default async function StartHomeworkPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const user = (await getSessionUser())!
  const { activeChildId, activeChild } = await getActiveChild(user.id)
  const m = getMessages(locale)

  let children: { id: string; name: string }[]
  if (activeChild) {
    children = [{ id: activeChild.id, name: activeChild.name }]
  } else {
    const { data } = await createAdminClient()
      .from("children")
      .select("id, name")
      .eq("parent_id", user.id)
      .order("created_at", { ascending: true })
    children = (data ?? []) as { id: string; name: string }[]
  }

  const childName = activeChild?.name?.split(" ")[0] ?? null
  const rawCompanion = activeChild?.companion_type
  const initialCompanion: CompanionType | null =
    rawCompanion && VALID_COMPANIONS.has(rawCompanion)
      ? (rawCompanion as CompanionType)
      : null

  const messages = {
    ...m.newTask,
    subjects: m.tavle.subjects,
  }

  const boardHref = localePath(locale, "parentDashboard")

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Link
        href={boardHref}
        className="mb-2 inline-flex items-center gap-1 self-start text-sm font-medium text-ink/60 transition hover:text-ink cursor-pointer"
      >
        <span aria-hidden>‹</span> {m.addToBoard.backToBoard}
      </Link>
      <div className="flex flex-1 items-center justify-center">
        <div className="flex w-full max-w-2xl flex-col self-center lg:max-w-3xl">
          <CompanionProvider initial={initialCompanion} childId={activeChildId}>
            <NewTaskForm
              mode="start"
              children={children}
              lockedChildId={activeChild?.id ?? null}
              childName={childName}
              onboardingHref={localePath(locale, "parentOnboarding")}
              boardHref={boardHref}
              taskHrefBase={`/${locale}/parent/tasks`}
              messages={messages}
            />
          </CompanionProvider>
        </div>
      </div>
    </div>
  )
}
