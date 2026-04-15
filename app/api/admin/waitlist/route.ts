import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { DEV_BYPASS_AUTH, DEV_PROFILE } from "@/lib/dev-user"

const schema = z.object({
  email: z.string().email(),
})

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 })

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

  const admin = createAdminClient()
  const { error } = await admin.from("waitlist").delete().eq("email", parsed.data.email)
  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 })

  return NextResponse.json({ ok: true })
}
