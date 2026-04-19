import { K } from "../design-tokens"

// Brøkbjælke — horizontal bar, parts filled. Optional second bar for compare.
// Ported from math-components.jsx (T2.2).

type Props = {
  parts: number
  filled: number
  comparePartsProp?: number
  compareFilled?: number
}

export function FractionBar({
  parts,
  filled,
  comparePartsProp,
  compareFilled,
}: Props) {
  const W = 320
  const H = 32
  const hasCompare = comparePartsProp != null && compareFilled != null

  function renderBar(p: number, f: number, lower: boolean) {
    return (
      <div
        style={{
          display: "flex",
          width: W,
          height: H,
          borderRadius: 10,
          overflow: "hidden",
          border: `1.5px solid ${K.ink}22`,
          background: K.card,
        }}
      >
        {Array.from({ length: p }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              borderRight: i < p - 1 ? `1.5px solid ${K.ink}22` : "none",
              background: i < f ? (lower ? K.sky : K.coral) : "transparent",
              transition: "background 220ms ease-out",
            }}
          />
        ))}
      </div>
    )
  }

  function label(f: number, p: number) {
    return (
      <div
        style={{
          fontFamily: K.serif,
          fontWeight: 700,
          fontSize: 22,
          color: K.ink,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          lineHeight: 1,
        }}
      >
        <span>{f}</span>
        <span
          style={{
            borderTop: `2px solid ${K.ink}`,
            padding: "2px 6px 0",
            marginTop: 2,
          }}
        >
          {p}
        </span>
      </div>
    )
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        alignItems: "center",
        margin: "12px 0",
      }}
    >
      {hasCompare && (
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {renderBar(comparePartsProp!, compareFilled!, true)}
          {label(compareFilled!, comparePartsProp!)}
        </div>
      )}
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        {renderBar(parts, filled, false)}
        {label(filled, parts)}
      </div>
    </div>
  )
}
