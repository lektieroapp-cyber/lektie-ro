import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth/session"
import { createAdminClient } from "@/lib/supabase/admin"

// POST /api/admin/reset-my-tasks — admin-only + localhost-only.
// Wipes tasks + sessions (turns cascade) for the *currently logged-in*
// user. Mirrors `scripts/reset-user-tasks.mjs` but as a self-service
// endpoint so the admin can re-test without leaving the app.
//
// Triple-gated:
//   1. server-side NODE_ENV must be "development" — refuses on Vercel prod.
//   2. caller must be authenticated.
//   3. caller's role must be "admin" (matches the existing admin pages).
//
// Profile + children + subscription survive — login keeps working and the
// kid setup doesn't need to be redone. Storage photos auto-delete on the
// bucket's 24h policy.
export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "dev_only" }, { status: 403 })
  }
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  if (user.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const admin = createAdminClient()

  const [{ count: tasksBefore }, { count: sessionsBefore }] = await Promise.all([
    admin.from("tasks").select("id", { count: "exact", head: true }).eq("parent_id", user.id),
    admin.from("sessions").select("id", { count: "exact", head: true }).eq("parent_id", user.id),
  ])

  // Order matters mildly: tasks first sets sessions.task_id to null via
  // the ON DELETE SET NULL FK. Sessions next removes turns via cascade.
  const { error: tasksErr } = await admin.from("tasks").delete().eq("parent_id", user.id)
  if (tasksErr) {
    return NextResponse.json({ error: "delete_tasks_failed", detail: tasksErr.message }, { status: 500 })
  }
  const { error: sessionsErr } = await admin.from("sessions").delete().eq("parent_id", user.id)
  if (sessionsErr) {
    return NextResponse.json({ error: "delete_sessions_failed", detail: sessionsErr.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    tasksDeleted: tasksBefore ?? 0,
    sessionsDeleted: sessionsBefore ?? 0,
  })
}
