import { notFound } from "next/navigation"
import { UsersTable, type UserRow } from "@/components/admin/UsersTable"
import { estimateUserCostDkk } from "@/lib/ai-pricing"
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

  // Sessions table may not exist yet (migration 006). If that query errors,
  // we still render the user list — cost cells just show "—".
  const sessionsQuery = admin
    .from("sessions")
    .select("parent_id, turn_count")
    .then(r => r, () => ({ data: [] as { parent_id: string | null; turn_count: number | null }[] }))

  const [usersResult, { data: profiles }, { data: children }, { data: sessions }] =
    await Promise.all([
      admin.auth.admin.listUsers({ perPage: 1000 }),
      admin.from("profiles").select("id, role"),
      admin.from("children").select("parent_id"),
      sessionsQuery,
    ])

  const profileMap = new Map(
    (profiles ?? []).map(p => [p.id, p.role as "parent" | "admin"])
  )
  const parentsWithKids = new Set((children ?? []).map(c => c.parent_id))

  // Aggregate sessions + total turns per parent_id.
  const sessionStats = new Map<string, { sessions: number; turns: number }>()
  for (const s of sessions ?? []) {
    if (!s.parent_id) continue
    const prev = sessionStats.get(s.parent_id) ?? { sessions: 0, turns: 0 }
    prev.sessions += 1
    prev.turns += s.turn_count ?? 0
    sessionStats.set(s.parent_id, prev)
  }

  const rows: UserRow[] = (usersResult.data?.users ?? []).map(u => {
    const stats = sessionStats.get(u.id) ?? { sessions: 0, turns: 0 }
    const cost = estimateUserCostDkk(stats.sessions, stats.turns)
    return {
      id: u.id,
      email: u.email ?? "-",
      role: profileMap.get(u.id) ?? "parent",
      subscription: "free",
      hasKid: parentsWithKids.has(u.id),
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at ?? null,
      sessions: stats.sessions,
      estCostDkk: cost.dkk,
    }
  })

  rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <section className="mt-10">
      <UsersTable rows={rows} />
    </section>
  )
}
