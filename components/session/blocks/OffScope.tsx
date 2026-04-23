"use client"

import { useState } from "react"
import { K } from "../design-tokens"

// Emitted by the AI when the kid's recent messages drift away from the
// current task (chatting about something unrelated, going down a rabbit hole
// on a different subject, etc.). Rendered inside Dani's bubble as a soft
// redirect — not a hard block, not a scolding. Two actions:
//   • Fortsæt — dismiss the notice, keep going on the same task (local state)
//   • Jeg er færdig — wrap this task up and go to celebration (parent handler)
//
// Intentionally gentle. The whole product philosophy is warm.

export function OffScope({
  note,
  onEndTask,
}: {
  note?: string
  onEndTask?: () => void
}) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 14,
        background: K.mintSoft,
        border: `1px solid ${K.mintEdge}`,
        marginTop: 4,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span aria-hidden style={{ fontSize: 16, lineHeight: 1, marginTop: 2 }}>
          🌱
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: K.mintDeep,
              letterSpacing: 0.3,
              textTransform: "uppercase",
            }}
          >
            Lidt væk fra opgaven
          </div>
          {note && (
            <div style={{ fontSize: 13, color: K.ink, lineHeight: 1.35, marginTop: 2 }}>
              {note}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          style={{
            border: `1.5px solid ${K.mintEdge}`,
            background: "transparent",
            color: K.ink,
            borderRadius: 999,
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Fortsæt
        </button>
        {onEndTask && (
          <button
            type="button"
            onClick={onEndTask}
            style={{
              border: "none",
              background: K.mint,
              color: K.ink,
              borderRadius: 999,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Jeg er færdig
          </button>
        )}
      </div>
    </div>
  )
}
