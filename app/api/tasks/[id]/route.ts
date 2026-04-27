import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { getSessionUser } from "@/lib/auth/session"
import { createAdminClient } from "@/lib/supabase/admin"
import { fetchTaskById, updateTask } from "@/lib/tasks"

const patchSchema = z.object({
  title: z.string().nullable().optional(),
  text: z.string().optional(),
  type: z.string().optional(),
  goal: z.string().nullable().optional(),
  steps: z.array(z.object({ label: z.string(), prompt: z.string() })).nullable().optional(),
  context: z.string().nullable().optional(),
  needsPaper: z.boolean().nullable().optional(),
  status: z.enum(["pending", "in_progress", "done", "dismissed"]).optional(),
  approvedByParent: z.boolean().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  }
  const { id } = await params
  try {
    const task = await fetchTaskById(user.id, id)
    if (!task) return NextResponse.json({ error: "not_found" }, { status: 404 })
    return NextResponse.json({ task })
  } catch (err) {
    console.error("[tasks/:id GET]", (err as Error).message)
    return NextResponse.json({ error: "db_error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  }
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 })
  }
  try {
    const task = await updateTask(user.id, id, parsed.data)
    if (!task) return NextResponse.json({ error: "not_found" }, { status: 404 })
    return NextResponse.json({ task })
  } catch (err) {
    console.error("[tasks/:id PATCH]", (err as Error).message)
    return NextResponse.json({ error: "db_error" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  }
  const { id } = await params
  const admin = createAdminClient()
  const { error } = await admin.from("tasks").delete().eq("id", id).eq("parent_id", user.id)
  if (error) {
    console.error("[tasks/:id DELETE]", error.message)
    return NextResponse.json({ error: "db_error" }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
