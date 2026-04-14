import { ImageResponse } from "next/og"

export const alt = "LektieRo — Ro om lektierne. Plads til familien."
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: "linear-gradient(135deg, #FBF5EE 0%, #FBF5EE 60%, #FCE9DF 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              background: "rgba(216, 92, 72, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#D85C48",
              fontSize: 32,
            }}
          >
            ♥
          </div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#1E2A3A" }}>
            <span>Lektie</span>
            <span style={{ color: "#D85C48" }}>Ro</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 96,
              lineHeight: 1.05,
              fontWeight: 700,
              color: "#1E2A3A",
              letterSpacing: "-0.02em",
            }}
          >
            <span>Ro om lektierne.</span>
            <span>Plads til familien.</span>
          </div>
          <div style={{ display: "flex", fontSize: 32, color: "rgba(30, 42, 58, 0.7)" }}>
            AI-lektiehjælp til danske folkeskoleelever. Vi guider, men giver aldrig facit.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            background: "#E98873",
            color: "white",
            padding: "12px 24px",
            borderRadius: 999,
            fontSize: 24,
            fontWeight: 600,
          }}
        >
          Tidlig adgang åben → lektiero.dk
        </div>
      </div>
    ),
    size
  )
}
