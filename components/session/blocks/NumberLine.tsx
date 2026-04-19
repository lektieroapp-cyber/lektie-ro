import { K } from "../design-tokens"

// Tallinje — animated hop across a linear sequence.
// Ported from math-components.jsx (T2.1).

type Props = {
  from: number
  to: number
  step: number
}

export function NumberLine({ from, to, step }: Props) {
  const min = Math.min(from, to) - 2
  const max = Math.max(from, to) + 2
  const W = 380
  const H = 110
  const pad = 24
  const x = (v: number) => pad + ((v - min) / (max - min)) * (W - pad * 2)
  const ticks: number[] = []
  for (let v = min + 2; v <= max - 2; v++) ticks.push(v)
  const axisY = 78
  const fromX = x(from)
  const toX = x(to)
  const midX = (fromX + toX) / 2

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: "block", margin: "12px auto", maxWidth: "100%" }}
    >
      <line x1={pad} y1={axisY} x2={W - pad} y2={axisY} stroke={K.ink3} strokeWidth="1.5" />
      {ticks.map(v => {
        const isEndpoint = v === from || v === to
        return (
          <g key={v}>
            <line
              x1={x(v)}
              y1={axisY - 4}
              x2={x(v)}
              y2={axisY + 4}
              stroke={isEndpoint ? K.ink : K.ink3}
              strokeWidth={isEndpoint ? 2 : 1}
            />
            <text
              x={x(v)}
              y={axisY + 20}
              fontSize="12"
              fontFamily={K.sans}
              fontWeight={isEndpoint ? 700 : 500}
              fill={isEndpoint ? K.ink : K.ink2}
              textAnchor="middle"
            >
              {v}
            </text>
          </g>
        )
      })}
      <path
        d={`M ${fromX} ${axisY} Q ${midX} ${axisY - 44} ${toX} ${axisY}`}
        stroke={K.coral}
        strokeWidth="2.5"
        fill="none"
        strokeDasharray="4 4"
        strokeLinecap="round"
      />
      <polygon
        points={`${toX - 5},${axisY - 5} ${toX + 2},${axisY} ${toX - 5},${axisY + 2}`}
        fill={K.coral}
      />
      <rect x={midX - 22} y={axisY - 58} width="44" height="22" rx="11" fill={K.coral} />
      <text
        x={midX}
        y={axisY - 42}
        fontFamily={K.serif}
        fontWeight="700"
        fontSize="14"
        fill="#fff"
        textAnchor="middle"
      >
        +{step}
      </text>
      <circle cx={fromX} cy={axisY} r="5" fill={K.ink} />
    </svg>
  )
}
