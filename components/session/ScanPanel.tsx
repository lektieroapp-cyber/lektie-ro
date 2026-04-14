const CameraIcon = (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
)

export function ScanPanel({
  onSelect,
  error,
}: {
  onSelect: () => void
  error?: string | null
}) {
  return (
    <div
      className="rounded-card bg-white p-10 md:p-14 text-center"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-soft/15 text-blue-soft">
        {CameraIcon}
      </div>
      <h2
        className="mt-5 text-2xl md:text-3xl font-bold text-ink"
        style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
      >
        Scan din opgave
      </h2>
      <p className="mt-2 max-w-md mx-auto text-muted">
        Vis mig hvad du arbejder på, så hjælper jeg dig med at forstå det.
      </p>
      <button
        type="button"
        onClick={onSelect}
        className="mt-6 inline-flex rounded-btn bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
      >
        Tag billede eller vælg fra galleri
      </button>
      {error ? (
        <p className="mt-4 text-sm text-coral-deep">{error}</p>
      ) : (
        <p className="mt-3 text-xs text-muted">
          Demo: AI-svar er forhåndsdefinerede indtil Azure kører. Billedet uploades dog rigtigt.
        </p>
      )}
    </div>
  )
}
