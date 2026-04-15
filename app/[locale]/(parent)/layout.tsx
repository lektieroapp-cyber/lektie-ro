import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { Sidebar } from "@/components/app/Sidebar"
import { isLocale } from "@/lib/i18n/config"
import { DEV_BYPASS_AUTH, DEV_PROFILE, DEV_USER, getDevEnsureStatus } from "@/lib/dev-user"
import { getSessionUser } from "@/lib/auth/session"
import { createAdminClient } from "@/lib/supabase/admin"

export default async function ParentLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const user = await getSessionUser()
  if (!user) redirect(`/${locale}/login`)

  if (!user.passwordSet) {
    redirect(`/${locale}/welcome?next=${encodeURIComponent(`/${locale}/parent/dashboard`)}`)
  }

  const isAdmin = user.role === "admin"

  // Resolve the active child so the sidebar can adapt to child vs parent mode.
  const cookieStore = await cookies()
  const activeChildId = cookieStore.get("lr_active_child")?.value
  let activeChild: { id: string; name: string; avatar_emoji: string | null } | null = null
  if (activeChildId && activeChildId !== "parent") {
    const { data } = await createAdminClient()
      .from("children")
      .select("id, name, avatar_emoji")
      .eq("id", activeChildId)
      .eq("parent_id", user.id)
      .single()
    activeChild = data ?? null
  }

  return (
    <div className="flex min-h-screen flex-col bg-blue-tint/30 md:h-screen md:min-h-0 md:flex-row md:overflow-hidden">
      <Sidebar locale={locale} isAdmin={isAdmin} email={user.email ?? ""} activeChild={activeChild} />
      <main className="flex-1 overflow-x-hidden md:overflow-y-auto">
        {DEV_BYPASS_AUTH && <DevBanner />}
        <div className="mx-auto w-full max-w-5xl px-5 py-8 md:px-10 md:py-12">
          {children}
        </div>
      </main>
    </div>
  )
}

function DevBanner() {
  const ensure = getDevEnsureStatus()
  const isBad = ensure.state === "failed"
  return (
    <div
      className={`px-4 py-2 text-center text-xs font-medium ${
        isBad ? "bg-coral-deep/20 text-coral-deep" : "bg-amber-pill text-ink"
      }`}
    >
      DEV_BYPASS_AUTH er aktivt. Logget ind som{" "}
      <code>{DEV_PROFILE.display_name}</code> ({DEV_PROFILE.role},{" "}
      <code>{DEV_USER.id.slice(0, 8)}…</code>).
      {isBad && (
        <>
          {" "}
          <strong>Ensure fejlede:</strong> <code>{ensure.error}</code>
        </>
      )}
    </div>
  )
}
