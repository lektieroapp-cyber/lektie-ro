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
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5 py-10">
      <div className="w-full max-w-md">
        <Link href={`/${locale}`} className="mx-auto mb-8 flex justify-center">
          <Logo size="md" />
        </Link>
        <AuthCard mode="login" locale={locale} />
      </div>
    </div>
  )
}
