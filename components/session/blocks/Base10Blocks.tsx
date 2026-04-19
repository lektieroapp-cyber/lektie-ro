import { K } from "../design-tokens"

// Titalsklodser — sky tens-rods + mint ones-cubes for place value.
// Ported from math-components.jsx (T3.7).

type Props = {
  tens: number
  ones: number
}

export function Base10Blocks({ tens, ones }: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 12,
        margin: "12px 0",
        justifyContent: "center",
      }}
    >
      <div style={{ display: "flex", gap: 4 }}>
        {Array.from({ length: tens }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 18,
              height: 90,
              borderRadius: 4,
              background: `repeating-linear-gradient(${K.sky}, ${K.sky} 7px, ${K.skySoft} 7px, ${K.skySoft} 9px)`,
              border: `1.5px solid ${K.sky}`,
            }}
          />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 16px)", gap: 2 }}>
        {Array.from({ length: ones }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 16,
              height: 16,
              borderRadius: 3,
              background: K.mint,
              border: `1.5px solid ${K.mint}`,
            }}
          />
        ))}
      </div>
      <div
        style={{
          fontFamily: K.serif,
          fontWeight: 700,
          fontSize: 30,
          color: K.ink,
          marginLeft: 8,
          paddingBottom: 4,
        }}
      >
        {tens * 10 + ones}
      </div>
    </div>
  )
}
