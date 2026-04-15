import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { DEV_BYPASS_AUTH, DEV_USER, ensureDevUserExists } from "@/lib/dev-user"

// Child profile fields — soft signals the Stage-2 hint prompt will read so
// the AI can pick relatable examples and adjust tone/pace. See
// `supabase/migrations/003_children_profile.sql` for column comments.
const schema = z.object({
  name: z.string().trim().min(1).max(40),
  grade: z.number().int().min(0).max(10),
  avatar_emoji: z.string().max(8).optional(),
  interests: z.string().trim().max(200).optional(),
  special_needs: z.string().trim().max(300).optional(),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 })
  }

  let parentId: string
  if (DEV_BYPASS_AUTH) {
    await ensureDevUserExists()
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
      interests: parsed.data.interests ?? null,
      special_needs: parsed.data.special_needs ?? null,
    })
    .select("id, name, grade, avatar_emoji, interests, special_needs")
    .single()

  if (error) {
    console.error("[children POST] failed:", error.code, error.message)
    return NextResponse.json({ error: "db_error" }, { status: 500 })
  }

  return NextResponse.json({ child: data }, { status: 201 })
}
