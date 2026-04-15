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
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* Two-figure mark — viewBox crops local coords x=39–148, y=23–148 */}
          <svg width="54" height="62" viewBox="39 23 109 125">
            <ellipse cx="66" cy="108" rx="26" ry="44"
                     transform="rotate(-13 66 108)" fill="#E98873"/>
            <ellipse cx="126" cy="94" rx="21" ry="37"
                     transform="rotate(13 126 94)" fill="#7AAEC8"/>
            <path d="M100,114 L72,122 L74,146 C82,152 92,154 100,148Z" fill="#2E3E56"/>
            <path d="M100,114 L128,122 L126,146 C118,152 108,154 100,148Z" fill="#2E3E56"/>
            <circle cx="70" cy="44" r="21" fill="#E98873"/>
            <circle cx="122" cy="41" r="17" fill="#7AAEC8"/>
          </svg>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#1E2A3A" }}>
            <span>Lektie</span>
            <span style={{ color: "#E98873" }}>Ro</span>
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
