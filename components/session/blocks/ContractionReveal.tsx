import { K } from "../design-tokens"

// Sammentrækning — "do not → don't" shown as full form on the left and
// contracted form on the right with the apostrophe highlighted.
// Ported from engelsk-components.jsx (T3.15).

type Props = {
  /** Full form like "do not" */
  full: string
  /** Contracted form like "don't" */
  contracted: string
}

export function ContractionReveal({ full, contracted }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        alignItems: "center",
        maxWidth: 380,
        margin: "12px auto",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div
          style={{
            padding: "10px 16px",
            borderRadius: 12,
            background: K.butterSoft,
            border: `1.5px solid ${K.butter}`,
            fontFamily: K.serif,
            fontWeight: 700,
            fontSize: 22,
            color: K.ink,
          }}
        >
          {full}
        </div>
        <div style={{ fontFamily: K.serif, fontSize: 24, color: K.ink2 }}>→</div>
        <div
          style={{
            padding: "10px 16px",
            borderRadius: 12,
            background: K.mintSoft,
            border: `2px solid ${K.mint}`,
            fontFamily: K.serif,
            fontWeight: 700,
            fontSize: 22,
            color: K.ink,
          }}
        >
          {contracted.split("'").map((part, i, arr) => (
            <span key={i}>
              {part}
              {i < arr.length - 1 && (
                <span
                  style={{
                    fontFamily: K.sans,
                    color: K.coral,
                    fontWeight: 800,
                    fontSize: 24,
                    margin: "0 1px",
                    transform: "translateY(-4px)",
                    display: "inline-block",
                  }}
                >
                  '
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
