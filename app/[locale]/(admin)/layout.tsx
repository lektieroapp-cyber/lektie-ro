import { notFound, redirect } from "next/navigation"
import { Sidebar } from "@/components/app/Sidebar"
import { isLocale } from "@/lib/i18n/config"
import { DEV_BYPASS_AUTH, DEV_PROFILE } from "@/lib/dev-user"
import { getSessionUser } from "@/lib/auth/session"

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const user = await getSessionUser()
  if (!user) {
    console.log("[admin/layout] no session → redirect to login")
    redirect(`/${locale}/login`)
  }
  if (!user.passwordSet) {
    console.log(`[admin/layout] user.passwordSet=false → redirect to welcome (id=${user.id})`)
    redirect(`/${locale}/welcome?next=${encodeURIComponent(`/${locale}/admin`)}`)
  }
  if (user.role !== "admin") {
    console.log(`[admin/layout] user.role="${user.role}" (not admin) → notFound (id=${user.id})`)
    notFound()
  }
  console.log(`[admin/layout] OK admin (id=${user.id} email=${user.email})`)

  return (
    <div className="flex min-h-screen flex-col bg-blue-tint/30 md:h-screen md:min-h-0 md:flex-row md:overflow-hidden">
      <Sidebar locale={locale} isAdmin />
      <main className="flex-1 overflow-x-hidden md:overflow-y-auto">
        {DEV_BYPASS_AUTH && (
          <div className="bg-amber-pill px-4 py-2 text-center text-xs font-medium text-ink">
            DEV_BYPASS_AUTH er aktivt. Du er logget ind som <code>{DEV_PROFILE.display_name}</code> ({DEV_PROFILE.role}).
          </div>
        )}
        <div className="mx-auto w-full max-w-5xl px-5 py-8 md:px-10 md:py-12">
          {children}
        </div>
      </main>
    </div>
  )
}
