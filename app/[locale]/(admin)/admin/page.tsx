import { notFound } from "next/navigation"
import { InviteUserForm } from "@/components/admin/InviteUserForm"
import { isLocale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"
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
  const [{ count: waitlistCount }, { count: profilesCount }, { data: recent }] =
    await Promise.all([
      admin.from("waitlist").select("*", { count: "exact", head: true }),
      admin.from("profiles").select("*", { count: "exact", head: true }),
      admin
        .from("waitlist")
        .select("email, locale, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ])

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

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <StatCard label={m.admin.waitlistCount} value={waitlistCount ?? 0} accent />
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
        <div
          className="mt-4 overflow-x-auto rounded-card bg-white"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="bg-blue-tint/40 text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{m.admin.email}</th>
                <th className="px-5 py-3 font-medium">{m.admin.locale}</th>
                <th className="px-5 py-3 font-medium">{m.admin.joinedAt}</th>
              </tr>
            </thead>
            <tbody>
              {(recent ?? []).map(row => (
                <tr key={row.email} className="border-t border-ink/5">
                  <td className="px-5 py-3 text-ink">{row.email}</td>
                  <td className="px-5 py-3 text-muted uppercase">{row.locale}</td>
                  <td className="px-5 py-3 text-muted">
                    {new Date(row.created_at).toLocaleString("da-DK")}
                  </td>
                </tr>
              ))}
              {(!recent || recent.length === 0) && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-muted">
                    {m.admin.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
