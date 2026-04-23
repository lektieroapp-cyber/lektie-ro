// Azure OpenAI pay-as-you-go rates (USD per 1M tokens, Sweden Central).
// Update when Azure publishes new prices — one place, everything recalculates.
// Source: https://azure.microsoft.com/en-us/pricing/details/azure-openai/

export type ModelId = "gpt-5" | "gpt-5-mini" | "gpt-5-nano" | "gpt-5-chat"

export type ModelSpec = {
  id: ModelId
  label: string
  inputPerMTok: number
  outputPerMTok: number
  note: string
  canVision: boolean
}

export const MODELS: Record<ModelId, ModelSpec> = {
  "gpt-5-nano": {
    id: "gpt-5-nano",
    label: "gpt-5-nano",
    inputPerMTok: 0.05,
    outputPerMTok: 0.4,
    note: "Billigst. For svag til Socratic dialog — lækker ofte facit.",
    canVision: true,
  },
  "gpt-5-mini": {
    id: "gpt-5-mini",
    label: "gpt-5-mini",
    inputPerMTok: 0.25,
    outputPerMTok: 2,
    note: "Anbefalet. God instruktionsfølgning, vision, streaming, lav pris.",
    canVision: true,
  },
  "gpt-5-chat": {
    id: "gpt-5-chat",
    label: "gpt-5-chat",
    inputPerMTok: 1.25,
    outputPerMTok: 10,
    note: "Optimeret til chat-UX uden reasoning-overhead. ~5× dyrere.",
    canVision: false,
  },
  "gpt-5": {
    id: "gpt-5",
    label: "gpt-5",
    inputPerMTok: 1.25,
    outputPerMTok: 10,
    note: "Fuld reasoning. Kun værd at eskalere til for hårde STEM-opgaver.",
    canVision: true,
  },
}

// USD → DKK. Treat as a slow-moving constant — overkill to fetch live FX.
export const USD_TO_DKK = 7.0

// Per-call token assumptions for LektieRo's two stages.
// Re-tuned 2026-04-20 to match the actual prompts we ship now:
//   - Subject-filtered block catalog (saves ~400 tokens per hint vs all-subjects)
//   - reasoning_effort: minimal (minor reasoning overhead, folded into output)
//   - Hard 70-word output cap on hints
//   - Validation rules + new examples added to BASE_RULES
//
// Updated as we observe real session data. Sources: dev log `firstTokenMs`,
// `totalMs`, `chars`, `words` + Azure billing dashboard.
export const TOKEN_ASSUMPTIONS = {
  // Stage 1: photo → JSON extraction with groups/goal/steps. Runs ONCE per
  // session (or per task group with the new multi-group extraction).
  // ~3500 image tokens (high detail, typical 1024px homework photo — base
  // 170 + 765 × ~4 tiles) + ~600 vision prompt + ~30 user msg.
  visionInputTokens: 4000,
  // JSON with 3-6 task groups × {text, goal, steps[…]} + confidence +
  // detection notes. Structured output is meatier than flat tasks list.
  visionOutputTokens: 600,

  // Stage 2: Socratic hint, per turn.
  // System (BASE + filtered blocks + curriculum + child profile + goal
  // block + voice rules) is ~2000 tokens alone. Add the task prefix (~30)
  // and rolling turn history that grows ~80 tok/turn.
  //
  // For a 1-turn session this is ~2100. For a 40-turn session the final
  // turn sees ~5200 tokens. Average across a realistic multi-session hour:
  // ~3500.
  hintInputTokensPerTurn: 3500,
  // Voice cap (25 words) = ~40 tokens. Text cap (70 words) = ~100 tokens.
  // Plus ~40 reasoning tokens. Weighted toward voice since that's the
  // target rollout; underestimates text slightly but matches real billing.
  hintOutputTokensPerTurn: 100,
} as const

/** Single-session cost given assumptions above and the chosen model. */
export function costPerSessionUsd(turnsPerSession: number, modelId: ModelId): number {
  const m = MODELS[modelId]
  const a = TOKEN_ASSUMPTIONS
  const vision =
    (a.visionInputTokens * m.inputPerMTok + a.visionOutputTokens * m.outputPerMTok) /
    1_000_000
  const hint =
    turnsPerSession *
    (a.hintInputTokensPerTurn * m.inputPerMTok +
      a.hintOutputTokensPerTurn * m.outputPerMTok) /
    1_000_000
  return vision + hint
}

/**
 * Estimate the running cost for a user given their session + turn counts.
 * Uses gpt-5-mini pricing by default (our prod model).
 */
export function estimateUserCostDkk(
  sessionCount: number,
  totalTurns: number,
  modelId: ModelId = "gpt-5-mini",
): { usd: number; dkk: number } {
  if (sessionCount === 0) return { usd: 0, dkk: 0 }
  const avgTurns = totalTurns > 0 ? totalTurns / sessionCount : 4
  const usd = sessionCount * costPerSessionUsd(avgTurns, modelId)
  return { usd, dkk: usd * USD_TO_DKK }
}

// Voice (STT + TTS) rate cards.
// IDs match lib/voice/types.ts — only providers we actually ship.

export type VoiceProviderId = "off" | "azure" | "elevenlabs"

export type VoiceProviderSpec = {
  id: VoiceProviderId
  label: string
  note: string
  sttPerMinUsd: number
  ttsPerKCharUsd: number
}

export const VOICE_PROVIDERS: Record<VoiceProviderId, VoiceProviderSpec> = {
  off: {
    id: "off",
    label: "Voice slået fra",
    note: "Tekst-only. Ingen voice-omkostning.",
    sttPerMinUsd: 0,
    ttsPerKCharUsd: 0,
  },
  azure: {
    id: "azure",
    label: "Azure Speech (STT + Neural TTS)",
    note: "Default. GDPR. Samme tenant som LLM. Stemme OK, ikke varm.",
    sttPerMinUsd: 0.0167,
    ttsPerKCharUsd: 0.016,
  },
  elevenlabs: {
    id: "elevenlabs",
    label: "ElevenLabs (Scribe STT + Flash v2.5 TTS)",
    note: "Premium varm dansk stemme. Kræver Enterprise DPA til børnelyd.",
    sttPerMinUsd: 0.00667,
    ttsPerKCharUsd: 0.15,
  },
}

// Per-vendor unit rates for the admin Stemme page A/B matrix.
// The bundled + recommended scenarios above are composites of these; the
// Stemme page wants the raw vendor math so admins can see what switching
// just the STT or just the TTS half costs.
// Source: docs/voice-pricing-estimates.md § vendor rate cards.
export const VOICE_UNIT_RATES = {
  azure: {
    label: "Azure AI Speech",
    sttPerMinUsd: 0.0167,
    ttsPerKCharUsd: 0.016,
    note: "Sweden Central. Samme tenant som OpenAI.",
  },
  elevenlabs: {
    label: "ElevenLabs",
    // Scribe v2: ~$0.40/hr ≈ $0.00667/min.
    sttPerMinUsd: 0.00667,
    // Flash v2.5: ~$0.15 / 1k chars mid-tier.
    ttsPerKCharUsd: 0.15,
    note: "Scribe STT + Flash v2.5 TTS. Kræver Enterprise DPA til børnelyd.",
  },
} as const

export type VoiceVendorId = keyof typeof VOICE_UNIT_RATES

// Per-turn voice assumptions. Revisit once real session data lands (post-prod).
export const VOICE_ASSUMPTIONS = {
  // Child speech per turn, in seconds. "Jeg tror det er 7" + filler + think-aloud.
  sttSecondsPerTurn: 25,
  // AI Socratic reply per turn, in characters. Voice-mode prompt caps at 25
  // talte ord (lib/prompts.ts) ≈ 180 chars including spaces.
  ttsCharsPerTurn: 180,
} as const

export function computeVoiceCost(
  providerId: VoiceProviderId,
  turns: number,
): { usd: number } {
  if (providerId === "off") return { usd: 0 }
  const p = VOICE_PROVIDERS[providerId]
  const sttMinutes = (turns * VOICE_ASSUMPTIONS.sttSecondsPerTurn) / 60
  const ttsKChars = (turns * VOICE_ASSUMPTIONS.ttsCharsPerTurn) / 1000
  return { usd: sttMinutes * p.sttPerMinUsd + ttsKChars * p.ttsPerKCharUsd }
}

export type HourlyUsageInputs = {
  tasksPerHour: number
  turnsPerTask: number
  visionModel: ModelId
  hintModel: ModelId
  voiceProvider: VoiceProviderId
}

export type HourlyCost = {
  visionUsd: number
  hintUsd: number
  voiceUsd: number
  perHourUsd: number
  perHourDkk: number
  perTaskUsd: number
  perTaskDkk: number
}

export function computeHourlyCost(u: HourlyUsageInputs): HourlyCost {
  const vision = MODELS[u.visionModel]
  const hint = MODELS[u.hintModel]
  const a = TOKEN_ASSUMPTIONS

  const totalTurns = u.tasksPerHour * u.turnsPerTask

  const visionUsd =
    u.tasksPerHour *
    ((a.visionInputTokens * vision.inputPerMTok +
      a.visionOutputTokens * vision.outputPerMTok) /
      1_000_000)

  const hintUsd =
    totalTurns *
    ((a.hintInputTokensPerTurn * hint.inputPerMTok +
      a.hintOutputTokensPerTurn * hint.outputPerMTok) /
      1_000_000)

  const voiceUsd = computeVoiceCost(u.voiceProvider, totalTurns).usd

  const perHourUsd = visionUsd + hintUsd + voiceUsd
  const perTaskUsd = u.tasksPerHour > 0 ? perHourUsd / u.tasksPerHour : 0

  return {
    visionUsd,
    hintUsd,
    voiceUsd,
    perHourUsd,
    perHourDkk: perHourUsd * USD_TO_DKK,
    perTaskUsd,
    perTaskDkk: perTaskUsd * USD_TO_DKK,
  }
}
