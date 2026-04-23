import { K } from "../design-tokens"

// Emitted by the AI when it can't see enough of the problem to help well —
// blurry photo, cropped task, reference to something off-page ("se side 14"),
// multiple pages visible, or the image is of something other than homework.
// Not a general "I don't know" — only for "I literally cannot see enough".
//
// Rendered inside Dani's bubble as a small card with a clear next action.

export function NeedPhoto({
  reason,
  onTakePhoto,
}: {
  reason?: string
  onTakePhoto?: () => void
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        borderRadius: 14,
        background: K.claySoft,
        border: `1px solid ${K.clay}33`,
        marginTop: 4,
      }}
    >
      <div
        aria-hidden
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          flexShrink: 0,
        }}
      >
        📸
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: K.clay,
            letterSpacing: 0.3,
            textTransform: "uppercase",
          }}
        >
          Jeg har brug for et bedre billede
        </div>
        {reason && (
          <div style={{ fontSize: 13, color: K.ink, lineHeight: 1.35, marginTop: 2 }}>
            {reason}
          </div>
        )}
      </div>
      {onTakePhoto && (
        <button
          type="button"
          onClick={onTakePhoto}
          style={{
            border: "none",
            background: K.clay,
            color: "#fff",
            borderRadius: 999,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            flexShrink: 0,
          }}
        >
          Tag nyt billede
        </button>
      )}
    </div>
  )
}
