import { Footer } from "@/components/marketing/Footer"
import { Navbar } from "@/components/marketing/Navbar"
import { isLocale } from "@/lib/i18n/config"
import { notFound } from "next/navigation"

export default async function MarketingLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      <Navbar locale={locale} />
      <main className="flex-1">{children}</main>
      <Footer locale={locale} />
    </div>
  )
}
