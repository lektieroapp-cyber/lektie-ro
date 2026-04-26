import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { DEV_BYPASS_AUTH, DEV_PROFILE } from "@/lib/dev-user"

// Admin-only runtime probe for env-var presence. Lets us verify that the
// running serverless function actually has the vars Vercel claims are set —
// independent of any page render cache or admin-panel UI logic.
//
// Returns booleans only (never the actual values) so a leaked admin token
// can't exfiltrate secrets. The build-time NEXT_PUBLIC_* check answers
// whether the var was present when the bundle was compiled, separately
// from runtime presence.
export async function GET() {
  let allowed = false
  if (DEV_BYPASS_AUTH) {
    allowed = DEV_PROFILE.role === "admin"
  } else {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
    allowed = profile?.role === "admin"
  }
  if (!allowed) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const azureRegion = process.env.AZURE_SPEECH_REGION ?? null
  return NextResponse.json({
    runtime: {
      AZURE_SPEECH_KEY: !!process.env.AZURE_SPEECH_KEY,
      AZURE_SPEECH_KEY_length: process.env.AZURE_SPEECH_KEY?.length ?? 0,
      AZURE_SPEECH_REGION: !!azureRegion,
      AZURE_SPEECH_REGION_value: azureRegion,
      AZURE_SPEECH_TTS_VOICE: process.env.AZURE_SPEECH_TTS_VOICE ?? null,
      NEXT_PUBLIC_VOICE_ENABLED_runtime: process.env.NEXT_PUBLIC_VOICE_ENABLED ?? null,
      AI_MODE: process.env.AI_MODE ?? null,
      AZURE_OPENAI_KEY: !!process.env.AZURE_OPENAI_KEY,
      AZURE_OPENAI_DEPLOYMENT: process.env.AZURE_OPENAI_DEPLOYMENT ?? null,
    },
    buildTime: {
      NEXT_PUBLIC_VOICE_ENABLED: process.env.NEXT_PUBLIC_VOICE_ENABLED === "true",
    },
    vercel: {
      env: process.env.VERCEL_ENV ?? null,
      gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      deployedAt: process.env.VERCEL_DEPLOYMENT_ID ?? null,
    },
  })
}
