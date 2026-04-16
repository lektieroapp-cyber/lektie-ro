export default function EmailsLoading() {
  return (
    <div className="mt-10 animate-pulse">
      <div className="h-5 w-48 rounded bg-ink/5" />
      <div className="mt-4 flex flex-col gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-32 w-full rounded-card bg-ink/5" />
        ))}
      </div>
    </div>
  )
}
