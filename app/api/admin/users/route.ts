import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { DEV_BYPASS_AUTH, DEV_PROFILE } from "@/lib/dev-user"
import { defaultLocale } from "@/lib/i18n/config"

const schema = z.object({
  email: z.string().email().max(320),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 })
  }

  let allowed = false
  if (DEV_BYPASS_AUTH) {
    allowed = DEV_PROFILE.role === "admin"
  } else {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
    allowed = profile?.role === "admin"
  }

  if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "")
  const admin = createAdminClient()

  const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(`/${defaultLocale}/parent/dashboard`)}`,
  })

  if (error) {
    console.error("[admin/users invite] failed:", error.message)
    const msg = error.message.toLowerCase()
    if (msg.includes("already") || msg.includes("registered")) {
      return NextResponse.json({ error: "already_exists" }, { status: 409 })
    }
    return NextResponse.json({ error: "invite_failed", detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, userId: data.user?.id ?? null })
}
