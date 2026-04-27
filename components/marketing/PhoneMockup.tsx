import { Companion } from "@/components/mascot/Companion"

// Floating phone shown in the hero right column. Static mockup of the guide
// screen — Dani + speech bubble + ten-frame with one clay focus cluster.
// v3 palette: mint fill, clay focus (the single warm accent), mint-soft chips.
export function PhoneMockup() {
  return (
    <div
      className="relative flex justify-center"
      style={{
        marginBottom: -60,
        animation: "heroFloat 6s ease-in-out infinite",
      }}
    >
      <div
        style={{
          width: 260,
          height: 520,
          background: "#fff",
          borderRadius: 42,
          boxShadow: "0 40px 80px -20px rgba(31,45,26,0.35), 0 0 0 8px #1F2D1A",
          padding: "20px 16px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Dynamic island */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            width: 90,
            height: 22,
            background: "#1F2D1A",
            borderRadius: 20,
          }}
        />

        <div
          style={{
            marginTop: 30,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            height: "calc(100% - 30px)",
          }}
        >
          {/* Dani greeting */}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 6 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 999,
                background: "#E4F2EB",
                border: "1.5px solid #C5E3D1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                overflow: "hidden",
              }}
            >
              <Companion type="lion" size={38} />
            </div>
            <div
              style={{
                background: "#E4F2EB",
                padding: "10px 12px",
                borderRadius: "4px 14px 14px 14px",
                fontSize: 12,
                color: "#1F2D1A",
                lineHeight: 1.35,
                flex: 1,
              }}
            >
              Okay! Lad os kigge på <b>8 + 5</b>. Hvor mange mangler du for at fylde ti-rammen?
            </div>
          </div>

          {/* Task pill */}
          <div
            style={{
              background: "#fff",
              border: "1px solid rgba(31,45,26,0.08)",
              borderRadius: 14,
              padding: "10px 12px",
              fontFamily: "var(--font-fraunces), Georgia, serif",
              fontSize: 15,
              fontWeight: 600,
              color: "#1F2D1A",
            }}
          >
            Regn ud: 8 + 5
            <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
              {/* Chip colours mirror the block colours below so the
                  decomposition 8 + 2 + 3 reads visually:
                  mint "8" → 8 mint cells, clay "2" → 2 clay cells in the
                  ten-frame, clay "3" → 3 clay cells in the overflow row. */}
              <NumChip bg="#E4F2EB" fg="#4F8E6B">8</NumChip>
              <Plus />
              <NumChip bg="#F4DBD1" fg="#8F4A38">2</NumChip>
              <Plus />
              <NumChip bg="#F4DBD1" fg="#8F4A38">3</NumChip>
            </div>
          </div>

          {/* Ten-frame — 8 mint filled + 2 clay focus (the cells needed to
              complete ten). Clay is the single warm accent; the 2 here and
              the 3 in the overflow row below share the same conceptual
              "the +5 being decomposed" role. */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 4,
              padding: 10,
              background: "#fff",
              border: "1px solid rgba(31,45,26,0.06)",
              borderRadius: 12,
            }}
          >
            {[..."aaaaaaaaff"].map((t, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: "1",
                  borderRadius: 6,
                  border: `1.5px solid ${t === "a" ? "#4F8E6B" : "#A85E48"}`,
                  background: t === "a" ? "#7ACBA2" : "#C97962",
                }}
              />
            ))}
          </div>
          {/* Overflow row — 3 clay cells (the "3" leftover after filling the
              ten) + 2 empty slots. Colours match the clay "3" chip above. */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 4,
              padding: 6,
              borderRadius: 10,
              border: "1.5px dashed rgba(31,45,26,0.2)",
              background: "#EDE2CD",
              marginTop: -4,
            }}
          >
            {[..."fffxx"].map((t, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: "1",
                  borderRadius: 5,
                  border: `1.5px solid ${t === "f" ? "#A85E48" : "rgba(31,45,26,0.15)"}`,
                  background: t === "f" ? "#C97962" : "transparent",
                }}
              />
            ))}
          </div>
          {/* Second turn — Dani's follow-up after the kid's voice answer.
              Re-uses the same bubble visual as the first turn so the chat
              flow reads as one ongoing conversation. */}
          <div
            style={{
              background: "#E4F2EB",
              padding: "10px 12px",
              borderRadius: "14px 14px 14px 4px",
              fontSize: 11.5,
              color: "#1F2D1A",
              lineHeight: 1.4,
              alignSelf: "stretch",
            }}
          >
            <b>Godt set!</b> Nu har du de 10 og 3 tilbage. Hvad bliver resultatet?
          </div>

          {/* Voice input bar pinned to bottom — mic on the left, live waveform
              in the middle, mint send arrow on the right. Mirrors the kid
              voice-mode UI so the marketing phone reads as the real product. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: "auto",
              padding: "6px 6px 6px 4px",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                background: "#EDE2CD",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#556048",
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="3" width="6" height="12" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0" strokeLinecap="round" />
                <path d="M12 18v3" strokeLinecap="round" />
                <path d="M9 21h6" strokeLinecap="round" />
              </svg>
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 3,
                height: 36,
                padding: "0 12px",
                background: "#fff",
                borderRadius: 999,
                border: "1px solid rgba(31,45,26,0.06)",
              }}
              aria-hidden
            >
              {[6, 10, 14, 18, 22, 18, 14, 10, 14, 18, 14, 10, 6].map((h, i) => (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    width: 2.5,
                    height: h,
                    borderRadius: 2,
                    background: "#7ACBA2",
                  }}
                />
              ))}
            </div>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                background: "#7ACBA2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                flexShrink: 0,
                boxShadow: "0 4px 12px -4px rgba(79,142,107,0.45)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Colored number pill used in the task card — bg/fg mirror the ten-frame
// block colors so each number maps visually to its squares below.
function NumChip({
  bg,
  fg,
  children,
}: {
  bg: string
  fg: string
  children: React.ReactNode
}) {
  return (
    <span
      style={{
        background: bg,
        color: fg,
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        fontFamily: "var(--font-nunito), sans-serif",
        minWidth: 24,
        textAlign: "center",
      }}
    >
      {children}
    </span>
  )
}

function Plus() {
  return <span style={{ color: "#8A9280", fontWeight: 700 }}>+</span>
}
