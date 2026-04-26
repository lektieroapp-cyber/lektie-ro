import { type Locale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"
import { PromiseDemoTabs } from "./PromiseDemoTabs"

// v3: forest bg (no gradient), italic highlight in soft leaf green, dimmed
// sand-glow bulb instead of the loud yellow one.
const COLORS = {
  forest: "#1E3526",
  leaf: "#C8D9A8",       // italic highlight on dark section
  textMuted: "#B8C4A8",
}

export function PromiseBand({ locale }: { locale: Locale }) {
  const m = getMessages(locale)
  const bodyParts = m.promise.body.split("{highlight}")
  const tabLabels = {
    math: m.promise.demoTabs?.math ?? "Matematik",
    dansk: m.promise.demoTabs?.dansk ?? "Dansk",
    eng: m.promise.demoTabs?.eng ?? "Engelsk",
  }

  return (
    <section
      id="how"
      style={{
        background: COLORS.forest,
        color: "#F4EADA",
        padding: "100px 32px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(600px 300px at 20% 50%, rgba(122,203,162,0.12), transparent), radial-gradient(500px 300px at 80% 50%, rgba(243,215,129,0.08), transparent)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          maxWidth: 920,
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Soft sand-glow bulb — dimmer than v2's yellow. */}
        <div
          aria-hidden
          style={{
            width: 70,
            height: 70,
            margin: "0 auto 20px",
            background: "radial-gradient(circle at 50% 45%, #FFE8A8 0%, #F3D781 45%, #D4B55A 100%)",
            borderRadius: 999,
            boxShadow: "0 0 60px rgba(243,215,129,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            animation: "bulbGlow 3s ease-in-out infinite",
          }}
        >
          💡
        </div>

        <h2
          style={{
            fontFamily: "var(--font-fraunces), Georgia, serif",
            fontWeight: 700,
            fontSize: "clamp(34px, 4.4vw, 56px)",
            lineHeight: 1.1,
            letterSpacing: "-0.8px",
            marginBottom: 18,
            color: "#F4EADA",
          }}
        >
          {m.promise.title}
          <br />{" "}
          <em
            style={{
              fontStyle: "italic",
              color: COLORS.leaf,
              fontWeight: 500,
            }}
          >
            {m.promise.titleItalic ?? "vi viser vejen"}
          </em>
        </h2>

        <p
          style={{
            fontSize: 18,
            color: COLORS.textMuted,
            maxWidth: 580,
            margin: "0 auto",
            lineHeight: 1.55,
          }}
        >
          {bodyParts[0]}
          <b style={{ color: "#F4EADA", fontWeight: 700 }}>{m.promise.highlight}</b>
          {bodyParts[1]}
        </p>

        <PromiseDemoTabs
          demoBadge={m.promise.demoBadge ?? "Live eksempel"}
          tabLabels={tabLabels}
        />
      </div>
    </section>
  )
}
