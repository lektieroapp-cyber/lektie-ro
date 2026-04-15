"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Logo } from "@/components/marketing/Logo"
import { createClient } from "@/lib/supabase/client"
import { type Locale } from "@/lib/i18n/config"

type NavItem = { href: string; label: string; icon: React.ReactNode }
type ActiveChild = { id: string; name: string; avatar_emoji: string | null }

type Props = {
  locale: Locale
  items: NavItem[]
  adminItem: NavItem | null
  settingsHref: string
  profilesHref: string
  email: string
  activeChild: ActiveChild | null
  brandTagline: string
  adminSectionLabel: string
}

const HamburgerIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" />
  </svg>
)
const CloseIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
  </svg>
)

function firstName(full: string) { return full.split(" ")[0] }

export function MobileNav({ locale, items, adminItem, settingsHref, profilesHref, email, activeChild, brandTagline, adminSectionLabel }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const initial = email[0]?.toUpperCase() ?? "?"
  const isChildMode = activeChild !== null

  async function handleLogout() {
    setOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(`/${locale}`)
    router.refresh()
  }

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = original }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  function isActive(href: string) { return pathname === href || pathname.startsWith(href + "/") }

  return (
    <>
      <header className="flex items-center justify-between gap-3 border-b border-ink/10 bg-white px-4 py-3 md:hidden">
        <Logo size="sm" />
        <button type="button" aria-label="Åbn menu" aria-expanded={open} onClick={() => setOpen(true)}
          className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-card text-ink/70 hover:bg-blue-tint/50 hover:text-ink">
          {HamburgerIcon}
        </button>
      </header>

      {open && <div aria-hidden onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm md:hidden" />}

      <aside className={`fixed right-0 top-0 z-50 flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-[0_0_40px_rgba(30,42,58,0.15)] transition-transform duration-200 md:hidden ${open ? "translate-x-0" : "translate-x-full"}`}
        aria-hidden={!open}>

        <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
          <Logo size="sm" />
          <button type="button" aria-label="Luk menu" onClick={() => setOpen(false)}
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-card text-ink/70 hover:bg-blue-tint/50 hover:text-ink">
            {CloseIcon}
          </button>
        </div>

        <p className="px-4 pt-4 text-[10px] uppercase tracking-wider text-muted">{brandTagline}</p>

        <nav className="mt-3 flex flex-col gap-1 px-2">
          {items.map(it => (
            <Link key={it.href} href={it.href} prefetch
              className={`flex items-center gap-3 rounded-card px-3 py-3 text-[15px] font-medium transition ${isActive(it.href) ? "bg-blue-tint text-blue-soft" : "text-ink/80 hover:bg-blue-tint/50 hover:text-ink"}`}>
              <span aria-hidden className="inline-flex h-5 w-5 items-center justify-center">{it.icon}</span>
              <span>{it.label}</span>
            </Link>
          ))}
        </nav>

        {adminItem && (
          <div className="mt-4 px-2">
            <div className="mb-2 flex items-center gap-2 px-3">
              <span className="h-px flex-1 bg-coral-deep/15" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-coral-deep/70">{adminSectionLabel}</span>
              <span className="h-px flex-1 bg-coral-deep/15" />
            </div>
            <Link href={adminItem.href} prefetch
              className={`flex items-center gap-3 rounded-card px-3 py-3 text-[15px] font-medium transition ${isActive(adminItem.href) ? "bg-coral-deep/10 text-coral-deep" : "text-coral-deep/80 hover:bg-coral-deep/10 hover:text-coral-deep"}`}>
              <span aria-hidden className="inline-flex h-5 w-5 items-center justify-center">{adminItem.icon}</span>
              <span>{adminItem.label}</span>
            </Link>
          </div>
        )}

        {/* Account section at bottom */}
        <div className="mt-auto border-t border-ink/10 px-2 py-3 flex flex-col gap-1">
          {/* Identity */}
          <div className="flex items-center gap-3 px-3 py-2">
            {isChildMode ? (
              <>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xl leading-none">
                  {activeChild.avatar_emoji ?? "🙂"}
                </span>
                <span className="truncate text-[13px] font-medium text-ink/80">{firstName(activeChild.name)}</span>
              </>
            ) : (
              <>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[13px] font-bold text-primary">{initial}</span>
                <span className="truncate text-[13px] text-muted">{email}</span>
              </>
            )}
          </div>

          {/* Child mode: only switch + logout */}
          {isChildMode ? (
            <>
              <Link href={profilesHref} onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-card px-3 py-2.5 text-[14px] font-medium text-ink/80 hover:bg-blue-tint/50 hover:text-ink">
                Skift konto
              </Link>
              <button type="button" onClick={handleLogout}
                className="flex items-center gap-3 rounded-card px-3 py-2.5 text-[14px] font-medium text-ink/70 hover:bg-blue-tint/50 hover:text-ink cursor-pointer">
                Log ud
              </button>
            </>
          ) : (
            <>
              <Link href={settingsHref} onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-card px-3 py-2.5 text-[14px] font-medium text-ink/80 hover:bg-blue-tint/50 hover:text-ink">
                Indstillinger
              </Link>
              <button type="button" disabled
                className="flex items-center gap-3 rounded-card px-3 py-2.5 text-[14px] font-medium text-muted cursor-not-allowed">
                Fakturering <span className="ml-1 rounded-full bg-amber-pill px-1.5 py-0.5 text-[10px] font-semibold text-ink/60">Snart</span>
              </button>
              <Link href={profilesHref} onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-card px-3 py-2.5 text-[14px] font-medium text-ink/80 hover:bg-blue-tint/50 hover:text-ink">
                Skift konto
              </Link>
              <button type="button" onClick={handleLogout}
                className="flex items-center gap-3 rounded-card px-3 py-2.5 text-[14px] font-medium text-ink/70 hover:bg-blue-tint/50 hover:text-ink cursor-pointer">
                Log ud
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  )
}
