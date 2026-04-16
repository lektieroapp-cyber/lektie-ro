const SUBJECTS = [
  { key: "matematik", label: "Matematik", emoji: "🔢" },
  { key: "dansk", label: "Dansk", emoji: "📖" },
  { key: "engelsk", label: "Engelsk", emoji: "🇬🇧" },
] as const

export function SubjectPicker({
  onPick,
}: {
  onPick: (subject: string) => void
}) {
  return (
    <div
      className="rounded-card bg-white p-5 text-center md:p-8"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h2
        className="text-xl font-bold text-ink md:text-2xl"
        style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
      >
        Hvilket fag er det?
      </h2>
      <p className="mt-1 text-sm text-muted">
        Jeg kunne ikke helt se det ud fra billedet.
      </p>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {SUBJECTS.map(s => (
          <button
            key={s.key}
            type="button"
            onClick={() => onPick(s.key)}
            className="flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-ink/10 bg-white px-3 py-4 transition hover:border-primary/40 hover:bg-blue-tint/30 focus:outline-none focus:ring-2 focus:ring-primary/30 md:px-5 md:py-5"
          >
            <span className="text-3xl md:text-4xl">{s.emoji}</span>
            <span className="text-sm font-semibold text-ink md:text-base">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
