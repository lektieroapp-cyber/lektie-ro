"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function NavLink({
  href,
  icon,
  label,
}: {
  href: string
  icon: React.ReactNode
  label: string
}) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + "/")

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-blue-tint text-blue-soft"
          : "text-ink/70 hover:bg-blue-tint/50 hover:text-ink"
      }`}
    >
      <span aria-hidden className="inline-flex h-5 w-5 items-center justify-center">
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  )
}
