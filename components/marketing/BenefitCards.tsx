import { type Locale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"

// v3 (image #18): two paired cards with a left-aligned title, a small
// decoration in the top-right, a dotted "chapter divider" under the
// title, a centered subtitle, then three iconed promises separated by
// vertical dashed columns, and a closing pill with a colored icon
// circle. A row of footer perks (gratis prøve · ingen binding · GDPR)
// sits centered below both cards.
const COLORS = {
  ink: "#1F2D1A",
  ink2: "#556048",
  ink3: "#8A9280",
  mint: "#7ACBA2",
  mintDeep: "#4F8E6B",
  mintSoft: "#E4F2EB",
  mintFill: "#C8E0D2",
  mintEdge: "#C5E3D1",
  forest: "#1E3526",
  cream: "#F5EDDE",
  clay: "#C97962",
  divider: "rgba(31,45,26,0.12)",
  dashedLine: "rgba(31,45,26,0.18)",
}

type IconProps = { className?: string }

const ShieldIcon = ({ className }: IconProps) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2l8 4v6c0 5-3.5 9.3-8 10-4.5-.7-8-5-8-10V6l8-4z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
)
const SproutIcon = ({ className }: IconProps) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22 V 11" />
    <path d="M12 13 C 7 12 4 7 6 3 C 11 3 13 7 13 12 z" fill="currentColor" fillOpacity="0.18" />
    <path d="M12 11 C 14 6 18 4 21 5 C 21 9 17 12 12 12 z" fill="currentColor" fillOpacity="0.18" />
  </svg>
)
const SparkleIcon = ({ className }: IconProps) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3l2.2 5.4L20 10l-5.4 2.2L12 18l-2.2-5.8L4 10l5.8-1.6z" />
    <path d="M19 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" />
  </svg>
)
const HomeIcon = ({ className }: IconProps) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z" />
  </svg>
)
const TrendIcon = ({ className }: IconProps) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="3 17 9 11 13 15 21 7" />
    <polyline points="15 7 21 7 21 13" />
  </svg>
)
const LockIcon = ({ className }: IconProps) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 1 1 8 0v4" />
  </svg>
)
const SmileIcon = ({ className }: IconProps) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 14c1 1.5 2.4 2 4 2s3-.5 4-2" />
    <circle cx="9" cy="10" r="0.8" fill="currentColor" />
    <circle cx="15" cy="10" r="0.8" fill="currentColor" />
  </svg>
)

type Item = { title: string; body: string; icon: React.ReactNode }

function ChapterDivider() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        margin: "0 4px",
      }}
      aria-hidden
    >
      <span style={{ flex: 1, height: 1, background: COLORS.divider }} />
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: COLORS.mintDeep,
        }}
      />
      <span style={{ flex: 1, height: 1, background: COLORS.divider }} />
    </div>
  )
}

function Card({
  title,
  subtitle,
  items,
  pillLabel,
  pillIcon,
  tone,
}: {
  title: string
  subtitle: string
  items: Item[]
  pillLabel: string
  pillIcon: React.ReactNode
  tone: "child" | "parent"
}) {
  const isChild = tone === "child"
  const cardBg = isChild ? "#fff" : COLORS.mintSoft
  const pillIconBg = isChild ? COLORS.mintDeep : COLORS.forest
  return (
    <div
      style={{
        background: cardBg,
        borderRadius: 28,
        padding: "30px 32px 32px",
        boxShadow: "0 1px 0 rgba(31,45,26,0.04), 0 18px 36px -22px rgba(31,45,26,0.18)",
        border: "1px solid rgba(0,0,0,0.04)",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        height: "100%",
      }}
    >
      <h3
        style={{
          margin: 0,
          fontFamily: "var(--font-fraunces), Georgia, serif",
          fontWeight: 700,
          fontSize: 30,
          letterSpacing: "-0.5px",
          color: COLORS.ink,
          lineHeight: 1.05,
        }}
      >
        {title}
      </h3>

      <ChapterDivider />

      <p
        style={{
          margin: 0,
          textAlign: "center",
          fontSize: 14,
          color: COLORS.ink2,
          lineHeight: 1.55,
          // Width sized to wrap at the natural rhetorical pause
          // (".. så barnet" for kid, ".. med indsigt," for parent)
          // rather than mid-clause. `text-wrap: balance` is OFF on
          // purpose — balance would even out the line lengths and
          // break the rhythm.
          maxWidth: 400,
          alignSelf: "center",
        }}
      >
        {subtitle}
      </p>

      {/* Icon row with vertical dashed separators between columns. The
          relative wrapper hosts two absolutely-positioned dashed lines
          at 1/3 and 2/3 of the width, sitting just inside the icon row's
          vertical span. */}
      <div style={{ position: "relative", paddingTop: 10 }}>
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: "33.33%",
            top: 14,
            bottom: 6,
            borderLeft: `1.5px dashed ${COLORS.dashedLine}`,
          }}
        />
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: "66.67%",
            top: 14,
            bottom: 6,
            borderLeft: `1.5px dashed ${COLORS.dashedLine}`,
          }}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
            position: "relative",
          }}
        >
          {items.map(it => (
            <div
              key={it.title}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: 12,
                padding: "0 4px",
              }}
            >
              <span
                aria-hidden
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 56,
                  height: 56,
                  borderRadius: 999,
                  background: isChild ? COLORS.mintSoft : "#fff",
                  color: COLORS.mintDeep,
                }}
              >
                {it.icon}
              </span>
              <div
                className="font-semibold text-ink"
                style={{
                  fontSize: 14.5,
                  lineHeight: 1.25,
                  letterSpacing: "-0.1px",
                  // Constrain width so single-line titles ("Tryghed &
                  // selvtillid", "Indsigt uden stress") wrap to two
                  // lines like the longer ones — every column gets the
                  // same two-line title block.
                  maxWidth: "9em",
                  minHeight: "2.5em",
                }}
              >
                {it.title}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: COLORS.ink2,
                  lineHeight: 1.5,
                  maxWidth: 180,
                  minHeight: "4.5em",
                }}
              >
                {it.body}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Closing pill — mint fill with a stronger colored icon circle on
          the left. Kid card uses a mint-deep circle (smile glyph),
          parent card uses a forest circle (shield glyph) — small but
          visible differentiator that mirrors the cards' personalities. */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          alignSelf: "center",
          gap: 12,
          padding: "11px 26px 11px 14px",
          borderRadius: 999,
          background: COLORS.mintFill,
          color: COLORS.mintDeep,
          fontWeight: 700,
          fontSize: 14,
          maxWidth: "100%",
          marginTop: "auto",
        }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 999,
            background: pillIconBg,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          {pillIcon}
        </span>
        {pillLabel}
      </div>
    </div>
  )
}

export function BenefitCards({ locale }: { locale: Locale }) {
  const m = getMessages(locale)

  const childItems: Item[] = [
    { ...m.benefits.child.items.learning, icon: <ShieldIcon /> },
    { ...m.benefits.child.items.safety, icon: <SproutIcon /> },
    { ...m.benefits.child.items.mastery, icon: <SparkleIcon /> },
  ]
  const parentItems: Item[] = [
    { ...m.benefits.parent.items.peace, icon: <HomeIcon /> },
    { ...m.benefits.parent.items.insight, icon: <TrendIcon /> },
    { ...m.benefits.parent.items.pedagogy, icon: <LockIcon /> },
  ]

  return (
    <section id="benefits" style={{ background: "var(--color-canvas, #F5EDDE)" }}>
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "80px 24px 64px",
          position: "relative",
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "stretch",
          gap: 28,
        }}
        className="benefits-grid"
      >
        <Card
          title={m.benefits.child.title}
          subtitle={m.benefits.child.subtitle ?? ""}
          items={childItems}
          pillLabel={m.benefits.child.pill ?? "Bygget til at skabe lyst til at lære"}
          pillIcon={<SmileIcon />}
          tone="child"
        />

        {/* Heart divider — clay heart inside a faint dashed ring. */}
        <span
          aria-hidden
          className="benefits-heart"
          style={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 56,
            height: 56,
            borderRadius: 999,
            border: `1.5px dashed rgba(201,121,98,0.45)`,
            color: COLORS.clay,
            alignSelf: "center",
          }}
        >
          <svg width="22" height="20" viewBox="0 0 34 30" fill="none">
            <path
              d="M17 27 C 3 17 3 8 9 5 C 13 3 15.5 5 17 7 C 18.5 5 21 3 25 5 C 31 8 31 17 17 27 z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
              fill="rgba(201,121,98,0.14)"
            />
          </svg>
        </span>

        <Card
          title={m.benefits.parent.title}
          subtitle={m.benefits.parent.subtitle ?? ""}
          items={parentItems}
          pillLabel={m.benefits.parent.pill ?? "Viden du kan stole på, ro du kan mærke"}
          pillIcon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 2l8 4v6c0 5-3.5 9.3-8 10-4.5-.7-8-5-8-10V6l8-4z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          }
          tone="parent"
        />
      </div>

      <style>{`
        @media (max-width: 900px) {
          .benefits-grid {
            grid-template-columns: 1fr !important;
            padding: 56px 20px 56px !important;
            gap: 16px !important;
          }
          .benefits-heart {
            margin: 0 auto !important;
          }
        }
      `}</style>
    </section>
  )
}

