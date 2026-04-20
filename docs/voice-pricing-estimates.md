# Voice pricing estimates — LektieRo

Working doc for what voice (STT + TTS) will actually cost us per child, per month.
Source of truth for the numbers that drive `/da/admin/costs` (Priser tab).

**When the rates in here change, update `lib/ai-pricing.ts` in the same PR.**
The admin calculator reads from that file — keep them in sync or the "Priser" tab lies.

---

## Hard constraints

- **GDPR / EU data residency only.** No routing through non-EU LLM or voice infra.
- **Danish in, Danish out.** STT must handle kid Danish (partial words, lisps, background noise). TTS must sound warm, not robotic — kids 8–14 will reject a flat voice.
- **Budget:** 229 kr/mo single plan, 289 kr/mo family. Voice can't eat more than ~20 % of either. Prefer < 10 %.
- **Latency:** fluent conversation feel = < 1.2 s end-to-end turn time. Not strict realtime (300 ms) — kids pause to think between turns.

---

## Usage model — per session

A session = one photo + Socratic hint conversation. Voice only applies to the hint turns (Stage 2), not vision extraction.

| Metric                     | Value       | Source                                                               |
|----------------------------|-------------|----------------------------------------------------------------------|
| Turns per session (avg)    | 4           | Current prod assumption (`TOKEN_ASSUMPTIONS.hintInputTokensPerTurn`) |
| Turns per session (max)    | 8           | Hard cap in `sessions.turn_count` guard                              |
| Child speech per turn      | 15 s        | Estimate: "jeg tror det er 7" + filler. Revisit after real data.     |
| AI speech per turn (chars) | 420         | 70-word cap × ~6 chars/word incl. spaces                             |
| Sessions/week (typical)    | 5           | 1 school day × 5, matches current calculator default                 |
| Sessions/week (heavy)      | 15          | Daily + multiple subjects                                            |

Per session totals:
- **STT audio:** 4 turns × 15 s = **1 minute**
- **TTS chars:** 4 turns × 420 = **1,680 characters**

Per month (5 sessions/wk × 4.33 wk):
- **STT:** ~22 minutes
- **TTS:** ~36,400 characters

---

## Vendor rate cards (verified April 2026 — reconfirm before committing)

All prices in USD. Convert at 7.0 DKK/USD for planning.

### Speech-to-Text (STT)

| Vendor           | Model        | Danish? | Rate              | EU residency            | Notes                                     |
|------------------|--------------|---------|-------------------|-------------------------|-------------------------------------------|
| Deepgram         | Nova-3       | ✓       | $0.0058/min       | EU deploy (Enterprise)  | Fast, streaming partials. DPA available.  |
| Deepgram         | Nova-2       | ✓       | $0.0043/min       | EU deploy (Enterprise)  | Slightly older but same Danish quality.   |
| Google Cloud     | Chirp        | ✓       | $0.016/min        | `europe-west`           | Good baseline. DPA standard.              |
| Azure Speech     | `da-DK`      | ✓       | $0.0167/min       | Sweden Central          | Same tenant as our LLM. Simplest contract.|
| ElevenLabs       | Scribe       | ✓       | $0.40/hr ≈ $0.0067/min | EU zone (Enterprise) | Bundled with Conv AI.                     |

### Text-to-Speech (TTS)

| Vendor       | Voice/Model            | Danish? | Rate                     | EU residency            | Notes                                       |
|--------------|------------------------|---------|--------------------------|-------------------------|---------------------------------------------|
| ElevenLabs   | Flash v2.5             | ✓       | ~$0.15 / 1K chars (mid)  | EU zone (Enterprise)    | Warmest kid voice. Verify DPA + zero retention. |
| ElevenLabs   | Turbo v2.5             | ✓       | ~$0.30 / 1K chars (mid)  | EU zone (Enterprise)    | Slightly higher quality, 2× price.          |
| Azure Speech | Neural `da-DK-ChristelNeural` / `JeppeNeural` | ✓ | $16 / 1M chars = $0.016 / 1K | Sweden Central          | Good, not emotional. Cheapest warm option.  |
| Google Cloud | WaveNet `da-DK-Wavenet-*` | ✓    | $16 / 1M chars = $0.016 / 1K | `europe-west`           | Comparable to Azure.                        |

### Bundled conversational platforms

| Vendor       | Product          | Rate          | Notes                                                                 |
|--------------|------------------|---------------|-----------------------------------------------------------------------|
| ElevenLabs   | Conversational AI | $0.08/min   | STT + turn-taking + TTS in one pipe. Bring your own LLM (keeps Azure gpt-5-mini). Best interruption/barge-in feel. |

---

## Per-session cost scenarios

Using the usage model above (4 turns, 1 min STT, 1,680 chars TTS).

| Scenario                                     | STT $      | TTS $     | Total $   | Total kr  |
|----------------------------------------------|------------|-----------|-----------|-----------|
| **A. Deepgram + ElevenLabs Flash** (recommended) | 0.0043     | 0.252     | **0.256** | **1.79 kr** |
| **B. Azure Speech (STT + Neural TTS)**        | 0.0167     | 0.027     | **0.044** | **0.31 kr** |
| **C. Google Cloud (Chirp + WaveNet)**         | 0.016      | 0.027     | **0.043** | **0.30 kr** |
| **D. ElevenLabs Conversational AI**           | —          | —         | **0.320** | **2.24 kr** |
| **E. Deepgram + Azure Neural TTS (hybrid)**   | 0.0043     | 0.027     | **0.031** | **0.22 kr** |

Scenario D is 4 min × $0.08/min bundled price.

---

## Per-child monthly projections

Text-only AI baseline (from current calculator defaults, gpt-5-mini, 4 turns, 5 sessions/wk): **~1.20 kr/month**.

Voice adds on top:

| Scenario         | 5 sess/wk  | 15 sess/wk | % of 229 kr plan (5/wk) | % of 289 kr plan (15/wk) |
|------------------|------------|------------|--------------------------|--------------------------|
| A. DG + EL Flash | ~39 kr     | ~116 kr    | 17 %                     | 40 %                     |
| B. Azure Speech  | ~6.7 kr    | ~20 kr     | 3 %                      | 7 %                      |
| C. Google Cloud  | ~6.6 kr    | ~20 kr     | 3 %                      | 7 %                      |
| D. EL Conv AI    | ~49 kr     | ~146 kr    | 21 %                     | 51 %                     |
| E. DG + Azure TTS| ~4.8 kr    | ~14 kr     | 2 %                      | 5 %                      |

**Read this carefully.** A heavy user on ElevenLabs blows through the margin on a Family Premium plan. Any voice rollout needs either:
1. A hard cap on voice-minutes per child per month, or
2. Voice gated behind the Family Premium tier only, or
3. Scenario B/C/E (cheap TTS) as default, with ElevenLabs as an opt-in premium voice.

---

## Recommendation (as of 2026-04-20)

1. **Ship default:** Scenario E — Deepgram STT + Azure Neural TTS. ~5 kr/child/mo heavy use. Same contracts we already have. Good enough Danish warmth.
2. **Premium voice option:** Scenario A — upgrade TTS to ElevenLabs Flash v2.5 for Family Premium subscribers. Worth the margin hit because it's the brand-sensory moment parents will demo to friends.
3. **Skip:** Scenario D (bundled Conv AI) unless a specific UX problem (interruption, barge-in) becomes a blocker. Too expensive for the value.

Gate the whole thing behind `NEXT_PUBLIC_VOICE_ENABLED` + per-child monthly voice-minute cap.

---

## When to revisit

- **Real session data lands** (migration 006 applied + first week of prod usage). Replace the 15 s/turn and 420 chars/turn estimates with measured values.
- **ElevenLabs announces new Danish voices** — kid-appropriate voice quality is the only reason to pay the premium.
- **Azure releases a new Danish Neural voice** — currently Christel and Jeppe; if they ship a child-warmth-tuned voice this equation changes.
- **Usage distribution skews heavy** — if p95 usage is 15+ sessions/wk, the TCO flips toward Azure/Google regardless of warmth preference.
