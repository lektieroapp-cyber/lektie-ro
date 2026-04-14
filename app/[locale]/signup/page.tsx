import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AuthCard } from "@/components/auth/AuthCard"
import { Logo } from "@/components/marketing/Logo"
import { isLocale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"

export const metadata: Metadata = {
  title: "Opret konto",
  robots: { index: false, follow: false },
}

// Pre-launch gate: walk-up signup is disabled. Send the invite code we share
// privately as `?invite=<EARLY_ACCESS_INVITE_CODE>`. Real users land on the
// holding card and are pushed back to the waitlist on the landing page.
const INVITE_CODE = process.env.EARLY_ACCESS_INVITE_CODE || ""

export default async function SignupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ invite?: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const { invite } = await searchParams
  const m = getMessages(locale)

  const allowed = !!INVITE_CODE && invite === INVITE_CODE

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5 py-10">
      <div className="w-full max-w-md">
        <Link href={`/${locale}`} className="mx-auto mb-8 flex justify-center">
          <Logo size="md" />
        </Link>

        {allowed ? (
          <AuthCard mode="signup" locale={locale} />
        ) : (
          <div
            className="rounded-card bg-white p-8 text-center"
            style={{ boxShadow: "var(--shadow-card-lg)" }}
          >
            <h1
              className="text-2xl font-bold text-ink"
              style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
            >
              {m.auth.signupGateTitle}
            </h1>
            <p className="mt-3 text-sm text-muted">{m.auth.signupGateBody}</p>
            <Link
              href={`/${locale}#venteliste`}
              className="mt-6 inline-flex rounded-btn bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
            >
              {m.auth.signupGateCta}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
