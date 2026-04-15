import type { HintMode, SolveResponse, Task } from "./types"

const ExplainIcon = (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
)

const HintIcon = (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3" strokeLinecap="round" />
  </svg>
)

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
      className="rounded-card bg-white p-6 md:p-8"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {/* Task confirmation */}
      <div className="rounded-xl border border-ink/10 bg-canvas px-4 py-3">
        <p className="text-[11px] uppercase tracking-wider text-muted">
          {solve.subject} · {solve.grade}. klasse
        </p>
        <p className="mt-1 text-[15px] text-ink leading-relaxed">{task.text}</p>
      </div>

      <h2
        className="mt-6 text-2xl font-bold text-ink"
        style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
      >
        Hvad har du brug for hjælp til?
      </h2>
      <p className="mt-1 text-sm text-muted">
        Vælg det der passer bedst til, hvor du er nu.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Explain mode */}
        <button
          type="button"
          onClick={() => onSelect("explain")}
          className="group flex flex-col items-start gap-3 rounded-card border-2 border-blue-soft/20 bg-blue-tint/30 p-5 text-left transition hover:border-blue-soft/50 hover:bg-blue-tint/60 focus:outline-none focus:ring-2 focus:ring-blue-soft/40"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-soft/15 text-blue-soft transition group-hover:bg-blue-soft/25">
            {ExplainIcon}
          </span>
          <div>
            <p className="text-[17px] font-bold text-ink">Forstå opgaven</p>
            <p className="mt-1 text-sm text-muted leading-relaxed">
              Hvad er det egentlig jeg skal gøre?
            </p>
          </div>
          <span className="mt-auto text-xs font-semibold text-blue-soft">
            Forklar mig det →
          </span>
        </button>

        {/* Hint mode */}
        <button
          type="button"
          onClick={() => onSelect("hint")}
          className="group flex flex-col items-start gap-3 rounded-card border-2 border-primary/20 bg-primary/5 p-5 text-left transition hover:border-primary/40 hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary transition group-hover:bg-primary/25">
            {HintIcon}
          </span>
          <div>
            <p className="text-[17px] font-bold text-ink">Jeg sidder fast</p>
            <p className="mt-1 text-sm text-muted leading-relaxed">
              Jeg er i gang, men kommer ikke videre.
            </p>
          </div>
          <span className="mt-auto text-xs font-semibold text-primary">
            Giv mig et hint →
          </span>
        </button>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-5 text-sm text-muted underline hover:text-ink"
      >
        ← Vælg en anden opgave
      </button>
    </div>
  )
}
