export default function ProfilesLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-canvas px-6 py-10 sm:py-16">
      <div className="h-12 w-24 rounded-lg bg-ink/5 animate-pulse md:h-16 md:w-32" />

      <div className="flex flex-col items-center animate-pulse">
        <div className="h-9 w-72 rounded-lg bg-ink/5" />
        <div className="mt-3 h-4 w-48 rounded bg-ink/5" />
        <div className="mt-10 grid grid-cols-2 gap-6 sm:gap-10">
          {[0, 1].map(i => (
            <div key={i} className="flex flex-col items-center gap-3">
              <div className="h-28 w-28 rounded-2xl bg-ink/5 sm:h-36 sm:w-36" />
              <div className="h-4 w-16 rounded bg-ink/5" />
            </div>
          ))}
        </div>
      </div>

      <div className="h-8 w-32 rounded-full bg-ink/5 animate-pulse" />
    </div>
  )
}
