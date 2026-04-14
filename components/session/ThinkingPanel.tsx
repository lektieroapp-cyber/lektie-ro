export function ThinkingPanel() {
  return (
    <div
      className="rounded-card bg-white p-12 text-center"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div
        className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-tint"
        aria-hidden
      >
        <span className="block h-4 w-4 animate-pulse rounded-full bg-blue-soft" />
      </div>
      <h2
        className="mt-5 text-2xl font-bold text-ink"
        style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
      >
        Jeg kigger på opgaven …
      </h2>
      <p className="mt-2 text-sm text-muted">Et øjeblik mens jeg finder ud af, hvad du arbejder med.</p>
    </div>
  )
}
