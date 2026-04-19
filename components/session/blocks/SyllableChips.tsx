import { K } from "../design-tokens"

// Stavelseschips — break a word into tappable syllables.
// Ported from tier1-components.jsx (T1.3).

type Props = {
  word: string
  breaks: string[]
}

const TINTS = [K.coralSoft, K.butterSoft, K.skySoft, K.mintSoft]
const BORDERS = [K.coral, K.butter, K.sky, K.mint]

export function SyllableChips({ word, breaks }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        margin: "12px 0",
      }}
    >
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        {breaks.map((s, i) => (
          <div
            key={i}
            style={{
              padding: "14px 20px",
              borderRadius: 16,
              background: TINTS[i % TINTS.length],
              border: `1.5px solid ${BORDERS[i % BORDERS.length]}66`,
              fontFamily: K.serif,
              fontWeight: 700,
              fontSize: 26,
              color: K.ink,
              boxShadow: "0 1px 0 rgba(31,27,51,0.04)",
            }}
          >
            {s}
          </div>
        ))}
      </div>
      <div
        style={{
          fontSize: 12,
          color: K.ink3,
          fontFamily: K.sans,
          fontWeight: 600,
        }}
      >
        {word}
      </div>
    </div>
  )
}
