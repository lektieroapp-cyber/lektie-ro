import type { SolveResponse, Task } from "./types"

export function TaskPicker({
  solve,
  onPick,
  onNewPhoto,
}: {
  solve: SolveResponse
  onPick: (t: Task) => void
  onNewPhoto: () => void
}) {
  return (
    <div
      className="rounded-card bg-white p-5 md:p-8"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h2
        className="text-xl font-bold text-ink md:text-2xl"
        style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
      >
        Hvilken opgave skal vi kigge på?
      </h2>

      <ul className="mt-4 flex flex-col gap-2">
        {solve.tasks.map(t => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onPick(t)}
              className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border border-ink/10 bg-white px-4 py-3.5 text-left transition hover:border-primary/40 hover:bg-blue-tint/30"
            >
              <span className="text-[15px] text-ink leading-relaxed">{t.text}</span>
              <span aria-hidden className="shrink-0 text-primary">→</span>
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onNewPhoto}
        className="mt-4 text-sm text-muted underline hover:text-ink"
      >
        Tag nyt billede
      </button>
    </div>
  )
}
