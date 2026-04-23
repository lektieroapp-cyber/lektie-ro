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
//           ?locale=en-US,da-DK            (multi — runs both in parallel,
//                                           picks the higher-confidence
//                                           result; used for engelsk/tysk
//                                           tasks where the kid frequently
//                                           switches between target language
//                                           and Danish meta-communication)
//   Returns: { text, ms, provider, locale? }
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

  // Comma-separated list → run in parallel, pick highest-confidence winner.
  // Single locale → existing behaviour. First locale in the list is the
  // "primary" fallback when every candidate came back empty/low-conf.
  const rawLocale = request.nextUrl.searchParams.get("locale") || STT_LOCALE_DANISH
  const locales = rawLocale
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
  const primary = locales[0] ?? STT_LOCALE_DANISH

  try {
    if (locales.length <= 1) {
      const result = await getSttProvider(providerId).transcribe({
        audio,
        contentType,
        locale: primary,
      })
      return NextResponse.json({ ...result, locale: primary })
    }

    // Parallel multi-locale. Azure short-form REST can't auto-detect, so we
    // fan out, score by NBest[0].confidence, and return the winner. Costs 2x
    // STT but fixes the bug where a kid speaking Danish during an engelsk
    // task gets transcribed as English gibberish ("A really familiar
    // procedure is Jessica." from Danish audio).
    const provider = getSttProvider(providerId)
    const buf = audio.slice(0) // ensure one clean copy per parallel request
    const results = await Promise.allSettled(
      locales.map(locale =>
        provider
          .transcribe({ audio: buf.slice(0), contentType, locale })
          .then(r => ({ ...r, locale }))
      )
    )

    const candidates = results
      .flatMap(r => (r.status === "fulfilled" ? [r.value] : []))
      .filter(r => r.text.trim().length > 0)

    if (candidates.length === 0) {
      // Every candidate came back empty. Fall back to the primary result
      // (or first error) so the client gets a consistent shape.
      const firstOk = results.find(r => r.status === "fulfilled")
      if (firstOk && firstOk.status === "fulfilled") {
        return NextResponse.json({ ...firstOk.value, locale: firstOk.value.locale })
      }
      const firstErr = results.find(r => r.status === "rejected")
      throw firstErr && firstErr.status === "rejected"
        ? firstErr.reason
        : new Error("all_candidates_empty")
    }

    // Pick highest confidence. alternatives[0]?.confidence is the top
    // NBest entry's confidence from Azure; missing → 0.
    const best = candidates.reduce((a, b) => {
      const ac = a.alternatives?.[0]?.confidence ?? 0
      const bc = b.alternatives?.[0]?.confidence ?? 0
      return bc > ac ? b : a
    })

    return NextResponse.json(best)
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
