"use client"

import { K } from "./design-tokens"
import type { TaskStep } from "./types"

// Step-progression bar shown above the conversation in HintChat + VoiceCanvas.
// Pedagogical intent (from docs/pedagogy.md):
//   - tydelig trin-progression — eleven ser præcis hvilke delopgaver der er løst
//   - flueben ved løst trin    — visuel bekræftelse på fremgang
//   - overkommelighed          — afgrænset omfang reducerer angst inden man starter
//
// Two layouts:
//   - EXPANDED (row-per-step with full prompt text): when steps.length ≤ 6.
//     Used for template tasks and small multi-step exercises where the kid
//     benefits from seeing *what* each trin means, not just the label.
//   - COMPACT (pills): when steps.length > 6. Grade-5+ math pages with 12+
//     a/b/c items would overflow in expanded form, so we fall back.
//
// Progress is derived from [progress done="A,B" current="C"] markers the AI
// emits in its responses — parent component does the parsing + passes here.

const EXPANDED_LAYOUT_MAX = 6

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
  const expanded = total <= EXPANDED_LAYOUT_MAX

  return (
    <div
      style={{
        padding: expanded ? "10px 12px" : "10px 14px",
        background: "rgba(255,255,255,0.7)",
        borderRadius: 14,
        border: "1px solid rgba(31,27,51,0.06)",
        marginBottom: 12,
      }}
      aria-label={`Fremgang: ${doneCount} ud af ${total} trin løst`}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: expanded ? 8 : 0,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: K.ink2,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          Trin
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: doneCount === total ? K.mintDeep : K.ink2,
          }}
        >
          {doneCount} / {total}
        </div>
      </div>
      {expanded ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {steps.map(step => {
            const isDone = done.has(step.label)
            const isCurrent = !isDone && current === step.label
            return (
              <StepRow
                key={step.label}
                label={step.label}
                prompt={step.prompt}
                isDone={isDone}
                isCurrent={isCurrent}
              />
            )
          })}
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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
      )}
    </div>
  )
}

// One row per step — full prompt visible. Checkbox left, label + prompt right.
function StepRow({
  label,
  prompt,
  isDone,
  isCurrent,
}: {
  label: string
  prompt: string
  isDone: boolean
  isCurrent: boolean
}) {
  const rowBg = isDone
    ? "rgba(122,203,162,0.12)"
    : isCurrent
      ? "rgba(201,121,98,0.08)"
      : "transparent"
  const borderColor = isCurrent ? `${K.clay}70` : "transparent"
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "6px 10px",
        background: rowBg,
        borderRadius: 10,
        border: `1.5px solid ${borderColor}`,
        transition: "background 0.2s, border-color 0.2s",
      }}
    >
      <Checkbox isDone={isDone} isCurrent={isCurrent} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: prompt ? 12 : 14,
            fontWeight: 700,
            color: isDone ? K.mintDeep : isCurrent ? K.clay : K.ink2,
            textTransform: "uppercase",
            letterSpacing: 0.4,
            marginBottom: prompt ? 1 : 0,
          }}
        >
          Trin {label}
        </div>
        {prompt && (
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.35,
              color: isDone ? K.ink2 : K.ink,
              textDecoration: isDone ? "line-through" : "none",
              textDecorationColor: isDone ? K.mintDeep : undefined,
            }}
          >
            {prompt}
          </div>
        )}
      </div>
    </div>
  )
}

function Checkbox({ isDone, isCurrent }: { isDone: boolean; isCurrent: boolean }) {
  const border = isDone ? K.mintDeep : isCurrent ? K.clay : "rgba(31,27,51,0.25)"
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 20,
        height: 20,
        borderRadius: 6,
        border: `2px solid ${border}`,
        background: isDone ? K.mintDeep : "#fff",
        flexShrink: 0,
        marginTop: 2,
        transition: "background 0.2s, border-color 0.2s",
      }}
    >
      {isDone && (
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path
            d="M2.5 6.5L4.8 8.8L9.5 3.5"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      )}
    </span>
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
