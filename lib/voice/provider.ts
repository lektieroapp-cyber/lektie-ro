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

/**
 * Quote-language mode for TTS synthesis on engelsk tasks.
 *
 * - "danish-base" (default) — Danish narration with English-quoted spans
 *   wrapped in `<lang xml:lang="en-US">` so target words get English
 *   pronunciation. Used for Dani's normal Danish-led engelsk tutoring.
 * - "english-base" — English narration with Danish-quoted spans wrapped
 *   in `<lang xml:lang="da-DK">` so Danish scaffolding words ("kop",
 *   "tillægsord") get Danish pronunciation. Used when the parent set
 *   english_tutoring_language to "english".
 */
export type TtsQuoteMode = "danish-base" | "english-base"

export type TtsProvider = {
  id: VoiceProviderId
  synthesize(args: { text: string; voice: string; quoteMode?: TtsQuoteMode }): Promise<TtsResult>
  listVoices(): VoiceInfo[]
}
