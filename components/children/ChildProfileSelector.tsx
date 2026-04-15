"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type Child = { id: string; name: string; avatar_emoji: string | null }

function firstName(full: string) {
  return full.split(" ")[0]
}

function Spinner() {
  return (
    <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/10">
      <span className="block h-7 w-7 rounded-full border-[3px] border-white/40 border-t-white animate-spin" />
    </span>
  )
}

function ProfileCard({
  child,
  index,
  selecting,
  onClick,
}: {
  child: Child
  index: number
  selecting: string | null
  onClick: () => void
}) {
  const isSelected = selecting === child.id
  const isDimmed = selecting !== null && !isSelected

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={selecting !== null}
      className="animate-fade-up group flex cursor-pointer flex-col items-center gap-3 focus:outline-none disabled:cursor-default"
      style={{
        animationDelay: `${index * 70}ms`,
        opacity: isDimmed ? 0.35 : 1,
        transform: isSelected ? "scale(1.08)" : undefined,
        transition: "opacity 250ms ease, transform 250ms ease",
      }}
    >
      <span className="relative flex h-28 w-28 items-center justify-center rounded-2xl bg-white/90 text-5xl shadow-md transition duration-200 group-hover:scale-105 group-hover:shadow-xl group-focus:ring-2 group-focus:ring-primary/50 sm:h-36 sm:w-36 sm:text-6xl"
        style={isSelected ? { boxShadow: "0 0 0 3px var(--color-primary)" } : undefined}
      >
        {child.avatar_emoji ?? "🙂"}
        {isSelected && <Spinner />}
      </span>
      <span className="text-[15px] font-semibold text-ink/80 transition group-hover:text-ink sm:text-[17px]">
        {firstName(child.name)}
      </span>
    </button>
  )
}

function ParentCard({
  index,
  selecting,
  onClick,
}: {
  index: number
  selecting: string | null
  onClick: () => void
}) {
  const isSelected = selecting === "parent"
  const isDimmed = selecting !== null && !isSelected

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={selecting !== null}
      className="animate-fade-up group flex cursor-pointer flex-col items-center gap-3 focus:outline-none disabled:cursor-default"
      style={{
        animationDelay: `${index * 70}ms`,
        opacity: isDimmed ? 0.35 : 1,
        transform: isSelected ? "scale(1.08)" : undefined,
        transition: "opacity 250ms ease, transform 250ms ease",
      }}
    >
      <span
        className="relative flex h-28 w-28 items-center justify-center rounded-2xl border-2 border-ink/10 bg-white/60 text-5xl shadow-sm transition duration-200 group-hover:scale-105 group-hover:border-ink/25 group-hover:shadow-md group-focus:ring-2 group-focus:ring-primary/50 sm:h-36 sm:w-36 sm:text-6xl"
        style={isSelected ? { boxShadow: "0 0 0 3px var(--color-primary)" } : undefined}
      >
        👤
        {isSelected && <Spinner />}
      </span>
      <span className="text-[15px] font-semibold text-muted transition group-hover:text-ink sm:text-[17px]">
        Forælder
      </span>
    </button>
  )
}

function AddCard({ index, onClick }: { index: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="animate-fade-up group flex cursor-pointer flex-col items-center gap-3 focus:outline-none"
      style={{ animationDelay: `${index * 70}ms` }}
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
  const [lastActive, setLastActive] = useState<Child | null>(null)
  const [selecting, setSelecting] = useState<string | null>(null)

  useEffect(() => {
    const match = document.cookie.match(/lr_active_child=([^;]+)/)
    if (match) {
      const found = children.find(c => c.id === match[1])
      if (found) setLastActive(found)
    }
  }, [children])

  function selectChild(id: string) {
    setSelecting(id)
    const maxAge = 60 * 60 * 24 * 365
    document.cookie = `lr_active_child=${id}; path=/; max-age=${maxAge}; samesite=lax`
    window.location.href = dashboardHref
  }

  function selectParent() {
    setSelecting("parent")
    const maxAge = 60 * 60 * 24 * 365
    document.cookie = `lr_active_child=parent; path=/; max-age=${maxAge}; samesite=lax`
    window.location.href = overviewHref
  }

  const showAdd = children.length < 4
  const totalCards = children.length + 1 + (showAdd ? 1 : 0)

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-canvas px-6 py-10 sm:py-16">

      {/* Top: logo */}
      <a href="/" className="animate-fade-in block" style={{ animationDelay: "0ms" }}>
        <img src="/logo_with_text.png" alt="LektieRo" className="h-12 w-auto" />
      </a>

      {/* Centre: heading + profiles */}
      <div className="flex flex-col items-center">
        <h1
          className="animate-fade-up text-center text-3xl font-bold text-ink sm:text-4xl"
          style={{ fontFamily: "var(--font-fraunces), var(--font-display)", animationDelay: "0ms",
            opacity: selecting ? 0.4 : undefined, transition: "opacity 250ms ease" }}
        >
          Hvem laver lektier i dag?
        </h1>
        <p className="animate-fade-in mt-2 text-sm text-muted" style={{ animationDelay: "80ms",
          opacity: selecting ? 0.4 : undefined, transition: "opacity 250ms ease" }}>
          Tryk på din profil for at starte
        </p>

        <div className={`mt-10 grid gap-6 sm:gap-10 ${
          totalCards <= 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"
        }`}>
          {children.map((child, i) => (
            <ProfileCard
              key={child.id}
              child={child}
              index={i}
              selecting={selecting}
              onClick={() => selectChild(child.id)}
            />
          ))}
          <ParentCard index={children.length} selecting={selecting} onClick={selectParent} />
          {showAdd && <AddCard index={children.length + 1} onClick={() => router.push(settingsHref)} />}
        </div>
      </div>

      {/* Bottom: last active chip */}
      <div
        className="animate-fade-in flex w-full justify-start"
        style={{ animationDelay: "400ms", opacity: selecting ? 0 : undefined, transition: "opacity 200ms ease" }}
      >
        {lastActive && (
          <div className="flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 shadow-sm">
            <span className="text-xl leading-none">{lastActive.avatar_emoji ?? "🙂"}</span>
            <span className="text-[13px] font-medium text-ink/70">{firstName(lastActive.name)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
