import { notFound, redirect } from "next/navigation"
import { Sidebar } from "@/components/app/Sidebar"
import { VisualViewportSync } from "@/components/app/VisualViewportSync"
import { isLocale } from "@/lib/i18n/config"
import { DEV_BYPASS_AUTH, DEV_PROFILE, DEV_USER, getDevEnsureStatus } from "@/lib/dev-user"
import { getSessionUser } from "@/lib/auth/session"
import { getActiveChild } from "@/lib/auth/active-child"
import { shouldUseLargerText } from "@/lib/accommodations"

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

  // Reading-mode: turns on automatically for grade ≤ 2 (still building
  // reading fluency) or when the parent has flagged dyslexia. Drives
  // the .reading-large CSS rules in app/globals.css to scale up text on
  // kid-facing surfaces. Parent-mode (no active child) never gets it.
  const readingLarge =
    !!activeChild && shouldUseLargerText(activeChild.accommodations, activeChild.grade)

  return (
    // `fixed inset-x-0 top-0` pins the shell to the viewport without
    // contributing to body height. Without this, body height = shell
    // height, so any sibling that body picks up (Next.js dev portal,
    // toast root, anything injected at body level) adds up and we get
    // a body scrollbar on top of the inner main scroll — the "double
    // scroll" symptom on Forældre Ro. Fixed positioning sidesteps that
    // entirely. Height stays driven by `--lr-app-h` so the keyboard
    // handling in VisualViewportSync still works.
    <div
      className="fixed inset-x-0 top-0 flex flex-col overflow-hidden bg-blue-tint/30 md:flex-row"
      style={{ height: "var(--lr-app-h, 100svh)" }}
      data-reading-mode={readingLarge ? "large" : undefined}
    >
      <VisualViewportSync />
      <Sidebar locale={locale} isAdmin={isAdmin} email={user.email ?? ""} activeChild={activeChild} />
      <main className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
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
      className={`px-4 py-2 text-center text-xs font-semibold ${
        isBad ? "bg-clay/20 text-clay" : "bg-clay-soft text-clay"
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
