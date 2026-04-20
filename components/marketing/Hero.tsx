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

        {/* Promise chips — mint, mint-deep-on-mint-soft, ink-soft dots */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 28,
            flexWrap: "wrap",
          }}
        >
          <Chip label={m.hero.values.one} dotColor={COLORS.mint} />
          <Chip
            label={m.hero.values.two}
            dotColor={COLORS.mintDeep}
            bg={COLORS.mintSoft}
            border={COLORS.mintEdge}
            textColor={COLORS.mintDeep}
          />
          <Chip label={m.hero.values.three} dotColor={COLORS.ink2} />
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
  dotColor,
  bg = "#fff",
  border = "rgba(31,45,26,0.08)",
  textColor,
}: {
  label: string
  dotColor: string
  bg?: string
  border?: string
  textColor?: string
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        borderRadius: 999,
        background: bg,
        border: `1.5px solid ${border}`,
        fontWeight: 700,
        fontSize: 13,
        color: textColor ?? COLORS.ink2,
        boxShadow: bg === "#fff" ? "0 2px 6px rgba(31,45,26,0.04)" : "none",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: dotColor,
        }}
      />
      {label}
    </span>
  )
}
