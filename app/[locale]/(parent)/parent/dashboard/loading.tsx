export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div className="w-full max-w-2xl animate-pulse">
        {/* Greeting placeholder */}
        <div className="mx-auto h-8 w-36 rounded-lg bg-ink/5" />
        {/* Scan card placeholder */}
        <div className="mt-4 rounded-card bg-white px-6 py-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="mx-auto h-14 w-14 rounded-full bg-ink/5" />
          <div className="mx-auto mt-4 h-5 w-52 rounded bg-ink/5" />
          <div className="mx-auto mt-2 h-3 w-40 rounded bg-ink/5" />
        </div>
      </div>
    </div>
  )
}
