// Shared voice types. Kept separate from provider.ts so client components
// can import the string-literal types without pulling in the server-only
// fetch logic.

export type VoiceProviderId = "azure" | "elevenlabs"

export const STT_LOCALE_DANISH = "da-DK"

// Voice override for the engelsk subject. Christel can't switch into English
// pronunciation inside a Danish sentence (standard neural voices ignore the
// SSML <lang> wrap), so for English homework the AI's voice swaps to a
// multilingual neural voice that handles BOTH Danish narration AND properly
// pronounces the quoted English words. Yes, the Danish narration sounds a
// little accented — but the kid is studying English; correct target-language
// pronunciation is what they need to hear.
export const ENGELSK_AZURE_VOICE = "en-US-AndrewMultilingualNeural"

// Azure Danish Neural TTS voices.
// - Christel/Jeppe are STANDARD da-DK voices: warmest Danish output but they
//   IGNORE <lang xml:lang="en-US"> switches inside SSML — quoted English words
//   get read with Danish phonetics regardless ("dark" → "dark" the Danish way).
// - The Multilingual voices (Microsoft's 2024 release) speak fluent Danish AND
//   honour <lang> switches properly. Use one of these if English-pronunciation
//   correctness matters more than the warmth of Christel. They're available in
//   Sweden Central and priced identically to the standard voices.
export const AZURE_VOICES = [
  { id: "da-DK-ChristelNeural", label: "Christel (kvinde, kun dansk)", gender: "female" as const },
  { id: "da-DK-JeppeNeural", label: "Jeppe (mand, kun dansk)", gender: "male" as const },
  { id: "en-US-AvaMultilingualNeural", label: "Ava (kvinde, multilingual — taler dansk + engelsk)", gender: "female" as const },
  { id: "en-US-AndrewMultilingualNeural", label: "Andrew (mand, multilingual — taler dansk + engelsk)", gender: "male" as const },
  { id: "en-US-EmmaMultilingualNeural", label: "Emma (kvinde, multilingual — taler dansk + engelsk)", gender: "female" as const },
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
