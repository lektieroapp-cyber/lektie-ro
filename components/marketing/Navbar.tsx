import Link from "next/link"
import { type Locale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"
import { localePath } from "@/lib/i18n/routes"
import { createClient } from "@/lib/supabase/server"
import { DEV_BYPASS_AUTH } from "@/lib/dev-user"
import { Logo } from "./Logo"

export async function Navbar({ locale }: { locale: Locale }) {
  const m = getMessages(locale)

  let loggedIn = DEV_BYPASS_AUTH
  if (!loggedIn) {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      loggedIn = !!user
    } catch {
      loggedIn = false
    }
  }

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-ink/[0.06] backdrop-blur-[12px]"
      style={{ background: "rgba(251,243,232,0.85)" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-2 md:px-6 md:py-3">
        <Link href={`/${locale}`} className="inline-flex items-center">
          <Logo size="md" />
        </Link>
        <nav className="flex items-center gap-3 sm:gap-5">
          <Link
            href={localePath(locale, "pricing")}
            className="hidden sm:inline-flex text-sm font-medium text-ink/70 hover:text-ink"
          >
            {m.nav.pricing}
          </Link>
          <Link
            href={localePath(locale, "faq")}
            className="hidden sm:inline-flex text-sm font-medium text-ink/70 hover:text-ink"
          >
            {m.nav.faq}
          </Link>
          <Link
            href={loggedIn ? localePath(locale, "parentDashboard") : localePath(locale, "login")}
            className="rounded-btn border border-ink/10 bg-white px-4 py-2 text-sm font-semibold text-ink shadow-[0_2px_8px_rgba(30,42,58,0.04)] transition hover:border-primary/40 hover:text-primary sm:px-5"
          >
            {loggedIn ? m.nav.dashboard : m.nav.login}
          </Link>
        </nav>
      </div>
    </header>
  )
}
