type Tone = "mint" | "clay" | "plum"

const TONE_BG: Record<Tone, string> = {
  mint: "#E1EEDD",
  clay: "#F4DBD1",
  plum: "#E8DEF1",
}

const TONE_BAR: Record<Tone, string> = {
  mint: "#4F8E6B",
  clay: "#A05844",
  plum: "#7A5A9C",
}

/**
 * Per-subject completion tile. Icon at top, subject name, then a stacked
 * count + progress bar + percent at the bottom. Difficulty (the dot row)
 * lives on the wide child card to the left so we don't show the same data
 * in two places.
 *
 * Pass `href` to make the whole tile a link — used from Forældre Ro to
 * deep-link into the Tavle's subject detail for that child.
 */
import Link from "next/link"

export function SubjectSummaryCard({
  subjectLabel,
  icon,
  tone,
  done,
  total,
  countLabel,
  href,
  pctOverride,
}: {
  subjectLabel: string
  icon: React.ReactNode
  tone: Tone
  done: number
  total: number
  countLabel: string
  href?: string
  /** Step-level progress percentage for the bar (0-100). When passed,
   *  overrides the default `done/total` (task counts) calculation so the
   *  bar can reflect granular work — e.g. "0/1 opgave" + 17% bar when
   *  the kid has done 4 of 23 steps on the only task. Falls back to
   *  task-count math when unset. */
  pctOverride?: number | null
}) {
  const taskPct = total === 0 ? 0 : Math.round((done / total) * 100)
  const pct = pctOverride != null ? Math.max(0, Math.min(100, pctOverride)) : taskPct
  const baseClass =
    "flex h-full min-h-[17rem] flex-col items-center justify-between rounded-card bg-white p-5 text-center"
  const interactive = href
    ? "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md"
    : ""
  const inner = (
    <>
      {/* Top: icon + name */}
      <div className="flex flex-col items-center gap-3">
        <span
          aria-hidden
          className="inline-flex h-24 w-24 items-center justify-center rounded-full"
          style={{ background: TONE_BG[tone] }}
        >
          {icon}
        </span>
        <div
          className="text-base font-semibold text-ink"
          style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
        >
          {subjectLabel}
        </div>
      </div>
      {/* Bottom: count + progress bar + percent */}
      <div className="mt-4 flex w-full flex-col items-center gap-2">
        <p className="text-xs text-ink/60">{countLabel}</p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/8">
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: TONE_BAR[tone] }}
          />
        </div>
        <p className="text-xs font-semibold tabular-nums text-ink/70">{pct}%</p>
      </div>
    </>
  )
  return href ? (
    <Link
      href={href}
      className={`${baseClass} ${interactive}`}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {inner}
    </Link>
  ) : (
    <div className={baseClass} style={{ boxShadow: "var(--shadow-card)" }}>
      {inner}
    </div>
  )
}

export function AddSubjectCard({
  title,
  body,
}: {
  title: string
  body: string
}) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-card border-2 border-dashed border-ink/20 bg-white/40 p-4 text-center"
    >
      <span
        aria-hidden
        className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: "rgba(122, 203, 162, 0.7)", color: "#fff" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </span>
      <div
        className="text-sm font-semibold text-ink"
        style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
      >
        {title}
      </div>
      <p className="mt-0.5 text-xs text-ink/55">{body}</p>
    </div>
  )
}

export function MathGlyph() {
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <ellipse cx="34" cy="58" rx="18" ry="2.4" fill="#000" opacity="0.1" />
      <rect x="14" y="9" width="40" height="48" rx="6" fill="#5E4A78" />
      <rect x="13" y="8" width="40" height="48" rx="6" fill="#9F8AB5" stroke="#1F2D1A" strokeWidth="1.5" />
      <rect x="17" y="13" width="32" height="12" rx="2.5" fill="#FFF8EA" stroke="#1F2D1A" strokeWidth="1.3" />
      <path d="M40 17.5 L40 21.5 M44 17.5 L44 21.5" stroke="#4F8E6B" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M30 17.5 L30 21.5" stroke="#C97962" strokeWidth="1.6" strokeLinecap="round" />
      <g fill="#FFF8EA" stroke="#1F2D1A" strokeWidth="1.1">
        <rect x="17.5" y="29" width="6" height="5" rx="1.2" />
        <rect x="25.5" y="29" width="6" height="5" rx="1.2" />
        <rect x="33.5" y="29" width="6" height="5" rx="1.2" />
        <rect x="41.5" y="29" width="6" height="5" rx="1.2" fill="#C97962" />
        <rect x="17.5" y="36" width="6" height="5" rx="1.2" />
        <rect x="25.5" y="36" width="6" height="5" rx="1.2" />
        <rect x="33.5" y="36" width="6" height="5" rx="1.2" />
        <rect x="41.5" y="36" width="6" height="5" rx="1.2" fill="#C97962" />
        <rect x="17.5" y="43" width="6" height="5" rx="1.2" />
        <rect x="25.5" y="43" width="6" height="5" rx="1.2" />
        <rect x="33.5" y="43" width="6" height="5" rx="1.2" />
        <rect x="41.5" y="43" width="6" height="5" rx="1.2" fill="#7ACBA2" />
        <rect x="17.5" y="50" width="14" height="5" rx="1.2" />
        <rect x="33.5" y="50" width="6" height="5" rx="1.2" />
        <rect x="41.5" y="50" width="6" height="5" rx="1.2" fill="#7ACBA2" />
      </g>
    </svg>
  )
}
export function BookGlyph() {
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <ellipse cx="34" cy="56" rx="22" ry="3" fill="#000" opacity="0.08" />
      <path d="M10 18 L34 22 L58 18 L58 50 L34 54 L10 50 z" fill="#4F8E6B" />
      <path d="M10 18 L34 22 L34 54 L10 50 z" fill="#FFF8EA" stroke="#1F2D1A" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M58 18 L34 22 L34 54 L58 50 z" fill="#FFF8EA" stroke="#1F2D1A" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M34 22 L34 54" stroke="#1F2D1A" strokeWidth="1.4" />
      <path d="M14 28 L30 31" stroke="#556048" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M14 33 L30 36" stroke="#556048" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M14 38 L26 40.5" stroke="#556048" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M14 43 L30 45.5" stroke="#556048" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M38 31 L54 28" stroke="#556048" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M38 36 L54 33" stroke="#556048" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M38 40.5 L50 38.5" stroke="#556048" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M38 45.5 L54 43" stroke="#556048" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M44 18 L44 32 L47 29.5 L50 32 L50 18 z" fill="#C97962" stroke="#1F2D1A" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}
export function DictionaryGlyph() {
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <ellipse cx="34" cy="56" rx="20" ry="2.6" fill="#000" opacity="0.1" />
      <path d="M16 12 L48 12 L48 54 L16 54 z" fill="#FFF8EA" />
      <path d="M48 12 L52 16 L52 56 L48 54 z" fill="#EAD9B5" />
      <path d="M14 11 L46 11 Q50 11 50 15 L50 53 Q50 57 46 57 L14 57 z" fill="#C97962" stroke="#1F2D1A" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14 19 L50 19" stroke="#8F4A38" strokeWidth="1.3" />
      <path d="M14 49 L50 49" stroke="#8F4A38" strokeWidth="1.3" />
      <rect x="20" y="26" width="24" height="14" rx="1.5" fill="#FFF8EA" stroke="#8F4A38" strokeWidth="1.2" />
      <path d="M23 31 L41 31" stroke="#8F4A38" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M25 35.5 L39 35.5" stroke="#8F4A38" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M14 11 L18 15 L14 15 z" fill="#8F4A38" opacity="0.5" />
    </svg>
  )
}
