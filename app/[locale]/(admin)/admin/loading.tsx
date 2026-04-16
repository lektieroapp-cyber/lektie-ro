export default function AdminLoading() {
  return (
    <div className="animate-pulse">
      {/* Stat cards */}
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-card bg-white p-6" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="h-3 w-24 rounded bg-ink/5" />
            <div className="mt-4 h-10 w-14 rounded bg-ink/5" />
          </div>
        ))}
      </div>
      {/* Invite + table */}
      <div className="mt-10 h-5 w-32 rounded bg-ink/5" />
      <div className="mt-4 h-24 w-full rounded-card bg-ink/5" />
      <div className="mt-10 h-5 w-40 rounded bg-ink/5" />
      <div className="mt-4 h-64 w-full rounded-card bg-ink/5" />
    </div>
  )
}
