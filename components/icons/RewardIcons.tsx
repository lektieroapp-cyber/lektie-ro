// Subtle confetti / celebration glyph for headers (replaces 🎉).
// Other reward icons (star/flame/sticker) were removed along with the
// unbuilt XP/streak/sticker reward system — add them back when rewards ship.

type Props = { size?: number; color?: string }

export function SparkleIcon({ size = 20, color = "#7ACBA2" }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M12 2l1.6 5.1L19 9l-5.4 1.9L12 16l-1.6-5.1L5 9l5.4-1.9L12 2Z" />
      <circle cx="19" cy="18" r="1.5" />
      <circle cx="4" cy="18" r="1.2" opacity="0.7" />
    </svg>
  )
}
