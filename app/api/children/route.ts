import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { DEV_BYPASS_AUTH, DEV_USER } from "@/lib/dev-user"

const schema = z.object({
  name: z.string().trim().min(1).max(40),
  grade: z.number().int().min(0).max(10),
  avatar_emoji: z.string().max(8).optional(),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 })
  }

  let parentId: string
  if (DEV_BYPASS_AUTH) {
    parentId = DEV_USER.id
  } else {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    parentId = user.id
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("children")
    .insert({
      parent_id: parentId,
      name: parsed.data.name,
      grade: parsed.data.grade,
      avatar_emoji: parsed.data.avatar_emoji ?? null,
    })
    .select("id, name, grade, avatar_emoji")
    .single()

  if (error) {
    console.error("[children POST] failed:", error.code, error.message)
    return NextResponse.json({ error: "db_error" }, { status: 500 })
  }

  return NextResponse.json({ child: data }, { status: 201 })
}
