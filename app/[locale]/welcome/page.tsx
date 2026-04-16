import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { SetPasswordForm } from "@/components/auth/SetPasswordForm"
import { Logo } from "@/components/marketing/Logo"
import { isLocale } from "@/lib/i18n/config"
import { createClient } from "@/lib/supabase/server"
import { DEV_BYPASS_AUTH } from "@/lib/dev-user"

export const metadata: Metadata = {
  title: "Velkommen",
  robots: { index: false, follow: false },
}

export default async function WelcomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ next?: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const { next } = await searchParams

  // Must be signed in to see this. The invite flow lands users here with
  // their session already set via /auth/complete.
  if (!DEV_BYPASS_AUTH) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect(`/${locale}/login`)
  }

  const redirectTo = next && next.startsWith("/") ? next : `/${locale}/parent/profiles`

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5 py-10">
      <div className="w-full max-w-md">
        <Link href={`/${locale}`} className="mx-auto mb-8 flex justify-center">
          <Logo size="md" />
        </Link>
        <SetPasswordForm locale={locale} next={redirectTo} />
      </div>
    </div>
  )
}
