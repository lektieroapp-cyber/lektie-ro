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
  const isWord = task.text.length > 36
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
        alignItems: "center",
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
        }}
      >
        {index + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            color: K.ink2,
            fontWeight: 600,
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
        >
          {isWord ? "Tekststykke" : "Regn ud"}
        </div>
        <div
          style={{
            fontFamily: K.serif,
            fontSize: isWord ? 14 : 18,
            fontWeight: 600,
            color: K.ink,
            marginTop: 2,
            lineHeight: 1.25,
          }}
        >
          {task.text}
        </div>
      </div>
      <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
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
