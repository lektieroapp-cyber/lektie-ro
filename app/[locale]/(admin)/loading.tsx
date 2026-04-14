export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="h-12 w-1/3 animate-pulse rounded-lg bg-ink/5" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-28 animate-pulse rounded-card bg-white/60" />
        <div className="h-28 animate-pulse rounded-card bg-white/60" />
      </div>
      <div className="h-80 animate-pulse rounded-card bg-white/60" />
    </div>
  )
}
