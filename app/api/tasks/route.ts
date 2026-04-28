import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { getSessionUser } from "@/lib/auth/session"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  createTask,
  fetchOpenTasksForChild,
  fetchOpenTasksForParent,
  fetchPendingReview,
  isTaskSubject,
} from "@/lib/tasks"

// GET /api/tasks
//   ?childId=<uuid>     → kid board (open + approved tasks for that child)
//   ?review=1           → parent review queue (unapproved)
//   (no params)         → parent board (open + approved across all children)
export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  }

  const url = new URL(request.url)
  const childId = url.searchParams.get("childId")
  const review = url.searchParams.get("review") === "1"

  try {
    if (review) {
      const tasks = await fetchPendingReview(user.id)
      return NextResponse.json({ tasks })
    }
    if (childId) {
      const tasks = await fetchOpenTasksForChild(user.id, childId)
      return NextResponse.json({ tasks })
    }
    const tasks = await fetchOpenTasksForParent(user.id)
    return NextResponse.json({ tasks })
  } catch (err) {
    console.error("[tasks GET]", (err as Error).message)
    return NextResponse.json({ error: "db error" }, { status: 500 })
  }
}

// POST /api/tasks  — create one approved task. Used by the parent review
// queue's "Godkend" action.
const createSchema = z.object({
  childId: z.string().uuid(),
  subject: z.string(),
  title: z.string().nullable().optional(),
  text: z.string().min(1),
  type: z.string().optional(),
  goal: z.string().nullable().optional(),
  steps: z.array(z.object({ label: z.string(), prompt: z.string() })).nullable().optional(),
  context: z.string().nullable().optional(),
  needsPaper: z.boolean().nullable().optional(),
  sourceImagePath: z.string().nullable().optional(),
  taskGroupId: z.string().uuid().nullable().optional(),
  completionCertainty: z.enum(["high", "medium", "low"]).optional(),
  approve: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 })
  }

  if (!isTaskSubject(parsed.data.subject)) {
    return NextResponse.json({ error: "invalid_subject" }, { status: 400 })
  }

  // Verify the child belongs to this parent — RLS would also catch it but
  // a clean 404 is friendlier than the generic db error.
  const admin = createAdminClient()
  const { data: child } = await admin
    .from("children")
    .select("id")
    .eq("id", parsed.data.childId)
    .eq("parent_id", user.id)
    .maybeSingle()
  if (!child) {
    return NextResponse.json({ error: "child_not_found" }, { status: 404 })
  }

  try {
    const task = await createTask(user.id, {
      childId: parsed.data.childId,
      subject: parsed.data.subject,
      title: parsed.data.title ?? null,
      text: parsed.data.text,
      type: parsed.data.type,
      goal: parsed.data.goal ?? null,
      steps: parsed.data.steps ?? null,
      context: parsed.data.context ?? null,
      needsPaper: parsed.data.needsPaper ?? null,
      sourceImagePath: parsed.data.sourceImagePath ?? null,
      taskGroupId: parsed.data.taskGroupId ?? null,
      completionCertainty: parsed.data.completionCertainty,
      approve: parsed.data.approve,
    })
    return NextResponse.json({ task })
  } catch (err) {
    console.error("[tasks POST]", (err as Error).message)
    return NextResponse.json({ error: "db_error" }, { status: 500 })
  }
}
