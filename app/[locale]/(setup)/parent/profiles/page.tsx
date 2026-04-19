import { redirect, notFound } from "next/navigation"
import { isLocale } from "@/lib/i18n/config"
import { localePath } from "@/lib/i18n/routes"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/auth/session"
import { ChildProfileSelector } from "@/components/children/ChildProfileSelector"

type Child = {
  id: string
  name: string
  avatar_emoji: string | null
  companion_type: string | null
}

export default async function ProfilesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const user = (await getSessionUser())!
  const admin = createAdminClient()
  const { data } = await admin
    .from("children")
    .select("id, name, avatar_emoji, companion_type")
    .eq("parent_id", user.id)
    .order("created_at", { ascending: true })
  const children: Child[] = data ?? []

  if (children.length === 0) {
    redirect(localePath(locale, "parentOnboarding"))
  }

  return (
    <ChildProfileSelector
      children={children}
      dashboardHref={localePath(locale, "parentDashboard")}
      settingsHref={localePath(locale, "parentSettings")}
      overviewHref={localePath(locale, "parentOverview")}
    />
  )
}
