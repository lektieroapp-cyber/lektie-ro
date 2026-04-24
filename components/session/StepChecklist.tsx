"use client"

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
//                   clay = current, faded = upcoming. Tiny, stays on one line.
//
//   [ ] TRIN C                                    ← only the current step
//       Tag tur og begynd din beskrivelse med...    gets the full row.
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
  if (!steps || steps.length === 0) return null
  const doneCount = steps.filter(s => done.has(s.label)).length
  const total = steps.length

  // Pick the "focus" step: the explicit current, else the first undone.
  const firstUndone = steps.find(s => !done.has(s.label))
  const focusLabel =
    current && steps.some(s => s.label === current && !done.has(s.label))
      ? current
      : firstUndone?.label ?? null
  const focusStep = focusLabel
    ? steps.find(s => s.label === focusLabel) ?? null
    : null
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
          marginBottom: focusStep ? 10 : 0,
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
              const isCurrent = !isDone && step.label === focusLabel
              return (
                <StepDot
                  key={step.label}
                  label={step.label}
                  isDone={isDone}
                  isCurrent={isCurrent}
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

      {focusStep && (
        <FocusRow label={focusStep.label} prompt={focusStep.prompt} />
      )}
    </div>
  )
}

// Tiny status pill per step — filled mint for done, outlined clay for
// current, faded grey for upcoming. Label text inside so the kid can still
// recognise which letter is which.
function StepDot({
  label,
  isDone,
  isCurrent,
}: {
  label: string
  isDone: boolean
  isCurrent: boolean
}) {
  const bg = isDone ? K.mintDeep : isCurrent ? "#fff" : "transparent"
  const color = isDone ? "#fff" : isCurrent ? K.clay : K.ink2
  const border = isDone
    ? K.mintDeep
    : isCurrent
      ? K.clay
      : "rgba(31,27,51,0.15)"
  return (
    <span
      aria-hidden
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
        transition: "background 0.2s, color 0.2s, border-color 0.2s",
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
    </span>
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
function FocusRow({ label, prompt }: { label: string; prompt: string }) {
  const isWordLabel = label.length > 2
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "8px 10px",
        background: "rgba(201,121,98,0.08)",
        borderRadius: 10,
        border: `1.5px solid ${K.clay}70`,
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
          border: `2px solid ${K.clay}`,
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
            color: K.clay,
            textTransform: isWordLabel ? "none" : "uppercase",
            letterSpacing: isWordLabel ? 0 : 0.4,
            marginBottom: prompt ? 1 : 0,
          }}
        >
          {isWordLabel ? label : `Trin ${label}`}
        </div>
        {prompt && (
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.35,
              color: K.ink,
            }}
          >
            {prompt}
          </div>
        )}
      </div>
    </div>
  )
}
