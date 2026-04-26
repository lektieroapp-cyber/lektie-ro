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
    /** How much of the task finished when the kid ended the session.
     *  Optional — older clients may omit. Used to soften the difficulty
     *  score: "abandoned with 0 progress" is harder than "partial 3/4". */
    stepsDone?: number
    stepsTotal?: number
    completionKind?: "completed" | "partial" | "abandoned"
    turns?: Array<{ role: "user" | "assistant"; content: string }>
  }

  const difficultyScore = deriveDifficulty({
    turnCount: body.turnCount,
    completed: body.completed,
    stepsDone: body.stepsDone,
    stepsTotal: body.stepsTotal,
    kind: body.completionKind,
  })

  const admin = createAdminClient()

  // Verify this session belongs to this parent before updating.
  // steps_done / steps_total / completion_kind landed in migration 009.
  // Older deployments (pre-009) silently lose these — the column update
  // will simply error per-column, but the rest of the row still writes
  // correctly because Supabase processes the column list against the
  // schema. To be safe we only include the new columns when the client
  // sent them at all.
  const update: Record<string, unknown> = {
    turn_count: body.turnCount,
    completed: body.completed,
    difficulty_score: difficultyScore,
    ended_at: new Date().toISOString(),
  }
  if (typeof body.stepsDone === "number") update.steps_done = body.stepsDone
  if (typeof body.stepsTotal === "number") update.steps_total = body.stepsTotal
  if (body.completionKind) update.completion_kind = body.completionKind

  const { error: updateError } = await admin
    .from("sessions")
    .update(update)
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

  // Fire-and-forget post-session analysis. Skipped when the kid barely
  // engaged (≤1 turn) — nothing useful to extract. Failures here never
  // affect the response: the kid has already moved on to the next task,
  // and the analyze endpoint will be retryable from an admin tool later
  // if we want to backfill old rows.
  if (body.turnCount >= 2 && body.turns && body.turns.length >= 2) {
    void triggerAnalysis(request, body.sessionId)
  }

  return NextResponse.json({ ok: true, difficultyScore })
}

async function triggerAnalysis(request: NextRequest, sessionId: string) {
  try {
    // Same-origin fetch so the analyze endpoint runs in its own
    // serverless function context with its own timeout budget. We pass
    // through the auth cookie so getSessionUser() inside the analyze
    // route resolves to the same parent.
    const cookie = request.headers.get("cookie") ?? ""
    const url = new URL("/api/session/analyze", request.url)
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie,
      },
      body: JSON.stringify({ sessionId }),
    })
  } catch (err) {
    console.error("[session PATCH] analyze trigger failed:", (err as Error).message)
  }
}

/**
 * Derive a 1–5 difficulty score from turn count + completion shape.
 *   1 = understood quickly (few turns, fully done)
 *   2 = a little help
 *   3 = quite hard
 *   4 = very hard but finished
 *   5 = gave up (abandoned OR many turns and not completed)
 *
 * When the client sends partial-completion data, we soften the "gave up"
 * verdict for kids who made meaningful progress but stopped. "3/4 trin"
 * on a template task shouldn't register the same as "0/4 trin abandoned".
 */
function deriveDifficulty(input: {
  turnCount: number
  completed: boolean
  stepsDone?: number
  stepsTotal?: number
  kind?: "completed" | "partial" | "abandoned"
}): number {
  const { turnCount, completed, kind, stepsDone, stepsTotal } = input
  const assistantTurns = Math.ceil(turnCount / 2)
  if (kind === "abandoned") return 5
  if (kind === "partial" && stepsTotal && stepsTotal > 0) {
    // Made some progress but stopped. Score by progress ratio — 75% done is
    // a "4 but didn't quite finish" (hard), 25% done trends toward "5".
    const ratio = (stepsDone ?? 0) / stepsTotal
    if (ratio >= 0.75) return 4
    if (ratio >= 0.5) return 4
    if (ratio >= 0.25) return 5
    return 5
  }
  if (!completed && assistantTurns >= 4) return 5
  if (assistantTurns <= 2) return 1
  if (assistantTurns <= 4) return 2
  if (assistantTurns <= 6) return 3
  return 4
}
