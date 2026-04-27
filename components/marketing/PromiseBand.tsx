import { type Locale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"
import { Companion } from "@/components/mascot/Companion"

// v3 forest band — title at top, then the body line, then a single inline
// "Live eksempel" demo panel, then the three promise badges *outside* the
// panel so they read as a footer to the whole section. A subtle cream wave
// at the bottom transitions into the next section.
const COLORS = {
  forest: "#1E3526",
  forestPanel: "#16291C",
  forestBorder: "#2C4A37",
  leaf: "#C8D9A8",
  textMuted: "#B8C4A8",
  textSoft: "#9DAE8A",
  ink: "#1F2D1A",
  ink2: "#556048",
  mint: "#7ACBA2",
  mintDeep: "#4F8E6B",
  mintSoft: "#E4F2EB",
  mintEdge: "#C5E3D1",
  cream: "#F5EDDE",
  cream2: "#EDE2CD",
  warmCream: "#F4E5C5",
  claySoft: "#F4DBD1",
  claySoftBorder: "#E4B5A4",
  clayDeep: "#8F4A38",
}

export function PromiseBand({ locale }: { locale: Locale }) {
  const m = getMessages(locale)
  const bodyParts = m.promise.body.split("{highlight}")
  const badges = m.promise.badges ?? {
    adapt:    { title: "Tilpasset niveau",     body: "Tilpasses barnets interesser og niveau." },
    feedback: { title: "Venlig feedback",      body: "Motiverer og guider uden at give svaret." },
    safe:     { title: "Trygt & motiverende",  body: "Skaber ro, forståelse og selvtillid." },
  }

  return (
    <section
      id="how"
      style={{
        background: COLORS.forest,
        color: "#F4EADA",
        padding: "100px 32px 0",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          maxWidth: 920,
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
          paddingBottom: 80,
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-fraunces), Georgia, serif",
            fontWeight: 700,
            fontSize: "clamp(36px, 4.6vw, 60px)",
            lineHeight: 1.06,
            letterSpacing: "-1px",
            margin: "0 0 18px",
            color: "#F4EADA",
            textWrap: "balance" as const,
          }}
        >
          {m.promise.title}
          <br />
          <em
            style={{
              fontStyle: "italic",
              color: COLORS.leaf,
              fontWeight: 500,
            }}
          >
            {m.promise.titleItalic ?? "uden at få svaret"}
          </em>
        </h2>

        <p
          style={{
            fontSize: 17,
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

        {/* Inline live-example panel — three turns top-to-bottom. The
            promise badges live OUTSIDE this panel (below it) so they
            close the whole section, not just the demo. */}
        <div
          style={{
            margin: "44px auto 0",
            maxWidth: 660,
            background: COLORS.forestPanel,
            border: `1px solid ${COLORS.forestBorder}`,
            borderRadius: 22,
            padding: "20px 22px 22px",
            boxShadow: "0 30px 80px -30px rgba(0,0,0,0.45)",
            textAlign: "left",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              borderRadius: 999,
              background: "rgba(122,203,162,0.18)",
              color: COLORS.mintEdge,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                background: COLORS.mint,
                boxShadow: "0 0 0 4px rgba(122,203,162,0.18)",
              }}
            />
            {m.promise.demoBadge ?? "Live eksempel"}
          </div>

          <DemoTurn role="lion">
            Regn ud: <b>24 + 17</b>. Hvad tænker du, hvis vi deler tallene op?
          </DemoTurn>
          <DemoTurn role="kid">
            20 + 10 er 30. Så 4 + 7 er 11…
          </DemoTurn>
          <DemoTurn role="lion" last>
            Godt set! Nu har du <b>30 og 11</b>. Læg dem sammen, så er <b>du</b> næsten i mål.
          </DemoTurn>
        </div>

        {/* Promise trio under the panel — icon in a hollow ring on the
            dark band, bold title, soft caption. Reads as the closing
            statement of the whole section. */}
        <div className="promise-badges">
          <PromiseBadge icon={<StarGlyph />} title={badges.adapt.title} body={badges.adapt.body} />
          <PromiseBadge icon={<SmileGlyph />} title={badges.feedback.title} body={badges.feedback.body} />
          <PromiseBadge icon={<ShieldGlyph />} title={badges.safe.title} body={badges.safe.body} />
        </div>
      </div>

      {/* Wave + chevron live in a single relative wrapper so the chevron
          can overlap the seam (sitting half on green, half on cream)
          rather than floating above the wave. */}
      <div
        style={{
          position: "relative",
          marginTop: 24,
          marginLeft: -32,
          marginRight: -32,
          lineHeight: 0,
        }}
      >
        {/* Organic three-cubic wave. The path traces a wave shape across
            the TOP, then drops down vertical sides to the bottom corners
            and closes along the bottom edge — so the cream fill is a
            solid rectangle below y=80 across the full width, with the
            wave only carved into the top portion. Earlier the path
            started at (0, 84) and (1440, 84), which made the cream fill
            zero-height at x=0 and x=1440 — the leftmost and rightmost
            columns of the SVG were transparent and the section's
            dark-green bg showed through as side "bars". Anchoring at
            (0, 36) / (1440, 36) on the wave-top side and using L
            commands to walk down to (0, 84) / (1440, 84) gives full-
            width cream at the bottom while preserving the wave shape. */}
        <svg
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          style={{ display: "block", width: "100%", height: 60 }}
        >
          <path
            d="M 0 84
               L 0 36
               C 220 36 360 4 580 30
               C 760 54 880 46 1020 22
               C 1180 8 1300 42 1440 36
               L 1440 84
               Z"
            fill={COLORS.cream}
          />
        </svg>

        {/* Cream backstop — extends the cream beyond the SVG's bottom
            edge so any subpixel rendering gap or layout drift below the
            wave shows cream instead of the section's dark-green bg.
            Bigger height (16px) plus a 4px overlap with the SVG bottom
            (negative marginTop) covers the intermittent dark-green
            hairline that appeared on some Chrome devtools mobile widths
            where subpixel rounding pushed the SVG's last row to a
            partially-transparent fraction of a pixel. */}
        <div
          aria-hidden
          style={{
            height: 16,
            background: COLORS.cream,
            marginTop: -4,
          }}
        />

        {/* Chevron sits at the wave's middle valley — half on green,
            half on cream — so it reads as a button planted into the
            seam itself instead of a separate UI element above it.
            White circle bg makes it visible against both colors. */}
        <a
          href="#benefits"
          aria-label="Læs videre"
          style={{
            position: "absolute",
            left: "50%",
            // The wave's centre-x curve y at x=720 in viewBox is ~43
            // (between (580,30) and (1020,22), with controls at y=54
            // and 46 dragging it down). In CSS coords (scale 60/80 =
            // 0.75) that's ~33. Sit the chevron centre there so it
            // lands half on green / half on cream — the previous
            // `top: 19` left it floating in the dark-green area above
            // the wave line.
            top: 33,
            transform: "translate(-50%, -50%)",
            zIndex: 2,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 46,
            height: 46,
            borderRadius: 999,
            background: "#fff",
            border: "1px solid rgba(31,45,26,0.06)",
            boxShadow: "0 6px 18px -8px rgba(31,45,26,0.25)",
            color: COLORS.mintDeep,
            transition: "transform 0.2s",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </a>
      </div>

      <style>{`
        .promise-badges {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
          margin-top: 36px;
          max-width: 760px;
          margin-left: auto;
          margin-right: auto;
        }
        @media (max-width: 720px) {
          .promise-badges {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }
        }
      `}</style>
    </section>
  )
}

function DemoTurn({
  role,
  children,
  last,
}: {
  role: "lion" | "kid"
  children: React.ReactNode
  last?: boolean
}) {
  const isLion = role === "lion"
  const avatar = isLion ? (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 38,
        height: 38,
        borderRadius: 999,
        background: COLORS.mintSoft,
        border: `1.5px solid ${COLORS.mintEdge}`,
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      <Companion type="lion" size={34} />
    </span>
  ) : (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 38,
        height: 38,
        borderRadius: 999,
        background: COLORS.claySoft,
        border: `1.5px solid ${COLORS.claySoftBorder}`,
        fontWeight: 800,
        fontSize: 13,
        color: COLORS.clayDeep,
        flexShrink: 0,
        fontFamily: "var(--font-fraunces), Georgia, serif",
      }}
    >
      K
    </span>
  )
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        marginBottom: last ? 0 : 8,
      }}
    >
      {avatar}
      <div
        style={{
          background: isLion ? COLORS.mintSoft : COLORS.cream,
          padding: "10px 14px",
          borderRadius: "4px 14px 14px 14px",
          fontSize: 14,
          color: COLORS.ink,
          lineHeight: 1.45,
          flex: 1,
        }}
      >
        {children}
      </div>
    </div>
  )
}

function PromiseBadge({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        textAlign: "left",
      }}
    >
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 38,
          height: 38,
          borderRadius: 999,
          border: "1.5px solid rgba(255,255,255,0.18)",
          color: COLORS.leaf,
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 14,
            color: "#F4EADA",
            letterSpacing: "-0.1px",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: COLORS.textSoft,
            lineHeight: 1.45,
            marginTop: 3,
          }}
        >
          {body}
        </div>
      </div>
    </div>
  )
}

function StarGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l2.6 6.6L22 10l-5.4 4.5L18.5 22 12 18l-6.5 4 1.9-7.5L2 10l7.4-.4z" />
    </svg>
  )
}

function SmileGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14c1 1.5 2.4 2 4 2s3-.5 4-2" />
      <circle cx="9" cy="10" r="1" fill="currentColor" />
      <circle cx="15" cy="10" r="1" fill="currentColor" />
    </svg>
  )
}

function ShieldGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2l8 4v6c0 5-3.5 9.3-8 10-4.5-.7-8-5-8-10V6l8-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}
