"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Companion } from "@/components/mascot/Companion"
import type { CompanionType } from "@/components/mascot/types"

type ActiveChild = {
  id: string
  name: string
  avatar_emoji: string | null
  companion_type: string | null
}

const SwitchIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 2l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="M7 22l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
)

const SettingsIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1-.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
)

const BillingIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
)

const LogoutIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

function firstName(full: string) {
  return full.split(" ")[0]
}

function ChildAvatar({
  child,
  size,
  wrapperClass = "",
}: {
  child: ActiveChild
  size: number
  wrapperClass?: string
}) {
  // If the kid picked a companion, render the animal SVG. Otherwise fall back
  // to their emoji avatar. Both sit in a matching-size rounded pill.
  const hasCompanion = !!child.companion_type
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full ${wrapperClass}`}
      style={{ width: size, height: size }}
    >
      {hasCompanion ? (
        <Companion type={child.companion_type as CompanionType} size={Math.round(size * 0.95)} />
      ) : (
        <span className="text-xl leading-none">{child.avatar_emoji ?? "🙂"}</span>
      )}
    </span>
  )
}

export function AccountMenu({
  email,
  settingsHref,
  profilesHref,
  locale,
  activeChild,
}: {
  email: string
  settingsHref: string
  profilesHref: string
  locale: string
  activeChild: ActiveChild | null
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const initial = email[0]?.toUpperCase() ?? "?"
  const isChildMode = activeChild !== null

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [open])

  async function handleLogout() {
    setOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(`/${locale}`)
    router.refresh()
  }

  function handleSwitchAccount() {
    setOpen(false)
    document.cookie = "lr_active_child=; path=/; max-age=0"
    router.push(profilesHref)
    router.refresh()
  }

  return (
    <div ref={ref} className="relative">
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-card border border-ink/8 bg-white py-1"
          style={{ boxShadow: "0 -4px 24px rgba(31,45,26,0.10)" }}
        >
          {/* Header: child avatar or parent email */}
          <div className="border-b border-ink/6 px-4 py-2.5">
            {isChildMode ? (
              <div className="flex items-center gap-2">
                <ChildAvatar child={activeChild} size={28} />
                <span className="text-[13px] font-semibold text-ink">{firstName(activeChild.name)}</span>
              </div>
            ) : (
              <p className="truncate text-[12px] text-muted">{email}</p>
            )}
          </div>

          {/* Child mode: only switch + logout */}
          {isChildMode ? (
            <>
              <button type="button" onClick={handleSwitchAccount}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] text-ink/80 hover:bg-blue-tint/50 hover:text-ink cursor-pointer">
                {SwitchIcon} Skift konto
              </button>
              <div className="mx-3 my-1 border-t border-ink/6" />
              <button type="button" onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] text-ink/70 hover:bg-blue-tint/50 hover:text-ink cursor-pointer">
                {LogoutIcon} Log ud
              </button>
            </>
          ) : (
            <>
              <Link href={settingsHref} onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-ink/80 hover:bg-blue-tint/50 hover:text-ink">
                {SettingsIcon} Indstillinger
              </Link>
              <button type="button" disabled
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] text-muted cursor-not-allowed">
                {BillingIcon}
                <span>Fakturering</span>
                <span className="ml-auto rounded-full bg-mint-edge px-1.5 py-0.5 text-[10px] font-semibold text-mint-deep">Snart</span>
              </button>
              <button type="button" onClick={handleSwitchAccount}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] text-ink/80 hover:bg-blue-tint/50 hover:text-ink cursor-pointer">
                {SwitchIcon} Skift konto
              </button>
              <div className="mx-3 my-1 border-t border-ink/6" />
              <button type="button" onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] text-ink/70 hover:bg-blue-tint/50 hover:text-ink cursor-pointer">
                {LogoutIcon} Log ud
              </button>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex w-full cursor-pointer items-center gap-3 rounded-card px-3 py-2.5 transition hover:bg-blue-tint/50 ${open ? "bg-blue-tint/50" : ""}`}
      >
        {isChildMode ? (
          <>
            <ChildAvatar child={activeChild} size={32} wrapperClass="bg-primary/15" />
            <span className="truncate text-[13px] font-medium text-ink/80">{firstName(activeChild.name)}</span>
          </>
        ) : (
          <>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint-soft text-[13px] font-bold text-mint-deep">
              {initial}
            </span>
            <span className="truncate text-[13px] font-medium text-ink/80">{email}</span>
          </>
        )}
        <svg className={`ml-auto h-3.5 w-3.5 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
    </div>
  )
}
