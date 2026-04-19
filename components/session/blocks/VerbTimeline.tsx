import { K } from "../design-tokens"

// Verb-tidslinje — place a verb on past / now / future.
// Ported from engelsk-components.jsx (T2.5).

type Props = {
  sentence: string
  past: string
  present: string
  future: string
  /** Which option gets the coral active pill. Default: "past". */
  active?: "past" | "present" | "future"
}

export function VerbTimeline({
  sentence,
  past,
  present,
  future,
  active = "past",
}: Props) {
  const options = [
    { key: "past" as const, top: past, label: "past" },
    { key: "present" as const, top: present, label: "now" },
    { key: "future" as const, top: future, label: "future" },
  ]
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 18,
        maxWidth: 420,
        alignItems: "center",
        margin: "12px auto",
      }}
    >
      <div
        style={{
          fontFamily: K.serif,
          fontSize: 17,
          fontWeight: 500,
          fontStyle: "italic",
          color: K.ink,
          textAlign: "center",
        }}
      >
        {sentence}
      </div>
      <div style={{ position: "relative", width: "100%", paddingTop: 4 }}>
        <div
          style={{
            position: "absolute",
            top: 44,
            left: 30,
            right: 30,
            height: 2,
            background: K.ink3,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 52,
            left: 0,
            fontSize: 10,
            fontFamily: K.sans,
            fontWeight: 800,
            color: K.ink2,
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
        >
          ← før
        </div>
        <div
          style={{
            position: "absolute",
            top: 52,
            right: 0,
            fontSize: 10,
            fontFamily: K.sans,
            fontWeight: 800,
            color: K.ink2,
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
        >
          efter →
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 14px" }}>
          {options.map(o => {
            const isActive = o.key === active
            return (
              <div
                key={o.key}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <div
                  style={{
                    padding: "8px 16px",
                    borderRadius: 999,
                    background: isActive ? K.coral : K.butterSoft,
                    color: isActive ? "#fff" : K.ink,
                    fontFamily: K.serif,
                    fontWeight: 700,
                    fontSize: 16,
                    border: `1.5px solid ${isActive ? K.coral : K.butter}`,
                    transform: isActive ? "translateY(-4px) scale(1.05)" : "none",
                    boxShadow: isActive ? `0 6px 14px -4px ${K.coral}55` : "none",
                  }}
                >
                  {o.top}
                </div>
                <div style={{ width: 2, height: 8, background: K.ink3 }} />
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: K.sans,
                    fontWeight: 700,
                    color: K.ink2,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {o.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
