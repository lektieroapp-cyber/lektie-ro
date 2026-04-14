import { notFound, redirect } from "next/navigation"
import { Sidebar } from "@/components/app/Sidebar"
import { createClient } from "@/lib/supabase/server"
import { isLocale } from "@/lib/i18n/config"

export default async function ParentLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  const isAdmin = profile?.role === "admin"

  return (
    <div className="flex min-h-screen bg-blue-tint/30">
      <Sidebar locale={locale} isAdmin={isAdmin} />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto w-full max-w-5xl px-6 py-10 md:px-10 md:py-12">
          {children}
        </div>
      </main>
    </div>
  )
}
