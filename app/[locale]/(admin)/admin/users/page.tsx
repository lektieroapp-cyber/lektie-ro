import { notFound } from "next/navigation"
import { AdminSubNav } from "@/components/admin/AdminSubNav"
import { UsersTable, type UserRow } from "@/components/admin/UsersTable"
import { isLocale } from "@/lib/i18n/config"
import { localePath } from "@/lib/i18n/routes"
import { createAdminClient } from "@/lib/supabase/admin"

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const admin = createAdminClient()

  const [usersResult, { data: profiles }, { data: children }] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("profiles").select("id, role"),
    admin.from("children").select("parent_id"),
  ])

  const profileMap = new Map(
    (profiles ?? []).map(p => [p.id, p.role as "parent" | "admin"])
  )
  const parentsWithKids = new Set((children ?? []).map(c => c.parent_id))

  const rows: UserRow[] = (usersResult.data?.users ?? []).map(u => ({
    id: u.id,
    email: u.email ?? "—",
    role: profileMap.get(u.id) ?? "parent",
    hasKid: parentsWithKids.has(u.id),
    createdAt: u.created_at,
    lastSignIn: u.last_sign_in_at ?? null,
  }))

  rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const subNav = [
    { href: localePath(locale, "admin"), label: "Oversigt" },
    { href: `/${locale}/admin/users`, label: "Brugere" },
    { href: `/${locale}/admin/emails`, label: "Emails" },
  ]

  return (
    <>
      <header>
        <h1
          className="text-4xl md:text-5xl font-bold text-ink"
          style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
        >
          Brugere
        </h1>
        <p className="mt-2 text-base text-muted">{rows.length} konti registreret</p>
      </header>

      <AdminSubNav items={subNav} />

      <section className="mt-10">
        <UsersTable rows={rows} />
      </section>
    </>
  )
}
