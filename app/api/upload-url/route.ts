import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { DEV_BYPASS_AUTH, DEV_USER } from "@/lib/dev-user"

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "homework-photos"
const MAX_BYTES = 10 * 1024 * 1024

const schema = z.object({
  contentType: z.string().regex(/^image\/(jpeg|png|webp|heic|heif)$/),
  size: z.number().int().positive().max(MAX_BYTES),
  ext: z.string().regex(/^[a-z0-9]{2,5}$/),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 })
  }

  let userId: string
  if (DEV_BYPASS_AUTH) {
    userId = DEV_USER.id
  } else {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    userId = user.id
  }

  const path = `${userId}/${Date.now()}.${parsed.data.ext}`
  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(path)

  if (error || !data) {
    console.error("[upload-url] failed:", error?.message)
    return NextResponse.json({ error: "storage_error" }, { status: 500 })
  }

  return NextResponse.json({
    uploadUrl: data.signedUrl,
    token: data.token,
    path,
  })
}
