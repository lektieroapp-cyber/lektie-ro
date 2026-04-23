import { NextResponse, type NextRequest } from "next/server"
import {
  getSttProvider,
  isVoiceProviderReady,
  STT_LOCALE_DANISH,
  type VoiceProviderId,
} from "@/lib/voice"
import { getVoiceMode, normaliseProvider } from "@/lib/voice-mode"
import { getSessionUser } from "@/lib/auth/session"
import { DEV_BYPASS_AUTH } from "@/lib/dev-user"

// POST /api/stt
//   Body   : raw audio bytes (Content-Type describes the codec)
//   Query  : ?provider=azure|elevenlabs   (overrides cookie/env for A/B)
//           ?locale=da-DK                  (default da-DK)
//   Returns: { text, ms, provider }
//
// Requires an authenticated session (parent or admin) or DEV_BYPASS_AUTH.
// Audio blobs are not persisted — transcript is returned and forgotten.

const MAX_AUDIO_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(request: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const mode = await getVoiceMode()
  const override = normaliseProvider(
    request.nextUrl.searchParams.get("provider") ?? undefined
  )
  const providerId: VoiceProviderId = override ?? mode.stt

  if (!isVoiceProviderReady(providerId)) {
    return NextResponse.json(
      { error: "provider_not_configured", provider: providerId },
      { status: 400 }
    )
  }

  const contentType =
    request.headers.get("content-type") || "audio/webm; codecs=opus"
  const audio = await request.arrayBuffer()
  if (audio.byteLength === 0) {
    return NextResponse.json({ error: "empty_audio" }, { status: 400 })
  }
  if (audio.byteLength > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "audio_too_large" }, { status: 413 })
  }

  const locale = request.nextUrl.searchParams.get("locale") || STT_LOCALE_DANISH

  try {
    const result = await getSttProvider(providerId).transcribe({
      audio,
      contentType,
      locale,
    })
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: "stt_failed", provider: providerId, detail: msg },
      { status: 502 }
    )
  }
}

async function isAuthed(): Promise<boolean> {
  if (DEV_BYPASS_AUTH) return true
  const user = await getSessionUser()
  return !!user
}
