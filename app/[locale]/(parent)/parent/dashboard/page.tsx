import { notFound } from "next/navigation"
import { SessionFlow } from "@/components/session/SessionFlow"
import { isLocale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"
import { createClient } from "@/lib/supabase/server"

export default async function ParentDashboard({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const m = getMessages(locale)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user!.id)
    .maybeSingle()

  const name = profile?.display_name || user!.email?.split("@")[0] || "dig"

  return (
    <>
      <header>
        <h1
          className="text-4xl md:text-5xl font-bold text-ink"
          style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
        >
          {m.parent.greeting.replace("{name}", name)}{" "}
          <span aria-hidden>{m.parent.greetingWave}</span>
        </h1>
        <p className="mt-2 text-base text-muted">{m.parent.subheading}</p>
      </header>

      <section className="mt-10">
        <SessionFlow />
      </section>
    </>
  )
}
