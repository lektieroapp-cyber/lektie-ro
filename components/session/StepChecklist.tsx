"use client"

import { K } from "./design-tokens"
import type { TaskStep } from "./types"

// Step-progression bar shown above the conversation in HintChat + VoiceCanvas.
// Pedagogical intent (from docs/pedagogy.md):
//   - tydelig trin-progression — eleven ser præcis hvilke delopgaver der er løst
//   - flueben ved løst trin    — visuel bekræftelse på fremgang
//   - overkommelighed          — afgrænset omfang reducerer angst inden man starter
//
// Progress is derived from [progress done="A,B" current="C"] markers the AI
// emits in its responses — parent component does the parsing + passes here.

export function StepChecklist({
  steps,
  done,
  current,
}: {
  steps: TaskStep[]
  done: Set<string>
  current: string | null
}) {
  if (!steps || steps.length === 0) return null
  const doneCount = steps.filter(s => done.has(s.label)).length
  const total = steps.length
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        padding: "10px 14px",
        background: "rgba(255,255,255,0.7)",
        borderRadius: 14,
        border: "1px solid rgba(31,27,51,0.06)",
        marginBottom: 12,
      }}
      aria-label={`Fremgang: ${doneCount} ud af ${total} trin løst`}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: K.ink2,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          marginRight: 4,
        }}
      >
        {doneCount}/{total}
      </div>
      {steps.map(step => {
        const isDone = done.has(step.label)
        const isCurrent = !isDone && current === step.label
        return (
          <StepPill
            key={step.label}
            label={step.label}
            isDone={isDone}
            isCurrent={isCurrent}
            tooltip={step.prompt}
          />
        )
      })}
    </div>
  )
}

function StepPill({
  label,
  isDone,
  isCurrent,
  tooltip,
}: {
  label: string
  isDone: boolean
  isCurrent: boolean
  tooltip: string
}) {
  const bg = isDone
    ? K.mint
    : isCurrent
      ? K.claySoft
      : "rgba(31,27,51,0.04)"
  const color = isDone
    ? K.ink
    : isCurrent
      ? K.clay
      : K.ink2
  const border = isCurrent ? `1.5px solid ${K.clay}` : "1.5px solid transparent"
  return (
    <span
      title={tooltip}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: bg,
        color,
        border,
        borderRadius: 999,
        padding: "4px 10px 4px 8px",
        fontSize: 12,
        fontWeight: isDone || isCurrent ? 700 : 500,
        fontFamily: "inherit",
        transition: "all 0.2s",
      }}
    >
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 14,
          height: 14,
          borderRadius: 999,
          background: isDone ? "#fff" : "transparent",
          border: isDone ? "none" : `1.5px solid ${isCurrent ? K.clay : "rgba(31,27,51,0.2)"}`,
          flexShrink: 0,
        }}
      >
        {isDone && (
          <svg width="9" height="9" viewBox="0 0 9 9">
            <path
              d="M1.5 4.8L3.5 6.8L7.5 2.2"
              stroke={K.mintDeep}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span style={{ lineHeight: 1 }}>{label}</span>
    </span>
  )
}
