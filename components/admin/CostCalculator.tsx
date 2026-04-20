"use client"

import { useMemo, useState } from "react"
import {
  computeCost,
  MODELS,
  TOKEN_ASSUMPTIONS,
  USD_TO_DKK,
  type ModelId,
} from "@/lib/ai-pricing"

const SUBSCRIPTION_DKK = 229

export function CostCalculator() {
  const [sessionsPerWeek, setSessionsPerWeek] = useState(5)
  const [turnsPerSession, setTurnsPerSession] = useState(4)
  const [visionModel, setVisionModel] = useState<ModelId>("gpt-5-mini")
  const [hintModel, setHintModel] = useState<ModelId>("gpt-5-mini")

  const cost = useMemo(
    () => computeCost({ sessionsPerWeek, turnsPerSession, visionModel, hintModel }),
    [sessionsPerWeek, turnsPerSession, visionModel, hintModel]
  )

  const marginPct = Math.max(
    0,
    ((SUBSCRIPTION_DKK - cost.perMonthDkk) / SUBSCRIPTION_DKK) * 100
  )

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div
        className="rounded-card bg-white p-6"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h3 className="text-base font-semibold text-ink">Brug per barn</h3>
        <p className="mt-1 text-sm text-muted">
          Justér sliderne for at se hvad et barns AI-forbrug koster os per måned.
        </p>

        <Slider
          label="Sessioner per uge"
          value={sessionsPerWeek}
          min={1}
          max={40}
          onChange={setSessionsPerWeek}
          suffix={sessionsPerWeek === 1 ? "session" : "sessioner"}
        />
        <Slider
          label="Turns per session"
          value={turnsPerSession}
          min={1}
          max={8}
          onChange={setTurnsPerSession}
          suffix={turnsPerSession === 1 ? "tur" : "ture"}
          help="Hårdt loft i produktion er 8 ture."
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

        <details className="mt-6 text-xs text-muted">
          <summary className="cursor-pointer font-medium text-ink/70 hover:text-ink">
            Antagelser bag estimatet
          </summary>
          <ul className="mt-2 space-y-1 pl-4">
            <li>
              Vision: {fmt(TOKEN_ASSUMPTIONS.visionInputTokens)} in /{" "}
              {fmt(TOKEN_ASSUMPTIONS.visionOutputTokens)} out per foto
            </li>
            <li>
              Hint: {fmt(TOKEN_ASSUMPTIONS.hintInputTokensPerTurn)} in /{" "}
              {fmt(TOKEN_ASSUMPTIONS.hintOutputTokensPerTurn)} out per tur
            </li>
            <li>USD → DKK: {USD_TO_DKK}</li>
            <li>Måned = 4.33 uger (52/12)</li>
          </ul>
        </details>
      </div>

      <div className="space-y-4">
        <div
          className="rounded-card bg-white p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="text-sm font-medium text-muted">
            AI-omkostning per måned
          </div>
          <div
            className="mt-1 text-4xl font-bold text-mint-deep"
            style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
          >
            {fmtDkk(cost.perMonthDkk)}
          </div>
          <div className="mt-1 text-xs text-muted">
            ≈ ${cost.perMonthUsd.toFixed(3)} USD
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <Row label="Per session" value={fmtDkk(cost.perSessionDkk)} sub={`$${cost.perSessionUsd.toFixed(4)}`} />
            <Row label="Per år" value={fmtDkk(cost.perYearDkk)} sub={`$${cost.perYearUsd.toFixed(2)}`} />
            <Row label="Vision-del" value={fmtDkk(cost.visionUsd * USD_TO_DKK)} sub="per session" />
            <Row label="Hint-del" value={fmtDkk(cost.hintUsd * USD_TO_DKK)} sub="per session" />
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
            Dækker kun AI-inference. Supabase, hosting, Resend og skat ikke medregnet.
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
