import Image from "next/image"
import { type Locale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"
import { PhoneMockup } from "./PhoneMockup"
import { WaitlistForm } from "./WaitlistForm"

// v3 palette — mint quiet brand, ink voice, no yellow/sky/coral chrome.
const COLORS = {
  cream: "#F5EDDE",
  cream2: "#EDE2CD",
  ink: "#1F2D1A",
  ink2: "#556048",
  ink3: "#8A9280",
  mint: "#7ACBA2",
  mintDeep: "#4F8E6B",
  mintSoft: "#E4F2EB",
  mintEdge: "#C5E3D1",
  clay: "#C97962",
  claySoft: "#F4DBD1",
}

export function Hero({ locale }: { locale: Locale }) {
  const m = getMessages(locale)
  // Three perks read as a horizontal row of mint-deep checks under the CTA.
  // Take the first three so the row never wraps awkwardly on the design width.
  const perks: string[] = (m.hero.perks ?? []).slice(0, 3)

  return (
    <section
      style={{
        maxWidth: 1240,
        margin: "0 auto",
        padding: "72px 32px 112px",
        position: "relative",
        display: "grid",
        gridTemplateColumns: "1.05fr 1fr",
        gap: 56,
        alignItems: "center",
      }}
      className="hero-grid"
    >
      {/* ─── Left column ─────────────────────────────────────────── */}
      <div style={{ position: "relative" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            borderRadius: 999,
            background: COLORS.mintSoft,
            color: COLORS.mintDeep,
            fontSize: 13,
            fontWeight: 700,
            border: `1px solid ${COLORS.mintEdge}`,
          }}
        >
          <span aria-hidden style={{ fontSize: 13 }}>🌱</span>
          {m.hero.badge}
        </span>

        <h1
          className="hero-title"
          style={{
            fontFamily: "var(--font-fraunces), Georgia, serif",
            fontWeight: 700,
            fontSize: "clamp(40px, 5.2vw, 68px)",
            lineHeight: 1.02,
            letterSpacing: "-1.5px",
            color: COLORS.ink,
            margin: "24px 0 20px",
            textWrap: "balance" as const,
          }}
        >
          {m.hero.titleLine1}
          <br />
          {m.hero.titleLine2}
          <em
            style={{
              fontStyle: "italic",
              fontWeight: 500,
              color: COLORS.mintDeep,
            }}
          >
            {m.hero.titleItalic ?? "familien."}
          </em>
        </h1>

        <p
          className="hero-subtitle"
          style={{
            fontSize: 18,
            color: COLORS.ink2,
            maxWidth: 480,
            lineHeight: 1.55,
            margin: "0 0 28px",
          }}
        >
          {m.hero.subtitle}
        </p>

        {/* Inline waitlist pill — email field + mint-deep CTA inside one
            rounded shell. Replaces the separate signup card from the v2
            layout so the primary action sits with the message. */}
        <div className="hero-cta-wrap" style={{ position: "relative", maxWidth: 480 }}>
          <WaitlistForm locale={locale} variant="inline" />
          {/* Hand-drawn arrow nudges the eye into the CTA. The curve
              sweeps in from the upper-right and lands at the "Skriv mig
              op" button — arrowhead points down-left at the button so the
              user reads it as "tap here", not as a flourish leading away.
              Hidden below the breakpoint where the columns stack. */}
          <span
            aria-hidden
            className="hero-arrow"
            style={{
              position: "absolute",
              right: -74,
              // Pulled up so the arrowhead (at SVG y=50) lands on the
              // vertical center of the "Skriv mig op" button instead of
              // below it. Curve extends a bit above the card top, which
              // reads fine against the cream background.
              top: -23,
              color: COLORS.ink2,
              opacity: 0.55,
            }}
          >
            <svg width="64" height="60" viewBox="0 0 64 60" fill="none">
              {/* Curve start (top-right) → end (bottom-left at 4,50) */}
              <path
                d="M56 8 C 36 28 24 50 4 50"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                fill="none"
              />
              {/* Arrowhead at (4, 50) pointing down-and-left at the CTA */}
              <path
                d="M 12 44 L 4 50 L 10 56"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </span>
        </div>

        {/* Perk row — three mint-deep checks under the CTA. */}
        {perks.length > 0 && (
          <div
            className="hero-perks"
            style={{
              display: "flex",
              gap: 22,
              marginTop: 22,
              flexWrap: "wrap",
            }}
          >
            {perks.map(label => (
              <span
                key={label}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13.5,
                  color: COLORS.ink2,
                  fontWeight: 600,
                }}
              >
                <CheckCircle />
                {label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ─── Right column: phone + lion + plant ────────────────── */}
      <div className="hero-right" style={{ position: "relative", minHeight: 620 }}>
        {/* Sparkle + paper-note decorations float behind the phone. The
            lion + plant cluster sits to the right of the phone, anchored
            to the bottom of the right column. The .hero-decor class lets
            the mobile media query hide them in one rule so they don't
            overflow the narrow viewport. */}
        <Sparkle className="hero-decor" style={{ position: "absolute", top: 20, left: -10, opacity: 0.55 }} />
        <Sparkle small className="hero-decor" style={{ position: "absolute", top: 120, right: 30, opacity: 0.55 }} />
        <PaperPlane className="hero-decor" style={{ position: "absolute", top: 60, right: -10, opacity: 0.6 }} />
        <PaperNote className="hero-decor" style={{ position: "absolute", top: 100, left: -28, opacity: 0.7 }} />
        <DottedSwoosh className="hero-decor" style={{ position: "absolute", top: 180, right: 0, opacity: 0.5 }} />

        <div className="hero-phone-wrap" style={{ display: "flex", justifyContent: "center", position: "relative", zIndex: 1 }}>
          <PhoneMockup />
        </div>

        <div
          className="hero-lion-wrap"
          aria-hidden
          style={{
            position: "absolute",
            right: -280,
            bottom: -48,
            width: 560,
            zIndex: 2,
            pointerEvents: "none",
          }}
        >
          <Image
            src="/hero_lion.webp"
            alt=""
            width={1536}
            height={1024}
            priority
            sizes="560px"
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </div>
      </div>

    </section>
  )
}

function CheckCircle() {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 18,
        height: 18,
        borderRadius: 999,
        border: `1.5px solid ${COLORS.mintEdge}`,
        color: COLORS.mintDeep,
        flexShrink: 0,
      }}
    >
      <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
        <path
          d="M2 7l3 3 7-7"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

type DecorProps = {
  style?: React.CSSProperties
  className?: string
}

function Sparkle({ small, style, className }: DecorProps & { small?: boolean }) {
  const size = small ? 14 : 18
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" style={style} className={className} aria-hidden>
      <path
        d="M9 1v6M9 11v6M1 9h6M11 9h6"
        stroke={COLORS.ink3}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

function PaperPlane({ style, className }: DecorProps) {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={style} className={className} aria-hidden>
      <path
        d="M4 22 L40 6 L34 38 L24 26 L4 22 Z"
        stroke={COLORS.ink3}
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill={COLORS.cream}
      />
      <path d="M24 26 L34 16" stroke={COLORS.ink3} strokeWidth="1.2" />
    </svg>
  )
}

function PaperNote({ style, className }: DecorProps) {
  return (
    <svg width="46" height="56" viewBox="0 0 46 56" fill="none" style={style} className={className} aria-hidden>
      <path
        d="M5 6 H 32 L 41 15 V 50 H 5 Z"
        fill="#FFF8EA"
        stroke={COLORS.ink3}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M32 6 V 15 H 41" stroke={COLORS.ink3} strokeWidth="1.2" fill="none" />
      <path d="M11 22 L 35 22 M 11 28 L 35 28 M 11 34 L 30 34" stroke={COLORS.ink3} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function DottedSwoosh({ style, className }: DecorProps) {
  return (
    <svg width="120" height="50" viewBox="0 0 120 50" fill="none" style={style} className={className} aria-hidden>
      <path
        d="M2 30 C 30 6 70 6 118 30"
        stroke={COLORS.ink3}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="2 6"
        fill="none"
      />
    </svg>
  )
}
