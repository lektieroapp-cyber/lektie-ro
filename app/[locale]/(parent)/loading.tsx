export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-12 w-2/3 animate-pulse rounded-lg bg-ink/5" />
      <div className="h-5 w-1/2 animate-pulse rounded bg-ink/5" />
      <div className="mt-6 h-64 animate-pulse rounded-card bg-white/60" />
    </div>
  )
}
