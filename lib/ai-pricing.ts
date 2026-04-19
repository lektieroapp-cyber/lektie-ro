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
  // Stage 1: photo → JSON extraction. Runs ONCE per session.
  // ~1500 image tokens (high detail) + ~400 vision prompt + ~30 user msg.
  visionInputTokens: 2500,
  // JSON with 3-8 tasks + confidence + detection notes. Plus ~100 reasoning.
  visionOutputTokens: 400,

  // Stage 2: Socratic hint, per turn.
  // ~1600 system (BASE + filtered blocks + curriculum + child) + ~30 task
  // prefix + growing turn history (~50 tok/prior pair).
  // Averaged across a 4-turn session.
  hintInputTokensPerTurn: 2000,
  // ~70-word cap = ~100 tokens output + ~50 minimal reasoning tokens.
  hintOutputTokensPerTurn: 150,
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

export type UsageInputs = {
  sessionsPerWeek: number
  turnsPerSession: number
  visionModel: ModelId
  hintModel: ModelId
}

export type CostBreakdown = {
  visionUsd: number
  hintUsd: number
  perSessionUsd: number
  perMonthUsd: number
  perYearUsd: number
  perSessionDkk: number
  perMonthDkk: number
  perYearDkk: number
}

export function computeCost(u: UsageInputs): CostBreakdown {
  const vision = MODELS[u.visionModel]
  const hint = MODELS[u.hintModel]
  const a = TOKEN_ASSUMPTIONS

  const visionUsd =
    (a.visionInputTokens * vision.inputPerMTok) / 1_000_000 +
    (a.visionOutputTokens * vision.outputPerMTok) / 1_000_000

  const hintUsd =
    u.turnsPerSession *
    ((a.hintInputTokensPerTurn * hint.inputPerMTok) / 1_000_000 +
      (a.hintOutputTokensPerTurn * hint.outputPerMTok) / 1_000_000)

  const perSessionUsd = visionUsd + hintUsd
  // 4.33 weeks ≈ avg month length (52 / 12)
  const perMonthUsd = perSessionUsd * u.sessionsPerWeek * 4.33
  const perYearUsd = perSessionUsd * u.sessionsPerWeek * 52

  return {
    visionUsd,
    hintUsd,
    perSessionUsd,
    perMonthUsd,
    perYearUsd,
    perSessionDkk: perSessionUsd * USD_TO_DKK,
    perMonthDkk: perMonthUsd * USD_TO_DKK,
    perYearDkk: perYearUsd * USD_TO_DKK,
  }
}
