import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import {
  VOICE_AZURE_VOICE_COOKIE,
  VOICE_EL_VOICE_COOKIE,
  VOICE_STT_COOKIE,
  VOICE_TTS_COOKIE,
  getVoiceDiagnostics,
  getVoiceMode,
} from "@/lib/voice-mode"
import { getSessionUser } from "@/lib/auth/session"
import { DEV_BYPASS_AUTH } from "@/lib/dev-user"

const patchSchema = z
  .object({
    stt: z.enum(["azure", "elevenlabs"]).optional(),
    tts: z.enum(["azure", "elevenlabs"]).optional(),
    azureVoice: z.string().min(1).max(100).optional(),
    elevenLabsVoiceId: z.string().min(1).max(100).optional(),
  })
  .refine(v => Object.keys(v).length > 0, {
    message: "Tom body — mindst ét felt skal være sat.",
  })

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  const mode = await getVoiceMode()
  const diagnostics = getVoiceDiagnostics(mode)
  return NextResponse.json({ mode, diagnostics })
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 })
  }

  // Set cookies on the response so any new request (including navigation)
  // reads the override immediately.
  const res = NextResponse.json({ ok: true })
  const opts = {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: "lax" as const,
  }
  if (parsed.data.stt) res.cookies.set(VOICE_STT_COOKIE, parsed.data.stt, opts)
  if (parsed.data.tts) res.cookies.set(VOICE_TTS_COOKIE, parsed.data.tts, opts)
  if (parsed.data.azureVoice)
    res.cookies.set(VOICE_AZURE_VOICE_COOKIE, parsed.data.azureVoice, opts)
  if (parsed.data.elevenLabsVoiceId)
    res.cookies.set(VOICE_EL_VOICE_COOKIE, parsed.data.elevenLabsVoiceId, opts)
  return res
}

async function isAdmin(): Promise<boolean> {
  if (DEV_BYPASS_AUTH) return true
  const user = await getSessionUser()
  return user?.role === "admin"
}
