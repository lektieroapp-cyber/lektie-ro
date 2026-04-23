"use client"

import { Companion } from "@/components/mascot/Companion"
import { useCompanion } from "@/components/mascot/CompanionContext"
import { DEFAULT_COMPANION } from "@/components/mascot/types"
import { K, SUBJECT_PALETTE, type SubjectKey } from "./design-tokens"
import type { SolveResponse, Task } from "./types"

export function TaskPicker({
  solve,
  onPick,
  onNewPhoto,
}: {
  solve: SolveResponse
  onPick: (t: Task) => void
  onNewPhoto: () => void
}) {
  const { type: companionType } = useCompanion()
  const subjectKey = (solve.subject as SubjectKey | null) ?? "matematik"
  const palette = SUBJECT_PALETTE[subjectKey] ?? SUBJECT_PALETTE.matematik

  const count = solve.tasks.length
  const countLabel = count === 1 ? "1 opgave" : `${count} opgaver`

  return (
    <div
      style={{
        fontFamily: K.sans,
        color: K.ink,
        maxWidth: 440,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <Companion type={companionType ?? DEFAULT_COMPANION} mood="happy" size={56} />
        <div style={{ flex: 1, paddingTop: 2 }}>
          <div style={{ fontFamily: K.serif, fontSize: 22, fontWeight: 600, color: K.ink, lineHeight: 1.2 }}>
            Jeg fandt {countLabel}!
          </div>
          <div style={{ fontSize: 14, color: K.ink2, marginTop: 4 }}>
            Hvilken én skal vi kigge på først?
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {solve.tasks.map((t, i) => (
          <TaskRow key={t.id} task={t} index={i} palette={palette} onPick={() => onPick(t)} />
        ))}
      </div>

      <button
        type="button"
        onClick={onNewPhoto}
        style={{
          alignSelf: "flex-start",
          border: "none",
          background: "transparent",
          color: K.ink2,
          fontSize: 13,
          textDecoration: "underline",
          cursor: "pointer",
          fontFamily: "inherit",
          padding: 4,
        }}
      >
        Tag et nyt billede
      </button>
    </div>
  )
}

function TaskRow({
  task,
  index,
  palette,
  onPick,
}: {
  task: Task
  index: number
  palette: { tint: string; dot: string; ink: string }
  onPick: () => void
}) {
  // Prefer the extractor's short title. Fall back to a truncated version
  // of text when title is missing (legacy sessions or extraction glitch).
  const displayTitle = task.title || shortFallback(task.text)
  const stepCount = task.steps?.length ?? 0
  const stepLabel =
    stepCount > 1 ? `${stepCount} trin` : stepCount === 1 ? "1 trin" : null
  return (
    <button
      type="button"
      onClick={onPick}
      style={{
        border: "1px solid rgba(31,27,51,0.05)",
        background: K.card,
        borderRadius: 18,
        padding: "14px 16px",
        cursor: "pointer",
        textAlign: "left",
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        boxShadow: K.shadowCard,
        animation: `slideIn 0.4s ${index * 0.08}s backwards`,
        fontFamily: "inherit",
        transition: "all 0.15s",
        color: K.ink,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateX(4px)"
        e.currentTarget.style.borderColor = K.coral + "40"
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateX(0)"
        e.currentTarget.style.borderColor = "rgba(31,27,51,0.05)"
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: palette.tint,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 700,
          color: palette.ink,
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {index + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11,
            color: K.ink2,
            fontWeight: 600,
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
        >
          <span>Opgave {index + 1}</span>
          {stepLabel && (
            <span
              style={{
                background: palette.tint,
                color: palette.ink,
                borderRadius: 999,
                padding: "2px 8px",
                fontSize: 10,
                letterSpacing: 0.3,
              }}
            >
              {stepLabel}
            </span>
          )}
          {task.needsPaper && (
            <span
              title="Denne opgave kræver papir — lineal, tegning eller skriftligt svar"
              style={{
                background: "rgba(201,121,98,0.12)",
                color: K.clay,
                borderRadius: 999,
                padding: "2px 8px",
                fontSize: 10,
                letterSpacing: 0.3,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span aria-hidden>✏</span>
              PAPIR
            </span>
          )}
        </div>
        <div
          style={{
            fontFamily: K.serif,
            fontSize: 18,
            fontWeight: 600,
            color: K.ink,
            marginTop: 2,
            lineHeight: 1.25,
          }}
        >
          {displayTitle}
        </div>
        {task.goal && (
          <div
            style={{
              fontSize: 12,
              color: K.ink2,
              marginTop: 6,
              lineHeight: 1.35,
              display: "flex",
              alignItems: "flex-start",
              gap: 6,
            }}
          >
            <span aria-hidden style={{ opacity: 0.8 }}>🎯</span>
            <span>{task.goal}</span>
          </div>
        )}
      </div>
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        style={{ flexShrink: 0, marginTop: 16 }}
      >
        <path
          d="M3 7h8m-3-3l3 3-3 3"
          stroke={K.coral}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

// Server-side extractor is asked for a short `title`, but legacy sessions +
// the mock-data fallback path don't have one. Derive a kid-friendly headline
// from the full instruction: strip leading enumeration prefixes ("1 ",
// "WARM-UP 1"), take the first clause or 5 words.
function shortFallback(text: string): string {
  let t = text.trim()
  t = t.replace(/^\s*(?:warm[-\s]?up\s+)?\d+\s*[.:]?\s*/i, "")
  t = t.replace(/^["'`]/, "")
  const clauseEnd = t.search(/[.!?:]/)
  if (clauseEnd > 0 && clauseEnd <= 50) return t.slice(0, clauseEnd).trim()
  const words = t.split(/\s+/).slice(0, 5).join(" ")
  return words.slice(0, 50)
}
