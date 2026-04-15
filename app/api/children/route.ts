import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { DEV_BYPASS_AUTH, DEV_USER, ensureDevUserExists } from "@/lib/dev-user"

const TIER_LIMITS: Record<string, number> = {
  free: 0,
  standard: 1,
  family: 4,
}

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
  let isAdmin = false
  if (DEV_BYPASS_AUTH) {
    await ensureDevUserExists()
    parentId = DEV_USER.id
    isAdmin = true
  } else {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    parentId = user.id
  }

  const admin = createAdminClient()

  if (!isAdmin) {
    const { data: profile } = await admin
      .from("profiles")
      .select("role, subscription_tier")
      .eq("id", parentId)
      .single()

    if (profile?.role === "admin") {
      isAdmin = true
    } else {
      const tier = profile?.subscription_tier ?? "standard"
      const limit = TIER_LIMITS[tier] ?? 1
      const { count } = await admin
        .from("children")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", parentId)
      if ((count ?? 0) >= limit) {
        return NextResponse.json({ error: "child_limit_reached", limit }, { status: 403 })
      }
    }
  }

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
