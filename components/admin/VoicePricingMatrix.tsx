import { MODELS, TOKEN_ASSUMPTIONS, USD_TO_DKK, VOICE_UNIT_RATES } from "@/lib/ai-pricing"

// Hourly cost of homework with the voice assistant.
//
// One number: hvad koster 1 time lektier med stemmeassistenten i rå Azure-
// inference. Alt pay-as-you-go, ingen margen, ingen infrastruktur.
//
// Antagelser for 1 realistisk time voice-native brug:
//   - 5 opgaver per time (~12 min per opgave)
//   - 12 ture per opgave (Sokratisk frem-og-tilbage, 60 ture/time i alt)
//   - 25 sek barne-tale per tur (tænke-pauser + "jeg tror det er…")
//   - 180 tegn AI-tale per tur (voice-cap = 25 ord ≈ 180 tegn)
//
// Azure Speech er billigt (STT: $1/audio-time, TTS: $16/M tegn). Selv en
// hel times voice-loop lander under 5 kr — det er korrekt, ikke en fejl.

const TASKS_PER_HOUR = 5
const TURNS_PER_TASK = 12
const STT_SECONDS_PER_TURN = 25
const TTS_CHARS_PER_TURN = 180

function hourlyBreakdown() {
  const tasks = TASKS_PER_HOUR
  const turns = TASKS_PER_HOUR * TURNS_PER_TASK

  // Vision runs once per task, hint runs per turn — both on gpt-5-mini.
  const model = MODELS["gpt-5-mini"]
  const visionPerTaskUsd =
    (TOKEN_ASSUMPTIONS.visionInputTokens * model.inputPerMTok +
      TOKEN_ASSUMPTIONS.visionOutputTokens * model.outputPerMTok) / 1_000_000
  const hintPerTurnUsd =
    (TOKEN_ASSUMPTIONS.hintInputTokensPerTurn * model.inputPerMTok +
      TOKEN_ASSUMPTIONS.hintOutputTokensPerTurn * model.outputPerMTok) / 1_000_000
  const llmUsd = tasks * visionPerTaskUsd + turns * hintPerTurnUsd

  const sttMin = (turns * STT_SECONDS_PER_TURN) / 60
  const ttsKChars = (turns * TTS_CHARS_PER_TURN) / 1000
  const sttUsd = sttMin * VOICE_UNIT_RATES.azure.sttPerMinUsd
  const ttsUsd = ttsKChars * VOICE_UNIT_RATES.azure.ttsPerKCharUsd

  const total = (llmUsd + sttUsd + ttsUsd) * USD_TO_DKK
  return {
    totalDkk: total,
    llmDkk: llmUsd * USD_TO_DKK,
    sttDkk: sttUsd * USD_TO_DKK,
    ttsDkk: ttsUsd * USD_TO_DKK,
  }
}

export function VoicePricingMatrix() {
  const b = hourlyBreakdown()
  return (
    <section
      className="mt-6 rounded-card bg-white p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h3 className="text-base font-semibold text-ink">
        Timepris — stemmeassistent
      </h3>
      <p className="mt-1 text-sm text-muted">
        Hvad 1 time lektier koster os i rå Azure-inference.
      </p>

      <div className="mt-5 flex items-baseline gap-3">
        <span
          className="text-4xl font-bold tabular-nums text-ink"
          style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
        >
          {fmtDkk(b.totalDkk)}
        </span>
        <span className="text-sm text-muted">/ time</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
        <span>
          Vision + hint:{" "}
          <span className="tabular-nums text-ink">{fmtDkk(b.llmDkk)}</span>
        </span>
        <span>
          Azure STT:{" "}
          <span className="tabular-nums text-ink">{fmtDkk(b.sttDkk)}</span>
        </span>
        <span>
          Azure TTS:{" "}
          <span className="tabular-nums text-ink">{fmtDkk(b.ttsDkk)}</span>
        </span>
      </div>

      <p className="mt-4 text-[11px] text-muted">
        Antager {TASKS_PER_HOUR} opgaver/time · {TURNS_PER_TASK} ture/opgave (
        {TASKS_PER_HOUR * TURNS_PER_TASK} ture i alt) · {STT_SECONDS_PER_TURN}{" "}
        sek barne-tale/tur · gpt-5-mini + Azure Speech. Azures rate er{" "}
        $1/audio-time for STT — prisen er reel, ikke en fejl.
      </p>
    </section>
  )
}

function fmtDkk(n: number): string {
  if (n < 1) return `${(n * 100).toFixed(1)} øre`
  if (n < 100) return `${n.toFixed(2)} kr.`
  return `${Math.round(n).toLocaleString("da-DK")} kr.`
}
