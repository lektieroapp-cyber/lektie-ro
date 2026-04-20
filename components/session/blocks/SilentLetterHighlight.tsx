import { K } from "../design-tokens"

// Stumt bogstav — highlight a silent letter in a Danish word.
// Ported from dansk-components.jsx (T3.12).

type Props = {
  word: string
  /** Index of the silent letter (0-based). Default: last letter. */
  silent: number
  /** Optional explanation shown below. */
  say?: string
}

export function SilentLetterHighlight({ word, silent, say }: Props) {
  const letters = word.split("")
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        alignItems: "center",
        margin: "12px auto",
      }}
    >
      <div style={{ display: "flex", gap: 4 }}>
        {letters.map((l, i) => {
          const isSilent = i === silent
          return (
            <div
              key={i}
              style={{
                position: "relative",
                width: 44,
                height: 54,
                borderRadius: 10,
                background: isSilent ? K.actionSoft : K.card,
                border: isSilent
                  ? `2px dashed ${K.action}`
                  : `1.5px solid ${K.ink}22`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: K.serif,
                fontWeight: 700,
                fontSize: 28,
                color: isSilent ? K.action : K.ink,
              }}
            >
              {l}
              {isSilent && (
                <div
                  style={{
                    position: "absolute",
                    bottom: -18,
                    fontSize: 10,
                    fontFamily: K.sans,
                    fontWeight: 800,
                    color: K.action,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  stumt
                </div>
              )}
            </div>
          )
        })}
      </div>
      {say && (
        <div
          style={{
            marginTop: 8,
            fontFamily: K.sans,
            fontSize: 13,
            color: K.ink2,
            fontWeight: 600,
            textAlign: "center",
            maxWidth: 260,
          }}
        >
          Vi siger{" "}
          <span style={{ fontFamily: K.serif, fontStyle: "italic", color: K.ink }}>
            "{say}"
          </span>
          , men skriver{" "}
          <span style={{ fontFamily: K.serif, fontWeight: 700, color: K.ink }}>{word}</span>.
        </div>
      )}
    </div>
  )
}
