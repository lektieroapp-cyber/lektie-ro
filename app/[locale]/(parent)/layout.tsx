import { notFound, redirect } from "next/navigation"
import { Sidebar } from "@/components/app/Sidebar"
import { createClient } from "@/lib/supabase/server"
import { isLocale } from "@/lib/i18n/config"
import { DEV_BYPASS_AUTH, DEV_PROFILE } from "@/lib/dev-user"

export default async function ParentLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  let isAdmin = false

  if (DEV_BYPASS_AUTH) {
    isAdmin = DEV_PROFILE.role === "admin"
  } else {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect(`/${locale}/login`)

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
    isAdmin = profile?.role === "admin"
  }

  return (
    <div className="flex min-h-screen flex-col bg-blue-tint/30 md:flex-row">
      <Sidebar locale={locale} isAdmin={isAdmin} />
      <main className="flex-1 overflow-x-hidden">
        {DEV_BYPASS_AUTH && <DevBanner />}
        <div className="mx-auto w-full max-w-5xl px-5 py-8 md:px-10 md:py-12">
          {children}
        </div>
      </main>
    </div>
  )
}

function DevBanner() {
  return (
    <div className="bg-amber-pill px-4 py-2 text-center text-xs font-medium text-ink">
      DEV_BYPASS_AUTH er aktivt. Du er logget ind som <code>{DEV_PROFILE.display_name}</code> ({DEV_PROFILE.role}). Slå fra i <code>.env.local</code> før commit.
    </div>
  )
}
