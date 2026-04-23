import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { DEV_BYPASS_AUTH, DEV_PROFILE } from "@/lib/dev-user"

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "homework-photos"
const TTL_SECONDS = 60 * 30 // 30 min — enough for a long homework session

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

// GET /api/admin/image-url?path=<storage-path>
//
// Returns a short-lived signed URL for a homework photo. Used by the
// SessionFlow dev preview panel when admins re-run a test image from
// /admin/test-images — they don't have a blob URL from a fresh upload
// in that flow, so we give them a signed URL to the bucket object.
//
// Admin-only. The bucket is private, so this is the only path to a
// renderable URL without piping bytes through a proxy.
export async function GET(request: NextRequest) {
  if (!(await getAdminStatus())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const path = request.nextUrl.searchParams.get("path")
  if (!path) {
    return NextResponse.json({ error: "missing_path" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, TTL_SECONDS)
  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: "sign_failed", detail: error?.message ?? "no url" },
      { status: 500 }
    )
  }

  return NextResponse.json({ url: data.signedUrl })
}
