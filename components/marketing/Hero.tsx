import Link from "next/link"
import { type Locale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"
import { localePath } from "@/lib/i18n/routes"
import { PhoneMockup } from "./PhoneMockup"
import { WaitlistForm } from "./WaitlistForm"

const COLORS = {
  cream: "#FBF3E8",
  cream2: "#F5EADA",
  ink: "#1F2D4A",
  ink2: "#4A5A7A",
  ink3: "#8A95AD",
  coral: "#E8846A",
  coral2: "#D96B4F",
  coralSoft: "#FDE4D8",
  butter: "#F2C75A",
  butterSoft: "#FBEBC2",
  sky: "#C9DDEE",
  mint: "#B5DEC8",
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
            background: COLORS.butterSoft,
            color: "#7A5A10",
            fontSize: 13,
            fontWeight: 700,
            border: `1px solid ${COLORS.butter}66`,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill={COLORS.butter}>
            <path d="M7 1l1.8 3.6L12.5 5l-2.7 2.7.6 3.8L7 9.8 3.6 11.5l.6-3.8L1.5 5l3.7-.4z" />
          </svg>
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
              color: COLORS.coral,
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

        {/* Promise chips */}
        <div
          style={{
            display: "flex",
            gap: 14,
            marginTop: 28,
            flexWrap: "wrap",
          }}
        >
          <Chip tint={COLORS.coralSoft} label={m.hero.values.one}>
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path
                d="M5 1v8M1 5h8"
                stroke={COLORS.coral}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </Chip>
          <Chip tint={COLORS.mint} label={m.hero.values.two}>
            <svg width="10" height="10" viewBox="0 0 10 10">
              <circle cx="5" cy="5" r="3" fill="#fff" />
            </svg>
          </Chip>
          <Chip tint={COLORS.butter} label={m.hero.values.three}>
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path
                d="M2 6l2.5 2L8 3"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </Chip>
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
              "0 30px 60px -20px rgba(31,45,74,0.18), 0 0 0 1px rgba(31,45,74,0.04)",
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

          {/* Perks grid */}
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
                    style={{ color: COLORS.coral, flexShrink: 0 }}
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
              style={{ color: COLORS.coral, fontWeight: 700 }}
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
  tint,
  label,
  children,
}: {
  tint: string
  label: string
  children: React.ReactNode
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        borderRadius: 999,
        background: "#fff",
        border: "1px solid rgba(31,45,74,0.08)",
        fontWeight: 700,
        fontSize: 14,
        color: COLORS.ink,
        boxShadow: "0 2px 6px rgba(31,45,74,0.04)",
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: 999,
          background: tint,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </span>
      {label}
    </span>
  )
}
