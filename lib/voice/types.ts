// Shared voice types. Kept separate from provider.ts so client components
// can import the string-literal types without pulling in the server-only
// fetch logic.

export type VoiceProviderId = "azure" | "elevenlabs"

export const STT_LOCALE_DANISH = "da-DK"

// Azure Danish Neural TTS voices — no kid-warmth-tuned variant exists as of
// April 2026. Christel is usually the warmer default; Jeppe is male.
export const AZURE_VOICES = [
  { id: "da-DK-ChristelNeural", label: "Christel (kvinde)", gender: "female" as const },
  { id: "da-DK-JeppeNeural", label: "Jeppe (mand)", gender: "male" as const },
]

export type SttResult = {
  text: string
  ms: number
  provider: VoiceProviderId
  /** Azure's RecognitionStatus verbatim — "Success", "NoMatch",
   *  "InitialSilenceTimeout", etc. Optional; only set by Azure provider. */
  status?: string
  /** Top-N candidate transcripts when the provider returns alternatives.
   *  Lets the admin tester diagnose cases where Azure "heard" several
   *  things but picked the shortest. */
  alternatives?: Array<{ text: string; confidence?: number }>
}

export type TtsResult = {
  audio: ArrayBuffer
  contentType: string
  ms: number
  provider: VoiceProviderId
}

export type VoiceInfo = {
  id: string
  label: string
  gender: "female" | "male"
}
