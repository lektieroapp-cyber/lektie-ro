import Link from "next/link"
import { type Locale } from "@/lib/i18n/config"
import { Logo } from "./Logo"

export function Navbar({ locale }: { locale: Locale }) {
  return (
    <header className="w-full">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href={`/${locale}`} className="inline-flex items-center">
          <Logo size="md" />
        </Link>
        {/* Navigation intentionally minimal in Step 1. The only login entry is
            via the "Har du allerede en kode?" link inside the waitlist card. */}
        <span aria-hidden className="text-sm text-muted hidden sm:inline">
          Ro om lektierne.
        </span>
      </div>
    </header>
  )
}
