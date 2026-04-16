import type { HintMode, SolveResponse, Task } from "./types"

export function ModeSelector({
  task,
  solve,
  onSelect,
  onBack,
}: {
  task: Task
  solve: SolveResponse
  onSelect: (mode: HintMode) => void
  onBack: () => void
}) {
  return (
    <div
      className="rounded-card bg-white p-5 md:p-8"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <p className="text-[15px] font-medium text-ink leading-relaxed">{task.text}</p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => onSelect("explain")}
          className="flex-1 cursor-pointer rounded-btn border-2 border-blue-soft/25 bg-blue-tint/30 px-5 py-3.5 text-center text-[15px] font-semibold text-ink transition hover:border-blue-soft/50 hover:bg-blue-tint/60 focus:outline-none focus:ring-2 focus:ring-blue-soft/40"
        >
          Hvad skal jeg gøre?
        </button>
        <button
          type="button"
          onClick={() => onSelect("hint")}
          className="flex-1 cursor-pointer rounded-btn border-2 border-primary/25 bg-primary/5 px-5 py-3.5 text-center text-[15px] font-semibold text-ink transition hover:border-primary/40 hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          Jeg sidder fast
        </button>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-4 text-sm text-muted underline hover:text-ink"
      >
        ← Vælg en anden opgave
      </button>
    </div>
  )
}
