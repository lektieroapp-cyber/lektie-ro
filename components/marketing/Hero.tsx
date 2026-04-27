import type { ReactNode } from "react"
import Link from "next/link"
import { type Locale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"
import { localePath } from "@/lib/i18n/routes"
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
  const perks: string[] = m.hero.perks ?? []

  return (
    <section
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "80px 32px 120px",
        position: "relative",
        display: "grid",
        gridTemplateColumns: "1.15fr 1fr",
        gap: 64,
        alignItems: "center",
      }}
      className="hero-grid"
    >
      {/* ─── Left column ─────────────────────────────────────────── */}
      <div>
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
          style={{
            fontSize: 18,
            color: COLORS.ink2,
            maxWidth: 440,
            lineHeight: 1.55,
          }}
        >
          {m.hero.subtitle}
        </p>

        {/* Promise chips — uniform style, mint-deep glyphs per value */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 28,
            flexWrap: "wrap",
          }}
        >
          <Chip label={m.hero.values.one} icon={<HeartIcon />} />
          <Chip label={m.hero.values.two} icon={<LeafIcon />} />
          <Chip label={m.hero.values.three} icon={<SparkIcon />} />
        </div>

        <a
          href="#how"
          style={{
            marginTop: 32,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontWeight: 600,
            color: COLORS.ink2,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          {m.hero.learnMore}
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path
              d="M3 5l4 4 4-4"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </div>

      {/* ─── Right column: phone + signup ───────────────────────── */}
      <div className="hero-right" style={{ position: "relative" }}>
        <PhoneMockup />

        <div
          id="venteliste"
          className="hero-signup"
          style={{
            background: "#fff",
            borderRadius: 24,
            padding: 28,
            boxShadow:
              "0 30px 60px -20px rgba(31,45,26,0.18), 0 0 0 1px rgba(31,45,26,0.04)",
            position: "relative",
            marginLeft: 40,
          }}
        >
          <h3
            style={{
              fontFamily: "var(--font-fraunces), Georgia, serif",
              fontSize: 26,
              fontWeight: 700,
              color: COLORS.ink,
              letterSpacing: "-0.5px",
              marginBottom: 6,
            }}
          >
            {m.waitlist.title}
          </h3>
          <p
            style={{
              fontSize: 13.5,
              color: COLORS.ink2,
              marginBottom: 18,
              lineHeight: 1.5,
            }}
          >
            {m.waitlist.subtitle}
          </p>

          <WaitlistForm locale={locale} />

          {/* Perks grid — mint-deep checks */}
          {perks.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginTop: 16,
              }}
            >
              {perks.map(label => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    color: COLORS.ink2,
                    fontWeight: 600,
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    style={{ color: COLORS.mintDeep, flexShrink: 0 }}
                  >
                    <path
                      d="M2 7l3 3 7-7"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {label}
                </div>
              ))}
            </div>
          )}

          <p
            style={{
              textAlign: "center",
              fontSize: 12.5,
              color: COLORS.ink3,
              marginTop: 14,
            }}
          >
            {m.waitlist.existingHint}{" "}
            <Link
              href={localePath(locale, "login")}
              style={{ color: COLORS.mintDeep, fontWeight: 700 }}
            >
              {m.waitlist.existingLink}
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            padding: 48px 24px 80px !important;
            gap: 48px !important;
          }
          .hero-signup {
            margin-left: 0 !important;
          }
          .hero-right {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 24px;
          }
        }
      `}</style>
    </section>
  )
}

function Chip({
  label,
  icon,
}: {
  label: string
  icon: ReactNode
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 16px 9px 12px",
        borderRadius: 999,
        background: "#fff",
        border: `1px solid ${COLORS.mintEdge}`,
        fontWeight: 600,
        fontSize: 13.5,
        letterSpacing: "-0.1px",
        color: COLORS.ink,
        boxShadow: "0 1px 2px rgba(31,45,26,0.04), 0 4px 12px rgba(31,45,26,0.04)",
      }}
    >
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 22,
          height: 22,
          borderRadius: 999,
          background: COLORS.mintSoft,
          color: COLORS.mintDeep,
        }}
      >
        {icon}
      </span>
      {label}
    </span>
  )
}

function HeartIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
      <path
        d="M7 12s-4.5-2.7-4.5-6a2.5 2.5 0 0 1 4.5-1.5A2.5 2.5 0 0 1 11.5 6c0 3.3-4.5 6-4.5 6z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LeafIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
      <path
        d="M11.5 2.5c0 5-3 8-7 8 0-5 3-8 7-8z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 10.5L2.5 12.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
      <path
        d="M7 1.5v3M7 9.5v3M1.5 7h3M9.5 7h3M3.1 3.1l2.1 2.1M8.8 8.8l2.1 2.1M10.9 3.1L8.8 5.2M5.2 8.8L3.1 10.9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}
