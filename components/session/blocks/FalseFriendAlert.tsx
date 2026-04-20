import { K } from "../design-tokens"

// Falske venner — DA≠EN lookalikes warning card.
// Ported from engelsk-components.jsx (T3.14).

type Props = {
  da: string
  daMeaning: string
  en: string
  enMeaning: string
  note?: string
}

export function FalseFriendAlert({ da, daMeaning, en, enMeaning, note }: Props) {
  return (
    <div
      style={{
        maxWidth: 380,
        padding: 18,
        background: K.butterSoft,
        border: `1.5px solid ${K.butter}`,
        borderRadius: 18,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        margin: "12px auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            background: K.butter,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: K.serif,
            fontWeight: 800,
            fontSize: 16,
            color: "#556048",
          }}
        >
          !
        </div>
        <div
          style={{
            fontFamily: K.sans,
            fontWeight: 800,
            fontSize: 12,
            color: "#556048",
            letterSpacing: 0.6,
            textTransform: "uppercase",
          }}
        >
          Falske venner
        </div>
      </div>
      <div style={{ display: "flex", gap: 14, alignItems: "stretch" }}>
        <div
          style={{
            flex: 1,
            padding: 12,
            background: K.mintSoft,
            borderRadius: 12,
            border: `1.5px solid ${K.mint}`,
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
              color: "#4F8E6B",
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            Dansk
          </div>
          <div style={{ fontFamily: K.serif, fontWeight: 700, fontSize: 18, color: K.ink }}>
            {da}
          </div>
          <div style={{ fontFamily: K.sans, fontSize: 12, color: K.ink2, fontStyle: "italic" }}>
            {daMeaning}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontFamily: K.serif,
            fontSize: 20,
            color: K.action,
            fontWeight: 700,
          }}
        >
          ≠
        </div>
        <div
          style={{
            flex: 1,
            padding: 12,
            background: K.skySoft,
            borderRadius: 12,
            border: `1.5px solid ${K.sky}`,
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
              color: "#4F8E6B",
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            English
          </div>
          <div style={{ fontFamily: K.serif, fontWeight: 700, fontSize: 18, color: K.ink }}>
            {en}
          </div>
          <div style={{ fontFamily: K.sans, fontSize: 12, color: K.ink2, fontStyle: "italic" }}>
            {enMeaning}
          </div>
        </div>
      </div>
      {note && (
        <div
          style={{
            fontFamily: K.sans,
            fontSize: 12,
            color: "#556048",
            lineHeight: 1.4,
          }}
        >
          {note}
        </div>
      )}
    </div>
  )
}
