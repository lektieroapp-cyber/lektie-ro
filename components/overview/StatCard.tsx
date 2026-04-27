import type { ReactNode } from "react"

// Single neutral tint for all three stat tiles. The earlier per-card
// tones (mint / clay / plum) collided visually with the subject summary
// cards directly below, so neutralising the icon backgrounds keeps the
// stat row from competing with the per-subject grid.
//
// The circle picks up the page bg + an inset drop-shadow so it reads as
// a "hole" carved into the white card — depth without colour.
type Tone = "mint" | "clay" | "plum"

const HOLE_BG = "#E8DEC2"  // matches parent layout bg behind the white card
const HOLE_SHADOW =
  "inset 0 3px 5px rgba(31,45,26,0.18), inset 0 -1px 1px rgba(255,255,255,0.55)"

/**
 * Forældre Ro stat tile — icon-left, content-right.
 * Big serif number anchors the eye; sub label sits underneath in muted ink.
 */
export function StatCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: ReactNode
  label: string
  value: string | number
  sub?: string
  tone: Tone
}) {
  return (
    <div
      className="flex items-center gap-4 rounded-card bg-white p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <span
        aria-hidden
        className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
        style={{ background: HOLE_BG, boxShadow: HOLE_SHADOW }}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-ink/65">{label}</p>
        <p
          className="mt-0.5 text-3xl font-bold leading-none text-ink"
          style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
        >
          {value}
        </p>
        {sub && (
          <p className="mt-1.5 text-xs text-ink/55">{sub}</p>
        )}
      </div>
    </div>
  )
}

export function CalendarIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="6.5" y="9.5" width="27" height="23" rx="4" fill="#B7D8C0" />
      <rect x="5" y="8" width="27" height="23" rx="4" fill="#fff" stroke="#4F8E6B" strokeWidth="1.6" />
      <path d="M5 12 a3 3 0 0 1 3-3 h21 a3 3 0 0 1 3 3 v3 H5 z" fill="#7ACBA2" />
      <rect x="11" y="5" width="2.6" height="6.5" rx="1.3" fill="#1F2D1A" />
      <rect x="23.4" y="5" width="2.6" height="6.5" rx="1.3" fill="#1F2D1A" />
      <circle cx="11.5" cy="20" r="1.6" fill="#4F8E6B" />
      <circle cx="18.5" cy="20" r="1.6" fill="#4F8E6B" />
      <circle cx="25.5" cy="20" r="1.6" fill="#7ACBA2" />
      <circle cx="11.5" cy="26" r="1.6" fill="#7ACBA2" />
      <circle cx="18.5" cy="26" r="1.6" fill="#C97962" />
      <circle cx="25.5" cy="26" r="1.6" fill="#C5E3D1" />
    </svg>
  )
}

export function FlameIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M20 5 C 21 10 27 12 28 18 C 29 24 25 31 20 33 C 14 31 11 26 12 20 C 13 16 16 15 17 12 C 18 14 19 14 20 5 z"
        fill="#E89B82"
        stroke="#8F4A38"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M20 14 C 20.5 17 24 18 23.5 22 C 23 26 21 29 20 30 C 17 28.5 15.5 25 16 21 C 16.5 18 18 17 19 15 C 19.3 16 19.6 15.5 20 14 z"
        fill="#F3D781"
      />
      <path
        d="M20 22 C 20.5 23.5 21.6 24.5 21 26.5 C 20.5 28 19.5 28.5 19 28 C 18 27 18 25 18.5 23.5 C 19 22.5 19.5 22.2 20 22 z"
        fill="#fff"
        opacity="0.9"
      />
    </svg>
  )
}

export function StarIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="20" cy="20" r="14" fill="#D7C5E8" opacity="0.6" />
      <path
        d="M20 6.5 L23.4 14.6 L32 15.5 L25.5 21.4 L27.4 30 L20 25.5 L12.6 30 L14.5 21.4 L8 15.5 L16.6 14.6 z"
        fill="#B69CCF"
        stroke="#5E4A78"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M20 9.5 L22.3 14.9 L17.7 14.9 z" fill="#E8DEF1" />
      <circle cx="31" cy="9" r="1.6" fill="#5E4A78" />
      <circle cx="9" cy="32" r="1.2" fill="#5E4A78" />
    </svg>
  )
}
