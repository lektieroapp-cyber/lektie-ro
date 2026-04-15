import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { DEV_BYPASS_AUTH, DEV_PROFILE } from "@/lib/dev-user"

async function getAdminStatus(): Promise<boolean> {
  if (DEV_BYPASS_AUTH) return DEV_PROFILE.role === "admin"
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  return profile?.role === "admin"
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!(await getAdminStatus())) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const body = await request.json()
  const role = body?.role
  if (role !== "parent" && role !== "admin") {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from("profiles").update({ role }).eq("id", id)
  if (error) {
    console.error("[admin/users patch] failed:", error.message)
    return NextResponse.json({ error: "update_failed" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!(await getAdminStatus())) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) {
    console.error("[admin/users delete] failed:", error.message)
    return NextResponse.json({ error: "delete_failed" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
