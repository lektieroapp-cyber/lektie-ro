"use client"

import { Companion } from "@/components/mascot/Companion"
import { useCompanion } from "@/components/mascot/CompanionContext"
import { DEFAULT_COMPANION } from "@/components/mascot/types"
import { CompassIcon, IdeaIcon, StuckIcon } from "@/components/icons/ModeIcons"
import { K } from "./design-tokens"
import type { HintMode, SolveResponse, Task } from "./types"

type ModeChoice = {
  mode: HintMode
  icon: React.ReactNode
  iconColor: string
  title: string
  sub: string
  tint: string
  ring: string
}

// Three modes, mapped to backend's two: "self" and "stuck" both map to hint
// mode (Socratic); "guide" maps to explain mode. Three feels right for a kid.
const MODES: ModeChoice[] = [
  {
    mode: "hint",
    icon: <IdeaIcon size={26} color="#3E8A6A" />,
    iconColor: "#3E8A6A",
    title: "Jeg vil prøve selv",
    sub: "Jeg tror jeg kan det — bare giv mig et lille skub hvis jeg går i stå.",
    tint: K.mintSoft,
    ring: K.mint,
  },
  {
    mode: "explain",
    icon: <CompassIcon size={26} color="#3A5F7A" />,
    iconColor: "#3A5F7A",
    title: "Hvad skal jeg gøre?",
    sub: "Hjælp mig med at finde ud af, hvor jeg skal starte.",
    tint: K.skySoft,
    ring: K.sky,
  },
  {
    mode: "hint",
    icon: <StuckIcon size={26} color={K.action} />,
    iconColor: K.action,
    title: "Jeg sidder fast",
    sub: "Jeg har prøvet, men jeg forstår det ikke. Kan du forklare det stille og roligt?",
    tint: K.actionSoft,
    ring: K.action,
  },
]

export function ModeSelector({
  task,
  solve: _solve,
  onSelect,
  onBack,
}: {
  task: Task
  solve: SolveResponse
  onSelect: (mode: HintMode) => void
  onBack: () => void
}) {
  const { type: companionType } = useCompanion()
  return (
    <div
      style={{
        fontFamily: K.sans,
        color: K.ink,
        maxWidth: 440,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <div
        style={{
          background: K.card,
          borderRadius: 20,
          padding: "14px 18px",
          border: "1px solid rgba(31,27,51,0.06)",
          boxShadow: K.shadowCard,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: K.ink2,
            fontWeight: 600,
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
        >
          Opgave
        </div>
        <div
          style={{
            fontFamily: K.serif,
            fontSize: 22,
            fontWeight: 600,
            color: K.ink,
            marginTop: 2,
            lineHeight: 1.25,
          }}
        >
          {task.text}
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <Companion type={companionType ?? DEFAULT_COMPANION} mood="curious" size={56} />
        <div style={{ flex: 1, paddingTop: 4 }}>
          <div
            style={{
              fontFamily: K.serif,
              fontSize: 20,
              fontWeight: 600,
              color: K.ink,
              lineHeight: 1.25,
            }}
          >
            Hvor vil du starte?
          </div>
          <div style={{ fontSize: 14, color: K.ink2, marginTop: 4 }}>
            Der er ikke noget rigtigt svar her — bare det du har lyst til!
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {MODES.map((m, i) => (
          <ModeCard key={i} {...m} onClick={() => onSelect(m.mode)} />
        ))}
      </div>

      <button
        type="button"
        onClick={onBack}
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
        ← Vælg en anden opgave
      </button>
    </div>
  )
}

function ModeCard({
  icon,
  title,
  sub,
  tint,
  ring,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  sub: string
  tint: string
  ring: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1.5px solid ${ring}50`,
        background: K.card,
        borderRadius: 20,
        padding: "16px 18px",
        cursor: "pointer",
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        gap: 14,
        boxShadow: K.shadowCard,
        fontFamily: "inherit",
        transition: "all 0.15s",
        color: K.ink,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = tint
        e.currentTarget.style.transform = "scale(1.015)"
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = K.card
        e.currentTarget.style.transform = "scale(1)"
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: tint,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: K.serif, fontSize: 17, fontWeight: 600, color: K.ink }}>
          {title}
        </div>
        <div style={{ fontSize: 12.5, color: K.ink2, marginTop: 2, lineHeight: 1.4 }}>{sub}</div>
      </div>
    </button>
  )
}
