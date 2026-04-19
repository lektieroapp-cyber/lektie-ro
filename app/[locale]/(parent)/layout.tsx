import { notFound, redirect } from "next/navigation"
import { Sidebar } from "@/components/app/Sidebar"
import { isLocale } from "@/lib/i18n/config"
import { DEV_BYPASS_AUTH, DEV_PROFILE, DEV_USER, getDevEnsureStatus } from "@/lib/dev-user"
import { getSessionUser } from "@/lib/auth/session"
import { getActiveChild } from "@/lib/auth/active-child"

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
    redirect(`/${locale}/welcome?next=${encodeURIComponent(`/${locale}/parent/profiles`)}`)
  }

  const isAdmin = user.role === "admin"
  const { activeChild } = await getActiveChild(user.id)

  return (
    <div className="flex min-h-screen flex-col bg-blue-tint/30 md:h-screen md:min-h-0 md:flex-row md:overflow-hidden">
      <Sidebar locale={locale} isAdmin={isAdmin} email={user.email ?? ""} activeChild={activeChild} />
      <main className="flex flex-1 flex-col overflow-x-hidden md:overflow-y-auto">
        {DEV_BYPASS_AUTH && <DevBanner />}
        <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-4 py-4 md:px-10 md:py-12">
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
