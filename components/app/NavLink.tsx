"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

type Tone = "default" | "admin"

const TONE_STYLES: Record<Tone, { active: string; idle: string; iconIdle: string }> = {
  default: {
    active: "bg-blue-tint text-blue-soft",
    idle: "text-ink/70 hover:bg-blue-tint/50 hover:text-ink",
    iconIdle: "text-ink/60 hover:bg-blue-tint/50",
  },
  admin: {
    active: "bg-ink/10 text-ink",
    idle: "text-ink/70 hover:bg-ink/5 hover:text-ink",
    iconIdle: "text-ink/60 hover:bg-ink/5",
  },
}

export function NavLink({
  href,
  icon,
  label,
  iconOnly = false,
  tone = "default",
  badge,
}: {
  href: string
  icon: React.ReactNode
  label: string
  iconOnly?: boolean
  tone?: Tone
  badge?: string
}) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + "/")
  const styles = TONE_STYLES[tone]

  if (iconOnly) {
    return (
      <Link
        href={href}
        prefetch
        aria-label={label}
        title={label}
        className={`inline-flex h-10 w-10 items-center justify-center rounded-card transition ${
          active ? styles.active : styles.iconIdle
        }`}
      >
        <span aria-hidden>{icon}</span>
      </Link>
    )
  }

  return (
    <Link
      href={href}
      prefetch
      className={`flex items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium transition ${
        active ? styles.active : styles.idle
      }`}
    >
      <span aria-hidden className="inline-flex h-5 w-5 items-center justify-center">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="rounded-chip bg-ink/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink">
          {badge}
        </span>
      )}
    </Link>
  )
}
