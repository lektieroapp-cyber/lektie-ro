"use client"

import Image from "next/image"
import Link from "next/link"
import {
  MathGlyph,
  BookGlyph,
  DictionaryGlyph,
} from "@/components/overview/SubjectSummaryCard"

export type EmptyTavleMessages = {
  emptyHeroTitle: string
  emptyHeroBody: string
  emptyHeroBodyKidWait: string
  subjects: Record<string, string>
  subjectTaglineDansk: string
  subjectTaglineMatematik: string
  subjectTaglineEngelsk: string
  emptyTipTitle: string
  emptyTipBody: string
  emptyAddTaskTitle: string
  emptyAddTaskBody: string
}

/**
 * First-run empty state for the Tavle. Hero illustration ported from the
 * design handoff at `lektiero/project/Tavle Empty Hero.html` — see the SVG
 * comments for the original scene structure.
 */
export function EmptyTavle({
  newTaskHref,
  showCta,
  messages,
}: {
  newTaskHref: string
  /** When false (young kid waiting on parent), subject + cta links render
   *  as plain divs and the bottom CTA is hidden. */
  showCta: boolean
  messages: EmptyTavleMessages
}) {
  const subjects: Array<{
    key: "dansk" | "matematik" | "engelsk"
    tint: string
    bar: string
    glyph: React.ReactNode
    tagline: string
  }> = [
    { key: "dansk",     tint: "#E1EEDD", bar: "#5C9D6E", glyph: <BookGlyph />, tagline: messages.subjectTaglineDansk },
    { key: "matematik", tint: "#FBEFD7", bar: "#D6B850", glyph: <MathGlyph />, tagline: messages.subjectTaglineMatematik },
    { key: "engelsk",   tint: "#E8DEF1", bar: "#7A5A9C", glyph: <DictionaryGlyph />, tagline: messages.subjectTaglineEngelsk },
  ]

  return (
    <div className="flex flex-col items-stretch gap-4">
      <div
        className="rounded-card bg-white p-5 sm:p-7"
        style={{
          boxShadow: "0 1px 0 rgba(31,45,26,0.04), 0 18px 36px -28px rgba(31,45,26,0.18)",
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <div className="flex flex-col items-center text-center">
          <TavleHeroIllustration />
          <h2
            className="mt-2 text-2xl font-bold text-ink md:text-3xl"
            style={{ fontFamily: "var(--font-fraunces), var(--font-display)", letterSpacing: "-0.01em" }}
          >
            {messages.emptyHeroTitle}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink/65">
            {showCta ? messages.emptyHeroBody : messages.emptyHeroBodyKidWait}
          </p>
        </div>

        {/* Subject cards — wide horizontal layout. Whole card clickable when
            the user is allowed to add tasks. */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {subjects.map(s => {
            const inner = (
              <>
                <span aria-hidden className="shrink-0">
                  {s.glyph}
                </span>
                <div className="min-w-0 flex-1">
                  <div
                    className="text-base font-semibold text-ink"
                    style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
                  >
                    {messages.subjects[s.key] ?? s.key}
                  </div>
                  <div className="text-xs text-ink/60">{s.tagline}</div>
                </div>
                {showCta && (
                  <span
                    aria-hidden
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink/70"
                    style={{ background: "rgba(255,255,255,0.65)" }}
                  >
                    <PlusGlyph />
                  </span>
                )}
              </>
            )
            const baseClass = "flex items-center gap-3 rounded-card p-4 text-left"
            const interactive = "transition cursor-pointer hover:-translate-y-0.5"
            const style = {
              background: s.tint,
              boxShadow: "0 1px 0 rgba(255,255,255,0.5) inset, 0 6px 18px -10px rgba(31,45,26,0.18)",
            } as const
            // Carry the subject through as ?subject= so the create page
            // pre-selects it instead of defaulting back to "dansk".
            const href = `${newTaskHref}${newTaskHref.includes("?") ? "&" : "?"}subject=${s.key}`
            return showCta ? (
              <Link key={s.key} href={href} className={`${baseClass} ${interactive}`} style={style}>
                {inner}
              </Link>
            ) : (
              <div key={s.key} className={baseClass} style={style}>
                {inner}
              </div>
            )
          })}
        </div>

        {/* Heart divider — dashed line + small clay heart in the middle */}
        <div className="mx-auto mt-5 flex max-w-md items-center gap-3" aria-hidden>
          <span className="h-px flex-1 border-t border-dashed border-ink/15" />
          <HeartGlyph />
          <span className="h-px flex-1 border-t border-dashed border-ink/15" />
        </div>

        {/* Tip strip */}
        <div className="mt-4 flex items-center gap-3 rounded-card bg-mint-soft/60 px-4 py-2.5">
          <span
            aria-hidden
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint-deep/85 text-white"
          >
            <StarOutlineGlyph />
          </span>
          <div className="min-w-0">
            <p
              className="text-sm font-semibold text-ink"
              style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
            >
              {messages.emptyTipTitle}
            </p>
            <p className="text-xs text-ink/60">{messages.emptyTipBody}</p>
          </div>
        </div>
      </div>

      {/* Bottom add CTA */}
      {showCta && (
        <Link
          href={newTaskHref}
          className="mx-auto inline-flex w-full max-w-md items-center gap-3 rounded-card bg-white px-5 py-4 text-left transition hover:-translate-y-0.5 cursor-pointer"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <span
            aria-hidden
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
            style={{ background: "#7ACBA2" }}
          >
            <PlusGlyph size={18} strokeWidth={2.5} />
          </span>
          <span className="flex-1">
            <span
              className="block text-sm font-semibold text-ink"
              style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
            >
              {messages.emptyAddTaskTitle}
            </span>
            <span className="block text-xs text-ink/60">{messages.emptyAddTaskBody}</span>
          </span>
        </Link>
      )}
    </div>
  )
}

/**
 * Hero illustration shared between empty-state and the main Tavle. The PNG
 * ships with generous internal padding around the artwork; the negative
 * vertical margins absorb that padding so the illustration fills more of
 * the card.
 *
 * Trim is responsive — mobile gets much smaller absolute negatives so the
 * artwork doesn't overlap the title underneath. The `variant` prop picks
 * between the empty-state (heavier trim, big illustration) and the
 * in-board use (lighter trim so the plant doesn't overlap subject cards).
 */
export function TavleHeroIllustration({
  maxWidth = 720,
  variant = "default",
}: {
  maxWidth?: number
  variant?: "default" | "compact"
}) {
  const trimClass =
    variant === "compact"
      ? "-mt-6 -mb-1 sm:-mt-12 sm:-mb-3 md:-mt-20 md:-mb-5"
      : "-mt-8 -mb-8 sm:-mt-16 sm:-mb-16 md:-mt-28 md:-mb-28"
  return (
    <div
      className={`mx-auto w-full ${trimClass}`}
      style={{ maxWidth }}
    >
      {/* Intrinsic dimensions match the source asset (1536×1024) so the
          browser reserves the correct aspect-ratio box before the bytes
          arrive — no layout shift on first paint. `priority` skips the
          lazy-load handshake since this lives above the fold on every
          Tavle render. */}
      <Image
        src="/tavle-empty-hero.webp"
        alt=""
        aria-hidden
        width={1536}
        height={1024}
        priority
        // Next.js re-compresses at q=75 by default; on small render
        // sizes (e.g. the 240px subject-detail header) that's enough
        // for visible blur on the soft pot/leaf gradients. q=92 keeps
        // the file small but the optimisation lossless-feeling.
        quality={92}
        sizes={`(max-width: 768px) 100vw, ${maxWidth}px`}
        className="mx-auto block h-auto w-full"
        style={{ maxWidth }}
      />
    </div>
  )
}

// ─── Reusable mini glyphs (no emojis) ────────────────────────────────────────

/** Mini sprout used inline in the empty-hero title and the regular Tavle
 *  mascot strip. Single source of truth for the sprout shape. */
export function SproutGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <path d="M11 20 C 11 14 11 10 11 5" stroke="#4F8E6B" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M11 12 C 5 11 2 5 4 1 C 10 1 11 6 11 11 z" fill="#7ACBA2" stroke="#4F8E6B" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M11 9 C 13 3 18 1 21 2 C 21 8 16 11 11 11 z" fill="#7ACBA2" stroke="#4F8E6B" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

function PlusGlyph({ size = 16, strokeWidth = 2.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function HeartGlyph() {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" fill="#C97962" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <path d="M8 13 C 1 8 1 3 4.5 1 C 6.5 0 7.5 1 8 2 C 8.5 1 9.5 0 11.5 1 C 15 3 15 8 8 13 z" />
    </svg>
  )
}

function StarOutlineGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M12 2l2.6 6.6L22 9.5l-5.5 4.8L18 22l-6-3.5L6 22l1.5-7.7L2 9.5l7.4-.9L12 2z" />
    </svg>
  )
}
