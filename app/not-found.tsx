import Link from "next/link"
import { Logo } from "@/components/marketing/Logo"
import { defaultLocale } from "@/lib/i18n/config"

export default function NotFound() {
  return (
    <html lang={defaultLocale}>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-5 py-12 text-center">
          <Logo size="md" />
          <h1
            className="mt-10 text-5xl font-bold text-ink"
            style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
          >
            Siden blev ikke fundet
          </h1>
          <p className="mt-4 max-w-md text-base text-muted">
            Linket virker ikke længere, eller adressen er skrevet forkert. Tag tilbage til
            forsiden, så hjælper vi dig videre.
          </p>
          <Link
            href={`/${defaultLocale}`}
            className="mt-8 inline-flex rounded-btn bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            Tilbage til forsiden
          </Link>
        </div>
      </body>
    </html>
  )
}
