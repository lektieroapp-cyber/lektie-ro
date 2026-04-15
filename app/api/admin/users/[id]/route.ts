import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { DEV_BYPASS_AUTH, DEV_PROFILE } from "@/lib/dev-user"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

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
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) {
    console.error("[admin/users delete] failed:", error.message)
    return NextResponse.json({ error: "delete_failed" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
