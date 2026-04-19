import { K } from "../design-tokens"

// Analog ur — hel/halv/kvart past. Highlight optionally circles a specific hour.
// Ported from math-components.jsx (T3.5).

type Props = {
  hour: number
  minute: number
  highlight?: number | null
}

export function Clock({ hour, minute, highlight = null }: Props) {
  const cx = 80
  const cy = 80
  const r = 72
  const hourAngle = ((hour % 12) + minute / 60) * 30 - 90
  const minAngle = minute * 6 - 90
  const hourX = cx + Math.cos((hourAngle * Math.PI) / 180) * 38
  const hourY = cy + Math.sin((hourAngle * Math.PI) / 180) * 38
  const minX = cx + Math.cos((minAngle * Math.PI) / 180) * 56
  const minY = cy + Math.sin((minAngle * Math.PI) / 180) * 56

  return (
    <svg
      width="170"
      height="170"
      viewBox="0 0 160 160"
      style={{ display: "block", margin: "12px auto" }}
    >
      <circle cx={cx} cy={cy} r={r} fill={K.card} stroke={K.ink} strokeWidth="2.5" />
      <circle cx={cx} cy={cy} r={r - 8} fill="none" stroke={K.skySoft} strokeWidth="1" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = i * 30 - 90
        const x1 = cx + Math.cos((a * Math.PI) / 180) * (r - 4)
        const y1 = cy + Math.sin((a * Math.PI) / 180) * (r - 4)
        const x2 = cx + Math.cos((a * Math.PI) / 180) * (r - 12)
        const y2 = cy + Math.sin((a * Math.PI) / 180) * (r - 12)
        const tx = cx + Math.cos((a * Math.PI) / 180) * (r - 22)
        const ty = cy + Math.sin((a * Math.PI) / 180) * (r - 22)
        const label = i === 0 ? 12 : i
        const isHl = highlight === label
        return (
          <g key={i}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={K.ink}
              strokeWidth={i % 3 === 0 ? 2 : 1}
            />
            <text
              x={tx}
              y={ty + 4}
              fontSize={i % 3 === 0 ? 13 : 11}
              fontFamily={K.serif}
              fontWeight="700"
              fill={isHl ? K.coral : K.ink}
              textAnchor="middle"
            >
              {label}
            </text>
            {isHl && (
              <circle cx={tx} cy={ty - 1} r="11" fill="none" stroke={K.coral} strokeWidth="2" strokeDasharray="3 2" />
            )}
          </g>
        )
      })}
      <line x1={cx} y1={cy} x2={hourX} y2={hourY} stroke={K.ink} strokeWidth="4" strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={minX} y2={minY} stroke={K.coral} strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="4" fill={K.ink} />
    </svg>
  )
}
