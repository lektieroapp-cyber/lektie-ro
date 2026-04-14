import { type Locale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"
import { localePath } from "@/lib/i18n/routes"
import { Logo } from "@/components/marketing/Logo"
import { NavLink } from "./NavLink"
import { LogoutButton } from "@/components/auth/LogoutButton"

const HomeIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z" />
  </svg>
)

const GearIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
)

const ShieldIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l8 4v6c0 5-3.5 9.3-8 10-4.5-.7-8-5-8-10V6l8-4z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
)

const LogoutIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

export function Sidebar({ locale, isAdmin }: { locale: Locale; isAdmin: boolean }) {
  const m = getMessages(locale)

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-ink/10 bg-white px-4 py-6">
      <div className="rounded-card border border-ink/10 bg-white px-3 py-4">
        <div className="flex justify-center">
          <Logo size="sm" />
        </div>
        <p className="mt-2 text-center text-[10px] uppercase tracking-wider text-muted">
          {m.app.sidebarTagline}
        </p>
      </div>

      <nav className="mt-8 flex flex-col gap-1">
        <NavLink
          href={localePath(locale, "parentDashboard")}
          icon={HomeIcon}
          label={m.app.nav.dashboard}
        />
        <NavLink
          href={localePath(locale, "parentOverview")}
          icon={GearIcon}
          label={m.app.nav.overview}
        />
        {isAdmin && (
          <NavLink
            href={localePath(locale, "admin")}
            icon={ShieldIcon}
            label={m.app.nav.admin}
          />
        )}
      </nav>

      <div className="mt-auto">
        <LogoutButton locale={locale} label={m.parent.logout} icon={LogoutIcon} />
      </div>
    </aside>
  )
}
