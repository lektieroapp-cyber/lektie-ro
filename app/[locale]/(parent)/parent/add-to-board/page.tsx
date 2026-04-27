import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { AddToBoardForm } from "@/components/board/AddToBoardForm"
import { isLocale } from "@/lib/i18n/config"
import { localePath } from "@/lib/i18n/routes"
import { getMessages } from "@/lib/i18n/getMessages"
import { getSessionUser } from "@/lib/auth/session"
import { getActiveChild } from "@/lib/auth/active-child"
import { createAdminClient } from "@/lib/supabase/admin"
import { isTaskSubject, type TaskSubject } from "@/lib/tasks"

// Curate-mode upload: parent takes one or more photos, reviews extracted
// tasks (per-task subject + approve/dismiss), then commits the batch to the
// board for the kid to do later. Kid mode redirects to the start-lektier
// page; this flow is parent-only.
export default async function AddToBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ subject?: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const user = (await getSessionUser())!
  const { activeChild } = await getActiveChild(user.id)
  if (activeChild) redirect(localePath(locale, "parentNewTask"))

  const m = getMessages(locale)
  const sp = await searchParams
  const initialSubject: TaskSubject | null =
    sp.subject && isTaskSubject(sp.subject) ? sp.subject : null

  const { data } = await createAdminClient()
    .from("children")
    .select("id, name")
    .eq("parent_id", user.id)
    .order("created_at", { ascending: true })
  const children = (data ?? []) as { id: string; name: string }[]

  const messages = {
    ...m.addToBoard,
    subjects: m.tavle.subjects,
  }

  const boardHref = localePath(locale, "parentDashboard")

  return (
    <div className="flex w-full flex-col gap-6">
      <Link
        href={boardHref}
        className="inline-flex items-center gap-1 self-start text-sm font-medium text-ink/60 transition hover:text-ink cursor-pointer"
      >
        <span aria-hidden>‹</span> {m.addToBoard.backToBoard}
      </Link>
      <header>
        <h1
          className="text-3xl font-bold text-ink md:text-4xl"
          style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
        >
          {m.addToBoard.title}
        </h1>
        <p className="mt-1 text-sm text-ink/60">{m.addToBoard.subtitle}</p>
      </header>
      <AddToBoardForm
        children={children}
        initialSubject={initialSubject}
        // Debug panel is dev-only. Even admins on prod don't see it —
        // the raw vision response can include extracted homework text
        // that isn't meant to be exposed in the customer-facing UI.
        isAdmin={user.role === "admin" && process.env.NODE_ENV === "development"}
        boardHref={boardHref}
        onboardingHref={localePath(locale, "parentOnboarding")}
        messages={messages}
      />
    </div>
  )
}
