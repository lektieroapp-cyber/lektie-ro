import { K } from "../design-tokens"

// Sætningsbygger — show jumbled words above an empty drop zone.
// Ported from dansk-components.jsx (T2.4).

type Props = {
  /** pipe-separated jumbled words, e.g. "leger|i|haven|Pigen" */
  words: string
}

export function SentenceBuilder({ words }: Props) {
  const parts = words.split("|").map(s => s.trim()).filter(Boolean)
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 400,
        margin: "12px auto",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 6,
          justifyContent: "center",
          flexWrap: "wrap",
          minHeight: 44,
        }}
      >
        {parts.map(w => (
          <div
            key={w}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              background: K.card,
              border: `1.5px solid ${K.ink}22`,
              fontFamily: K.serif,
              fontWeight: 600,
              fontSize: 16,
              color: K.ink,
            }}
          >
            {w}
          </div>
        ))}
      </div>
      <div
        style={{
          minHeight: 52,
          padding: "10px 14px",
          background: K.card,
          border: `1.5px dashed ${K.ink3}`,
          borderRadius: 12,
          display: "flex",
          gap: 6,
          alignItems: "center",
          justifyContent: "center",
          fontFamily: K.sans,
          fontSize: 13,
          color: K.ink3,
          fontStyle: "italic",
        }}
      >
        Byg sætningen i rigtig rækkefølge
      </div>
    </div>
  )
}
