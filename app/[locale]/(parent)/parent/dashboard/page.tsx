import { cookies } from "next/headers"
import Link from "next/link"
import { notFound } from "next/navigation"
import { OnboardingForm } from "@/components/session/OnboardingForm"
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
  const skipped = cookieStore.get("lr_onboarding_skipped")?.value === "1"

  if (children.length === 0 && !skipped) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
        <div className="w-full max-w-xl">
          <OnboardingForm locale={locale} showSkip />
        </div>
      </div>
    )
  }

  const activeChildId = cookieStore.get("lr_active_child")?.value
  const activeChild = (activeChildId && children.find(c => c.id === activeChildId)) || children[0]
  const greetingName = activeChild?.name || user.displayName
  const avatar = activeChild?.avatar_emoji

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

      {children.length === 0 && skipped && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-card bg-amber-pill/60 px-5 py-4 text-sm text-ink">
          <span>{m.parent.noChildBanner}</span>
          <Link
            href={localePath(locale, "parentOverview")}
            className="rounded-btn bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-hover"
          >
            {m.parent.noChildBannerCta}
          </Link>
        </div>
      )}

      <section className="mt-10">
        <SessionFlow />
      </section>
    </>
  )
}
