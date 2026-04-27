import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/auth/session"

// POST — incremental progress save while a session is still in flight.
//
// The main `/api/session` PATCH always sets `ended_at` and treats the
// session as finished. That's wrong for the case where the kid has solved
// step A but the session is still going, and even more wrong for the case
// where the kid randomly closes the browser before pressing Færdig — without
// this endpoint, all the steps they actually did are lost.
//
// This endpoint is a narrower update: it bumps `steps_done`, `steps_total`,
// and `turn_count` based on the current in-flight progress, but leaves
// `completed`, `ended_at`, and `difficulty_score` alone. Called by HintChat
// after each AI turn so the parent dashboard reflects real progress even if
// the session never formally ends.
export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const body = await request.json() as {
    sessionId: string
    turnCount: number
    stepsDone?: number
    stepsTotal?: number
  }

  if (!body.sessionId) {
    return NextResponse.json({ error: "missing_session_id" }, { status: 400 })
  }

  const update: Record<string, unknown> = {
    turn_count: body.turnCount,
    // Bump the activity timestamp on every progress save so the parent
    // overview can compute time-on-task as last_active_at − created_at
    // instead of now() − created_at.
    last_active_at: new Date().toISOString(),
  }
  if (typeof body.stepsDone === "number") update.steps_done = body.stepsDone
  if (typeof body.stepsTotal === "number") update.steps_total = body.stepsTotal

  const admin = createAdminClient()
  const { error } = await admin
    .from("sessions")
    .update(update)
    .eq("id", body.sessionId)
    .eq("parent_id", user.id)
    // Don't clobber a session that's already been finalised by the main
    // PATCH — once `completed = true` lands, the row is closed.
    .eq("completed", false)

  if (error) {
    console.error("[session/progress]", error.message)
    return NextResponse.json({ error: "db error" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
