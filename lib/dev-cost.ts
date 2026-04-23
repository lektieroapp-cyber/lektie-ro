// In-memory dev-only session-cost tracker. Each API consumer pushes a
// CostEvent when its call returns; SessionCostPanel subscribes for live
// totals. Singleton so any component can report without prop drilling.
//
// Not persisted — the panel resets when the page reloads or the user
// starts a fresh session via clearCostEvents().

import {
  llmUsdFromTokens,
  sttUsd,
  ttsUsd,
  USD_TO_DKK,
  type ModelId,
  type VoiceProviderId,
} from "./ai-pricing"

export type CostEvent =
  | {
      kind: "vision"
      promptTokens: number
      completionTokens: number
      model: ModelId
      ms?: number
      ts: number
    }
  | {
      kind: "hint"
      promptTokens: number
      completionTokens: number
      model: ModelId
      ms?: number
      ts: number
    }
  | {
      kind: "stt"
      provider: VoiceProviderId
      audioSec: number
      ms?: number
      ts: number
    }
  | {
      kind: "tts"
      provider: VoiceProviderId
      chars: number
      ms?: number
      ts: number
    }

let events: CostEvent[] = []
const listeners = new Set<() => void>()

// Plain `Omit<T, K>` collapses a discriminated union instead of distributing
// over it, so callers get an error when they pass `{kind:"vision", promptTokens,…}`
// because TypeScript thinks `promptTokens` isn't in the keys of the collapsed
// type. This distributive variant keeps each branch of the union intact.
type DistributiveOmit<T, K extends keyof CostEvent> = T extends CostEvent
  ? Omit<T, K>
  : never

export function pushCostEvent(e: DistributiveOmit<CostEvent, "ts">): void {
  events = [...events, { ...e, ts: Date.now() } as CostEvent]
  for (const l of listeners) l()
}

export function clearCostEvents(): void {
  events = []
  for (const l of listeners) l()
}

export function getCostEvents(): readonly CostEvent[] {
  return events
}

export function subscribeCostEvents(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export type CostTotals = {
  visionUsd: number
  hintUsd: number
  sttUsd: number
  ttsUsd: number
  totalUsd: number
  totalDkk: number
  counts: { vision: number; hint: number; stt: number; tts: number }
}

export function totalsFromEvents(list: readonly CostEvent[]): CostTotals {
  let visionUsd = 0
  let hintUsd = 0
  let sttTotalUsd = 0
  let ttsTotalUsd = 0
  const counts = { vision: 0, hint: 0, stt: 0, tts: 0 }
  for (const e of list) {
    if (e.kind === "vision") {
      visionUsd += llmUsdFromTokens(e.model, e.promptTokens, e.completionTokens)
      counts.vision++
    } else if (e.kind === "hint") {
      hintUsd += llmUsdFromTokens(e.model, e.promptTokens, e.completionTokens)
      counts.hint++
    } else if (e.kind === "stt") {
      sttTotalUsd += sttUsd(e.provider, e.audioSec)
      counts.stt++
    } else if (e.kind === "tts") {
      ttsTotalUsd += ttsUsd(e.provider, e.chars)
      counts.tts++
    }
  }
  const totalUsd = visionUsd + hintUsd + sttTotalUsd + ttsTotalUsd
  return {
    visionUsd,
    hintUsd,
    sttUsd: sttTotalUsd,
    ttsUsd: ttsTotalUsd,
    totalUsd,
    totalDkk: totalUsd * USD_TO_DKK,
    counts,
  }
}
