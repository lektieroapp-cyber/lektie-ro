export function ThinkingPanel({
  previewUrl,
  label,
  sub,
}: {
  previewUrl?: string | null
  label?: string
  sub?: string
}) {
  return (
    <div
      className="rounded-card bg-white p-8 md:p-12 text-center"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt=""
          className="mx-auto mb-6 max-h-48 w-auto rounded-card object-contain"
        />
      )}
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
        {label || "Jeg kigger på opgaven …"}
      </h2>
      <p className="mt-2 text-sm text-muted">
        {sub || "Et øjeblik mens jeg finder ud af, hvad du arbejder med."}
      </p>
    </div>
  )
}
