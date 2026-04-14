import type { SolveResponse, Task } from "./types"

export function TaskPicker({
  solve,
  onPick,
  onCancel,
  imagePath,
}: {
  solve: SolveResponse
  onPick: (t: Task) => void
  onCancel: () => void
  imagePath?: string | null
}) {
  return (
    <div
      className="rounded-card bg-white p-8"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            Fag: <span className="text-ink font-medium capitalize">{solve.subject}</span>
            {" · "}Klasse: <span className="text-ink font-medium">{solve.grade}.</span>
          </p>
          <h2
            className="mt-1 text-2xl font-bold text-ink"
            style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
          >
            Hvilken opgave vil du starte med?
          </h2>
          {imagePath && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-success">
              <span aria-hidden>✓</span> Billede uploadet
              <code className="text-muted">({imagePath.split("/").pop()})</code>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 text-sm text-muted underline hover:text-ink"
        >
          Annullér
        </button>
      </div>

      <ul className="mt-6 flex flex-col gap-3">
        {solve.tasks.map(t => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onPick(t)}
              className="flex w-full items-center justify-between gap-4 rounded-card border border-ink/10 bg-white px-5 py-4 text-left transition hover:border-primary/40 hover:bg-blue-tint/30"
            >
              <span className="text-ink leading-relaxed">{t.text}</span>
              <span aria-hidden className="shrink-0 text-primary">→</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
