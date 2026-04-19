import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { DEV_BYPASS_AUTH, DEV_USER, ensureDevUserExists } from "@/lib/dev-user"

const COMPANION_TYPES = [
  "lion", "fox", "owl", "panda", "octopus", "robot",
  "unicorn", "dragon", "rabbit", "alien", "cat", "polar-bear",
] as const

const patchSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  grade: z.number().int().min(0).max(10).optional(),
  avatar_emoji: z.string().max(8).nullable().optional(),
  interests: z.string().trim().max(200).nullable().optional(),
  special_needs: z.string().trim().max(300).nullable().optional(),
  companion_type: z.enum(COMPANION_TYPES).nullable().optional(),
})

async function getParentId(): Promise<string | null> {
  if (DEV_BYPASS_AUTH) {
    await ensureDevUserExists()
    return DEV_USER.id
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const parentId = await getParentId()
  if (!parentId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("children")
    .update(parsed.data)
    .eq("id", id)
    .eq("parent_id", parentId)
    .select("id, name, grade, avatar_emoji, interests, special_needs, companion_type")
    .single()

  if (error) {
    console.error("[children PATCH] failed:", error.message)
    return NextResponse.json({ error: "update_failed" }, { status: 500 })
  }

  return NextResponse.json({ child: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const parentId = await getParentId()
  if (!parentId) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { error } = await admin
    .from("children")
    .delete()
    .eq("id", id)
    .eq("parent_id", parentId)

  if (error) {
    console.error("[children DELETE] failed:", error.message)
    return NextResponse.json({ error: "delete_failed" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
