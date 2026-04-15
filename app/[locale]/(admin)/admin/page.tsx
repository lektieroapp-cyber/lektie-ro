import { notFound } from "next/navigation"
import { AdminSubNav } from "@/components/admin/AdminSubNav"
import { InviteUserForm } from "@/components/admin/InviteUserForm"
import { WaitlistTable, type WaitlistRow } from "@/components/admin/WaitlistTable"
import { isLocale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"
import { localePath } from "@/lib/i18n/routes"
import { createAdminClient } from "@/lib/supabase/admin"

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const m = getMessages(locale)

  const admin = createAdminClient()
  const [
    { count: waitlistCount },
    { count: profilesCount },
    { data: recent },
    usersResult,
  ] = await Promise.all([
    admin.from("waitlist").select("*", { count: "exact", head: true }),
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin
      .from("waitlist")
      .select("email, locale, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ])

  // Build a lowercased-email lookup of accounts that already exist so we can
  // mark each waitlist row with whether the user has converted.
  const userEmails = new Set(
    (usersResult.data?.users ?? [])
      .map(u => u.email?.toLowerCase())
      .filter((e): e is string => !!e)
  )

  const waitlistRows: WaitlistRow[] = (recent ?? []).map(row => ({
    email: row.email,
    locale: row.locale,
    created_at: row.created_at,
    hasAccount: userEmails.has(row.email.toLowerCase()),
  }))
  const convertedCount = waitlistRows.filter(r => r.hasAccount).length

  return (
    <>
      <header>
        <h1
          className="text-4xl md:text-5xl font-bold text-ink"
          style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
        >
          {m.admin.title}
        </h1>
        <p className="mt-2 text-base text-muted">{m.admin.subtitle}</p>
      </header>

      <AdminSubNav
        items={[
          { href: localePath(locale, "admin"), label: "Oversigt" },
          { href: `/${locale}/admin/users`, label: "Brugere" },
          { href: `/${locale}/admin/emails`, label: "Emails" },
        ]}
      />

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <StatCard label={m.admin.waitlistCount} value={waitlistCount ?? 0} accent />
        <StatCard label="Konverterede" value={convertedCount} />
        <StatCard label={m.admin.profilesCount} value={profilesCount ?? 0} />
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-ink">{m.admin.inviteTitle}</h2>
        <p className="mt-1 text-sm text-muted">{m.admin.inviteBody}</p>
        <div
          className="mt-4 rounded-card bg-white p-5"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <InviteUserForm />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-ink">{m.admin.recentSignups}</h2>
        {waitlistRows.length === 0 ? (
          <div
            className="mt-4 rounded-card bg-white p-8 text-center text-sm text-muted"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            {m.admin.empty}
          </div>
        ) : (
          <WaitlistTable rows={waitlistRows} />
        )}
      </section>
    </>
  )
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div
      className="rounded-card bg-white p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <p className="text-sm text-muted">{label}</p>
      <p
        className={`mt-2 text-4xl font-bold ${accent ? "text-coral-deep" : "text-ink"}`}
        style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
      >
        {value}
      </p>
    </div>
  )
}
