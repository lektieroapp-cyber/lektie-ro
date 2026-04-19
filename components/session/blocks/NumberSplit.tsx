import { K } from "../design-tokens"

// Taldeling — decompose a 2-digit number into tens + ones.
// Ported from tier1-components.jsx (T1.2). Accepts an optional second number
// (rwhole/rtens/rones) — when present, renders two splits side by side with
// a "+" between them. That's the common case for teaching addition: both
// addends need to be seen decomposed, not just one.

type Props = {
  whole: number
  /** Hundreds place (optional). When present, a 3-part split renders. */
  hundreds?: number
  tens: number
  ones: number
  // Right side — same shape as the left. Used for addition decomposition.
  rwhole?: number
  rhundreds?: number
  rtens?: number
  rones?: number
  compact?: boolean
}

type SplitArgs = {
  whole: number
  hundreds?: number
  tens: number
  ones: number
  compact?: boolean
}

function Split({ whole, hundreds, tens, ones, compact }: SplitArgs) {
  const hasHundreds = hundreds != null && hundreds > 0

  // SVG branch shape depends on how many parts we split into.
  // 2-parts: ___/ \___  (80 wide)
  // 3-parts: ___|___  + outer legs (140 wide)
  const svgWidth = hasHundreds ? 200 : 140

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      <div
        style={{
          fontFamily: K.serif,
          fontSize: compact ? 36 : 44,
          fontWeight: 700,
          color: K.ink,
          lineHeight: 1,
        }}
      >
        {whole}
      </div>

      {hasHundreds ? (
        <svg width={svgWidth * 0.85} height={34} viewBox={`0 0 ${svgWidth} 40`}>
          {/* 3-pronged branch: left, middle (straight), right */}
          <path
            d="M100 4 Q 100 18 25 34"
            stroke={K.ink3}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M100 4 L 100 34"
            stroke={K.ink3}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M100 4 Q 100 18 175 34"
            stroke={K.ink3}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width={120} height={34} viewBox="0 0 140 40">
          <path
            d="M70 4 Q 70 20 30 34"
            stroke={K.ink3}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M70 4 Q 70 20 110 34"
            stroke={K.ink3}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        {hasHundreds && (
          <Pill
            value={hundreds!}
            bg={K.plumSoft}
            fg="#5A3F7A"
            border={K.plum}
            compact={compact}
          />
        )}
        <Pill value={tens} bg={K.skySoft} fg="#3A5F7A" border={K.sky} compact={compact} />
        <Pill value={ones} bg={K.mintSoft} fg="#3F6B55" border={K.mint} compact={compact} />
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 2,
          fontSize: 10,
          fontFamily: K.sans,
          fontWeight: 700,
          color: K.ink2,
          letterSpacing: 0.3,
          textTransform: "uppercase",
        }}
      >
        {hasHundreds && <span style={{ minWidth: 48, textAlign: "center" }}>hundreder</span>}
        <span style={{ minWidth: 48, textAlign: "center" }}>tiere</span>
        <span style={{ minWidth: 48, textAlign: "center" }}>enere</span>
      </div>
    </div>
  )
}

function Pill({
  value,
  bg,
  fg,
  border,
  compact,
}: {
  value: number
  bg: string
  fg: string
  border: string
  compact?: boolean
}) {
  return (
    <div
      style={{
        background: bg,
        color: fg,
        padding: "8px 14px",
        borderRadius: 999,
        fontFamily: K.serif,
        fontWeight: 700,
        fontSize: compact ? 18 : 20,
        border: `1.5px solid ${border}`,
        minWidth: 42,
        textAlign: "center",
      }}
    >
      {value}
    </div>
  )
}

export function NumberSplit({
  whole,
  hundreds,
  tens,
  ones,
  rwhole,
  rhundreds,
  rtens,
  rones,
  compact = false,
}: Props) {
  const hasPair = rwhole != null && rtens != null && rones != null
  const useCompact = compact || hasPair

  if (!hasPair) {
    return (
      <div style={{ display: "flex", justifyContent: "center", margin: "12px 0" }}>
        <Split whole={whole} hundreds={hundreds} tens={tens} ones={ones} compact={compact} />
      </div>
    )
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        margin: "12px 0",
        flexWrap: "wrap",
      }}
    >
      <Split whole={whole} hundreds={hundreds} tens={tens} ones={ones} compact={useCompact} />
      <div
        style={{
          fontFamily: K.serif,
          fontSize: 32,
          color: K.ink2,
          fontWeight: 500,
        }}
      >
        +
      </div>
      <Split
        whole={rwhole!}
        hundreds={rhundreds}
        tens={rtens!}
        ones={rones!}
        compact={useCompact}
      />
    </div>
  )
}
