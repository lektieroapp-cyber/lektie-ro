// Dani the lion — warm, hand-drawn SVG mascot with moods.
// Ported from the Claude Design prototype to React/TS.

export type DaniMood =
  | "happy"
  | "excited"
  | "curious"
  | "thinking"
  | "cheer"
  | "wonder"
  | "sleepy"

const MANE = "#E8A04A"
const MANE_DARK = "#C97F2E"
const FACE = "#F9DDB0"
const FACE_SHADE = "#E8C48C"
const NOSE = "#2C2138"
const MOUTH = "#2C2138"

export function Dani({
  mood = "happy",
  size = 80,
  bobbing = false,
  thinking = false,
  className = "",
}: {
  mood?: DaniMood
  size?: number
  bobbing?: boolean
  thinking?: boolean
  className?: string
}) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        position: "relative",
        display: "inline-block",
        animation: bobbing ? "daniBob 2.8s ease-in-out infinite" : undefined,
      }}
    >
      <svg viewBox="0 0 104 104" width={size} height={size} style={{ overflow: "visible" }}>
        {/* Mane — two rings of tufts for a fluffy feel */}
        {Array.from({ length: 14 }).map((_, i) => {
          const a = (i / 14) * Math.PI * 2
          const r = 40 + (i % 3) * 3
          const cx = 52 + Math.cos(a) * r
          const cy = 54 + Math.sin(a) * r
          return <circle key={`m1-${i}`} cx={cx} cy={cy} r={13} fill={MANE_DARK} />
        })}
        {Array.from({ length: 14 }).map((_, i) => {
          const a = (i / 14) * Math.PI * 2 + 0.22
          const r = 36
          const cx = 52 + Math.cos(a) * r
          const cy = 54 + Math.sin(a) * r
          return <circle key={`m2-${i}`} cx={cx} cy={cy} r={13} fill={MANE} />
        })}

        {/* Ears */}
        <circle cx="26" cy="34" r="8" fill={MANE_DARK} />
        <circle cx="26" cy="34" r="5" fill="#D48BA1" />
        <circle cx="78" cy="34" r="8" fill={MANE_DARK} />
        <circle cx="78" cy="34" r="5" fill="#D48BA1" />

        {/* Face */}
        <ellipse cx="52" cy="58" rx="26" ry="24" fill={FACE} />
        <circle cx="34" cy="64" r="5" fill="#F4A7A3" opacity="0.55" />
        <circle cx="70" cy="64" r="5" fill="#F4A7A3" opacity="0.55" />

        {/* Muzzle + nose */}
        <ellipse cx="52" cy="68" rx="12" ry="8" fill={FACE_SHADE} opacity="0.6" />
        <path d="M48 60 q4 -3 8 0 q-4 5 -8 0 z" fill={NOSE} />

        <Eyes mood={mood} />
        <Mouth mood={mood} />

        {/* Whisker dots */}
        <circle cx="42" cy="66" r="0.9" fill="#2C2138" opacity="0.5" />
        <circle cx="62" cy="66" r="0.9" fill="#2C2138" opacity="0.5" />
      </svg>

      {thinking && (
        <div
          style={{
            position: "absolute",
            top: -6,
            right: -14,
            animation: "daniThink 1.6s ease-in-out infinite",
          }}
        >
          <svg width="30" height="24" viewBox="0 0 30 24">
            <circle cx="8" cy="18" r="3" fill="#fff" stroke="#2C2138" strokeWidth="1.5" />
            <circle cx="14" cy="12" r="4" fill="#fff" stroke="#2C2138" strokeWidth="1.5" />
            <circle cx="22" cy="8" r="6" fill="#fff" stroke="#2C2138" strokeWidth="1.5" />
          </svg>
        </div>
      )}
    </div>
  )
}

function Eyes({ mood }: { mood: DaniMood }) {
  switch (mood) {
    case "excited":
      return (
        <g>
          <circle cx="40" cy="52" r="3.5" fill="#2C2138" />
          <circle cx="64" cy="52" r="3.5" fill="#2C2138" />
          <circle cx="41" cy="51" r="1.2" fill="#fff" />
          <circle cx="65" cy="51" r="1.2" fill="#fff" />
        </g>
      )
    case "curious":
      return (
        <g>
          <circle cx="40" cy="53" r="3" fill="#2C2138" />
          <circle cx="64" cy="51" r="3" fill="#2C2138" />
        </g>
      )
    case "thinking":
      return (
        <g>
          <path d="M36 54 q4 -3 8 0" stroke="#2C2138" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="64" cy="52" r="3" fill="#2C2138" />
        </g>
      )
    case "cheer":
      return (
        <g>
          <path d="M35 54 q5 -6 10 0" stroke="#2C2138" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M59 54 q5 -6 10 0" stroke="#2C2138" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      )
    case "wonder":
      return (
        <g>
          <circle cx="40" cy="52" r="4" fill="#fff" stroke="#2C2138" strokeWidth="2" />
          <circle cx="64" cy="52" r="4" fill="#fff" stroke="#2C2138" strokeWidth="2" />
          <circle cx="40" cy="53" r="2" fill="#2C2138" />
          <circle cx="64" cy="53" r="2" fill="#2C2138" />
        </g>
      )
    case "sleepy":
    case "happy":
    default:
      return (
        <g>
          <path d="M36 52 q4 4 8 0" stroke="#2C2138" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M60 52 q4 4 8 0" stroke="#2C2138" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      )
  }
}

function Mouth({ mood }: { mood: DaniMood }) {
  switch (mood) {
    case "excited":
      return <path d="M44 66 q8 10 16 0 q-8 4 -16 0 z" fill={MOUTH} />
    case "curious":
      return <circle cx="52" cy="69" r="2.5" fill={MOUTH} />
    case "thinking":
      return <path d="M47 70 q5 -2 10 0" stroke={MOUTH} strokeWidth="3" fill="none" strokeLinecap="round" />
    case "cheer":
      return <path d="M42 66 q10 14 20 0 q-10 6 -20 0 z" fill={MOUTH} />
    case "wonder":
      return <ellipse cx="52" cy="70" rx="3" ry="4" fill={MOUTH} />
    case "sleepy":
      return <path d="M48 70 q4 2 8 0" stroke={MOUTH} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    case "happy":
    default:
      return <path d="M46 68 q6 5 12 0" stroke={MOUTH} strokeWidth="3" fill="none" strokeLinecap="round" />
  }
}

export function Sparkles({ count = 6, color = "#E8A04A" }: { count?: number; color?: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
      {Array.from({ length: count }).map((_, i) => {
        const left = 10 + ((i * 83) % 90)
        const top = 20 + ((i * 37) % 70)
        const delay = (i * 0.3) % 2
        const size = 6 + (i % 3) * 3
        return (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 10 10"
            style={{
              position: "absolute",
              left: `${left}%`,
              top: `${top}%`,
              animation: `sparkle 2.4s ease-in-out ${delay}s infinite`,
            }}
          >
            <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill={color} />
          </svg>
        )
      })}
    </div>
  )
}
