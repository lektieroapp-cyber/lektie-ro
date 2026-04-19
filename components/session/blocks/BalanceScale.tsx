import { K } from "../design-tokens"

// Vægtskål — equation as see-saw. Beam tilts based on sum diff.
// Ported from math-components.jsx (T3.1).

type Props = {
  left: number[]
  right: number[]
}

export function BalanceScale({ left, right }: Props) {
  const sumL = left.reduce((a, b) => a + b, 0)
  const sumR = right.reduce((a, b) => a + b, 0)
  const balanced = sumL === sumR
  const tilt = balanced ? 0 : sumL > sumR ? -8 : 8

  function pill(value: number, color: string, bg: string) {
    return (
      <div
        style={{
          padding: "6px 12px",
          borderRadius: 999,
          background: bg,
          fontFamily: K.serif,
          fontWeight: 700,
          fontSize: 18,
          color,
          border: `1.5px solid ${color}44`,
        }}
      >
        {value}
      </div>
    )
  }

  return (
    <div
      style={{
        width: 340,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        margin: "12px auto",
      }}
    >
      <svg width="320" height="160" viewBox="0 0 320 160">
        <g transform={`rotate(${tilt} 160 90)`}>
          <line x1="40" y1="90" x2="280" y2="90" stroke={K.ink} strokeWidth="3" strokeLinecap="round" />
          <line x1="40" y1="90" x2="40" y2="72" stroke={K.ink} strokeWidth="2" />
          <line x1="280" y1="90" x2="280" y2="72" stroke={K.ink} strokeWidth="2" />
          <path d="M15 72 H65 L50 58 H30 Z" fill={K.skySoft} stroke={K.sky} strokeWidth="1.5" />
          <path d="M255 72 H305 L290 58 H270 Z" fill={K.mintSoft} stroke={K.mint} strokeWidth="1.5" />
        </g>
        <line x1="160" y1="90" x2="160" y2="130" stroke={K.ink} strokeWidth="3" />
        <path d="M140 130 H180 L170 150 H150 Z" fill={K.ink} />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginTop: -8 }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", width: 140, justifyContent: "center" }}>
          {left.map((v, i) => <div key={i}>{pill(v, "#3A5F7A", K.skySoft)}</div>)}
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", width: 140, justifyContent: "center" }}>
          {right.map((v, i) => <div key={i}>{pill(v, "#3F6B55", K.mintSoft)}</div>)}
        </div>
      </div>
      <div
        style={{
          marginTop: 10,
          fontFamily: K.sans,
          fontWeight: 700,
          fontSize: 13,
          color: balanced ? "#3F6B55" : K.ink2,
        }}
      >
        {balanced ? `✓ ${sumL} = ${sumR}` : `${sumL} ? ${sumR}`}
      </div>
    </div>
  )
}
