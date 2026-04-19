import { K } from "../design-tokens"

// Ordklasser — sort words into navneord / udsagnsord / tillægsord.
// Ported from dansk-components.jsx (T2.3). MVP renders a static pile at the
// top + three empty buckets below — the AI explains, kid categorises mentally.

type WordSpec = { text: string; cls: "n" | "v" | "a" }

type Props = {
  /** "word:cls,word:cls" — e.g. "hund:n,løber:v,rød:a" */
  items: string
}

const BUCKETS: { key: "n" | "v" | "a"; label: string; tint: string; border: string }[] = [
  { key: "n", label: "Navneord", tint: K.mintSoft, border: K.mint },
  { key: "v", label: "Udsagnsord", tint: K.skySoft, border: K.sky },
  { key: "a", label: "Tillægsord", tint: K.butterSoft, border: K.butter },
]

function parseItems(items: string): WordSpec[] {
  return items
    .split(",")
    .map(pair => {
      const [text, cls] = pair.split(":").map(s => s.trim())
      return {
        text: text ?? "",
        cls: (cls === "n" || cls === "v" || cls === "a" ? cls : "n") as WordSpec["cls"],
      }
    })
    .filter(w => w.text.length > 0)
}

export function WordClassSort({ items }: Props) {
  const words = parseItems(items)
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        maxWidth: 420,
        margin: "12px auto",
      }}
    >
      <div
        style={{
          minHeight: 46,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: "center",
          padding: 10,
          background: K.card,
          borderRadius: 14,
          border: `1.5px dashed ${K.ink3}`,
        }}
      >
        {words.map(w => (
          <div
            key={w.text}
            style={{
              padding: "7px 13px",
              borderRadius: 999,
              background: K.card,
              border: `1.5px solid ${K.ink}22`,
              fontFamily: K.serif,
              fontWeight: 600,
              fontSize: 15,
              color: K.ink,
            }}
          >
            {w.text}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {BUCKETS.map(b => (
          <div
            key={b.key}
            style={{
              minHeight: 78,
              padding: 8,
              background: b.tint,
              borderRadius: 12,
              border: `1.5px dashed ${b.border}`,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontFamily: K.sans,
                fontWeight: 800,
                color: K.ink2,
                textTransform: "uppercase",
                letterSpacing: 0.4,
                textAlign: "center",
              }}
            >
              {b.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
