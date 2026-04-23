import type { SttResult, TtsResult, VoiceInfo, VoiceProviderId } from "./types"

// Provider shape. Both Azure and ElevenLabs implementations return the same
// objects so /api/stt and /api/tts stay provider-agnostic.

export type SttProvider = {
  id: VoiceProviderId
  transcribe(args: {
    audio: ArrayBuffer
    contentType: string
    locale: string
  }): Promise<SttResult>
}

export type TtsProvider = {
  id: VoiceProviderId
  synthesize(args: { text: string; voice: string }): Promise<TtsResult>
  listVoices(): VoiceInfo[]
}
