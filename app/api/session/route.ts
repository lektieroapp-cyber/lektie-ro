import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser } from "@/lib/auth/session"

// POST — create a new session row when the child picks a mode.
export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const body = await request.json() as {
    childId: string
    subject: string
    grade: number
    mode: "explain" | "hint"
    problemText?: string
    problemType?: string
    imagePath?: string
  }

  const admin = createAdminClient()

  // Verify child belongs to this parent.
  const { data: child } = await admin
    .from("children")
    .select("id")
    .eq("id", body.childId)
    .eq("parent_id", user.id)
    .single()

  if (!child) {
    return NextResponse.json({ error: "child not found" }, { status: 404 })
  }

  const { data, error } = await admin
    .from("sessions")
    .insert({
      child_id: body.childId,
      parent_id: user.id,
      subject: body.subject,
      grade: body.grade,
      mode: body.mode,
      problem_text: body.problemText ?? null,
      problem_type: body.problemType ?? null,
      image_path: body.imagePath ?? null,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[session POST]", error.message)
    return NextResponse.json({ error: "db error" }, { status: 500 })
  }

  return NextResponse.json({ sessionId: data.id })
}

// PATCH — complete a session: record turn count, difficulty, ended_at.
export async function PATCH(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const body = await request.json() as {
    sessionId: string
    turnCount: number
    completed: boolean
    turns?: Array<{ role: "user" | "assistant"; content: string }>
  }

  const difficultyScore = deriveDifficulty(body.turnCount, body.completed)

  const admin = createAdminClient()

  // Verify this session belongs to this parent before updating.
  const { error: updateError } = await admin
    .from("sessions")
    .update({
      turn_count: body.turnCount,
      completed: body.completed,
      difficulty_score: difficultyScore,
      ended_at: new Date().toISOString(),
    })
    .eq("id", body.sessionId)
    .eq("parent_id", user.id)

  if (updateError) {
    console.error("[session PATCH]", updateError.message)
    return NextResponse.json({ error: "db error" }, { status: 500 })
  }

  // Persist individual turns when provided.
  if (body.turns && body.turns.length > 0) {
    await admin.from("turns").insert(
      body.turns.map(t => ({
        session_id: body.sessionId,
        role: t.role,
        content: t.content,
      }))
    )
  }

  return NextResponse.json({ ok: true, difficultyScore })
}

/**
 * Derive a 1–5 difficulty score from turn count + completion.
 *   1 = understood quickly
 *   2 = a little help
 *   3 = quite hard
 *   4 = very hard but finished
 *   5 = gave up
 */
function deriveDifficulty(turnCount: number, completed: boolean): number {
  const assistantTurns = Math.ceil(turnCount / 2)
  if (!completed && assistantTurns >= 4) return 5
  if (assistantTurns <= 2) return 1
  if (assistantTurns <= 4) return 2
  if (assistantTurns <= 6) return 3
  return 4
}
