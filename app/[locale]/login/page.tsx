import { notFound } from "next/navigation"
import { AuthCard } from "@/components/auth/AuthCard"
import { Logo } from "@/components/marketing/Logo"
import { isLocale } from "@/lib/i18n/config"
import Link from "next/link"

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-md px-6 py-10">
        <Link href={`/${locale}`} className="inline-flex">
          <Logo size="md" />
        </Link>
        <div className="mt-10">
          <AuthCard mode="login" locale={locale} />
        </div>
      </div>
    </div>
  )
}
