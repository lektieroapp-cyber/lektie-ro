import { K } from "../design-tokens"

// To kolonner — DA/EN translation with synced chunk highlights.
// Ported from engelsk-components.jsx (T3.16).

type Props = {
  /** Pipe-separated DA chunks, e.g. "Jeg|kan lide|at læse" */
  da: string
  /** Pipe-separated EN chunks, same number, e.g. "I|like|to read" */
  en: string
  /** Index of the chunk to highlight (-1 = none). Default -1. */
  highlight?: number
}

const TINTS = [K.coralSoft, K.mintSoft, K.skySoft]

export function SideBySideTranslation({ da, en, highlight = -1 }: Props) {
  const daChunks = da.split("|").map(s => s.trim()).filter(Boolean)
  const enChunks = en.split("|").map(s => s.trim()).filter(Boolean)

  function renderRow(chunks: string[]) {
    return (
      <div
        style={{
          padding: 12,
          background: K.card,
          border: `1.5px solid ${K.ink}14`,
          borderRadius: 12,
          fontFamily: K.serif,
          fontSize: 17,
          color: K.ink,
          lineHeight: 1.8,
        }}
      >
        {chunks.map((chunk, i) => (
          <span
            key={i}
            style={{
              background: i === highlight ? TINTS[i % TINTS.length] : "transparent",
              padding: i === highlight ? "2px 6px" : "2px 0",
              borderRadius: 6,
              marginRight: 4,
              transition: "background 200ms",
            }}
          >
            {chunk}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        maxWidth: 420,
        margin: "12px auto",
      }}
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div
          style={{
            fontSize: 10,
            fontFamily: K.sans,
            fontWeight: 800,
            color: K.ink2,
            letterSpacing: 0.6,
            textTransform: "uppercase",
          }}
        >
          Dansk
        </div>
        {renderRow(daChunks)}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div
          style={{
            fontSize: 10,
            fontFamily: K.sans,
            fontWeight: 800,
            color: K.ink2,
            letterSpacing: 0.6,
            textTransform: "uppercase",
          }}
        >
          English
        </div>
        {renderRow(enChunks)}
      </div>
    </div>
  )
}
