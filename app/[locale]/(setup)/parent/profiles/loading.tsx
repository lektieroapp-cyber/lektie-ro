export default function ProfilesLoading() {
  return (
    <div className="flex flex-col items-center animate-pulse">
      <div className="mt-10 grid grid-cols-2 gap-6 sm:gap-10">
        {[0, 1].map(i => (
          <div key={i} className="flex flex-col items-center gap-3">
            <div className="h-28 w-28 rounded-2xl bg-ink/5 sm:h-36 sm:w-36" />
            <div className="h-4 w-16 rounded bg-ink/5" />
          </div>
        ))}
      </div>
      <div className="mt-8 h-10 w-40 rounded-full bg-ink/5" />
    </div>
  )
}
