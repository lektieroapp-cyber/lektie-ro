import { notFound } from "next/navigation"
import { UsersTable, type UserRow } from "@/components/admin/UsersTable"
import { isLocale } from "@/lib/i18n/config"
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
    subscription: "free",
    hasKid: parentsWithKids.has(u.id),
    createdAt: u.created_at,
    lastSignIn: u.last_sign_in_at ?? null,
  }))

  rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <section className="mt-10">
      <UsersTable rows={rows} />
    </section>
  )
}
