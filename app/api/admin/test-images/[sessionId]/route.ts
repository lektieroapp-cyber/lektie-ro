import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { DEV_BYPASS_AUTH, DEV_PROFILE } from "@/lib/dev-user"

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "homework-photos"

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

// DELETE /api/admin/test-images/[sessionId]
//
// Removes a session + its connected turns (via ON DELETE CASCADE from the
// 006 migration) and best-effort deletes the associated storage object so
// nothing lingers in the `homework-photos` bucket.
//
// Admin-only. Used from the /admin/test-images admin surface to clean up
// testing noise before a demo.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  if (!(await getAdminStatus())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const admin = createAdminClient()

  // Look up the image path first — we need it to clean the bucket, and the
  // sessions row is gone after the delete cascade.
  const { data: session, error: readErr } = await admin
    .from("sessions")
    .select("image_path")
    .eq("id", sessionId)
    .maybeSingle()
  if (readErr) {
    console.error("[admin/test-images delete] read failed:", readErr.message)
    return NextResponse.json({ error: "read_failed" }, { status: 500 })
  }
  if (!session) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  // Storage delete is best-effort and ONLY runs if no other session shares
  // this image_path — the "Brug dette →" shortcut creates new sessions
  // against existing images, so multiple rows can reference the same blob.
  // Removing the storage object on the first delete would silently orphan
  // the others (they'd show as "Udløbet" even though they're fresh).
  if (session.image_path) {
    const { count: refCount } = await admin
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("image_path", session.image_path)
      .neq("id", sessionId)

    if ((refCount ?? 0) === 0) {
      const { error: storageErr } = await admin.storage
        .from(BUCKET)
        .remove([session.image_path])
      if (storageErr) {
        console.warn(
          "[admin/test-images delete] storage remove warned:",
          storageErr.message
        )
      }
    } else {
      console.info(
        `[admin/test-images delete] keeping ${session.image_path} — still referenced by ${refCount} other session(s)`
      )
    }
  }

  const { error: delErr } = await admin.from("sessions").delete().eq("id", sessionId)
  if (delErr) {
    console.error("[admin/test-images delete] sessions delete failed:", delErr.message)
    return NextResponse.json({ error: "delete_failed" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
