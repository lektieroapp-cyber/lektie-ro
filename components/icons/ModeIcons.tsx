// Mode-selector icons — replace the 💡 🧭 🪤 emojis from the prototype with
// clean inline SVGs that respect the kid's accent.

type Props = { size?: number; color?: string }

// "Jeg vil prøve selv" — lightbulb
export function IdeaIcon({ size = 24, color = "#3E8A6A" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 3a6 6 0 0 0-4 10.5c.7.8 1 1.2 1 2.5v1h6v-1c0-1.3.3-1.7 1-2.5A6 6 0 0 0 12 3Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 19h6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 21h4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

// "Hvad skal jeg gøre?" — compass
export function CompassIcon({ size = 24, color = "#3A5F7A" }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
      <path
        d="M15 9l-2.2 5.2L7.6 16l2.2-5.2L15 9Z"
        fill={color}
        stroke={color}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// "Jeg sidder fast" — a gentle helping-hand / compass point (not a trap;
// "stuck" iconography should be kind, not alarming).
export function StuckIcon({ size = 24, color = "#D85C48" }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v6M12 15v6M3 12h6M15 12h6"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="2.5" fill={color} />
    </svg>
  )
}
