import Link from "next/link"
import { type Locale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"
import { localePath } from "@/lib/i18n/routes"
import { Logo } from "./Logo"

export function Footer({ locale }: { locale: Locale }) {
  const m = getMessages(locale)
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-ink/5 bg-canvas">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Logo size="sm" />
          <p className="text-sm text-muted">{m.footer.tagline}</p>
        </div>
        <nav className="flex flex-wrap gap-6 text-sm">
          <Link href={localePath(locale, "faq")} className="text-muted hover:text-ink">
            {m.footer.faq}
          </Link>
          <Link href={localePath(locale, "pricing")} className="text-muted hover:text-ink">
            {m.footer.pricing}
          </Link>
          <Link href={localePath(locale, "privacy")} className="text-muted hover:text-ink">
            {m.footer.privacy}
          </Link>
          <Link href={localePath(locale, "terms")} className="text-muted hover:text-ink">
            {m.footer.terms}
          </Link>
        </nav>
        <p className="text-xs text-muted">
          {m.footer.copyright.replace("{year}", String(year))}
        </p>
      </div>
    </footer>
  )
}
