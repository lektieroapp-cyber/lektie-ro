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

// Per-call token assumptions for LektieRo's two stages. Order-of-magnitude,
// tuned later from real session data once sessions table populates.
export const TOKEN_ASSUMPTIONS = {
  // Stage 1: photo → JSON extraction, runs ONCE per session.
  // Image tiles + system prompt + curriculum context → structured JSON out.
  visionInputTokens: 3000,
  visionOutputTokens: 200,

  // Stage 2: Socratic hint, per turn.
  // Growing context (system + history + curriculum) averaged across turns.
  hintInputTokensPerTurn: 800,
  hintOutputTokensPerTurn: 150,
} as const

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
