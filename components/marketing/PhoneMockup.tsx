import { Companion } from "@/components/mascot/Companion"

// Floating phone shown in the hero right column. Static mockup of the guide
// screen — Dani + speech bubble + a ten-frame glimpse + two CTAs.
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
          boxShadow: "0 40px 80px -20px rgba(31,45,74,0.35), 0 0 0 8px #1F2D4A",
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
            background: "#1F2D4A",
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
                background: "#FBEBC2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 4px 10px -4px rgba(232,160,74,0.5)",
                overflow: "hidden",
              }}
            >
              <Companion type="lion" size={38} />
            </div>
            <div
              style={{
                background: "#E6F0F7",
                padding: "10px 12px",
                borderRadius: "4px 14px 14px 14px",
                fontSize: 12,
                color: "#1F2D4A",
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
              border: "1px solid rgba(31,45,74,0.08)",
              borderRadius: 14,
              padding: "10px 12px",
              fontFamily: "var(--font-fraunces), Georgia, serif",
              fontSize: 15,
              fontWeight: 600,
              color: "#1F2D4A",
            }}
          >
            Regn ud: 8 + 5
            <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
              <NumChip bg="#FDE4D8" fg="#B9452D">8</NumChip>
              <Plus />
              <NumChip bg="#FBEBC2" fg="#7A5A10">2</NumChip>
              <Plus />
              <NumChip bg="#FBEBC2" fg="#7A5A10">3</NumChip>
            </div>
          </div>

          {/* Ten-frame: 8 coral + 2 butter fills the ten. */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 4,
              padding: 10,
              background: "#fff",
              border: "1px solid rgba(31,45,74,0.06)",
              borderRadius: 12,
            }}
          >
            {[..."aaaaaaaabb"].map((t, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: "1",
                  borderRadius: 6,
                  border: `1.5px solid ${t === "a" ? "#E8846A" : "#F2C75A"}`,
                  background: t === "a" ? "#E8846A" : "#F2C75A",
                }}
              />
            ))}
          </div>
          {/* Overflow row: 3 butter cells spill past the ten. */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 4,
              padding: 6,
              borderRadius: 10,
              border: "1.5px dashed #F2C75A",
              background: "rgba(251,235,194,0.35)",
              marginTop: -4,
            }}
          >
            {[..."bbbxx"].map((t, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: "1",
                  borderRadius: 5,
                  border: `1.5px solid ${t === "b" ? "#F2C75A" : "rgba(31,45,74,0.13)"}`,
                  background: t === "b" ? "#F2C75A" : "transparent",
                }}
              />
            ))}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#4A5A7A",
              padding: "0 4px",
              lineHeight: 1.4,
            }}
          >
            Ti-rammen er fuld, og der er <b>3 tilbage</b>. Hvad bliver det i alt?
          </div>

          {/* Buttons pinned to bottom */}
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
                color: "#1F2D4A",
                border: "1.5px solid rgba(31,45,74,0.12)",
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
                fontWeight: 700,
                background: "#E8846A",
                color: "#fff",
                boxShadow: "0 4px 12px -4px rgba(232,132,106,0.5)",
              }}
            >
              Opgave løst ✓
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
  return <span style={{ color: "#8A95AD", fontWeight: 700 }}>+</span>
}
