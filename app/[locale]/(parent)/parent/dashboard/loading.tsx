// Skeleton for the Tavle dashboard. The header is static (same title +
// subtitle for both kid and parent modes — see messages.tavle.title /
// subtitleParent / subtitleKid in messages/da.json) so we render its
// real text immediately. Only the data-driven parts (subject grid,
// hero illustration, add-task CTA) get the pulse skeleton treatment.
//
// Strings are hardcoded `da` rather than going through `getMessages`
// because Next.js loading.tsx components don't receive params. `da` is
// the only active locale today; revisit when sv/nb ship.
const HEADER_TITLE = "Tavle"
const HEADER_SUBTITLE = "Dine opgaver og lektier samlet ét sted."

export default function DashboardLoading() {
  return (
    <div className="flex w-full flex-col gap-6 pb-12 md:pb-16">
      {/* Real header — static across loads, no skeleton needed. */}
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1
              className="text-3xl font-bold text-ink md:text-4xl"
              style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
            >
              {HEADER_TITLE}
            </h1>
            <p className="text-sm text-ink/60">{HEADER_SUBTITLE}</p>
          </div>
        </div>
      </header>

      {/* Pulsing skeleton wraps only the data-driven content below. */}
      <div className="flex flex-col gap-6 motion-safe:animate-pulse">
        {/* Main card — hero illustration + subject grid */}
        <div
          className="rounded-card bg-white/55 p-4 sm:p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          {/* Hero illustration placeholder. Aspect ratio matches the
              actual /tavle-empty-hero.webp (1536×1024 ≈ 3:2) so the
              reserved height is right on every viewport. */}
          <div className="mx-auto w-full" style={{ maxWidth: 520 }}>
            <div
              className="w-full rounded-card bg-ink/[0.04]"
              style={{ aspectRatio: "3 / 2" }}
            />
          </div>

          {/* Three subject cards. Tints are intentionally muted versions
              of the live subject palette (dansk green, matematik gold,
              engelsk purple) so the skeleton hints at the real thing
              instead of three identical grey rectangles. */}
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SubjectCardSkeleton tint="#E1EEDD" bar="#5C9D6E" />
            <SubjectCardSkeleton tint="#FBEFD7" bar="#D6B850" />
            <SubjectCardSkeleton tint="#E8DEF1" bar="#7A5A9C" />
          </div>
        </div>

        {/* Bottom CTA — add task pill */}
        <div
          className="mx-auto flex w-full max-w-xl items-center gap-3 rounded-card border border-ink/8 bg-white/70 px-5 py-4"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <span className="inline-flex h-10 w-10 shrink-0 rounded-full bg-mint/35" />
          <div className="h-4 w-40 rounded bg-ink/10" />
        </div>
      </div>
    </div>
  )
}

function SubjectCardSkeleton({ tint, bar }: { tint: string; bar: string }) {
  return (
    <div
      className="flex flex-col items-start gap-3 rounded-card p-4"
      style={{
        background: tint,
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.5) inset, 0 6px 18px -10px rgba(31,45,26,0.18)",
      }}
    >
      <div className="flex w-full items-start justify-between gap-3">
        {/* Glyph slot — circle placeholder */}
        <div className="h-7 w-7 rounded-full bg-white/55" />
        <div className="flex min-w-0 flex-col items-end gap-1.5">
          <div className="h-5 w-24 rounded bg-white/65" />
          <div className="h-3 w-16 rounded bg-white/55" />
        </div>
      </div>
      {/* Progress bar — shows ~35% in subject-bar colour as a teaser
          rather than a flat grey block. */}
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/65">
        <div className="h-full w-[35%] rounded-full" style={{ background: bar }} />
      </div>
    </div>
  )
}
