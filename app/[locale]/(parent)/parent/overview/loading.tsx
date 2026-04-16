export default function OverviewLoading() {
  return (
    <div className="animate-pulse">
      {/* Title */}
      <div className="h-10 w-56 rounded-lg bg-ink/5 md:h-12 md:w-72" />
      <div className="mt-2 h-4 w-80 rounded bg-ink/5" />

      {/* Stat cards */}
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-card bg-white p-6" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="h-3 w-20 rounded bg-ink/5" />
            <div className="mt-4 h-10 w-16 rounded bg-ink/5" />
          </div>
        ))}
      </div>

      {/* Children section */}
      <div className="mt-10">
        <div className="h-6 w-32 rounded bg-ink/5" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {[0, 1].map(i => (
            <div key={i} className="rounded-card bg-white p-5" style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-ink/5" />
                <div>
                  <div className="h-4 w-24 rounded bg-ink/5" />
                  <div className="mt-2 h-3 w-16 rounded bg-ink/5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
