import { K } from "../design-tokens"

// Ti-rammen — visualize addition across 10 with overflow row.
// Ported from tier1-components.jsx (T1.1).

type Props = {
  a: number
  b: number
}

export function TenFrame({ a, b }: Props) {
  const total = a + b
  const main = Math.min(total, 10)
  const overflow = Math.max(0, total - 10)

  const cells: string[] = []
  for (let i = 0; i < 10; i++) {
    if (i < a) cells.push(K.coral)
    else if (i < main) cells.push(K.butter)
    else cells.push("transparent")
  }
  const overflowCells: string[] = []
  for (let i = 0; i < 5; i++) {
    overflowCells.push(i < overflow ? K.butter : "transparent")
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: "center",
        margin: "12px 0",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 44px)",
          gap: 6,
          padding: 12,
          background: K.card,
          borderRadius: 16,
          border: `1px solid ${K.ink}14`,
        }}
      >
        {cells.map((f, i) => (
          <div
            key={i}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              border: `1.5px solid ${f === "transparent" ? K.ink + "22" : f}`,
              background: f === "transparent" ? "transparent" : f,
              transition: "all 180ms ease-out",
            }}
          />
        ))}
      </div>
      {overflow > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 44px)",
            gap: 6,
            padding: 12,
            background: K.butterSoft,
            borderRadius: 16,
            border: `1.5px dashed ${K.butter}`,
            animation: "tfPulse 1.6s ease-in-out infinite",
          }}
        >
          {overflowCells.map((f, i) => (
            <div
              key={i}
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                border: `1.5px solid ${f === "transparent" ? K.ink + "22" : f}`,
                background: f === "transparent" ? "transparent" : f,
              }}
            />
          ))}
        </div>
      )}
      <div
        style={{
          fontSize: 12,
          color: K.ink2,
          fontFamily: K.sans,
          fontWeight: 600,
          marginTop: 4,
        }}
      >
        {a} + {b} = ti-ramme + {overflow} til
      </div>
    </div>
  )
}
