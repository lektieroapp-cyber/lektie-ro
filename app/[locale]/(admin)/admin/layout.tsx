import { notFound } from "next/navigation"
import { AdminSubNav } from "@/components/admin/AdminSubNav"
import { isLocale } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/getMessages"
import { localePath } from "@/lib/i18n/routes"

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const m = getMessages(locale)

  return (
    <>
      <header>
        <h1
          className="text-4xl md:text-5xl font-bold text-ink"
          style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
        >
          {m.admin.title}
        </h1>
        <p className="mt-2 text-base text-muted">{m.admin.subtitle}</p>
      </header>

      <AdminSubNav
        items={[
          { href: localePath(locale, "admin"), label: "Oversigt" },
          { href: `/${locale}/admin/users`, label: "Brugere" },
          { href: `/${locale}/admin/emails`, label: "Emails" },
        ]}
      />

      {children}
    </>
  )
}
