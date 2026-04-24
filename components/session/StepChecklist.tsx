"use client"

import { useState } from "react"
import { K } from "./design-tokens"
import type { TaskStep } from "./types"

// Step-progression bar shown above the conversation in HintChat + VoiceCanvas.
// Pedagogical intent (from docs/pedagogy.md):
//   - tydelig trin-progression — eleven ser præcis hvilke delopgaver der er løst
//   - flueben ved løst trin    — visuel bekræftelse på fremgang
//   - overkommelighed          — ét trin ad gangen reducerer overbelastning
//
// Layout (focus mode):
//   TRIN   ● ● ○ ○        2/4
//          └─────── dots for every step: filled mint = done, outlined
//                   clay = current, faded = upcoming. Tap a dot to PEEK
//                   at that step's prompt without changing the active one.
//
//   [ ] TRIN C                                    ← focus row shows the
//       Tag tur og begynd din beskrivelse med...    active or peeked step.
//
// Done steps compress to dots so the kid isn't staring at a wall of
// already-completed work. Upcoming steps also compress — curiosity is fine,
// cognitive load is not. When all steps are done we just show the summary row.
//
// Progress is derived from [progress done="A,B" current="C"] markers the AI
// emits — parent component does the parsing + passes here.

export function StepChecklist({
  steps,
  done,
  current,
}: {
  steps: TaskStep[]
  done: Set<string>
  current: string | null
}) {
  // Kid can tap any step dot to peek at that step's prompt — useful for
  // "what does B want?" curiosity without losing the current focus.
  // Click the same dot again to dismiss the peek.
  const [peekedLabel, setPeekedLabel] = useState<string | null>(null)

  if (!steps || steps.length === 0) return null
  const doneCount = steps.filter(s => done.has(s.label)).length
  const total = steps.length

  // Pick the "focus" step: the explicit current, else the first undone.
  const firstUndone = steps.find(s => !done.has(s.label))
  const activeLabel =
    current && steps.some(s => s.label === current && !done.has(s.label))
      ? current
      : firstUndone?.label ?? null
  const activeStep = activeLabel
    ? steps.find(s => s.label === activeLabel) ?? null
    : null
  // Peek overrides active for the focus-row display; dot styling keeps
  // showing the REAL active step in clay so the kid isn't confused about
  // where they actually are.
  const isPeeking = peekedLabel !== null && peekedLabel !== activeLabel
  const displayedStep = isPeeking
    ? steps.find(s => s.label === peekedLabel) ?? activeStep
    : activeStep
  const allDone = doneCount === total

  return (
    <div
      style={{
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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: displayedStep ? 10 : 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: K.ink2,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              flexShrink: 0,
            }}
          >
            Trin
          </span>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", minWidth: 0 }}>
            {steps.map(step => {
              const isDone = done.has(step.label)
              const isCurrent = !isDone && step.label === activeLabel
              const isPeeked = peekedLabel === step.label
              return (
                <StepDot
                  key={step.label}
                  label={step.label}
                  isDone={isDone}
                  isCurrent={isCurrent}
                  isPeeked={isPeeked}
                  onClick={() =>
                    setPeekedLabel(prev => (prev === step.label ? null : step.label))
                  }
                />
              )
            })}
          </div>
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: allDone ? K.mintDeep : K.ink2,
            flexShrink: 0,
          }}
        >
          {doneCount} / {total}
        </div>
      </div>

      {displayedStep && (
        <FocusRow
          label={displayedStep.label}
          prompt={displayedStep.prompt}
          isPeek={isPeeking}
        />
      )}
    </div>
  )
}

// Tiny status pill per step — filled mint for done, outlined clay for the
// active step, faded grey for upcoming. Clickable: tap to peek that step's
// prompt in the focus row below; tap again to dismiss the peek.
function StepDot({
  label,
  isDone,
  isCurrent,
  isPeeked,
  onClick,
}: {
  label: string
  isDone: boolean
  isCurrent: boolean
  isPeeked: boolean
  onClick: () => void
}) {
  const bg = isDone ? K.mintDeep : isCurrent ? "#fff" : "transparent"
  const color = isDone ? "#fff" : isCurrent ? K.clay : K.ink2
  const border = isDone
    ? K.mintDeep
    : isCurrent
      ? K.clay
      : "rgba(31,27,51,0.15)"
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Se trin ${label}`}
      aria-pressed={isPeeked}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 22,
        height: 22,
        borderRadius: 999,
        background: bg,
        color,
        border: `1.5px solid ${border}`,
        padding: "0 6px",
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1,
        fontFamily: "inherit",
        cursor: "pointer",
        outline: isPeeked ? `2px solid ${K.clay}60` : "none",
        outlineOffset: isPeeked ? 2 : 0,
        transition: "background 0.2s, color 0.2s, border-color 0.2s, outline 0.15s",
      }}
    >
      {isDone ? (
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path
            d="M2 5.2L4 7.2L8 3"
            stroke="#fff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      ) : (
        label
      )}
    </button>
  )
}

// Expanded row for the single in-focus step. Clay accent outlines it so the
// kid can't miss "this is what we're working on right now".
//
// Label handling:
//   - Short single-char labels (A, B, 1, 2) get the "TRIN X" framing
//     because the letter alone carries no meaning.
//   - Word labels (e.g. "dark", "scream" for engelsk circle-of-words
//     tasks) are themselves the meaning — show them directly, no "TRIN"
//     prefix (that just adds noise).
// Safety cap for the displayed step prompt. The extractor is instructed to
// keep step.prompt short and action-oriented (≤ 90 chars), and any lists /
// examples belong in the private context block. When the extractor ignores
// that and stuffs a paragraph into prompt, we truncate here so the header
// doesn't swallow the screen. "Vis mere" expands to the full text on demand.
const PROMPT_SOFT_CAP = 120

function FocusRow({
  label,
  prompt,
  isPeek = false,
}: {
  label: string
  prompt: string
  isPeek?: boolean
}) {
  const isWordLabel = label.length > 2
  const [expanded, setExpanded] = useState(false)
  const trimmed = prompt.trim()
  const needsTruncation = trimmed.length > PROMPT_SOFT_CAP
  const visible =
    needsTruncation && !expanded
      ? trimmed.slice(0, PROMPT_SOFT_CAP).trimEnd() + "…"
      : trimmed
  // Peek preview uses a muted grey tint instead of clay so the kid can tell
  // "this is a step I'm curious about" vs "this is my active step".
  const accent = isPeek ? K.ink2 : K.clay
  const bg = isPeek ? "rgba(31,27,51,0.04)" : "rgba(201,121,98,0.08)"
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "8px 10px",
        background: bg,
        borderRadius: 10,
        border: `1.5px solid ${accent}70`,
      }}
    >
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 20,
          height: 20,
          borderRadius: 6,
          border: `2px solid ${accent}`,
          background: "#fff",
          flexShrink: 0,
          marginTop: 2,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: isWordLabel ? 15 : prompt ? 12 : 14,
            fontWeight: 700,
            color: accent,
            textTransform: isWordLabel ? "none" : "uppercase",
            letterSpacing: isWordLabel ? 0 : 0.4,
            marginBottom: prompt ? 1 : 0,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>{isWordLabel ? label : `Trin ${label}`}</span>
          {isPeek && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: K.ink2,
                background: "rgba(31,27,51,0.08)",
                padding: "2px 6px",
                borderRadius: 999,
                letterSpacing: 0.5,
              }}
            >
              KIG
            </span>
          )}
        </div>
        {prompt && (
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.35,
              color: K.ink,
            }}
          >
            {visible}
            {needsTruncation && (
              <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                style={{
                  marginLeft: 6,
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  color: K.ink2,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textDecoration: "underline",
                }}
              >
                {expanded ? "vis mindre" : "vis mere"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
