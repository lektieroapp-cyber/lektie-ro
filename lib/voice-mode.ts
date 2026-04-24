import { cookies } from "next/headers"
import {
  isAzureSpeechConfigured,
  isElevenLabsConfigured,
  isVoiceProviderReady,
  type VoiceProviderId,
} from "./voice"

// Voice mode = which provider handles STT, which handles TTS, and which voice
// each provider speaks with. Kept separate from AI_MODE (that toggles mock vs
// live LLM) because they change independently.
//
// Precedence per field (first match wins):
//   1. Per-browser cookie override (set by admin page).
//   2. Server env var default.
//   3. Hardcoded fallback ("azure", Christel).

export const VOICE_STT_COOKIE = "lr_voice_stt"
export const VOICE_TTS_COOKIE = "lr_voice_tts"
export const VOICE_AZURE_VOICE_COOKIE = "lr_voice_az_voice"
export const VOICE_EL_VOICE_COOKIE = "lr_voice_el_voice"

export type VoiceMode = {
  stt: VoiceProviderId
  tts: VoiceProviderId
  azureVoice: string
  elevenLabsVoiceId: string
}

// Jeppe (male) is the prod Danish voice — A/B testing confirmed he sounds
// noticeably warmer and more natural than Christel for kid-facing dialogue.
// Override per-environment via AZURE_SPEECH_TTS_VOICE.
const DEFAULT_AZURE_VOICE = "da-DK-JeppeNeural"

export async function getVoiceMode(): Promise<VoiceMode> {
  const cookieStore = await cookies()

  const stt = resolveProvider(
    cookieStore.get(VOICE_STT_COOKIE)?.value,
    process.env.VOICE_STT_PROVIDER
  )
  const tts = resolveProvider(
    cookieStore.get(VOICE_TTS_COOKIE)?.value,
    process.env.VOICE_TTS_PROVIDER
  )
  const azureVoice =
    cookieStore.get(VOICE_AZURE_VOICE_COOKIE)?.value ||
    process.env.AZURE_SPEECH_TTS_VOICE ||
    DEFAULT_AZURE_VOICE
  const elevenLabsVoiceId =
    cookieStore.get(VOICE_EL_VOICE_COOKIE)?.value ||
    process.env.ELEVENLABS_DEFAULT_VOICE_ID ||
    ""

  return { stt, tts, azureVoice, elevenLabsVoiceId }
}

export type VoiceModeDiagnostics = {
  azureConfigured: boolean
  elevenLabsConfigured: boolean
  envStt: string | null
  envTts: string | null
  envAzureVoice: string | null
  envElevenVoice: string | null
  voiceEnabledFlag: boolean
  sttReady: boolean
  ttsReady: boolean
}

export function getVoiceDiagnostics(mode: VoiceMode): VoiceModeDiagnostics {
  return {
    azureConfigured: isAzureSpeechConfigured(),
    elevenLabsConfigured: isElevenLabsConfigured(),
    envStt: process.env.VOICE_STT_PROVIDER ?? null,
    envTts: process.env.VOICE_TTS_PROVIDER ?? null,
    envAzureVoice: process.env.AZURE_SPEECH_TTS_VOICE ?? null,
    envElevenVoice: process.env.ELEVENLABS_DEFAULT_VOICE_ID ?? null,
    voiceEnabledFlag: process.env.NEXT_PUBLIC_VOICE_ENABLED === "true",
    sttReady: isVoiceProviderReady(mode.stt),
    ttsReady: isVoiceProviderReady(mode.tts),
  }
}

function resolveProvider(
  cookieValue: string | undefined,
  envValue: string | undefined
): VoiceProviderId {
  const cookieId = normaliseProvider(cookieValue)
  if (cookieId) return cookieId
  const envId = normaliseProvider(envValue)
  if (envId) return envId
  return "azure"
}

export function normaliseProvider(v: string | undefined): VoiceProviderId | null {
  if (v === "azure" || v === "elevenlabs") return v
  return null
}
