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
          <div
            style={{
              fontSize: 11,
              color: "#556048",
              padding: "0 4px",
              lineHeight: 1.4,
            }}
          >
            Ti-rammen er fuld, og der er <b>3 tilbage</b>. Hvad bliver det i alt?
          </div>

          {/* Buttons pinned to bottom — mint CTA with ink text (v3 contrast rule). */}
          <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
            <div
              style={{
                flex: 1,
                height: 40,
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                background: "#fff",
                color: "#1F2D1A",
                border: "1.5px solid rgba(31,45,26,0.12)",
              }}
            >
              Prøv selv
            </div>
            <div
              style={{
                flex: 1,
                height: 40,
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 800,
                background: "#7ACBA2",
                color: "#1F2D1A",
                boxShadow: "0 4px 12px -4px rgba(79,142,107,0.35)",
              }}
            >
              Tjek svar
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
