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
      className={`animate-fade-up group flex cursor-pointer flex-col items-center gap-3 focus:outline-none disabled:cursor-default ${
        isDimmed ? "animate-page-exit" : ""
      }`}
      style={{
        animationDelay: isDimmed ? "0s" : `${index * 70}ms`,
        opacity: isDimmed ? 0 : 1,
        transition: "opacity 300ms ease",
      }}
    >
      <span
        className={`relative flex h-28 w-28 items-center justify-center rounded-2xl bg-white/90 shadow-md transition duration-200 group-hover:scale-105 group-hover:shadow-xl group-focus:ring-2 group-focus:ring-primary/50 sm:h-36 sm:w-36 ${
          isSelected ? "animate-bounce-pick" : ""
        }`}
        style={isSelected ? { boxShadow: "0 0 0 3px var(--color-primary)" } : undefined}
      >
        <span className={`text-5xl sm:text-6xl ${isSelected ? "animate-wiggle" : ""}`}>
          {child.avatar_emoji ?? "🙂"}
        </span>
      </span>
      <span className={`font-semibold transition sm:text-[17px] ${
        isSelected ? "text-[16px] text-ink" : "text-[15px] text-ink/80 group-hover:text-ink"
      }`}>
        {isSelected ? `Hej ${firstName(child.name)}!` : firstName(child.name)}
      </span>
    </button>
  )
}

function ParentLink({
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
      className={`animate-fade-up group flex cursor-pointer items-center gap-3 rounded-full bg-white/80 px-6 py-3 shadow-md transition hover:bg-white hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-default ${
        isSelected ? "animate-bounce-pick" : ""
      }`}
      style={{
        animationDelay: isDimmed ? "0s" : `${index * 70}ms`,
        opacity: isDimmed ? 0 : 1,
        transition: "opacity 300ms ease, transform 250ms ease",
      }}
    >
      <span className={`text-2xl leading-none ${isSelected ? "animate-wiggle" : ""}`}>☕</span>
      <span className="text-[15px] font-semibold text-ink/70 transition group-hover:text-ink">
        Forældre Ro
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

  function setCookie(value: string) {
    const maxAge = 60 * 60 * 24 * 365
    document.cookie = `lr_active_child=${value}; path=/; max-age=${maxAge}; samesite=lax`
  }

  function selectChild(id: string) {
    setSelecting(id)
    setCookie(id)
    setTimeout(() => {
      router.refresh()
      router.push(dashboardHref)
    }, 500)
  }

  function selectParent() {
    setSelecting("parent")
    setCookie("parent")
    setTimeout(() => {
      router.refresh()
      router.push(overviewHref)
    }, 500)
  }

  const showAdd = children.length < 4
  const childCards = children.length + (showAdd ? 1 : 0)

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-canvas px-6 py-10 sm:py-16">

      {/* Top: logo */}
      <a href="/" className="animate-fade-in block" style={{ animationDelay: "0ms" }}>
        <img src="/logo_with_text.png" alt="LektieRo" className="h-12 w-auto md:h-16" />
      </a>

      {/* Centre: heading + profiles */}
      <div className="flex flex-col items-center">
        <h1
          className="animate-fade-up text-center text-3xl font-bold text-ink sm:text-4xl"
          style={{ fontFamily: "var(--font-fraunces), var(--font-display)", animationDelay: "0ms",
            opacity: selecting ? 0 : undefined, transition: "opacity 300ms ease" }}
        >
          Hvem laver lektier i dag?
        </h1>
        <p className="animate-fade-in mt-2 text-sm text-muted" style={{ animationDelay: "80ms",
          opacity: selecting ? 0 : undefined, transition: "opacity 300ms ease" }}>
          Tryk på din profil for at starte
        </p>

        <div className={`mt-10 grid gap-6 sm:gap-10 ${
          childCards <= 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
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
          {showAdd && <AddCard index={children.length} onClick={() => router.push(settingsHref)} />}
        </div>

        {/* Parent entry — below profiles, visually distinct but easy to find */}
        <div className="mt-8">
          <ParentLink index={childCards} selecting={selecting} onClick={selectParent} />
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
