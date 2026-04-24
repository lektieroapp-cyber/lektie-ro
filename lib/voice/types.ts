// Shared voice types. Kept separate from provider.ts so client components
// can import the string-literal types without pulling in the server-only
// fetch logic.

export type VoiceProviderId = "azure" | "elevenlabs"

export const STT_LOCALE_DANISH = "da-DK"

// Voice override for the engelsk subject — uses the HYBRID format
// "<da-voice>+<en-voice>" understood by lib/voice/azure.ts. Danish narration
// is rendered with Jeppe (native, warm) and quoted English spans break out
// to Andrew (multilingual, correct English pronunciation). Two speakers in
// one sentence, but native quality on both halves — A/B confirmed this
// sounds better than any single multilingual voice we tested.
export const ENGELSK_AZURE_VOICE = "da-DK-JeppeNeural+en-US-AndrewMultilingualNeural"

// Azure Neural TTS voices we actually use in production.
//
// - Christel/Jeppe: native da-DK, used for matematik/dansk/tysk. Warm Danish
//   but ignores <lang> SSML switches — English quotes get Danish phonetics.
// - Andrew Multilingual: used for engelsk only (see ENGELSK_AZURE_VOICE).
//   Properly pronounces quoted English words; carries an English accent on
//   Danish narration. Tested alternatives (Jenny/Ryan auto-detect, Dragon HD,
//   German multilinguals) — none did Danish meaningfully better, so we
//   accepted Andrew's accent on the engelsk subject.
//
// Other voices removed from the admin picker after A/B testing — re-add
// from git history if a new test is warranted.
export const AZURE_VOICES = [
  { id: "da-DK-JeppeNeural", label: "Jeppe (DA, prod default)", gender: "male" as const },
  { id: "da-DK-ChristelNeural", label: "Christel (DA, alternativ)", gender: "female" as const },
  { id: "en-US-AndrewMultilingualNeural", label: "Andrew (EN multilingual — bruges til engelsk)", gender: "male" as const },
  // Hybrid voice IDs use "<da-voice>+<en-voice>" — TTS renders Danish narration
  // with the first voice and quoted English spans with the second.
  // Two speakers in one sentence; native pronunciation on both sides.
  { id: "da-DK-JeppeNeural+en-US-AndrewMultilingualNeural", label: "HYBRID: Jeppe (DA) + Andrew swap til engelske citater", gender: "male" as const },
  { id: "da-DK-ChristelNeural+en-US-AvaMultilingualNeural", label: "HYBRID: Christel (DA) + Ava swap til engelske citater", gender: "female" as const },
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
