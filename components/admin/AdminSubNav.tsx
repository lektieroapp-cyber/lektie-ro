"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function AdminSubNav({
  items,
}: {
  items: { href: string; label: string }[]
}) {
  const pathname = usePathname()
  return (
    <nav className="mt-6 flex gap-1 border-b border-ink/10">
      {items.map(it => {
        const active = pathname === it.href || pathname.startsWith(it.href + "/")
        return (
          <Link
            key={it.href}
            href={it.href}
            prefetch
            className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
              active
                ? "border-b-2 border-coral-deep text-coral-deep"
                : "border-b-2 border-transparent text-ink/60 hover:text-ink"
            }`}
          >
            {it.label}
          </Link>
        )
      })}
    </nav>
  )
}
