import { type Locale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"
import { PromiseDemoTabs } from "./PromiseDemoTabs"

const COLORS = {
  ink: "#1F2D4A",
  butter: "#F2C75A",
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
        background: "linear-gradient(180deg, #1F2D4A 0%, #2A3B5F 100%)",
        color: "#fff",
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
            "radial-gradient(600px 300px at 20% 50%, rgba(232,132,106,0.15), transparent), radial-gradient(500px 300px at 80% 50%, rgba(242,199,90,0.1), transparent)",
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
        {/* Glowing bulb */}
        <div
          aria-hidden
          style={{
            width: 60,
            height: 60,
            margin: "0 auto 24px",
            background: "radial-gradient(circle at 40% 40%, #FFDE8C, #F2C75A)",
            borderRadius: "50% 50% 50% 50% / 45% 45% 55% 55%",
            boxShadow:
              "0 0 40px rgba(242,199,90,0.5), 0 0 80px rgba(242,199,90,0.3)",
            position: "relative",
            animation: "bulbGlow 3s ease-in-out infinite",
          }}
        >
          <span
            style={{
              position: "absolute",
              bottom: -8,
              left: "50%",
              transform: "translateX(-50%)",
              width: 24,
              height: 8,
              background: "#C9A350",
              borderRadius: "2px 2px 4px 4px",
              display: "block",
            }}
          />
        </div>

        <h2
          style={{
            fontFamily: "var(--font-fraunces), Georgia, serif",
            fontWeight: 700,
            fontSize: "clamp(34px, 4.4vw, 56px)",
            lineHeight: 1.1,
            letterSpacing: "-0.8px",
            marginBottom: 18,
            color: "#fff",
          }}
        >
          {m.promise.title}
          <br />—{" "}
          <em
            style={{
              fontStyle: "italic",
              color: COLORS.butter,
              fontWeight: 600,
            }}
          >
            {m.promise.titleItalic ?? "vi viser vejen"}
          </em>
        </h2>

        <p
          style={{
            fontSize: 18,
            color: "rgba(255,255,255,0.75)",
            maxWidth: 580,
            margin: "0 auto",
            lineHeight: 1.55,
          }}
        >
          {bodyParts[0]}
          <b style={{ color: "#fff", fontWeight: 700 }}>{m.promise.highlight}</b>
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
