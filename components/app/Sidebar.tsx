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
  avatar_emoji: string | null
  companion_type: string | null
}

const HomeIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
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

  // Child mode: only the homework dashboard. Parent mode: dashboard + overview.
  const userItems = isChildMode
    ? [{ href: localePath(locale, "parentDashboard"), icon: HomeIcon, label: m.app.nav.dashboard }]
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
              <span className="h-px flex-1 bg-coral-deep/15" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-coral-deep/70">
                {m.app.adminSection}
              </span>
              <span className="h-px flex-1 bg-coral-deep/15" />
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
