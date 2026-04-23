"use client"

import { useMemo, useState } from "react"
import {
  computeHourlyCost,
  MODELS,
  TOKEN_ASSUMPTIONS,
  USD_TO_DKK,
  VOICE_ASSUMPTIONS,
  VOICE_PROVIDERS,
  type ModelId,
  type VoiceProviderId,
} from "@/lib/ai-pricing"

const SUBSCRIPTION_DKK = 229
const WEEKS_PER_MONTH = 4.33

export function CostCalculator() {
  const [tasksPerHour, setTasksPerHour] = useState(5)
  const [turnsPerTask, setTurnsPerTask] = useState(8)
  const [hoursPerWeek, setHoursPerWeek] = useState(3)
  const [visionModel, setVisionModel] = useState<ModelId>("gpt-5-mini")
  const [hintModel, setHintModel] = useState<ModelId>("gpt-5-mini")
  const [voiceProvider, setVoiceProvider] = useState<VoiceProviderId>("azure")

  const cost = useMemo(
    () =>
      computeHourlyCost({
        tasksPerHour,
        turnsPerTask,
        visionModel,
        hintModel,
        voiceProvider,
      }),
    [tasksPerHour, turnsPerTask, visionModel, hintModel, voiceProvider]
  )

  const perMonthDkk = cost.perHourDkk * hoursPerWeek * WEEKS_PER_MONTH
  const perMonthUsd = cost.perHourUsd * hoursPerWeek * WEEKS_PER_MONTH
  const marginPct = Math.max(
    0,
    ((SUBSCRIPTION_DKK - perMonthDkk) / SUBSCRIPTION_DKK) * 100
  )

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div
        className="rounded-card bg-white p-6"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h3 className="text-base font-semibold text-ink">Brug per barn</h3>
        <p className="mt-1 text-sm text-muted">
          Justér sliderne for at se hvad én times lektier koster os — og hvad det
          ruller op til per måned ved valgt ugentlig brug.
        </p>

        <Slider
          label="Opgaver per time"
          value={tasksPerHour}
          min={1}
          max={10}
          onChange={setTasksPerHour}
          suffix={tasksPerHour === 1 ? "opgave" : "opgaver"}
          help="Hvor mange separate lektieopgaver barnet kommer igennem på en time."
        />
        <Slider
          label="Ture per opgave"
          value={turnsPerTask}
          min={1}
          max={12}
          onChange={setTurnsPerTask}
          suffix={turnsPerTask === 1 ? "tur" : "ture"}
          help="Sokratisk frem-og-tilbage per opgave. Hårdt loft i produktion er 8."
        />
        <Slider
          label="Timer per uge"
          value={hoursPerWeek}
          min={1}
          max={15}
          onChange={setHoursPerWeek}
          suffix={hoursPerWeek === 1 ? "time" : "timer"}
          help="Bruges kun til måneds-udregning og margin."
        />

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <ModelPicker
            label="Vision (stage 1)"
            value={visionModel}
            onChange={setVisionModel}
            visionOnly
          />
          <ModelPicker
            label="Hint (stage 2)"
            value={hintModel}
            onChange={setHintModel}
          />
        </div>

        <div className="mt-6">
          <VoicePicker value={voiceProvider} onChange={setVoiceProvider} />
        </div>

        <details className="mt-6 text-xs text-muted">
          <summary className="cursor-pointer font-medium text-ink/70 hover:text-ink">
            Antagelser bag estimatet
          </summary>
          <ul className="mt-2 space-y-1 pl-4">
            <li>
              Vision: {fmt(TOKEN_ASSUMPTIONS.visionInputTokens)} in /{" "}
              {fmt(TOKEN_ASSUMPTIONS.visionOutputTokens)} out per opgave (kører
              én gang per foto/opgave)
            </li>
            <li>
              Hint: {fmt(TOKEN_ASSUMPTIONS.hintInputTokensPerTurn)} in /{" "}
              {fmt(TOKEN_ASSUMPTIONS.hintOutputTokensPerTurn)} out per tur
            </li>
            <li>
              Voice: {VOICE_ASSUMPTIONS.sttSecondsPerTurn}s barn-tale /{" "}
              {VOICE_ASSUMPTIONS.ttsCharsPerTurn} tegn AI-tale per tur (matcher
              25-ord cap i voice-prompten)
            </li>
            <li>USD → DKK: {USD_TO_DKK}</li>
            <li>Måned = {WEEKS_PER_MONTH} uger (52 / 12)</li>
          </ul>
        </details>
      </div>

      <div className="space-y-4">
        <div
          className="rounded-card bg-white p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="text-sm font-medium text-muted">
            Pris per time lektier
          </div>
          <div
            className="mt-1 text-4xl font-bold text-mint-deep"
            style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
          >
            {fmtDkk(cost.perHourDkk)}
          </div>
          <div className="mt-1 text-xs text-muted">
            ≈ ${cost.perHourUsd.toFixed(2)} USD · {tasksPerHour * turnsPerTask}{" "}
            ture/time
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <Row
              label="Per opgave"
              value={fmtDkk(cost.perTaskDkk)}
              sub={`$${cost.perTaskUsd.toFixed(4)}`}
            />
            <Row
              label="Per måned"
              value={fmtDkk(perMonthDkk)}
              sub={`$${perMonthUsd.toFixed(2)} · ${hoursPerWeek}t/uge`}
            />
            <Row
              label="Vision-del"
              value={fmtDkk(cost.visionUsd * USD_TO_DKK)}
              sub="per time"
            />
            <Row
              label="Hint-del"
              value={fmtDkk(cost.hintUsd * USD_TO_DKK)}
              sub="per time"
            />
            {voiceProvider !== "off" && (
              <Row
                label="Voice-del"
                value={fmtDkk(cost.voiceUsd * USD_TO_DKK)}
                sub="per time"
              />
            )}
          </div>
        </div>

        <div
          className="rounded-card p-6"
          style={{
            background: "var(--color-blue-tint)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="text-sm font-medium text-ink/70">
            Margin på Enkelt-abonnement ({SUBSCRIPTION_DKK} kr./md)
          </div>
          <div
            className="mt-1 text-3xl font-bold text-blue-soft"
            style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
          >
            {marginPct.toFixed(1)}%
          </div>
          <div className="mt-1 text-xs text-muted">
            Ved {hoursPerWeek} timer/uge. Dækker kun AI-inference. Supabase,
            hosting, Resend og skat ikke medregnet.
          </div>
        </div>
      </div>
    </div>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
  suffix,
  help,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (n: number) => void
  suffix: string
  help?: string
}) {
  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium text-ink">{label}</label>
        <span className="text-sm tabular-nums text-muted">
          <span className="font-semibold text-ink">{value}</span> {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-ink/10 accent-mint-deep"
      />
      {help && <p className="mt-1 text-xs text-muted">{help}</p>}
    </div>
  )
}

function ModelPicker({
  label,
  value,
  onChange,
  visionOnly,
}: {
  label: string
  value: ModelId
  onChange: (m: ModelId) => void
  visionOnly?: boolean
}) {
  const options = Object.values(MODELS).filter(m => (visionOnly ? m.canVision : true))
  const spec = MODELS[value]
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </label>
      <select
        className="lr-select mt-1 w-full rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm text-ink focus:border-mint-deep focus:outline-none"
        value={value}
        onChange={e => onChange(e.target.value as ModelId)}
      >
        {options.map(m => (
          <option key={m.id} value={m.id}>
            {m.label} — ${m.inputPerMTok}/${m.outputPerMTok} per 1M
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-muted">{spec.note}</p>
    </div>
  )
}

function VoicePicker({
  value,
  onChange,
}: {
  value: VoiceProviderId
  onChange: (v: VoiceProviderId) => void
}) {
  const spec = VOICE_PROVIDERS[value]
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wider text-muted">
        Voice (STT + TTS)
      </label>
      <select
        className="lr-select mt-1 w-full rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm text-ink focus:border-mint-deep focus:outline-none"
        value={value}
        onChange={e => onChange(e.target.value as VoiceProviderId)}
      >
        {Object.values(VOICE_PROVIDERS).map(p => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-muted">{spec.note}</p>
    </div>
  )
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-canvas/60 p-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className="mt-0.5 text-base font-semibold tabular-nums text-ink">{value}</div>
      {sub && <div className="text-[11px] text-muted">{sub}</div>}
    </div>
  )
}

function fmt(n: number) {
  return n.toLocaleString("da-DK")
}

function fmtDkk(n: number) {
  if (n < 1) return `${(n * 100).toFixed(1)} øre`
  if (n < 100) return `${n.toFixed(2)} kr.`
  return `${Math.round(n).toLocaleString("da-DK")} kr.`
}
