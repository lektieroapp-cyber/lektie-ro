import { K } from "../design-tokens"

// Dobbeltkonsonant — tiny A/B card showing two spellings with the vowel rule.
// Ported from dansk-components.jsx (T3.11).

type Props = {
  right: string
  wrong: string
  hint?: string
}

export function DoubleConsonantCheck({ right, wrong, hint }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        alignItems: "center",
        maxWidth: 360,
        margin: "12px auto",
      }}
    >
      <div
        style={{
          fontFamily: K.sans,
          fontSize: 13,
          color: K.ink2,
          fontWeight: 600,
        }}
      >
        Hvilken skrivemåde er rigtig?
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <div
          style={{
            padding: "14px 20px",
            borderRadius: 14,
            background: K.card,
            border: `1.5px solid ${K.ink}22`,
            fontFamily: K.serif,
            fontWeight: 700,
            fontSize: 24,
            color: K.ink,
          }}
        >
          {right}
        </div>
        <div
          style={{
            padding: "14px 20px",
            borderRadius: 14,
            background: K.card,
            border: `1.5px solid ${K.ink}22`,
            fontFamily: K.serif,
            fontWeight: 700,
            fontSize: 24,
            color: K.ink,
          }}
        >
          {wrong}
        </div>
      </div>
      {hint && (
        <div
          style={{
            padding: "8px 12px",
            background: K.butterSoft,
            borderRadius: 10,
            fontFamily: K.sans,
            fontSize: 12,
            color: "#7A5A10",
            fontWeight: 600,
            maxWidth: 300,
            textAlign: "center",
          }}
        >
          {hint}
        </div>
      )}
    </div>
  )
}
