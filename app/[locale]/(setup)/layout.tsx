import { notFound, redirect } from "next/navigation"
import { isLocale } from "@/lib/i18n/config"
import { getSessionUser } from "@/lib/auth/session"
import { DEV_BYPASS_AUTH, DEV_PROFILE, DEV_USER, getDevEnsureStatus } from "@/lib/dev-user"

export default async function SetupLayout({
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
    redirect(`/${locale}/welcome?next=${encodeURIComponent(`/${locale}/parent/onboarding`)}`)
  }

  return (
    <div className="min-h-screen bg-canvas">
      {DEV_BYPASS_AUTH && <DevBanner />}
      {children}
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
