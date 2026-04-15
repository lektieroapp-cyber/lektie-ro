"use client"

import { useRouter } from "next/navigation"

type Child = { id: string; name: string; avatar_emoji: string | null }

function ProfileCard({ child, onClick }: { child: Child; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex cursor-pointer flex-col items-center gap-3 focus:outline-none"
    >
      <span className="flex h-28 w-28 items-center justify-center rounded-full bg-white text-5xl shadow-md transition duration-200 group-hover:scale-105 group-hover:shadow-lg group-focus:ring-2 group-focus:ring-primary/50">
        {child.avatar_emoji ?? "🙂"}
      </span>
      <span className="text-[15px] font-semibold text-ink/80 transition group-hover:text-ink">
        {child.name}
      </span>
    </button>
  )
}

function AddCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex cursor-pointer flex-col items-center gap-3 focus:outline-none"
    >
      <span className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-dashed border-ink/20 bg-white/60 text-4xl text-ink/30 transition duration-200 group-hover:border-primary/50 group-hover:text-primary group-focus:ring-2 group-focus:ring-primary/50">
        +
      </span>
      <span className="text-[15px] font-medium text-muted transition group-hover:text-ink">
        Tilføj barn
      </span>
    </button>
  )
}

export function ChildProfileSelector({
  children,
  dashboardHref,
  settingsHref,
}: {
  children: Child[]
  dashboardHref: string
  settingsHref: string
}) {
  const router = useRouter()

  function selectChild(id: string) {
    const maxAge = 60 * 60 * 8
    document.cookie = `lr_active_child=${id}; path=/; max-age=${maxAge}; samesite=lax`
    router.push(dashboardHref)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16"
      style={{ background: "var(--color-canvas)" }}
    >
      <h1
        className="text-3xl font-bold text-ink md:text-4xl"
        style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
      >
        Hvem bruger LektieRo?
      </h1>
      <p className="mt-2 text-sm text-muted">Vælg hvem der laver lektier i dag</p>

      <div className="mt-12 flex flex-wrap justify-center gap-8">
        {children.map(child => (
          <ProfileCard key={child.id} child={child} onClick={() => selectChild(child.id)} />
        ))}
        <AddCard onClick={() => router.push(settingsHref)} />
      </div>

      <button
        type="button"
        onClick={() => router.push(dashboardHref)}
        className="mt-16 cursor-pointer text-sm text-muted underline underline-offset-2 hover:text-ink"
      >
        Forældre-oversigt →
      </button>
    </div>
  )
}
