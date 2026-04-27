import { type Locale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"
import { localePath } from "@/lib/i18n/routes"
import { Logo } from "@/components/marketing/Logo"
import { NavLink } from "./NavLink"
import { MobileNav } from "./MobileNav"
import { AccountMenu } from "./AccountMenu"

type ActiveChild = {
  id: string
  name: string
  grade: number | null
  avatar_emoji: string | null
  companion_type: string | null
}

const HomeIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="9" y1="13" x2="9" y2="20" />
  </svg>
)

const PlusIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const OverviewIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
)

const ShieldIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l8 4v6c0 5-3.5 9.3-8 10-4.5-.7-8-5-8-10V6l8-4z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
)

export function Sidebar({
  locale,
  isAdmin,
  email,
  activeChild,
}: {
  locale: Locale
  isAdmin: boolean
  email: string
  activeChild: ActiveChild | null
}) {
  const m = getMessages(locale)
  const isChildMode = activeChild !== null

  const profilesHref = localePath(locale, "parentProfiles")

  // Kid mode: Tavle + Ny lektie (every grade — we trust the kid to start
  // their own homework). Parent mode: Tavle + Forældre Ro. Adding tasks to
  // the board for the parent lives inside the Tavle itself (the "+ Læg på
  // tavlen" pill in the header).
  const userItems = isChildMode
    ? [
        { href: localePath(locale, "parentDashboard"), icon: HomeIcon, label: m.app.nav.dashboard },
        { href: localePath(locale, "parentNewTask"), icon: PlusIcon, label: m.app.nav.newTask },
      ]
    : [
        { href: localePath(locale, "parentDashboard"), icon: HomeIcon, label: m.app.nav.dashboard },
        { href: localePath(locale, "parentOverview"), icon: OverviewIcon, label: m.app.nav.overview },
      ]

  const adminItem = {
    href: localePath(locale, "admin"),
    icon: ShieldIcon,
    label: m.app.nav.admin,
  }

  return (
    <>
      <MobileNav
        locale={locale}
        items={userItems}
        adminItem={isAdmin ? adminItem : null}
        settingsHref={localePath(locale, "parentSettings")}
        profilesHref={profilesHref}
        email={email}
        activeChild={activeChild}
        brandTagline={m.app.sidebarTagline}
        adminSectionLabel={m.app.adminSection}
      />

      <aside className="hidden w-60 shrink-0 flex-col border-r border-ink/10 bg-white px-3 py-6 md:flex">
        <div className="px-3 py-2">
          <div className="flex justify-center">
            <Logo size="sm" />
          </div>
          <p className="mt-2 text-center text-[10px] uppercase tracking-wider text-muted">
            {m.app.sidebarTagline}
          </p>
        </div>

        <nav className="mt-8 flex flex-col gap-1">
          {userItems.map(it => (
            <NavLink key={it.href} href={it.href} icon={it.icon} label={it.label} />
          ))}
        </nav>

        {isAdmin && (
          <div className="mt-6">
            <div className="mb-2 flex items-center gap-2 px-3">
              <span className="h-px flex-1 bg-ink/15" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink/60">
                {m.app.adminSection}
              </span>
              <span className="h-px flex-1 bg-ink/15" />
            </div>
            <NavLink
              href={adminItem.href}
              icon={adminItem.icon}
              label={adminItem.label}
              tone="admin"
              badge={m.app.adminBadge}
            />
          </div>
        )}

        <div className="mt-auto border-t border-ink/8 pt-4">
          <AccountMenu
            email={email}
            settingsHref={localePath(locale, "parentSettings")}
            profilesHref={profilesHref}
            locale={locale}
            activeChild={activeChild}
          />
        </div>
      </aside>
    </>
  )
}
