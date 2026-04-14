import Link from "next/link"
import { type Locale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"
import { localePath } from "@/lib/i18n/routes"
import { WaitlistForm } from "./WaitlistForm"
import { Logo } from "./Logo"

export function Hero({ locale }: { locale: Locale }) {
  const m = getMessages(locale)

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(135deg, var(--color-canvas) 0%, var(--color-canvas) 55%, var(--color-canvas-warm) 100%)",
        }}
      />
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:py-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div className="flex flex-col gap-6">
          <div className="inline-flex w-fit items-center rounded-card bg-white/70 px-3 py-2 shadow-[0_2px_8px_rgba(30,42,58,0.04)]">
            <Logo size="sm" />
          </div>

          <div
            className="inline-flex w-fit items-center gap-2 rounded-chip px-4 py-1.5 text-sm font-medium text-ink"
            style={{ backgroundColor: "var(--color-amber-pill)" }}
          >
            <span aria-hidden>⭐</span>
            <span>{m.hero.badge}</span>
          </div>

          <h1
            className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight text-ink"
            style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
          >
            {m.hero.title}
          </h1>

          <p className="max-w-xl text-lg text-ink/80">{m.hero.subtitle}</p>

          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-coral-deep font-semibold">
            {[m.hero.values.one, m.hero.values.two, m.hero.values.three].map(v => (
              <li key={v} className="inline-flex items-center gap-2">
                <span aria-hidden>✓</span>
                <span>{v}</span>
              </li>
            ))}
          </ul>

          <a
            href="#benefits"
            className="inline-flex w-fit items-center gap-1 text-blue-soft font-medium hover:underline"
          >
            {m.hero.learnMore} ↓
          </a>
        </div>

        <div className="lg:pl-6">
          <div
            id="venteliste"
            className="rounded-card bg-white p-6 md:p-8"
            style={{ boxShadow: "var(--shadow-card-lg)" }}
          >
            <h2
              className="text-2xl md:text-3xl font-bold text-ink"
              style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
            >
              {m.waitlist.title}
            </h2>
            <p className="mt-2 text-sm text-muted">{m.waitlist.subtitle}</p>
            <div className="mt-6">
              <WaitlistForm locale={locale} />
            </div>
            <div className="mt-6 border-t border-ink/10 pt-4 text-center text-sm text-muted">
              {m.waitlist.existingHint}{" "}
              <Link
                href={localePath(locale, "login")}
                className="text-blue-soft font-medium hover:underline"
              >
                {m.waitlist.existingLink}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
