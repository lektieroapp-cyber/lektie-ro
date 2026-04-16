export default function OverviewLoading() {
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1
          className="text-4xl md:text-5xl font-bold text-ink"
          style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
        >
          Forældre Ro
        </h1>
        <p className="text-base text-muted max-w-xl">
          Her får du overblik over barnets lektiesessioner og fremskridt.
        </p>
      </header>

      <div className="animate-pulse">
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

        {/* Recent sessions */}
        <div className="mt-10">
          <div className="h-6 w-40 rounded bg-ink/5" />
          <div className="mt-4 flex flex-col gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-4 rounded-card bg-white px-5 py-4" style={{ boxShadow: "var(--shadow-card)" }}>
                <div className="h-8 w-8 rounded-full bg-ink/5" />
                <div className="flex-1">
                  <div className="h-4 w-48 rounded bg-ink/5" />
                  <div className="mt-1 h-3 w-32 rounded bg-ink/5" />
                </div>
                <div className="h-4 w-12 rounded bg-ink/5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
