import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { AuthCard } from "@/components/auth/AuthCard"
import { Logo } from "@/components/marketing/Logo"
import { isLocale } from "@/lib/i18n/config"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Log ind",
  robots: { index: false, follow: false },
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const { error } = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5 py-10">
      <div className="w-full max-w-md">
        <Link href={`/${locale}`} className="mx-auto mb-8 flex justify-center">
          <Logo size="md" />
        </Link>
        {error && (
          <div className="mb-5 rounded-lg border border-coral-deep/30 bg-coral-deep/5 px-4 py-3 text-sm text-coral-deep">
            Login mislykkedes: <code className="text-xs">{error}</code>. Prøv igen, eller kontakt support hvis problemet fortsætter.
          </div>
        )}
        <AuthCard mode="login" locale={locale} />
      </div>
    </div>
  )
}
