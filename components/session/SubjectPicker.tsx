"use client"

import { Companion } from "@/components/mascot/Companion"
import { useCompanion } from "@/components/mascot/CompanionContext"
import { DEFAULT_COMPANION } from "@/components/mascot/types"
import { K } from "./design-tokens"

type Subject = {
  key: string
  name: string
  tint: string
  dot: string
  hint: string
  glyph: React.ReactNode
}

const SUBJECTS: Subject[] = [
  {
    key: "matematik",
    name: "Matematik",
    tint: K.skySoft,
    dot: K.sky,
    hint: "Tal, former, plus og minus",
    glyph: <MathGlyph />,
  },
  {
    key: "dansk",
    name: "Dansk",
    tint: K.danskSoft,
    dot: K.dansk,
    hint: "Læsning, stavning og grammatik",
    glyph: <BookGlyph />,
  },
  {
    key: "engelsk",
    name: "Engelsk",
    tint: K.engelskSoft,
    dot: K.engelsk,
    hint: "Ord og sætninger på engelsk",
    glyph: <GlobeGlyph />,
  },
]

export function SubjectPicker({
  onPick,
  guess,
  guessConfidence,
  detectionNotes,
}: {
  onPick: (subject: string) => void
  /** Optional — AI's best guess if one exists. Rendered as a suggestion. */
  guess?: string | null
  guessConfidence?: "high" | "medium" | "low"
  detectionNotes?: string | null
}) {
  const { type: companionType } = useCompanion()

  const guessedSubject = SUBJECTS.find(s => s.key === guess)
  const showGuess = !!guessedSubject && guessConfidence === "low"

  const headline = showGuess
    ? `Er det ${guessedSubject.name.toLowerCase()}?`
    : "Hm, hvilket fag er det?"
  const sub = showGuess
    ? "Jeg er ikke helt sikker. Kan du bekræfte?"
    : "Jeg kan ikke helt se det ud fra billedet."

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
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <Companion type={companionType ?? DEFAULT_COMPANION} mood="curious" size={64} />
        <div style={{ flex: 1, paddingTop: 6 }}>
          <div style={{ fontFamily: K.serif, fontSize: 22, fontWeight: 600, color: K.ink, lineHeight: 1.2 }}>
            {headline}
          </div>
          <div style={{ fontSize: 14, color: K.ink2, marginTop: 4 }}>
            {sub}
          </div>
          {detectionNotes && (
            <div
              style={{
                marginTop: 10,
                padding: "8px 12px",
                background: K.butterSoft,
                borderRadius: 12,
                color: "#6A5210",
                fontSize: 12.5,
                lineHeight: 1.4,
              }}
            >
              {detectionNotes}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {SUBJECTS.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => onPick(s.key)}
            style={{
              border: "1px solid rgba(31,27,51,0.04)",
              background: K.card,
              borderRadius: 20,
              padding: "18px 14px",
              cursor: "pointer",
              textAlign: "left",
              boxShadow: K.shadowCard,
              animation: `pop 0.4s ${i * 0.06}s backwards`,
              transition: "transform 0.15s",
              fontFamily: "inherit",
              color: K.ink,
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-3px)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: 14,
                background: s.tint,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              {s.glyph}
            </div>
            <div style={{ fontFamily: K.serif, fontSize: 17, fontWeight: 600, color: K.ink }}>
              {s.name}
            </div>
            <div style={{ fontSize: 12, color: K.ink2, marginTop: 2, lineHeight: 1.3 }}>
              {s.hint}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function MathGlyph() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26">
      <text x="13" y="12" fontSize="9" fontWeight="700" fill={K.sky} textAnchor="middle" fontFamily={K.serif}>
        1 2
      </text>
      <text x="13" y="22" fontSize="9" fontWeight="700" fill={K.sky} textAnchor="middle" fontFamily={K.serif}>
        3 4
      </text>
    </svg>
  )
}
function BookGlyph() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <path d="M4 5 Q13 3 22 5 L22 21 Q13 19 4 21 Z" stroke="#4F8E6B" strokeWidth="2" fill="#fff" />
      <path d="M13 4 L13 20" stroke="#4F8E6B" strokeWidth="1.5" />
    </svg>
  )
}
function GlobeGlyph() {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 800,
        color: "#4F8E6B",
        letterSpacing: 0.5,
        fontFamily: K.serif,
      }}
    >
      GB
    </span>
  )
}
