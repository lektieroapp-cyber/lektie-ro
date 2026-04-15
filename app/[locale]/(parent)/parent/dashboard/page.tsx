import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { SessionFlow } from "@/components/session/SessionFlow"
import { isLocale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"
import { localePath } from "@/lib/i18n/routes"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/auth/session"

type Child = { id: string; name: string; grade: number; avatar_emoji: string | null }

async function loadChildren(parentId: string): Promise<Child[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("children")
    .select("id, name, grade, avatar_emoji")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: true })
  return data ?? []
}

export default async function ParentDashboard({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const m = getMessages(locale)

  const user = (await getSessionUser())!
  const children = await loadChildren(user.id)
  const cookieStore = await cookies()

  // No children yet → full-screen onboarding wizard.
  if (children.length === 0) {
    redirect(localePath(locale, "parentOnboarding"))
  }

  // No selection made yet → Netflix selector.
  const activeChildId = cookieStore.get("lr_active_child")?.value
  if (!activeChildId) {
    redirect(localePath(locale, "parentProfiles"))
  }

  // "parent" sentinel means the parent chose their own view — greet by name.
  const activeChild = activeChildId === "parent"
    ? null
    : (children.find(c => c.id === activeChildId) ?? null)

  const greetingName = activeChild?.name ?? user.displayName
  const avatar = activeChild?.avatar_emoji ?? null

  return (
    <>
      <header>
        <h1
          className="text-4xl md:text-5xl font-bold text-ink"
          style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
        >
          {avatar && <span aria-hidden className="mr-2">{avatar}</span>}
          {m.parent.greeting.replace("{name}", greetingName)}{" "}
          <span aria-hidden>{m.parent.greetingWave}</span>
        </h1>
        <p className="mt-2 text-base text-muted">{m.parent.subheading}</p>
      </header>

      <section className="mt-10">
        <SessionFlow
          isAdmin={user.role === "admin"}
          activeChildId={activeChildId}
        />
      </section>
    </>
  )
}
