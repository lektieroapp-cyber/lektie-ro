"use client"

import { useEffect, useState } from "react"
import {
  clearCostEvents,
  getCostEvents,
  subscribeCostEvents,
  totalsFromEvents,
} from "@/lib/dev-cost"

// Floating dev-only pill that shows the running cost of the current session
// based on REAL Azure usage (not estimates). Each API consumer pushes a
// CostEvent into lib/dev-cost when its call returns; this component just
// renders the running totals.
//
// Rendered by SessionFlow only when showDevTools is true. Click to expand
// and see the per-stage breakdown + reset button.

export function SessionCostPanel() {
  const [, force] = useState(0)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    return subscribeCostEvents(() => force(n => n + 1))
  }, [])

  const events = getCostEvents()
  const t = totalsFromEvents(events)
  const hasAny = events.length > 0

  return (
    <div
      style={{
        position: "fixed",
        bottom: 14,
        right: 14,
        zIndex: 95,
        fontFamily: "monospace, ui-monospace",
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        title="Klik for at vise/skjule omkostnings-detaljer"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderRadius: 999,
          border: "2px solid rgba(255,255,255,0.8)",
          background: hasAny ? "#1F2D1A" : "rgba(31,45,26,0.7)",
          color: "#fff",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 0.3,
          cursor: "pointer",
          boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
        }}
      >
        <span
          aria-hidden
          style={{
            background: "#7ACBA2",
            color: "#1F2D1A",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 0.5,
            padding: "2px 6px",
            borderRadius: 999,
          }}
        >
          DEV
        </span>
        <span>{fmtKr(t.totalDkk)}</span>
        <span style={{ opacity: 0.55, fontSize: 11 }}>
          ${t.totalUsd.toFixed(4)}
        </span>
      </button>

      {expanded && (
        <div
          style={{
            marginTop: 8,
            background: "#1F2D1A",
            color: "#fff",
            borderRadius: 12,
            padding: "12px 14px",
            minWidth: 240,
            boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
            fontSize: 11,
            lineHeight: 1.5,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 8,
              opacity: 0.7,
            }}
          >
            <span>SESSION OMKOSTNING</span>
            <button
              type="button"
              onClick={() => clearCostEvents()}
              style={{
                border: "none",
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
                fontSize: 10,
                padding: "2px 8px",
                borderRadius: 999,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              nulstil
            </button>
          </div>

          <Row label="Vision" usd={t.visionUsd} count={t.counts.vision} />
          <Row label="Hint" usd={t.hintUsd} count={t.counts.hint} />
          <Row label="STT" usd={t.sttUsd} count={t.counts.stt} />
          <Row label="TTS" usd={t.ttsUsd} count={t.counts.tts} />

          <div
            style={{
              marginTop: 8,
              paddingTop: 8,
              borderTop: "1px solid rgba(255,255,255,0.15)",
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 700,
            }}
          >
            <span>I alt</span>
            <span>
              {fmtKr(t.totalDkk)}{" "}
              <span style={{ opacity: 0.55, fontWeight: 400 }}>
                ${t.totalUsd.toFixed(5)}
              </span>
            </span>
          </div>

          <div style={{ marginTop: 8, opacity: 0.5, fontSize: 10 }}>
            Rå Azure pay-as-you-go pris. Live, ikke estimat.
          </div>
        </div>
      )}
    </div>
  )
}

function Row({
  label,
  usd,
  count,
}: {
  label: string
  usd: number
  count: number
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        opacity: count === 0 ? 0.35 : 1,
      }}
    >
      <span>
        {label}{" "}
        <span style={{ opacity: 0.5 }}>
          ({count})
        </span>
      </span>
      <span>{fmtKr(usd * 7)}</span>
    </div>
  )
}

function fmtKr(dkk: number): string {
  if (dkk === 0) return "0 øre"
  if (dkk < 1) return `${(dkk * 100).toFixed(2)} øre`
  return `${dkk.toFixed(2)} kr.`
}
