import { redirect, notFound } from "next/navigation"
import { isLocale } from "@/lib/i18n/config"
import { localePath } from "@/lib/i18n/routes"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/auth/session"
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow"
import { type Locale } from "@/lib/i18n/config"

export default async function OnboardingPage({
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
    .select("id")
    .eq("parent_id", user.id)
    .limit(1)

  // Already has children — skip onboarding, go pick a profile.
  if (data && data.length > 0) {
    redirect(localePath(locale, "parentProfiles"))
  }

  return <OnboardingFlow locale={locale as Locale} firstName={user.displayName?.split(" ")[0] ?? ""} />
}
