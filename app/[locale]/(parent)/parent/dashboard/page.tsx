import { cookies } from "next/headers"
import Link from "next/link"
import { notFound } from "next/navigation"
import { OnboardingForm } from "@/components/session/OnboardingForm"
import { SessionFlow } from "@/components/session/SessionFlow"
import { isLocale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"
import { localePath } from "@/lib/i18n/routes"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { DEV_BYPASS_AUTH, DEV_PROFILE, DEV_USER } from "@/lib/dev-user"

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

  let parentId: string
  let parentName: string

  if (DEV_BYPASS_AUTH) {
    parentId = DEV_USER.id
    parentName = DEV_PROFILE.display_name
  } else {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    parentId = user!.id
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", parentId)
      .maybeSingle()
    parentName = profile?.display_name || user!.email?.split("@")[0] || "dig"
  }

  const children = await loadChildren(parentId)
  const cookieStore = await cookies()
  const skipped = cookieStore.get("lr_onboarding_skipped")?.value === "1"

  // First run: no children and haven't skipped yet → onboarding form.
  if (children.length === 0 && !skipped) {
    return (
      <div className="mx-auto max-w-xl">
        <OnboardingForm locale={locale} />
      </div>
    )
  }

  const activeChild = children[0]
  const greetingName = activeChild?.name || parentName
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
        <div
          className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-card bg-amber-pill/60 px-5 py-4 text-sm text-ink"
        >
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
