import { azureStt, azureTts } from "./azure"
import { elevenStt, elevenTts } from "./elevenlabs"
import type { SttProvider, TtsProvider } from "./provider"
import type { VoiceProviderId } from "./types"

export { AZURE_VOICES, ENGELSK_AZURE_VOICE, STT_LOCALE_DANISH } from "./types"
export type {
  SttResult,
  TtsResult,
  VoiceInfo,
  VoiceProviderId,
} from "./types"
export type { SttProvider, TtsProvider } from "./provider"

export function getSttProvider(id: VoiceProviderId): SttProvider {
  if (id === "elevenlabs") return elevenStt
  return azureStt
}

export function getTtsProvider(id: VoiceProviderId): TtsProvider {
  if (id === "elevenlabs") return elevenTts
  return azureTts
}

export function isAzureSpeechConfigured(): boolean {
  return !!(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION)
}

export function isElevenLabsConfigured(): boolean {
  return !!process.env.ELEVENLABS_API_KEY
}

export function isVoiceProviderReady(id: VoiceProviderId): boolean {
  return id === "elevenlabs" ? isElevenLabsConfigured() : isAzureSpeechConfigured()
}
