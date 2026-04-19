"use client"

import { useState } from "react"
import { Companion } from "@/components/mascot/Companion"
import type { CompanionType } from "@/components/mascot/types"

const COLORS = {
  cream2: "#F5EADA",
  ink: "#1F2D4A",
  ink2: "#4A5A7A",
  coral: "#E8846A",
  coralSoft: "#FDE4D8",
  butterSoft: "#FBEBC2",
  skySoft: "#E6F0F7",
}

type TabId = "math" | "dansk" | "eng"

export function PromiseDemoTabs({
  demoBadge,
  tabLabels,
}: {
  demoBadge: string
  tabLabels: Record<TabId, string>
}) {
  const [tab, setTab] = useState<TabId>("math")

  return (
    <>
      <div
        role="tablist"
        style={{
          marginTop: 48,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 24,
          padding: 8,
          display: "inline-flex",
          gap: 4,
        }}
      >
        {(["math", "dansk", "eng"] as TabId[]).map(id => {
          const active = tab === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              style={{
                padding: "10px 20px",
                borderRadius: 18,
                fontWeight: 700,
                fontSize: 14,
                color: active ? COLORS.ink : "rgba(255,255,255,0.7)",
                cursor: "pointer",
                background: active ? "#fff" : "transparent",
                border: "none",
                fontFamily: "inherit",
                transition: "all 0.2s",
              }}
            >
              {tabLabels[id]}
            </button>
          )
        })}
      </div>

      <div
        style={{
          margin: "32px auto 0",
          maxWidth: 760,
          background: "#fff",
          borderRadius: 28,
          padding: 36,
          boxShadow: "0 40px 80px -20px rgba(0,0,0,0.4)",
          textAlign: "left",
          color: COLORS.ink,
          minHeight: 260,
          position: "relative",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: -14,
            left: 32,
            background: COLORS.coral,
            color: "#fff",
            padding: "6px 14px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            boxShadow: "0 6px 14px -4px rgba(232,132,106,0.5)",
          }}
        >
          {demoBadge}
        </span>

        {tab === "math" && <MathDemo />}
        {tab === "dansk" && <DanskDemo />}
        {tab === "eng" && <EngDemo />}
      </div>
    </>
  )
}

// ─── Demos ─────────────────────────────────────────────────────

function MathDemo() {
  return (
    <>
      <DemoRow
        type="lion"
        text="Regn ud: <b>24 + 17</b>. Hvad tænker du, hvis vi deler tallene op?"
      />
      <KidRow text="20 + 10 er 30. Så 4 + 7 er 11…" tint={COLORS.coralSoft} />
      <DemoRow
        type="lion"
        text="Skønt! Nu har du to bidder: 30 og 11. Læg dem sammen — <b>du</b> er der næsten."
      />
    </>
  )
}

function DanskDemo() {
  return (
    <>
      <DemoRow
        type="rabbit"
        text="Ordet er <b>kaniner</b>. Kan du klappe det ud i stavelser?"
      />
      <div
        style={{
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 48,
            flexShrink: 0,
            display: "flex",
            justifyContent: "center",
            paddingTop: 8,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              background: COLORS.cream2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              color: COLORS.ink2,
              fontSize: 13,
            }}
          >
            K
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <SyllableChip bg={COLORS.coralSoft}>ka</SyllableChip>
          <SyllableChip bg={COLORS.butterSoft}>ni</SyllableChip>
          <SyllableChip bg={COLORS.skySoft}>ner</SyllableChip>
        </div>
      </div>
      <DemoRow
        type="rabbit"
        text="Præcis! Nu kan du læse det højt — én stavelse ad gangen."
      />
    </>
  )
}

function EngDemo() {
  return (
    <>
      <DemoRow
        type="owl"
        text={'"Yesterday I <b>_____</b> to the park." Er det nu, før eller senere?'}
      />
      <div
        style={{
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
          marginBottom: 16,
        }}
      >
        <div style={{ width: 48, flexShrink: 0 }} />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <TimelinePill>før ←</TimelinePill>
          <TimelinePill active>Yesterday</TimelinePill>
          <TimelinePill>→ senere</TimelinePill>
        </div>
      </div>
      <DemoRow
        type="owl"
        text={'Yes! "Yesterday" er før — så hvad skal der ske med <b>go</b>?'}
      />
    </>
  )
}

// ─── Shared bits ───────────────────────────────────────────────

function DemoRow({ type, text }: { type: CompanionType; text: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 999,
          background: "#FBEBC2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: "0 4px 10px -4px rgba(232,160,74,0.5)",
          overflow: "hidden",
        }}
      >
        <Companion type={type} size={44} />
      </div>
      <div
        style={{
          background: COLORS.skySoft,
          padding: "12px 14px",
          borderRadius: "4px 14px 14px 14px",
          fontSize: 14,
          color: COLORS.ink,
          lineHeight: 1.45,
          flex: 1,
        }}
        dangerouslySetInnerHTML={{ __html: text }}
      />
    </div>
  )
}

function KidRow({ text, tint }: { text: string; tint: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          width: 48,
          flexShrink: 0,
          display: "flex",
          justifyContent: "center",
          paddingTop: 8,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            background: COLORS.cream2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            color: COLORS.ink2,
            fontSize: 13,
          }}
        >
          K
        </div>
      </div>
      <div
        style={{
          background: tint,
          padding: "12px 14px",
          borderRadius: "4px 14px 14px 14px",
          fontSize: 14,
          color: COLORS.ink,
          lineHeight: 1.45,
        }}
      >
        {text}
      </div>
    </div>
  )
}

function SyllableChip({
  bg,
  children,
}: {
  bg: string
  children: React.ReactNode
}) {
  return (
    <span
      style={{
        background: bg,
        padding: "8px 14px",
        borderRadius: 12,
        fontFamily: "var(--font-fraunces), Georgia, serif",
        fontWeight: 700,
        color: COLORS.ink,
      }}
    >
      {children}
    </span>
  )
}

function TimelinePill({
  active,
  children,
}: {
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <span
      style={{
        padding: "6px 12px",
        border: active ? "none" : "1.5px solid rgba(31,45,74,0.1)",
        borderRadius: 10,
        fontSize: 13,
        color: active ? "#fff" : COLORS.ink2,
        background: active ? COLORS.coral : "transparent",
        fontWeight: active ? 700 : 500,
      }}
    >
      {children}
    </span>
  )
}
