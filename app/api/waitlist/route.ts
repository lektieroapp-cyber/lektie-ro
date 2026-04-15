import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { addToAudience, sendTransactional } from "@/lib/email"
import { getTemplateById } from "@/lib/email/templates"
import { locales } from "@/lib/i18n/config"

const schema = z.object({
  email: z.string().email().max(320),
  locale: z.enum(locales as unknown as [string, ...string[]]).default("da"),
  source: z.string().max(80).optional(),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 })
  }

  const { email, locale, source } = parsed.data
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("waitlist")
    .insert({ email: email.toLowerCase(), locale, source: source ?? null })

  if (error && error.code === "23505") {
    return NextResponse.json({ alreadyJoined: true }, { status: 200 })
  }

  if (error) {
    console.error("[waitlist] insert failed:", error.code, error.message, error.details)
    return NextResponse.json({ error: "db_error" }, { status: 500 })
  }

  await addToAudience(email, { locale })

  const tpl = getTemplateById("lektiero-waitlist")
  if (tpl?.preview) {
    await sendTransactional(email, tpl.subject, tpl.preview())
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
