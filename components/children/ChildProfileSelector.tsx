"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type Child = { id: string; name: string; avatar_emoji: string | null }

function firstName(full: string) {
  return full.split(" ")[0]
}

function ProfileCard({
  child,
  index,
  mounted,
  onClick,
}: {
  child: Child
  index: number
  mounted: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex cursor-pointer flex-col items-center gap-3 focus:outline-none"
      style={{
        transitionDelay: `${index * 70}ms`,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
      }}
    >
      <span className="flex h-28 w-28 items-center justify-center rounded-2xl bg-white/90 text-5xl shadow-md transition duration-200 group-hover:scale-105 group-hover:shadow-xl group-focus:ring-2 group-focus:ring-primary/50 sm:h-36 sm:w-36 sm:text-6xl">
        {child.avatar_emoji ?? "🙂"}
      </span>
      <span className="text-[15px] font-semibold text-ink/80 transition group-hover:text-ink sm:text-[17px]">
        {firstName(child.name)}
      </span>
    </button>
  )
}

function AddCard({ index, mounted, onClick }: { index: number; mounted: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex cursor-pointer flex-col items-center gap-3 focus:outline-none"
      style={{
        transitionDelay: `${index * 70}ms`,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
      }}
    >
      <span className="flex h-28 w-28 items-center justify-center rounded-2xl border-2 border-dashed border-ink/20 bg-white/40 text-4xl text-ink/20 transition duration-200 group-hover:border-primary/50 group-hover:bg-white/60 group-hover:text-primary group-focus:ring-2 group-focus:ring-primary/50 sm:h-36 sm:w-36 sm:text-5xl">
        +
      </span>
      <span className="text-[14px] font-medium text-muted transition group-hover:text-ink sm:text-[15px]">
        Tilføj barn
      </span>
    </button>
  )
}

export function ChildProfileSelector({
  children,
  dashboardHref,
  settingsHref,
  overviewHref,
}: {
  children: Child[]
  dashboardHref: string
  settingsHref: string
  overviewHref: string
}) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [lastActiveId, setLastActiveId] = useState<string | null>(null)

  useEffect(() => {
    // Slight delay so the initial render is invisible, then we animate in.
    requestAnimationFrame(() => setMounted(true))

    // Read the previous session's active child from the cookie.
    const match = document.cookie.match(/lr_active_child=([^;]+)/)
    if (match) setLastActiveId(match[1])
  }, [])

  function selectChild(id: string) {
    // Persist for 1 year — sticks until the user explicitly changes profile.
    const maxAge = 60 * 60 * 24 * 365
    document.cookie = `lr_active_child=${id}; path=/; max-age=${maxAge}; samesite=lax`
    router.push(dashboardHref)
  }

  const lastActive = lastActiveId ? children.find(c => c.id === lastActiveId) : null
  const showAdd = children.length < 4

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-canvas px-6 py-10 sm:py-16">

      {/* Top: logo */}
      <a href="/" className="block">
        <img src="/logo_with_text.png" alt="LektieRo" className="h-7 w-auto opacity-70" />
      </a>

      {/* Centre: heading + profiles */}
      <div className="flex flex-col items-center">
        <h1
          className="text-center text-3xl font-bold text-ink sm:text-4xl"
          style={{
            fontFamily: "var(--font-fraunces), var(--font-display)",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 0.35s ease, transform 0.35s ease",
          }}
        >
          Hvem laver lektier i dag?
        </h1>
        <p
          className="mt-2 text-sm text-muted"
          style={{
            opacity: mounted ? 1 : 0,
            transition: "opacity 0.35s ease 0.1s",
          }}
        >
          Tryk på din profil for at starte
        </p>

        <div className={`mt-10 grid gap-6 sm:gap-10 ${
          children.length + (showAdd ? 1 : 0) <= 2
            ? "grid-cols-2"
            : "grid-cols-2 sm:grid-cols-4"
        }`}>
          {children.map((child, i) => (
            <ProfileCard
              key={child.id}
              child={child}
              index={i}
              mounted={mounted}
              onClick={() => selectChild(child.id)}
            />
          ))}
          {showAdd && (
            <AddCard
              index={children.length}
              mounted={mounted}
              onClick={() => router.push(settingsHref)}
            />
          )}
        </div>
      </div>

      {/* Bottom: last active chip + parent link */}
      <div className="flex w-full items-end justify-between">
        <div
          style={{
            opacity: mounted && lastActive ? 1 : 0,
            transform: mounted && lastActive ? "translateY(0)" : "translateY(6px)",
            transition: "opacity 0.4s ease 0.4s, transform 0.4s ease 0.4s",
          }}
        >
          {lastActive && (
            <div className="flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 shadow-sm">
              <span className="text-xl leading-none">{lastActive.avatar_emoji ?? "🙂"}</span>
              <span className="text-[13px] font-medium text-ink/70">{firstName(lastActive.name)}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => router.push(overviewHref)}
          className="cursor-pointer text-sm text-muted underline underline-offset-2 hover:text-ink"
          style={{
            opacity: mounted ? 1 : 0,
            transition: "opacity 0.4s ease 0.5s",
          }}
        >
          Forældre-oversigt →
        </button>
      </div>
    </div>
  )
}
