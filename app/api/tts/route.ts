import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import {
  getTtsProvider,
  isVoiceProviderReady,
  type VoiceProviderId,
} from "@/lib/voice"
import { getVoiceMode, normaliseProvider } from "@/lib/voice-mode"
import { getSessionUser } from "@/lib/auth/session"
import { DEV_BYPASS_AUTH } from "@/lib/dev-user"

// POST /api/tts
//   JSON body: { text: string, provider?: "azure"|"elevenlabs", voice?: string }
//   Returns  : audio bytes. Latency reported in `x-voice-ms` header so the
//              admin tester can show it alongside the <audio> element.
//
// Requires an authenticated session (parent or admin) or DEV_BYPASS_AUTH.

const bodySchema = z.object({
  text: z.string().min(1).max(2000),
  provider: z.enum(["azure", "elevenlabs"]).optional(),
  voice: z.string().min(1).max(100).optional(),
})

export async function POST(request: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 })
  }

  const mode = await getVoiceMode()
  const override =
    normaliseProvider(parsed.data.provider) ??
    normaliseProvider(request.nextUrl.searchParams.get("provider") ?? undefined)
  const providerId: VoiceProviderId = override ?? mode.tts

  if (!isVoiceProviderReady(providerId)) {
    return NextResponse.json(
      { error: "provider_not_configured", provider: providerId },
      { status: 400 }
    )
  }

  const voice =
    parsed.data.voice ??
    (providerId === "elevenlabs" ? mode.elevenLabsVoiceId : mode.azureVoice)

  if (!voice) {
    return NextResponse.json(
      { error: "voice_not_set", provider: providerId },
      { status: 400 }
    )
  }

  try {
    const result = await getTtsProvider(providerId).synthesize({
      text: parsed.data.text,
      voice,
    })
    return new NextResponse(result.audio, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "no-store",
        "x-voice-provider": result.provider,
        "x-voice-ms": String(result.ms),
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: "tts_failed", provider: providerId, detail: msg },
      { status: 502 }
    )
  }
}

async function isAuthed(): Promise<boolean> {
  if (DEV_BYPASS_AUTH) return true
  const user = await getSessionUser()
  return !!user
}
