import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { getSessionUser } from "@/lib/auth/session"
import { createAdminClient } from "@/lib/supabase/admin"
import { createTaskBatch, isTaskSubject } from "@/lib/tasks"

// POST /api/tasks/batch — create N tasks for one child under a single shared
// task_group_id. Used by NewTaskForm "start" mode (kid hits Snap, vision
// returns several tasks, app auto-approves them all and jumps into the first)
// so the remaining tasks are linkable as a homework set instead of orphans
// on the board.
const taskSchema = z.object({
  title: z.string().nullable().optional(),
  text: z.string().min(1),
  type: z.string().optional(),
  goal: z.string().nullable().optional(),
  steps: z.array(z.object({ label: z.string(), prompt: z.string() })).nullable().optional(),
  context: z.string().nullable().optional(),
  needsPaper: z.boolean().nullable().optional(),
  completionCertainty: z.enum(["high", "medium", "low"]).optional(),
})

const batchSchema = z.object({
  childId: z.string().uuid(),
  subject: z.string(),
  sourceImagePath: z.string().nullable().optional(),
  approve: z.boolean().optional(),
  /** Kid-facing bundle name shown on the Tavle bundle row (vision suggests
   *  one, parent can edit before submit). Persisted on every sibling. */
  groupTitle: z.string().max(80).nullable().optional(),
  tasks: z.array(taskSchema).min(1),
})

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = batchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 })
  }

  if (!isTaskSubject(parsed.data.subject)) {
    return NextResponse.json({ error: "invalid_subject" }, { status: 400 })
  }

  // Same parent-owns-child check as the single-create endpoint. RLS would
  // also catch it but a clean 404 is friendlier than the generic db_error.
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
    const { groupId, tasks } = await createTaskBatch(
      user.id,
      parsed.data.tasks.map(t => ({
        childId: parsed.data.childId,
        subject: parsed.data.subject as Parameters<typeof createTaskBatch>[1][number]["subject"],
        title: t.title ?? null,
        text: t.text,
        type: t.type,
        goal: t.goal ?? null,
        steps: t.steps ?? null,
        context: t.context ?? null,
        needsPaper: t.needsPaper ?? null,
        sourceImagePath: parsed.data.sourceImagePath ?? null,
        completionCertainty: t.completionCertainty,
        approve: parsed.data.approve,
      })),
      parsed.data.groupTitle ?? null,
    )
    return NextResponse.json({ groupId, tasks })
  } catch (err) {
    console.error("[tasks/batch POST]", (err as Error).message)
    return NextResponse.json({ error: "db_error" }, { status: 500 })
  }
}
