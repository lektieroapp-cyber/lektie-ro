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
  completedTaskIds,
}: {
  solve: SolveResponse
  onPick: (t: Task) => void
  onNewPhoto: () => void
  /** Task IDs already completed in the current photo session — filtered
   *  from the list so the kid doesn't re-pick what they just solved. */
  completedTaskIds?: string[]
}) {
  const { type: companionType } = useCompanion()
  const subjectKey = (solve.subject as SubjectKey | null) ?? "matematik"
  const palette = SUBJECT_PALETTE[subjectKey] ?? SUBJECT_PALETTE.matematik

  const done = new Set(completedTaskIds ?? [])
  const remaining = solve.tasks.filter(t => !done.has(t.id))
  const doneCount = solve.tasks.length - remaining.length
  const allDone = remaining.length === 0 && solve.tasks.length > 0

  const headline = allDone
    ? "Godt gået — alle opgaver er klaret!"
    : doneCount > 0
      ? `${remaining.length} ${remaining.length === 1 ? "opgave" : "opgaver"} tilbage`
      : `Jeg fandt ${solve.tasks.length === 1 ? "1 opgave" : `${solve.tasks.length} opgaver`}!`
  const subline = allDone
    ? "Tag et nyt billede når I er klar til næste lektie."
    : doneCount > 0
      ? `${doneCount} klaret. Hvilken vil du tage nu?`
      : "Hvilken én skal vi kigge på først?"

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
            {headline}
          </div>
          <div style={{ fontSize: 14, color: K.ink2, marginTop: 4 }}>
            {subline}
          </div>
        </div>
      </div>

      {!allDone && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {remaining.map((t, i) => (
            <TaskRow key={t.id} task={t} index={i} palette={palette} onPick={() => onPick(t)} />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onNewPhoto}
        style={{
          alignSelf: allDone ? "stretch" : "flex-start",
          border: allDone ? "none" : "none",
          background: allDone ? palette.dot : "transparent",
          color: allDone ? "#fff" : K.ink2,
          fontSize: allDone ? 15 : 13,
          fontWeight: allDone ? 600 : 400,
          textDecoration: allDone ? "none" : "underline",
          cursor: "pointer",
          fontFamily: "inherit",
          padding: allDone ? "12px 20px" : 4,
          borderRadius: allDone ? 999 : 0,
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
        {/* task.goal intentionally omitted here — it's the pedagogical
            learning goal written for Dani ("Øv mundtlig brug af ord…"),
            which reads like a lesson plan and confuses the kid who's
            choosing a task. Dani's first hint narration surfaces the
            goal in kid-facing language. */}
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
export function shortFallback(text: string): string {
  let t = text.trim()
  t = t.replace(/^\s*(?:warm[-\s]?up\s+)?\d+\s*[.:]?\s*/i, "")
  t = t.replace(/^["'`]/, "")
  const clauseEnd = t.search(/[.!?:]/)
  if (clauseEnd > 0 && clauseEnd <= 50) return t.slice(0, clauseEnd).trim()
  const words = t.split(/\s+/).slice(0, 5).join(" ")
  return words.slice(0, 50)
}
